'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download } from 'lucide-react'
import type { ActivityLog } from '@/types/database'
import { formatDateTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export default function ActivityLogPage() {
  const { toast } = useToast()
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    customer_id: '',
    user_id: '',
    activityType: 'all', // all, updates, notes, files
  })

  useEffect(() => {
    loadActivities()
  }, [page, filters])

  const loadActivities = async () => {
    try {
      setLoading(true)
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '50',
        })
        if (filters.action) params.set('action', filters.action)
        if (filters.entity_type) params.set('entity_type', filters.entity_type)
        if (filters.customer_id) params.set('customer_id', filters.customer_id)
        if (filters.user_id) params.set('user_id', filters.user_id)
        
        // Apply activity type filter
        if (filters.activityType === 'updates') {
          params.set('action', 'updated')
        } else if (filters.activityType === 'notes') {
          params.set('entity_type', 'note')
        } else if (filters.activityType === 'files') {
          params.set('entity_type', 'attachment')
        }

      const res = await fetch(`/api/activity-logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setTotalPages(data.pagination?.totalPages || 1)
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to load activities')
      }
    } catch (error: any) {
      console.error('Error loading activities:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load activities',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    try {
      const csv = [
        ['Date', 'User', 'Action', 'Entity Type', 'Field', 'Old Value', 'New Value'].join(','),
        ...activities.map(a => [
          formatDateTime(a.created_at),
          a.user_name,
          a.action,
          a.entity_type,
          a.field_name || '',
          a.old_value || '',
          a.new_value || '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity-log-${new Date().toISOString()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast({
        variant: 'success',
        title: 'Export Successful',
        description: 'Activity log exported to CSV',
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message || 'Failed to export activity log',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground">View all system activities</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Activity Type Quick Filters */}
            <div className="flex gap-2 mb-4 pb-4 border-b">
              <Button
                variant={filters.activityType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, activityType: 'all' })}
              >
                All
              </Button>
              <Button
                variant={filters.activityType === 'updates' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, activityType: 'updates' })}
              >
                Updates
              </Button>
              <Button
                variant={filters.activityType === 'notes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, activityType: 'notes' })}
              >
                Notes
              </Button>
              <Button
                variant={filters.activityType === 'files' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, activityType: 'files' })}
              >
                Files
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Input
                placeholder="Filter by action..."
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Entity Type</label>
              <Input
                placeholder="Filter by entity..."
                value={filters.entity_type}
                onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Customer ID</label>
              <Input
                type="number"
                placeholder="Filter by customer..."
                value={filters.customer_id}
                onChange={(e) => setFilters({ ...filters, customer_id: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">User ID</label>
              <Input
                placeholder="Filter by user..."
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : (
            <>
              <div className="space-y-2">
                {activities.map(activity => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{activity.user_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(activity.created_at)}
                        </span>
                        {activity.user_role && (
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                            {activity.user_role}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">{activity.action}</span> {activity.entity_type}
                        {activity.field_name && (
                          <>
                            {' '}field <span className="font-medium">{activity.field_name}</span>
                            {activity.old_value && activity.new_value && (
                              <>
                                {' '}from <span className="line-through">{activity.old_value}</span>
                                {' '}to <span className="font-medium">{activity.new_value}</span>
                              </>
                            )}
                          </>
                        )}
                        {activity.customer_id && (
                          <span className="text-muted-foreground">
                            {' '}(Customer #{activity.customer_id})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {activities.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No activities found</div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

