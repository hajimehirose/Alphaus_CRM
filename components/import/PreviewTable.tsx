'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import { ValidationError } from '@/lib/field-mapping'
import { cn } from '@/lib/utils'

interface PreviewTableProps {
  rows: Record<string, any>[]
  headers: string[]
  mappings: Record<string, string>
  validationErrors: ValidationError[]
  duplicateRows?: Set<number>
  maxRows?: number
}

export default function PreviewTable({
  rows,
  headers,
  mappings,
  validationErrors,
  duplicateRows = new Set(),
  maxRows = 10,
}: PreviewTableProps) {
  // Get errors by row
  const errorsByRow = new Map<number, ValidationError[]>()
  validationErrors.forEach(error => {
    const rowNum = error.row
    if (!errorsByRow.has(rowNum)) {
      errorsByRow.set(rowNum, [])
    }
    errorsByRow.get(rowNum)!.push(error)
  })

  const previewRows = rows.slice(0, maxRows)
  
  // Get mapped columns (only show columns that are mapped)
  const mappedColumns = headers.filter(header => mappings[header])
  
  const getRowStatus = (rowIndex: number): 'valid' | 'warning' | 'error' | 'duplicate' => {
    const rowErrors = errorsByRow.get(rowIndex) || []
    const hasErrors = rowErrors.some(e => e.level === 'error')
    const hasWarnings = rowErrors.some(e => e.level === 'warning')
    
    // Check if row is duplicate (rowIndex is 1-based, array index is 0-based)
    if (duplicateRows.has(rowIndex - 1)) {
      return 'duplicate'
    }
    if (hasErrors) return 'error'
    if (hasWarnings) return 'warning'
    return 'valid'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'duplicate':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return null
    }
  }

  const getRowBgColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-50/50'
      case 'warning':
        return 'bg-yellow-50/50'
      case 'error':
        return 'bg-red-50/50'
      case 'duplicate':
        return 'bg-orange-50/50'
      default:
        return ''
    }
  }

  const getFieldErrors = (rowIndex: number, field: string) => {
    return (errorsByRow.get(rowIndex) || []).filter(e => e.field === field)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Preview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Showing first {previewRows.length} of {rows.length} rows. Review the data before importing.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium bg-gray-50 sticky left-0 z-10">Status</th>
                <th className="px-3 py-2 text-left font-medium bg-gray-50">Row</th>
                {mappedColumns.map(header => {
                  const dbField = mappings[header]
                  return (
                    <th key={header} className="px-3 py-2 text-left font-medium bg-gray-50 min-w-[120px]">
                      <div>
                        <div className="font-medium">{header}</div>
                        <div className="text-xs text-muted-foreground">{dbField}</div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => {
                const rowIndex = row.__rowIndex || idx + 1
                const status = getRowStatus(rowIndex)
                const rowErrors = errorsByRow.get(rowIndex) || []
                
                return (
                  <tr
                    key={idx}
                    className={cn(
                      'border-b hover:bg-gray-50 transition-colors',
                      getRowBgColor(status)
                    )}
                  >
                    <td className="px-3 py-2 sticky left-0 bg-inherit z-10">
                      {getStatusIcon(status)}
                    </td>
                    <td className="px-3 py-2 font-medium">{rowIndex}</td>
                    {mappedColumns.map(header => {
                      const fieldErrors = getFieldErrors(rowIndex, mappings[header])
                      const hasError = fieldErrors.some(e => e.level === 'error')
                      const hasWarning = fieldErrors.some(e => e.level === 'warning')
                      
                      return (
                        <td key={header} className="px-3 py-2">
                          <div className="relative group">
                            <div
                              className={cn(
                                'truncate max-w-[200px]',
                                hasError && 'text-red-600 font-medium',
                                hasWarning && !hasError && 'text-yellow-700'
                              )}
                            >
                              {String(row[header] || '-')}
                            </div>
                            {fieldErrors.length > 0 && (
                              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                {fieldErrors.map((err, errIdx) => (
                                  <div key={errIdx}>{err.message}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Valid</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span>Error</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <span>Duplicate</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

