'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, LayoutGrid, Table2, Columns, Edit2, Eye, Download, Settings2, Filter, Trash2 as TrashIcon } from 'lucide-react'
import ColumnConfigDialog from '@/components/customers/ColumnConfigDialog'
import AdvancedFilters, { type FilterCondition } from '@/components/customers/AdvancedFilters'
import { useUserSettings, type TableDensity } from '@/hooks/use-user-settings'
import type { Customer } from '@/types/database'
import CustomerForm from '@/components/customers/CustomerForm'
import KanbanBoard from '@/components/customers/KanbanBoard'
import CustomerTable from '@/components/customers/CustomerTable'
import CustomerGrid from '@/components/customers/CustomerGrid'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DEAL_STAGES } from '@/lib/constants'

type ViewMode = 'kanban' | 'table' | 'grid'
type EditMode = 'view' | 'edit'

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { settings, saveSetting } = useUserSettings()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [editMode, setEditMode] = useState<EditMode>('view')
  const searchQuery = searchParams.get('search') || ''
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<FilterCondition[]>([])
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<number>>(new Set())

  const density: TableDensity = (settings.density as TableDensity) || 'comfortable'

  const handleDensityChange = async (newDensity: TableDensity) => {
    const success = await saveSetting('density', newDensity)
    if (success) {
      toast({
        title: 'Success',
        description: `Table density changed to ${newDensity}`,
      })
    }
  }

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterPriority])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterPriority) params.set('priority', filterPriority)

      const res = await fetch(`/api/customers?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      // Check if response is JSON
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await res.text()
        console.error('Non-JSON response received:', text.substring(0, 500))
        console.error('Response status:', res.status)
        console.error('Response headers:', Object.fromEntries(res.headers.entries()))
        
        // Try to extract error message from HTML if possible
        const errorMatch = text.match(/<title>(.*?)<\/title>/i) || text.match(/<h1>(.*?)<\/h1>/i)
        const errorMsg = errorMatch ? errorMatch[1] : 'Server returned HTML instead of JSON'
        
        throw new Error(`${errorMsg}. Status: ${res.status}. Check API route and environment variables.`)
      }
      
      const data = await res.json()
      
      if (!res.ok) {
        // Check for specific error codes
        if (res.status === 403 && data.error === 'Role not found') {
          throw new Error('You do not have a role assigned. Please contact an administrator to assign you a role.')
        }
        throw new Error(data.error || 'Failed to load customers')
      }
      
      setCustomers(data.customers || [])
      
      // Show info if no customers found (but not an error)
      if (data.customers && data.customers.length === 0) {
        console.log('No customers found. This could be due to:')
        console.log('1. No customers in the database')
        console.log('2. Your role filters (Sales role only sees customers assigned to you)')
        console.log('3. Active search/filter criteria')
      }
    } catch (error: any) {
      console.error('Error loading customers:', error)
      toast({
        variant: 'destructive',
        title: 'Error Loading Customers',
        description: error.message || 'Failed to load customers. Check console for details.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async (customerData: Partial<Customer>) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      })
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Customer created successfully',
        })
        setShowCreateDialog(false)
        loadCustomers()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create customer')
      }
    } catch (error: any) {
      console.error('Error creating customer:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create customer',
      })
    }
  }

  const handleUpdateCustomer = async (id: number, updates: Partial<Customer>) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Customer updated successfully',
        })
        loadCustomers()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update customer')
      }
    } catch (error: any) {
      console.error('Error updating customer:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update customer',
      })
    }
  }

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Customer deleted successfully',
        })
        loadCustomers()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete customer')
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete customer',
      })
    }
  }

  // Calculate pipeline metrics
  const pipelineMetrics = {
    totalValue: customers.reduce((sum, c) => sum + (c.deal_value_usd || 0), 0),
    weightedValue: customers.reduce((sum, c) => sum + (c.deal_value_usd || 0) * (c.deal_probability || 0) / 100, 0),
    closedWon: customers.filter(c => c.deal_stage === 'Closed Won').length,
    closedTotal: customers.filter(c => c.deal_stage === 'Closed Won' || c.deal_stage === 'Closed Lost').length,
    avgDealSize: customers.length > 0 
      ? customers.reduce((sum, c) => sum + (c.deal_value_usd || 0), 0) / customers.length 
      : 0,
  }

  const winRate = pipelineMetrics.closedTotal > 0 
    ? (pipelineMetrics.closedWon / pipelineMetrics.closedTotal) * 100 
    : 0

  const handleExportCSV = () => {
    try {
      const headers = ['Name (EN)', 'Name (JP)', 'Company Site', 'AWS Tier', 'Priority', 'Deal Stage', 'Deal Value USD', 'Deal Probability', 'Created At', 'Updated At']
      const rows = customers.map(c => [
        c.name_en || '',
        c.name_jp || '',
        c.company_site || '',
        c.tier || '',
        c.priority || '',
        c.deal_stage || '',
        c.deal_value_usd || 0,
        c.deal_probability || 0,
        c.created_at || '',
        c.updated_at || '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      toast({
        variant: 'success',
        title: 'Export Successful',
        description: 'Customer data exported to CSV',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message || 'Failed to export CSV',
      })
    }
  }

  const handleExportJSON = () => {
    try {
      const jsonContent = JSON.stringify(customers, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `customers-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      toast({
        variant: 'success',
        title: 'Export Successful',
        description: 'Customer data exported to JSON',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message || 'Failed to export JSON',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJSON}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant={editMode === 'edit' ? 'default' : 'outline'}
            onClick={() => setEditMode(editMode === 'view' ? 'edit' : 'view')}
          >
            {editMode === 'edit' ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                View Mode
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Mode
              </>
            )}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Pipeline Metrics */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Pipeline</div>
              <div className="text-2xl font-bold">
                ${pipelineMetrics.totalValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Weighted Value</div>
              <div className="text-2xl font-bold">
                ${pipelineMetrics.weightedValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">
                {winRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Avg Deal Size</div>
              <div className="text-2xl font-bold">
                ${pipelineMetrics.avgDealSize.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <Columns className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <Table2 className="h-4 w-4 mr-2" />
            Table
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grid
          </Button>
          {viewMode === 'table' && (
            <>
              <div className="h-6 w-px bg-gray-300 mx-2" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnConfig(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
              <select
                value={density}
                onChange={(e) => handleDensityChange(e.target.value as TableDensity)}
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filterPriority === 'High' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterPriority(filterPriority === 'High' ? null : 'High')}
          >
            High Priority
          </Button>
          <Button
            variant={filterPriority === 'AWS Premier' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterPriority(filterPriority === 'AWS Premier' ? null : 'AWS Premier')}
          >
            AWS Premier
          </Button>
        </div>
      </div>

      {/* Customer Views */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          customers={customers}
          onUpdate={handleUpdateCustomer}
          onDelete={handleDeleteCustomer}
          onNavigate={(id) => router.push(`/customer/${id}`)}
        />
        ) : viewMode === 'table' ? (
          <CustomerTable
            customers={customers}
            editMode={editMode === 'edit'}
            onUpdate={handleUpdateCustomer}
            onDelete={handleDeleteCustomer}
            onNavigate={(id) => router.push(`/customer/${id}`)}
            selectedIds={selectedCustomerIds}
            onSelectionChange={setSelectedCustomerIds}
          />
      ) : (
        <CustomerGrid
          customers={customers}
          onUpdate={handleUpdateCustomer}
          onDelete={handleDeleteCustomer}
          onNavigate={(id) => router.push(`/customer/${id}`)}
        />
      )}

      {/* Create Customer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={handleCreateCustomer}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Column Configuration Dialog */}
      <ColumnConfigDialog
        open={showColumnConfig}
        onOpenChange={setShowColumnConfig}
      />

      {/* Advanced Filters Dialog */}
      <AdvancedFilters
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        onApply={() => {
          // Apply filters - reload customers
          loadCustomers()
        }}
      />
    </div>
  )
}

