'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react'
import Papa from 'papaparse'
import { useToast } from '@/hooks/use-toast'
import FieldMappingTable from '@/components/import/FieldMappingTable'
import { autoDetectMappings, validateRow, type ValidationError } from '@/lib/field-mapping'
import { Progress } from '@/components/ui/progress'

interface PreviewRow {
  [key: string]: string | number | undefined
  __rowIndex?: number
}

type ImportStep = 'upload' | 'mapping' | 'validation' | 'duplicates' | 'importing' | 'complete'

export default function ImportPage() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [allRows, setAllRows] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [step, setStep] = useState<ImportStep>('upload')
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'create'>('skip')
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importResult, setImportResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Preview data (first 10 rows)
  const previewData = useMemo(() => allRows.slice(0, 10), [allRows])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file',
        variant: 'destructive',
      })
      return
    }

    setFile(selectedFile)
    parseCSV(selectedFile)
  }

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setErrorMessage('Error parsing CSV: ' + results.errors[0].message)
          toast({
            title: 'Parse Error',
            description: results.errors[0].message,
            variant: 'destructive',
          })
          return
        }

        const data = results.data as PreviewRow[]
        if (data.length === 0) {
          setErrorMessage('CSV file is empty')
          toast({
            title: 'Empty File',
            description: 'The CSV file is empty',
            variant: 'destructive',
          })
          return
        }

        // Add row indices
        data.forEach((row, idx) => {
          row.__rowIndex = idx + 1
        })

        setHeaders(Object.keys(data[0]))
        setAllRows(data)
        setErrorMessage('')

        // Auto-detect field mappings
        const autoMappings = autoDetectMappings(Object.keys(data[0]))
        setMappings(autoMappings)
        setStep('mapping')
      },
      error: (error) => {
        setErrorMessage('Error reading file: ' + error.message)
        toast({
          title: 'File Error',
          description: error.message,
          variant: 'destructive',
        })
      },
    })
  }

  const handleMappingChange = (csvColumn: string, databaseField: string | null) => {
    setMappings((prev) => {
      const newMappings = { ...prev }
      if (databaseField === null) {
        delete newMappings[csvColumn]
      } else {
        newMappings[csvColumn] = databaseField
      }
      return newMappings
    })
  }

  const handleValidate = async () => {
    setLoading(true)
    const errors: ValidationError[] = []

    // Validate all rows
    allRows.forEach((row) => {
      const rowErrors = validateRow(row, mappings)
      errors.push(...rowErrors)
    })

    setValidationErrors(errors)

    // Check for duplicates
    const nameEnField = Object.keys(mappings).find(col => mappings[col] === 'name_en')
    if (nameEnField) {
      const names = new Map<string, number[]>()
      allRows.forEach((row, idx) => {
        const nameValue = row[nameEnField]
        const name = typeof nameValue === 'string' ? nameValue.trim().toLowerCase() : String(nameValue || '').trim().toLowerCase()
        if (name) {
          if (!names.has(name)) {
            names.set(name, [])
          }
          names.get(name)!.push(idx)
        }
      })

      const duplicates = new Set<number>()
      names.forEach((indices) => {
        if (indices.length > 1) {
          indices.forEach(idx => duplicates.add(idx))
        }
      })

      setDuplicateRows(duplicates)
    }

    setLoading(false)

    // Check if there are critical errors
    const criticalErrors = errors.filter(e => e.level === 'error')
    if (criticalErrors.length > 0) {
      toast({
        title: 'Validation Errors',
        description: `Found ${criticalErrors.length} critical errors. Please fix them before importing.`,
        variant: 'destructive',
      })
      setStep('validation')
    } else if (duplicateRows.size > 0) {
      setStep('duplicates')
    } else {
      toast({
        title: 'Validation Complete',
        description: 'No errors found. Ready to import.',
      })
      setStep('duplicates') // Show duplicate handling even if no duplicates
    }
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setStep('importing')
    setProgress(0)
    setErrorMessage('')

    try {
      // Upload file
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(error.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      setProgress(25)

      // Prepare data with mappings
      const mappedData = allRows.map((row) => {
        const mapped: any = {}
        Object.entries(mappings).forEach(([csvCol, dbField]) => {
          if (dbField && row[csvCol]) {
            mapped[dbField] = row[csvCol].trim()
          }
        })
        return mapped
      })

      setProgress(50)

      // Execute import
      const executeRes = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: uploadData.sessionId,
          duplicateHandling,
          dryRun: false,
          mappings,
        }),
      })

      setProgress(75)

      if (!executeRes.ok) {
        const error = await executeRes.json()
        throw new Error(error.error || 'Import execution failed')
      }

      const result = await executeRes.json()
      setImportResult(result)
      setProgress(100)
      setStep('complete')

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${result.success || 0} customers`,
      })
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred during import')
      setStep('mapping')
      toast({
        title: 'Import Failed',
        description: error.message || 'An error occurred during import',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const criticalErrorCount = validationErrors.filter(e => e.level === 'error').length
  const warningCount = validationErrors.filter(e => e.level === 'warning').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Customers</h1>
        <p className="text-muted-foreground">Upload and map CSV data to import customers</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {['upload', 'mapping', 'validation', 'duplicates', 'importing', 'complete'].map((s, idx) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? 'bg-primary text-primary-foreground'
                  : idx < ['upload', 'mapping', 'validation', 'duplicates', 'importing', 'complete'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {idx + 1}
            </div>
            {idx < 5 && <div className="w-12 h-1 bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 'upload' && 'Upload CSV File'}
            {step === 'mapping' && 'Map Fields'}
            {step === 'validation' && 'Validate Data'}
            {step === 'duplicates' && 'Handle Duplicates'}
            {step === 'importing' && 'Importing...'}
            {step === 'complete' && 'Import Complete'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">CSV files only</p>
                </label>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const res = await fetch('/api/import/template')
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'customer-import-template.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                    toast({
                      title: 'Template Downloaded',
                      description: 'CSV template has been downloaded',
                    })
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </div>
          )}

          {/* Field Mapping Step */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  {allRows.length} rows detected. Map each CSV column to a database field.
                </p>
                <FieldMappingTable
                  csvHeaders={headers}
                  mappings={mappings}
                  onMappingChange={handleMappingChange}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handleValidate} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate & Continue'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Validation Step */}
          {step === 'validation' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-medium text-red-900">Validation Errors</h3>
                  <p className="text-sm text-red-800">
                    {criticalErrorCount} error(s) and {warningCount} warning(s) found
                  </p>
                </div>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">Field</th>
                      <th className="px-4 py-2 text-left">Message</th>
                      <th className="px-4 py-2 text-left">Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {validationErrors.map((error, idx) => (
                      <tr key={idx} className={error.level === 'error' ? 'bg-red-50' : ''}>
                        <td className="px-4 py-2">{error.row}</td>
                        <td className="px-4 py-2">{error.field}</td>
                        <td className="px-4 py-2">{error.message}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              error.level === 'error'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {error.level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back to Mapping
                </Button>
                {criticalErrorCount === 0 && (
                  <Button onClick={() => setStep('duplicates')}>
                    Continue
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Duplicate Handling Step */}
          {step === 'duplicates' && (
            <div className="space-y-4">
              {duplicateRows.size > 0 ? (
                <>
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <h3 className="font-medium text-yellow-900">Duplicates Found</h3>
                      <p className="text-sm text-yellow-800">
                        {duplicateRows.size} duplicate rows detected
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Row</th>
                          {headers.slice(0, 5).map((header) => (
                            <th key={header} className="px-4 py-2 text-left">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Array.from(duplicateRows).slice(0, 10).map((rowIdx) => (
                          <tr key={rowIdx} className="bg-yellow-50">
                            <td className="px-4 py-2">{rowIdx + 1}</td>
                            {headers.slice(0, 5).map((header) => (
                              <td key={header} className="px-4 py-2">
                                {allRows[rowIdx]?.[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      How should duplicates be handled?
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="skip"
                          checked={duplicateHandling === 'skip'}
                          onChange={(e) => setDuplicateHandling(e.target.value as any)}
                        />
                        <span>Skip duplicates (don&apos;t import)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="update"
                          checked={duplicateHandling === 'update'}
                          onChange={(e) => setDuplicateHandling(e.target.value as any)}
                        />
                        <span>Update existing records</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="create"
                          checked={duplicateHandling === 'create'}
                          onChange={(e) => setDuplicateHandling(e.target.value as any)}
                        />
                        <span>Create new records (allow duplicates)</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mb-2" />
                  <p className="text-sm text-green-800">No duplicates found. Ready to import.</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={loading}>
                  Import {allRows.length} Customers
                </Button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="space-y-4">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Importing... {progress}%
              </p>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && importResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-900">Import Successful</h3>
              </div>
              <div className="space-y-1 text-sm text-green-800">
                <p>✓ {importResult.success || 0} customers imported</p>
                {importResult.updated > 0 && (
                  <p>✓ {importResult.updated} customers updated</p>
                )}
                {importResult.skipped > 0 && (
                  <p>○ {importResult.skipped} customers skipped</p>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <p className="text-red-600">
                    ✗ {importResult.errors.length} errors occurred
                  </p>
                )}
              </div>
              <Button
                className="mt-4"
                onClick={() => {
                  setStep('upload')
                  setFile(null)
                  setAllRows([])
                  setHeaders([])
                  setMappings({})
                  setValidationErrors([])
                  setDuplicateRows(new Set())
                  setImportResult(null)
                  setErrorMessage('')
                }}
              >
                Import Another File
              </Button>
            </div>
          )}

          {/* Error Display */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-medium text-red-900">Error</h3>
              </div>
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
