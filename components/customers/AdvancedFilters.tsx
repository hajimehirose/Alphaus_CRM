'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { DEAL_STAGES } from '@/lib/constants'

export type FilterCondition = {
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan'
  value: string
}

interface AdvancedFiltersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: FilterCondition[]
  onFiltersChange: (filters: FilterCondition[]) => void
  onApply: () => void
}

export default function AdvancedFilters({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApply,
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterCondition[]>(filters)

  const addFilter = () => {
    setLocalFilters([...localFilters, { field: 'name_en', operator: 'contains', value: '' }])
  }

  const removeFilter = (index: number) => {
    setLocalFilters(localFilters.filter((_, i) => i !== index))
  }

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    setLocalFilters(localFilters.map((f, i) => (i === index ? { ...f, ...updates } : f)))
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
    onApply()
    onOpenChange(false)
  }

  const handleReset = () => {
    setLocalFilters([])
    onFiltersChange([])
    onApply()
    onOpenChange(false)
  }

  const fieldOptions = [
    { value: 'name_en', label: 'English Name' },
    { value: 'name_jp', label: 'Japanese Name' },
    { value: 'company_site', label: 'Company Site' },
    { value: 'tier', label: 'AWS Tier' },
    { value: 'priority', label: 'Priority' },
    { value: 'deal_stage', label: 'Deal Stage' },
    { value: 'deal_value_usd', label: 'Deal Value USD' },
    { value: 'alphaus_rep', label: 'Alphaus Rep' },
  ]

  const operatorOptions = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
  ]

  const getFieldInputType = (field: string) => {
    if (field === 'deal_stage') return 'select'
    if (field === 'priority') return 'select'
    if (field === 'tier') return 'select'
    if (field === 'deal_value_usd') return 'number'
    return 'text'
  }

  const getFieldOptions = (field: string) => {
    if (field === 'deal_stage') return DEAL_STAGES
    if (field === 'priority') return ['High', 'Mid', 'Low']
    if (field === 'tier') return ['Premier', 'Advanced', 'Selected', '-']
    return []
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
          <DialogDescription>
            Add multiple filter conditions to narrow down your customer list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {localFilters.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No filters applied. Click &quot;Add Filter&quot; to get started.
            </p>
          ) : (
            localFilters.map((filter, index) => (
              <div key={index} className="flex items-start gap-2 p-4 border rounded-lg">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(index, { field: value, value: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(index, { operator: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {operatorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {getFieldInputType(filter.field) === 'select' ? (
                    <Select
                      value={filter.value}
                      onValueChange={(value) => updateFilter(index, { value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Value" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFieldOptions(filter.field).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={getFieldInputType(filter.field)}
                      value={filter.value}
                      onChange={(e) => updateFilter(index, { value: e.target.value })}
                      placeholder="Value"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFilter(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}

          <Button variant="outline" onClick={addFilter} className="w-full">
            + Add Filter
          </Button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Filters ({localFilters.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

