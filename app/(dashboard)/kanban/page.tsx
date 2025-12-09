'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Columns } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Customer } from '@/types/database'
import KanbanBoard from '@/components/customers/KanbanBoard'

type ProjectType = 'archera' | 'ripple'

export default function KanbanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ProjectType>(
    (searchParams.get('project') as ProjectType) || 'archera'
  )

  useEffect(() => {
    loadCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/customers', {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await res.text()
        console.error('Non-JSON response received:', text.substring(0, 500))
        throw new Error('Server returned HTML instead of JSON')
      }
      
      const data = await res.json()
      
      if (!res.ok) {
        if (res.status === 403 && data.error === 'Role not found') {
          throw new Error('You do not have a role assigned. Please contact an administrator to assign you a role.')
        }
        throw new Error(data.error || 'Failed to load customers')
      }
      
      setCustomers(data.customers || [])
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

  // Filter customers based on selected project
  // Only show customers where the project flag is checked
  // If both are checked, show only in Archera tab (to avoid duplicates)
  const getFilteredCustomers = (project: ProjectType): Customer[] => {
    return customers.filter(customer => {
      const isArchera = customer.archera_customer === '✓'
      const isRipple = customer.ripple_customer === '✓'
      
      // Only show customers that have at least one project checked
      if (!isArchera && !isRipple) {
        return false
      }
      
      // If both are checked, show only in Archera tab to avoid duplicates
      if (isArchera && isRipple) {
        return project === 'archera'
      }
      
      // Show in respective project tab
      if (project === 'archera') {
        return isArchera
      } else {
        return isRipple
      }
    })
  }

  // Calculate pipeline metrics for filtered customers
  const getPipelineMetrics = (projectCustomers: Customer[]) => {
    return {
      totalValue: projectCustomers.reduce((sum, c) => sum + (c.deal_value_usd || 0), 0),
      weightedValue: projectCustomers.reduce((sum, c) => sum + (c.deal_value_usd || 0) * (c.deal_probability || 0) / 100, 0),
      closedWon: projectCustomers.filter(c => c.deal_stage === 'Closed Won').length,
      closedTotal: projectCustomers.filter(c => c.deal_stage === 'Closed Won' || c.deal_stage === 'Closed Lost').length,
      avgDealSize: projectCustomers.length > 0 
        ? projectCustomers.reduce((sum, c) => sum + (c.deal_value_usd || 0), 0) / projectCustomers.length 
        : 0,
    }
  }

  const archeraCustomers = getFilteredCustomers('archera')
  const rippleCustomers = getFilteredCustomers('ripple')
  const archeraMetrics = getPipelineMetrics(archeraCustomers)
  const rippleMetrics = getPipelineMetrics(rippleCustomers)
  const archeraWinRate = archeraMetrics.closedTotal > 0 
    ? (archeraMetrics.closedWon / archeraMetrics.closedTotal) * 100 
    : 0
  const rippleWinRate = rippleMetrics.closedTotal > 0 
    ? (rippleMetrics.closedWon / rippleMetrics.closedTotal) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Table
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Kanban View</h1>
            <p className="text-muted-foreground">Project-based pipeline management</p>
          </div>
        </div>
      </div>

      {/* Project Tabs */}
      <Tabs value={selectedProject} onValueChange={(value) => setSelectedProject(value as ProjectType)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="archera">
            Archera ({archeraCustomers.length})
          </TabsTrigger>
          <TabsTrigger value="ripple">
            Ripple ({rippleCustomers.length})
          </TabsTrigger>
        </TabsList>

        {/* Pipeline Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {selectedProject === 'archera' ? (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Pipeline</div>
                  <div className="text-2xl font-bold">
                    ${archeraMetrics.totalValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Weighted Value</div>
                  <div className="text-2xl font-bold">
                    ${archeraMetrics.weightedValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                  <div className="text-2xl font-bold">
                    {archeraWinRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Avg Deal Size</div>
                  <div className="text-2xl font-bold">
                    ${archeraMetrics.avgDealSize.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Total Pipeline</div>
                  <div className="text-2xl font-bold">
                    ${rippleMetrics.totalValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Weighted Value</div>
                  <div className="text-2xl font-bold">
                    ${rippleMetrics.weightedValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                  <div className="text-2xl font-bold">
                    {rippleWinRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-muted-foreground">Avg Deal Size</div>
                  <div className="text-2xl font-bold">
                    ${rippleMetrics.avgDealSize.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Kanban Boards */}
        <TabsContent value="archera" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <KanbanBoard
              customers={archeraCustomers}
              onUpdate={handleUpdateCustomer}
              onDelete={handleDeleteCustomer}
              onNavigate={(id) => router.push(`/customer/${id}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="ripple" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <KanbanBoard
              customers={rippleCustomers}
              onUpdate={handleUpdateCustomer}
              onDelete={handleDeleteCustomer}
              onNavigate={(id) => router.push(`/customer/${id}`)}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

