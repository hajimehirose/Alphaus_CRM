'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Trash2, Plus, ExternalLink } from 'lucide-react'
import type { Customer, Note, Attachment, ActivityLog } from '@/types/database'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import CustomerForm from '@/components/customers/CustomerForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const STORAGE_ICONS: Record<string, string> = {
  'Google Drive': '📁',
  'Dropbox': '📦',
  'OneDrive': '☁️',
  'Box': '📋',
  'Other': '📎',
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newAttachment, setNewAttachment] = useState({
    title: '',
    description: '',
    url: '',
    storage_type: 'Other',
  })

  useEffect(() => {
    loadCustomer()
    loadNotes()
    loadAttachments()
    loadActivities()
  }, [customerId])

  const loadCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`)
      const data = await res.json()
      setCustomer(data.customer)
    } catch (error) {
      console.error('Error loading customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`)
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const loadAttachments = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/attachments`)
      const data = await res.json()
      setAttachments(data.attachments || [])
    } catch (error) {
      console.error('Error loading attachments:', error)
    }
  }

  const loadActivities = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/activities`)
      const data = await res.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Error loading activities:', error)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      })
      if (res.ok) {
        setNewNote('')
        loadNotes()
        loadActivities()
      }
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const handleAddAttachment = async () => {
    if (!newAttachment.title || !newAttachment.url) return

    try {
      const res = await fetch(`/api/customers/${customerId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAttachment),
      })
      if (res.ok) {
        setNewAttachment({ title: '', description: '', url: '', storage_type: 'Other' })
        loadAttachments()
        loadActivities()
      }
    } catch (error) {
      console.error('Error adding attachment:', error)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Delete this note?')) return

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
      if (res.ok) {
        loadNotes()
        loadActivities()
      }
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Delete this attachment?')) return

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, { method: 'DELETE' })
      if (res.ok) {
        loadAttachments()
        loadActivities()
      }
    } catch (error) {
      console.error('Error deleting attachment:', error)
    }
  }

  const handleUpdateCustomer = async (updates: Partial<Customer>) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        setShowEditDialog(false)
        loadCustomer()
        loadActivities()
      }
    } catch (error) {
      console.error('Error updating customer:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!customer) {
    return <div className="text-center py-12">Customer not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{customer.name_en}</h1>
          {customer.name_jp && <p className="text-muted-foreground">{customer.name_jp}</p>}
        </div>
        <Button variant="outline" onClick={() => setShowEditDialog(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Deal Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{customer.deal_stage}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Deal Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(customer.deal_value_usd, 'USD')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Probability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{customer.deal_probability}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{customer.priority || '-'}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company Site</label>
                <p>{customer.company_site || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">AWS Tier</label>
                <p>{customer.tier || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">PIC</label>
                <p>{customer.pic || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Alphaus Rep</label>
                <p>{customer.alphaus_rep || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Note</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Write a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button onClick={handleAddNote}>
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {notes.map(note => (
              <Card key={note.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{note.user_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(note.created_at)}
                        </span>
                        {note.edited > 0 && (
                          <span className="text-xs text-muted-foreground">(edited)</span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{note.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Attachment Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newAttachment.title}
                    onChange={(e) => setNewAttachment({ ...newAttachment, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Storage Type</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newAttachment.storage_type}
                    onChange={(e) => setNewAttachment({ ...newAttachment, storage_type: e.target.value })}
                  >
                    {Object.keys(STORAGE_ICONS).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">URL *</label>
                <input
                  type="url"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newAttachment.url}
                  onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newAttachment.description}
                  onChange={(e) => setNewAttachment({ ...newAttachment, description: e.target.value })}
                />
              </div>
              <Button onClick={handleAddAttachment}>
                <Plus className="h-4 w-4 mr-2" />
                Add Attachment
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {attachments.map(attachment => (
              <Card key={attachment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{STORAGE_ICONS[attachment.storage_type] || '📎'}</span>
                        <div>
                          <h4 className="font-medium">{attachment.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {attachment.storage_type} • {formatDateTime(attachment.created_at)}
                          </p>
                        </div>
                      </div>
                      {attachment.description && (
                        <p className="text-sm text-muted-foreground mb-2">{attachment.description}</p>
                      )}
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open Link
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="space-y-2">
            {activities.map(activity => (
              <Card key={activity.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{activity.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(activity.created_at)}
                        </span>
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
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={{
              ...customer,
              priority: customer.priority ?? undefined,
              name_jp: customer.name_jp ?? undefined,
              company_site: customer.company_site ?? undefined,
              tier: customer.tier ?? undefined,
              cloud_usage: customer.cloud_usage ?? undefined,
              ripple_customer: customer.ripple_customer ?? undefined,
              archera_customer: customer.archera_customer ?? undefined,
              pic: customer.pic ?? undefined,
              exec: customer.exec ?? undefined,
              alphaus_rep: customer.alphaus_rep ?? undefined,
              alphaus_exec: customer.alphaus_exec ?? undefined,
            }}
            onSubmit={handleUpdateCustomer}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

