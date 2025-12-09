'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, ExternalLink, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { Customer } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useUserSettings, type ColumnConfig, type TableDensity } from '@/hooks/use-user-settings'
import { DEFAULT_COLUMNS } from '@/lib/constants'

interface CustomerTableProps {
  customers: Customer[]
  editMode: boolean
  onUpdate: (id: number, updates: Partial<Customer>) => void
  onDelete: (id: number) => void
  onNavigate: (id: number) => void
  selectedIds?: Set<number>
  onSelectionChange?: (ids: Set<number>) => void
}

type SortField = keyof Customer | null
type SortDirection = 'asc' | 'desc' | null

export default function CustomerTable({
  customers,
  editMode,
  onUpdate,
  onDelete,
  onNavigate,
  selectedIds = new Set(),
  onSelectionChange,
}: CustomerTableProps) {
  const { settings, loading: settingsLoading } = useUserSettings()
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  
  // Get column configuration from settings or use defaults
  const columnConfig: ColumnConfig[] = useMemo(() => {
    if (settingsLoading || !settings.columns) {
      return DEFAULT_COLUMNS.map((col, idx) => ({
        ...col,
        order: idx,
      }))
    }
    return settings.columns.sort((a, b) => a.order - b.order)
  }, [settings.columns, settingsLoading])

  // Get density from settings or use default
  const density: TableDensity = (settings.density as TableDensity) || 'comfortable'
  
  // Get visible columns
  const visibleColumns = useMemo(() => {
    return columnConfig.filter(col => col.visible)
  }, [columnConfig])

  // Density classes
  const densityClasses = {
    compact: 'px-2 py-1 text-xs',
    comfortable: 'px-4 py-3 text-sm',
    spacious: 'px-6 py-4 text-base',
  }

  const handleCellClick = (customerId: number, field: string, currentValue: any) => {
    if (!editMode) return
    setEditingCell({ id: customerId, field })
    setEditValue(String(currentValue || ''))
  }

  const handleSaveEdit = (customerId: number, field: string) => {
    if (editingCell?.id === customerId && editingCell?.field === field) {
      const updates: any = { [field]: editValue }
      onUpdate(customerId, updates)
      setEditingCell(null)
      setEditValue('')
    }
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedCustomers = useMemo(() => {
    if (!sortField || !sortDirection) return customers

    return [...customers].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()

      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr)
      } else {
        return bStr.localeCompare(aStr)
      }
    })
  }, [customers, sortField, sortDirection])

  // Helper function to check if field is editable
  const isFieldEditable = (field: string): boolean => {
    const col = columnConfig.find(c => c.field === field)
    return col ? !col.locked && col.type !== 'number' : true
  }

  // Helper function to format cell value
  const formatCellValue = (field: string, value: any): string => {
    if (value === null || value === undefined) return '-'
    
    if (field === 'deal_value_usd') {
      return formatCurrency(Number(value), 'USD')
    }
    if (field === 'deal_value_jpy') {
      return formatCurrency(Number(value), 'JPY')
    }
    if (field === 'created_at' || field === 'updated_at') {
      return formatDate(String(value))
    }
    return String(value)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {onSelectionChange && (
                <th className={`${densityClasses[density]} text-left`}>
                  <Checkbox
                    checked={selectedIds.size > 0 && selectedIds.size === customers.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectionChange(new Set(customers.map(c => c.id)))
                      } else {
                        onSelectionChange(new Set())
                      }
                    }}
                  />
                </th>
              )}
              {visibleColumns.map(col => (
                <th 
                  key={col.field} 
                  className={`${densityClasses[density]} text-left font-medium text-gray-500 uppercase ${
                    'cursor-pointer hover:bg-gray-100 select-none'
                  }`}
                  onClick={() => handleSort(col.field as keyof Customer)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortField === col.field && (
                      sortDirection === 'asc' ? (
                        <ArrowUpNarrowWide className="h-3 w-3" />
                      ) : (
                        <ArrowDownNarrowWide className="h-3 w-3" />
                      )
                    )}
                  </div>
                </th>
              ))}
              <th className={`${densityClasses[density]} text-left font-medium text-gray-500 uppercase`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-gray-50">
                {onSelectionChange && (
                  <td className={densityClasses[density]}>
                    <Checkbox
                      checked={selectedIds.has(customer.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedIds)
                        if (checked) {
                          newSelected.add(customer.id)
                        } else {
                          newSelected.delete(customer.id)
                        }
                        onSelectionChange(newSelected)
                      }}
                    />
                  </td>
                )}
                {visibleColumns.map(col => {
                  const isEditing = editingCell?.id === customer.id && editingCell?.field === col.field
                  const value = customer[col.field as keyof Customer]
                  const editable = isFieldEditable(col.field) && editMode

                  return (
                    <td
                      key={col.field}
                      className={`${densityClasses[density]}`}
                      onClick={() => editable && handleCellClick(customer.id, col.field, value)}
                    >
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSaveEdit(customer.id, col.field)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(customer.id, col.field)
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          autoFocus
                          className={density === 'compact' ? 'h-6 text-xs' : density === 'spacious' ? 'h-10' : 'h-8'}
                        />
                      ) : (
                        <span className={editable ? 'cursor-pointer hover:bg-blue-50 p-1 rounded' : ''}>
                          {formatCellValue(col.field, value)}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onNavigate(customer.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {editMode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {customers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No customers found</div>
      )}
    </div>
  )
}

