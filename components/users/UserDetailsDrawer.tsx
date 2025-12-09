'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PermissionBreakdown from './PermissionBreakdown'
import PermissionMatrix from './PermissionMatrix'
import UserStatusBadge from './UserStatusBadge'
import { formatDateTime } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface UserDetailsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    email: string
    name: string
    role: string | null
    status: 'active' | 'pending' | 'no_role'
    lastLogin: string | null
    createdAt: string
    roleData?: {
      assigned_at: string
      assigned_by: string | null
      updated_at: string
    } | null
  } | null
}

export default function UserDetailsDrawer({ open, onOpenChange, user }: UserDetailsDrawerProps) {
  const [permissions, setPermissions] = useState<any>(null)
  const [loadingPermissions, setLoadingPermissions] = useState(false)

  useEffect(() => {
    if (open && user) {
      loadPermissions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user])

  const loadPermissions = async () => {
    if (!user) return

    setLoadingPermissions(true)
    try {
      const res = await fetch(`/api/users/${user.id}/permissions`)
      if (res.ok) {
        const data = await res.json()
        setPermissions(data)
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoadingPermissions(false)
    }
  }

  if (!user) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-3">
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>
            View user information, permissions, and role details
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* User Info */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3 pb-3 border-b">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-12 w-12 rounded-full"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</label>
                <p className="text-sm font-medium mt-1">{user.role || 'No role assigned'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                <div className="mt-1">
                  <UserStatusBadge status={user.status} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Login</label>
                <p className="text-sm mt-1">{user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Created</label>
                <p className="text-sm mt-1">{formatDateTime(user.createdAt)}</p>
              </div>
            </div>
            {user.roleData && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role Assigned</label>
                  <p className="text-sm mt-1">{formatDateTime(user.roleData.assigned_at)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Updated</label>
                  <p className="text-sm mt-1">{formatDateTime(user.roleData.updated_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Permissions */}
          <Tabs defaultValue="breakdown" className="w-full">
            <TabsList>
              <TabsTrigger value="breakdown">Permission Breakdown</TabsTrigger>
              <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
            </TabsList>
            <TabsContent value="breakdown" className="mt-4">
              {loadingPermissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <PermissionBreakdown role={user.role as any} />
              )}
            </TabsContent>
            <TabsContent value="matrix" className="mt-4">
              <PermissionMatrix />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

