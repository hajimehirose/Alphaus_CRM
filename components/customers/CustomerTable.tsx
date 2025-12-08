'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react'
import type { Customer } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CustomerTableProps {
  customers: Customer[]
  editMode: boolean
  onUpdate: (id: number, updates: Partial<Customer>) => void
  onDelete: (id: number) => void
  onNavigate: (id: number) => void
}

type SortField = keyof Customer | null
type SortDirection = 'asc' | 'desc' | null

export default function CustomerTable({
  customers,
  editMode,
  onUpdate,
  onDelete,
  onNavigate,
}: CustomerTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

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

  const columns = [
    { key: 'name_en', label: 'Name (EN)', editable: true, sortable: true },
    { key: 'name_jp', label: 'Name (JP)', editable: true, sortable: true },
    { key: 'company_site', label: 'Company Site', editable: true, sortable: true },
    { key: 'tier', label: 'AWS Tier', editable: true, sortable: true },
    { key: 'priority', label: 'Priority', editable: true, sortable: true },
    { key: 'deal_stage', label: 'Stage', editable: true, sortable: true },
    { key: 'deal_value_usd', label: 'Deal Value USD', editable: true, sortable: true },
    { key: 'deal_probability', label: 'Probability', editable: false, sortable: true },
  ]

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(col.key as keyof Customer)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortField === col.key && (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-gray-50">
                {columns.map(col => {
                  const isEditing = editingCell?.id === customer.id && editingCell?.field === col.key
                  const value = customer[col.key as keyof Customer]

                  return (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-sm"
                      onClick={() => col.editable && handleCellClick(customer.id, col.key, value)}
                    >
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleSaveEdit(customer.id, col.key)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(customer.id, col.key)
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <span className={col.editable && editMode ? 'cursor-pointer hover:bg-blue-50 p-1 rounded' : ''}>
                          {col.key === 'deal_value_usd' && value
                            ? formatCurrency(Number(value), 'USD')
                            : col.key === 'created_at'
                            ? formatDate(String(value))
                            : String(value || '-')}
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

