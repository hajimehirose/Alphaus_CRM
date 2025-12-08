'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import { useUserSettings, type ColumnConfig } from '@/hooks/use-user-settings'
import { DEFAULT_COLUMNS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'

interface ColumnConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ColumnConfigDialog({ open, onOpenChange }: ColumnConfigDialogProps) {
  const { settings, saveSetting, loading } = useUserSettings()
  const { toast } = useToast()
  const [columns, setColumns] = useState<ColumnConfig[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (open && !loading) {
      // Load saved columns or use defaults
      const savedColumns = settings.columns || DEFAULT_COLUMNS.map((col, idx) => ({
        ...col,
        order: idx,
      }))
      setColumns(savedColumns.sort((a, b) => a.order - b.order))
      setHasChanges(false)
    }
  }, [open, loading, settings.columns])

  const handleToggleVisibility = (field: string) => {
    setColumns((cols) =>
      cols.map((col) =>
        col.field === field ? { ...col, visible: !col.visible } : col
      )
    )
    setHasChanges(true)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newColumns = [...columns]
    const temp = newColumns[index]
    newColumns[index] = newColumns[index - 1]
    newColumns[index - 1] = temp
    newColumns.forEach((col, idx) => {
      col.order = idx
    })
    setColumns(newColumns)
    setHasChanges(true)
  }

  const handleMoveDown = (index: number) => {
    if (index === columns.length - 1) return
    const newColumns = [...columns]
    const temp = newColumns[index]
    newColumns[index] = newColumns[index + 1]
    newColumns[index + 1] = temp
    newColumns.forEach((col, idx) => {
      col.order = idx
    })
    setColumns(newColumns)
    setHasChanges(true)
  }

  const handleSave = async () => {
    const success = await saveSetting('columns', columns)
    if (success) {
      toast({
        title: 'Success',
        description: 'Column configuration saved',
      })
      setHasChanges(false)
      onOpenChange(false)
    }
  }

  const handleReset = () => {
    const defaultColumns = DEFAULT_COLUMNS.map((col, idx) => ({
      ...col,
      order: idx,
    }))
    setColumns(defaultColumns)
    setHasChanges(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Columns</DialogTitle>
          <DialogDescription>
            Toggle visibility and reorder columns. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {columns.map((column, index) => (
            <div
              key={column.field}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
            >
              <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
              <Checkbox
                checked={column.visible}
                onCheckedChange={() => handleToggleVisibility(column.field)}
                disabled={column.locked}
              />
              <span className="flex-1 font-medium">
                {column.label}
                {column.locked && (
                  <span className="ml-2 text-xs text-muted-foreground">(Required)</span>
                )}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === columns.length - 1}
                >
                  ↓
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

