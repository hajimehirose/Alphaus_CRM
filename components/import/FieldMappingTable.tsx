'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DATABASE_FIELDS, type DatabaseField } from '@/lib/field-mapping'

interface FieldMappingTableProps {
  csvHeaders: string[]
  mappings: Record<string, string>
  onMappingChange: (csvColumn: string, databaseField: string | null) => void
}

export default function FieldMappingTable({
  csvHeaders,
  mappings,
  onMappingChange,
}: FieldMappingTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-medium">Map CSV Columns to Database Fields</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Match each CSV column to a database field, or leave as "Skip" to ignore
        </p>
      </div>
      <div className="divide-y max-h-96 overflow-y-auto">
        {csvHeaders.map((csvColumn) => {
          const mappedField = mappings[csvColumn] || null
          const fieldInfo = mappedField
            ? DATABASE_FIELDS.find(f => f.key === mappedField)
            : null

          return (
            <div key={csvColumn} className="p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="font-medium text-sm">{csvColumn}</label>
                  {fieldInfo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {fieldInfo.label}
                      {fieldInfo.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="w-64">
                  <Select
                    value={mappedField || 'skip'}
                    onValueChange={(value) =>
                      onMappingChange(csvColumn, value === 'skip' ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip this column</SelectItem>
                      {DATABASE_FIELDS.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                          {field.required && ' *'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

