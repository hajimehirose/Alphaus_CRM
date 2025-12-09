'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Edit, Trash2, Plus, ExternalLink, Save, X, Loader2 } from 'lucide-react'
import type { Customer, Note, Attachment, ActivityLog } from '@/types/database'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import CustomerForm from '@/components/customers/CustomerForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'

const STORAGE_ICONS: Record<string, string> = {
  'Google Drive': '📁',
  'Dropbox': '📦',
  'OneDrive': '☁️',
  'Box': '📋',
  'Other': '📎',
}

// Helper function to validate Google Drive URL
const isValidGoogleDriveUrl = (url: string): boolean => {
  return /^https?:\/\/(drive\.google\.com|docs\.google\.com)/.test(url)
}

// Helper function to derive title from Google Drive URL if needed
const deriveTitleFromUrl = (url: string): string => {
  if (!isValidGoogleDriveUrl(url)) return ''
  // Try to extract filename from URL if possible
  const match = url.match(/[\/\?]([^\/\?]+)$/)
  return match ? decodeURIComponent(match[1]) : 'Google Drive Link'
}

interface User {
  id: string
  email: string
  name: string
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState<Partial<Customer>>({})
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editedNoteContent, setEditedNoteContent] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  const [newAttachment, setNewAttachment] = useState({
    title: '',
    description: '',
    url: '',
    storage_type: 'Google Drive',
  })

  // Load current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setCurrentUser({ id: data.id, email: data.email })
        }
      })
      .catch(console.error)
  }, [])

  // Load users for mentions
  useEffect(() => {
    fetch('/api/users/list')
      .then(res => res.json())
      .then(data => {
        if (data.users) {
          setUsers(data.users)
        }
      })
      .catch(console.error)
  }, [])

  // Handle URL hash for tabs
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash && ['overview', 'notes', 'attachments', 'activities'].includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  useEffect(() => {
    loadCustomer()
    loadNotes()
    loadAttachments()
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    window.location.hash = value
  }

  const loadCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to load customer')
      }
      const data = await res.json()
      setCustomer(data.customer)
    } catch (error: any) {
      console.error('Error loading customer:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load customer',
      })
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

  // Parse mentions from note content
  const parseMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1]
      const user = users.find(u => 
        u.name.toLowerCase() === mentionedName.toLowerCase() ||
        u.email.split('@')[0].toLowerCase() === mentionedName.toLowerCase()
      )
      if (user) {
        mentions.push(user.id)
      }
    }
    return mentions
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast({
        variant: 'warning',
        title: 'Invalid Input',
        description: 'Note cannot be empty',
      })
      return
    }

    try {
      const mentions = parseMentions(newNote)
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote, mentions }),
      })
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Note added successfully',
        })
        setNewNote('')
        loadNotes()
        loadActivities()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add note')
      }
    } catch (error: any) {
      console.error('Error adding note:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add note',
      })
    }
  }

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id)
    setEditedNoteContent(note.content)
  }

  const handleCancelEditNote = () => {
    setEditingNoteId(null)
    setEditedNoteContent('')
  }

  const handleSaveNote = async (noteId: number) => {
    if (!editedNoteContent.trim()) {
      toast({
        variant: 'warning',
        title: 'Invalid Input',
        description: 'Note cannot be empty',
      })
      return
    }

    try {
      const mentions = parseMentions(editedNoteContent)
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedNoteContent, mentions }),
      })
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Note updated successfully',
        })
        setEditingNoteId(null)
        setEditedNoteContent('')
        loadNotes()
        loadActivities()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update note')
      }
    } catch (error: any) {
      console.error('Error updating note:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update note',
      })
    }
  }

  // Render note content with highlighted mentions
  const renderNoteContent = (content: string) => {
    if (!content) return ''
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.substring(1)
        const user = users.find(u => 
          u.name.toLowerCase() === username.toLowerCase() ||
          u.email.split('@')[0].toLowerCase() === username.toLowerCase()
        )
        if (user) {
          return (
            <span key={index} className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded font-medium">
              {part}
            </span>
          )
        }
      }
      return <span key={index}>{part}</span>
    })
  }

  const handleAddAttachment = async () => {
    if (!newAttachment.title || !newAttachment.url) {
      toast({
        variant: 'warning',
        title: 'Invalid Input',
        description: 'Title and URL are required',
      })
      return
    }

    if (!isValidGoogleDriveUrl(newAttachment.url)) {
      toast({
        variant: 'warning',
        title: 'Invalid URL',
        description: 'Please enter a valid Google Drive URL',
      })
      return
    }

    try {
      const res = await fetch(`/api/customers/${customerId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAttachment),
      })
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Attachment added successfully',
        })
        setNewAttachment({ title: '', description: '', url: '', storage_type: 'Google Drive' })
        loadAttachments()
        loadActivities()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add attachment')
      }
    } catch (error: any) {
      console.error('Error adding attachment:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add attachment',
      })
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Delete this note?')) return

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Note deleted successfully',
        })
        loadNotes()
        loadActivities()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete note')
      }
    } catch (error: any) {
      console.error('Error deleting note:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete note',
      })
    }
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('Delete this attachment?')) return

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Attachment deleted successfully',
        })
        loadAttachments()
        loadActivities()
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete attachment')
      }
    } catch (error: any) {
      console.error('Error deleting attachment:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete attachment',
      })
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
        toast({
          variant: 'success',
          title: 'Success',
          description: 'Customer updated successfully',
        })
        setShowEditDialog(false)
        setIsEditing(false)
        setEditedFields({})
        loadCustomer()
        loadActivities()
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

  const handleInlineSave = async () => {
    if (Object.keys(editedFields).length === 0) {
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      await handleUpdateCustomer(editedFields)
    } finally {
      setSaving(false)
    }
  }

  const handleInlineCancel = () => {
    setIsEditing(false)
    setEditedFields({})
  }

  const handleFieldChange = (field: keyof Customer, value: any) => {
    setEditedFields(prev => ({ ...prev, [field]: value }))
  }

  // Calculate quick stats
  const quickStats = useMemo(() => {
    if (!customer) return null
    const totalInteractions = notes.length + activities.length
    const createdDate = new Date(customer.created_at)
    const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      totalInteractions,
      daysSinceCreation,
      weightedValue: customer.deal_value_usd * (customer.deal_probability / 100),
    }
  }, [customer, notes.length, activities.length])

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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            {isEditing ? (
              <div className="flex gap-2">
                <Button onClick={handleInlineSave} disabled={saving} size="sm">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleInlineCancel} disabled={saving} size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

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
                {quickStats && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Weighted: {formatCurrency(quickStats.weightedValue, 'USD')}
                  </p>
                )}
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
            {quickStats && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Interactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{quickStats.totalInteractions}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Relationship</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{quickStats.daysSinceCreation}</p>
                    <p className="text-xs text-muted-foreground mt-1">days</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company Site</label>
                {isEditing ? (
                  <Input
                    type="text"
                    className="w-full mt-1"
                    value={editedFields.company_site !== undefined ? (editedFields.company_site || '') : (customer.company_site || '')}
                    onChange={(e) => handleFieldChange('company_site', e.target.value)}
                  />
                ) : (
                  <p>{customer.company_site || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">AWS Tier</label>
                {isEditing ? (
                  <Input
                    type="text"
                    className="w-full mt-1"
                    value={editedFields.tier !== undefined ? (editedFields.tier || '') : (customer.tier || '')}
                    onChange={(e) => handleFieldChange('tier', e.target.value)}
                  />
                ) : (
                  <p>{customer.tier || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">PIC</label>
                {isEditing ? (
                  <Input
                    type="text"
                    className="w-full mt-1"
                    value={editedFields.pic !== undefined ? (editedFields.pic || '') : (customer.pic || '')}
                    onChange={(e) => handleFieldChange('pic', e.target.value)}
                  />
                ) : (
                  <p>{customer.pic || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Alphaus Rep</label>
                {isEditing ? (
                  <Input
                    type="text"
                    className="w-full mt-1"
                    value={editedFields.alphaus_rep !== undefined ? (editedFields.alphaus_rep || '') : (customer.alphaus_rep || '')}
                    onChange={(e) => handleFieldChange('alphaus_rep', e.target.value)}
                  />
                ) : (
                  <p>{customer.alphaus_rep || '-'}</p>
                )}
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
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a note... Use @ to mention team members"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                          <span className="text-xs text-muted-foreground">
                            (edited {formatDateTime(note.updated_at)})
                          </span>
                        )}
                      </div>
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedNoteContent}
                            onChange={(e) => setEditedNoteContent(e.target.value)}
                            placeholder="Edit note..."
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveNote(note.id)}>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCancelEditNote}>
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{renderNoteContent(note.content)}</p>
                      )}
                    </div>
                    {editingNoteId !== note.id && (
                      <div className="flex gap-1">
                        {currentUser?.id === note.user_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNote(note)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {(currentUser?.id === note.user_id || currentUser?.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Google Drive Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  className="w-full mt-1"
                  value={newAttachment.title}
                  onChange={(e) => setNewAttachment({ ...newAttachment, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Google Drive URL *</label>
                <Input
                  type="url"
                  className="w-full mt-1"
                  value={newAttachment.url}
                  onChange={(e) => {
                    const url = e.target.value
                    setNewAttachment({ 
                      ...newAttachment, 
                      url,
                      storage_type: isValidGoogleDriveUrl(url) ? 'Google Drive' : 'Other'
                    })
                    // Auto-fill title if empty and valid Google Drive URL
                    if (!newAttachment.title && isValidGoogleDriveUrl(url)) {
                      const derivedTitle = deriveTitleFromUrl(url)
                      if (derivedTitle) {
                        setNewAttachment(prev => ({ ...prev, title: derivedTitle }))
                      }
                    }
                  }}
                  placeholder="https://drive.google.com/..."
                />
                {newAttachment.url && !isValidGoogleDriveUrl(newAttachment.url) && (
                  <p className="text-sm text-destructive mt-1">
                    Please enter a valid Google Drive URL
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  value={newAttachment.description}
                  onChange={(e) => setNewAttachment({ ...newAttachment, description: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleAddAttachment}
                disabled={!newAttachment.title || !newAttachment.url || !isValidGoogleDriveUrl(newAttachment.url)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Attachment
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {attachments.map(attachment => {
              const icon = STORAGE_ICONS[attachment.storage_type] || '📎'
              const displayName = attachment.title
              
              return (
                <Card key={attachment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{icon}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{displayName}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <span>{attachment.user_name}</span>
                              <span>•</span>
                              <span>{formatDateTime(attachment.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        {attachment.description && (
                          <p className="text-sm text-muted-foreground mb-2">{attachment.description}</p>
                        )}
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open in Google Drive
                        </a>
                      </div>
                      {(currentUser?.id === attachment.user_id || currentUser?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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

