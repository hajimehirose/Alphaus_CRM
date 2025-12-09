'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, AlertTriangle, Download, FileCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import FieldMappingTable from '@/components/import/FieldMappingTable'
import PreviewTable from '@/components/import/PreviewTable'
import { autoDetectMappings, validateRow, type ValidationError } from '@/lib/field-mapping'
import { parseFile, validateFileSize, validateFileType, formatFileSize } from '@/lib/file-parser'
import { Progress } from '@/components/ui/progress'

interface PreviewRow {
  [key: string]: string | number | undefined
  __rowIndex?: number
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'validation' | 'duplicates' | 'importing' | 'complete'

export default function ImportPage() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [allRows, setAllRows] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [step, setStep] = useState<ImportStep>('upload')
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'create'>('skip')
  const [dryRun, setDryRun] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set())
  const [databaseDuplicates, setDatabaseDuplicates] = useState<Map<number, any>>(new Map())
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [importResult, setImportResult] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file type
    const typeValidation = validateFileType(selectedFile)
    if (!typeValidation.valid) {
      toast({
        title: 'Invalid File Type',
        description: typeValidation.error,
        variant: 'destructive',
      })
      return
    }

    // Validate file size (10MB limit)
    const sizeValidation = validateFileSize(selectedFile)
    if (!sizeValidation.valid) {
      toast({
        title: 'File Too Large',
        description: sizeValidation.error,
        variant: 'destructive',
      })
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setErrorMessage('')

    try {
      const parsed = await parseFile(selectedFile)
      setHeaders(parsed.headers)
      setAllRows(parsed.rows)
      
      // Auto-detect field mappings
      const autoMappings = autoDetectMappings(parsed.headers)
      setMappings(autoMappings)
      
      toast({
        title: 'File Parsed',
        description: `Found ${parsed.rowCount} rows. Please map the fields.`,
        variant: 'success',
      })
      
      setStep('mapping')
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to parse file')
      toast({
        title: 'Parse Error',
        description: error.message || 'Failed to parse file',
        variant: 'destructive',
      })
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
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

    // Check for duplicates within file
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

    // Check for duplicates in database
    try {
      const duplicateCheckRes = await fetch('/api/import/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: allRows,
          mappings,
        }),
      })

      if (duplicateCheckRes.ok) {
        const duplicateData = await duplicateCheckRes.json()
        const dbDuplicateMap = new Map<number, any>()
        duplicateData.duplicates?.forEach((dup: any) => {
          dbDuplicateMap.set(dup.rowIndex, dup.existingCustomer)
        })
        setDatabaseDuplicates(dbDuplicateMap)
        
        // Add database duplicates to duplicateRows set (indices are 0-based)
        if (duplicateData.duplicateRowIndices && Array.isArray(duplicateData.duplicateRowIndices)) {
          setDuplicateRows(prev => {
            const newSet = new Set(prev)
            duplicateData.duplicateRowIndices.forEach((idx: number) => {
              newSet.add(idx)
            })
            return newSet
          })
        }
      }
    } catch (error) {
      console.error('Error checking database duplicates:', error)
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
    } else {
      setStep('preview')
      toast({
        title: 'Validation Complete',
        description: 'Data validated. Review the preview before importing.',
        variant: 'success',
      })
    }
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setStep('importing')
    setProgress(0)
    setProgressMessage('Uploading file...')
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
      setProgressMessage('Processing data...')

      // Execute import
      const executeRes = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: uploadData.sessionId,
          duplicateHandling,
          dryRun,
          mappings,
        }),
      })

      setProgress(75)
      setProgressMessage('Finalizing import...')

      if (!executeRes.ok) {
        const error = await executeRes.json()
        throw new Error(error.error || 'Import execution failed')
      }

      const result = await executeRes.json()
      setImportResult(result)
      setProgress(100)
      setProgressMessage('Import complete!')
      setStep('complete')

      toast({
        variant: 'success',
        title: dryRun ? 'Dry Run Complete' : 'Import Complete',
        description: dryRun 
          ? `Would import ${result.success || 0} customers, update ${result.updated || 0}, skip ${result.skipped || 0}`
          : `Successfully imported ${result.success || 0} customers`,
      })
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred during import')
      setStep('preview')
      toast({
        title: 'Import Failed',
        description: error.message || 'An error occurred during import',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadErrorReport = () => {
    if (!importResult?.errors || importResult.errors.length === 0) {
      toast({
        title: 'No Errors',
        description: 'There are no errors to download.',
      })
      return
    }

    const csv = [
      ['Row', 'Error'].join(','),
      ...importResult.errors.map((err: any) => [
        err.row || '',
        `"${String(err.error || err.message || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-errors-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Error Report Downloaded',
      description: 'Error report has been downloaded.',
    })
  }

  const criticalErrorCount = validationErrors.filter(e => e.level === 'error').length
  const warningCount = validationErrors.filter(e => e.level === 'warning').length
  const totalDuplicateCount = duplicateRows.size + databaseDuplicates.size

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Customers</h1>
        <p className="text-muted-foreground">Upload CSV or Excel files to import customer data</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 flex-wrap">
        {['upload', 'mapping', 'preview', 'duplicates', 'importing', 'complete'].map((s, idx) => {
          const stepOrder = ['upload', 'mapping', 'preview', 'duplicates', 'importing', 'complete']
          const currentStepIdx = stepOrder.indexOf(step)
          const stepIdx = stepOrder.indexOf(s)
          const isActive = step === s
          const isCompleted = stepIdx < currentStepIdx
          
          return (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isCompleted ? <CheckCircle className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < 5 && <div className={`w-12 h-1 mx-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 'upload' && 'Upload File'}
            {step === 'mapping' && 'Map Fields'}
            {step === 'preview' && 'Preview Data'}
            {step === 'validation' && 'Validation Errors'}
            {step === 'duplicates' && 'Handle Duplicates'}
            {step === 'importing' && (dryRun ? 'Dry Run...' : 'Importing...')}
            {step === 'complete' && (dryRun ? 'Dry Run Complete' : 'Import Complete')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id="file-upload"
                  disabled={loading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {loading ? (
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium mb-1">
                    {loading ? 'Parsing file...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV or Excel files (.csv, .xlsx, .xls) up to 10MB
                  </p>
                  {file && (
                    <p className="text-sm mt-2 text-green-600">
                      {file.name} ({formatFileSize(file.size)})
                    </p>
                  )}
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
                    a.download = 'crm_import_template.csv'
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
                  {allRows.length} rows detected. Map each CSV/Excel column to a database field.
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

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-4">
              <PreviewTable
                rows={allRows}
                headers={headers}
                mappings={mappings}
                validationErrors={validationErrors}
                duplicateRows={duplicateRows}
              />
              
              {totalDuplicateCount > 0 && (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h3 className="font-medium text-yellow-900">Duplicates Detected</h3>
                    <p className="text-sm text-yellow-800">
                      {duplicateRows.size} duplicate(s) within file
                      {databaseDuplicates.size > 0 && `, ${databaseDuplicates.size} match existing customers`}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back to Mapping
                </Button>
                <Button onClick={() => setStep('duplicates')}>
                  Continue to Duplicates
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
                  <Button onClick={() => setStep('preview')}>
                    Continue to Preview
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Duplicate Handling Step */}
          {step === 'duplicates' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <FileCheck className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900">Ready to Import</h3>
                  <p className="text-sm text-blue-800">
                    Review duplicate handling options and dry run settings
                  </p>
                </div>
              </div>

              {totalDuplicateCount > 0 && (
                <>
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <h3 className="font-medium text-yellow-900">Duplicates Found</h3>
                      <p className="text-sm text-yellow-800">
                        {duplicateRows.size} duplicate(s) within file
                        {databaseDuplicates.size > 0 && `, ${databaseDuplicates.size} match existing customers`}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      How should duplicates be handled?
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          value="skip"
                          checked={duplicateHandling === 'skip'}
                          onChange={(e) => setDuplicateHandling(e.target.value as any)}
                        />
                        <div>
                          <span className="font-medium">Skip duplicates</span>
                          <p className="text-xs text-muted-foreground">Don&apos;t import rows that match existing customers</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          value="update"
                          checked={duplicateHandling === 'update'}
                          onChange={(e) => setDuplicateHandling(e.target.value as any)}
                        />
                        <div>
                          <span className="font-medium">Update existing records</span>
                          <p className="text-xs text-muted-foreground">Overwrite existing customer data with imported data</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          value="create"
                          checked={duplicateHandling === 'create'}
                          onChange={(e) => setDuplicateHandling(e.target.value as any)}
                        />
                        <div>
                          <span className="font-medium">Create new records</span>
                          <p className="text-xs text-muted-foreground">Allow duplicates and create new customer records</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="p-4 border rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={dryRun}
                    onCheckedChange={(checked) => setDryRun(checked as boolean)}
                  />
                  <div>
                    <span className="font-medium">Dry Run Mode</span>
                    <p className="text-xs text-muted-foreground">
                      Validate and preview import without saving data to the database
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('preview')}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={loading}>
                  {dryRun ? (
                    <>Perform Dry Run ({allRows.length} rows)</>
                  ) : (
                    <>Import {allRows.length} Customers</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="space-y-4">
              <Progress value={progress} />
              <div className="text-center">
                <p className="text-sm font-medium mb-1">{progressMessage}</p>
                <p className="text-xs text-muted-foreground">{progress}% complete</p>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && importResult && (
            <div className="space-y-4">
              <div className={`p-4 border rounded-lg ${dryRun ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                  {dryRun ? (
                    <FileCheck className="h-5 w-5 text-blue-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <h3 className={`font-medium ${dryRun ? 'text-blue-900' : 'text-green-900'}`}>
                    {dryRun ? 'Dry Run Complete' : 'Import Successful'}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-xs text-muted-foreground">Success</div>
                    <div className="text-2xl font-bold text-green-600">{importResult.success || 0}</div>
                  </div>
                  {importResult.updated > 0 && (
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-muted-foreground">Updated</div>
                      <div className="text-2xl font-bold text-blue-600">{importResult.updated || 0}</div>
                    </div>
                  )}
                  {importResult.skipped > 0 && (
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-muted-foreground">Skipped</div>
                      <div className="text-2xl font-bold text-yellow-600">{importResult.skipped || 0}</div>
                    </div>
                  )}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-muted-foreground">Errors</div>
                      <div className="text-2xl font-bold text-red-600">{importResult.errors.length}</div>
                    </div>
                  )}
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={handleDownloadErrorReport}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Error Report
                    </Button>
                  </div>
                )}

                {!dryRun && importResult.success > 0 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = '/'
                      }}
                    >
                      View Customers
                    </Button>
                  </div>
                )}

                {dryRun && (
                  <div className="mt-4 p-3 bg-blue-100 rounded">
                    <p className="text-sm text-blue-900">
                      This was a dry run. No data was saved to the database. Click &quot;Proceed with Import&quot; to perform the actual import.
                    </p>
                    <Button
                      className="mt-3"
                      onClick={() => {
                        setDryRun(false)
                        handleImport()
                      }}
                    >
                      Proceed with Import
                    </Button>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload')
                  setFile(null)
                  setAllRows([])
                  setHeaders([])
                  setMappings({})
                  setValidationErrors([])
                  setDuplicateRows(new Set())
                  setDatabaseDuplicates(new Map())
                  setImportResult(null)
                  setErrorMessage('')
                  setDryRun(false)
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
