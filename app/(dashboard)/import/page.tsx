'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'

interface PreviewRow {
  [key: string]: string
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [importResult, setImportResult] = useState<any>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file')
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
          setStatus('error')
          return
        }

        const data = results.data as PreviewRow[]
        if (data.length === 0) {
          setErrorMessage('CSV file is empty')
          setStatus('error')
          return
        }

        setHeaders(Object.keys(data[0]))
        setPreviewData(data.slice(0, 10)) // Show first 10 rows
        setStatus('preview')
        setErrorMessage('')
      },
      error: (error) => {
        setErrorMessage('Error reading file: ' + error.message)
        setStatus('error')
      },
    })
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setStatus('idle')
    setErrorMessage('')

    try {
      // Convert file to base64 or upload to Supabase Storage
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Import failed')
      }

      const data = await res.json()

      // Execute import
      const executeRes = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: data.sessionId,
          duplicateHandling: 'skip', // or 'update', 'create'
          dryRun: false,
        }),
      })

      if (!executeRes.ok) {
        const error = await executeRes.json()
        throw new Error(error.error || 'Import execution failed')
      }

      const result = await executeRes.json()
      setImportResult(result)
      setStatus('success')
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred during import')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Customers</h1>
        <p className="text-muted-foreground">Upload a CSV file to import customers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {file && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <FileSpreadsheet className="h-5 w-5" />
              <span className="flex-1">{file.name}</span>
              <span className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </span>
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Preview (first 10 rows)</h3>
                <div className="border rounded-lg overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {headers.map(header => (
                          <th key={header} className="px-4 py-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          {headers.map(header => (
                            <td key={header} className="px-4 py-2">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Button onClick={handleImport} disabled={loading} className="w-full">
                {loading ? 'Importing...' : 'Import Customers'}
              </Button>
            </div>
          )}

          {status === 'success' && importResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-900">Import Successful</h3>
              </div>
              <p className="text-sm text-green-800">
                Imported {importResult.success || 0} customers successfully.
                {importResult.errors && importResult.errors.length > 0 && (
                  <> {importResult.errors.length} errors occurred.</>
                )}
              </p>
            </div>
          )}

          {status === 'error' && errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-medium text-red-900">Import Failed</h3>
              </div>
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

