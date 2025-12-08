'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, LayoutGrid, Table2, Columns, Edit2, Eye } from 'lucide-react'
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
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [editMode, setEditMode] = useState<EditMode>('view')
  const searchQuery = searchParams.get('search') || ''
  const [filterPriority, setFilterPriority] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [searchQuery, filterPriority])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterPriority) params.set('priority', filterPriority)

      const res = await fetch(`/api/customers?${params.toString()}`)
      const data = await res.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Error loading customers:', error)
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
        setShowCreateDialog(false)
        loadCustomers()
      }
    } catch (error) {
      console.error('Error creating customer:', error)
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
        loadCustomers()
      }
    } catch (error) {
      console.error('Error updating customer:', error)
    }
  }

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        loadCustomers()
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
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
    </div>
  )
}

