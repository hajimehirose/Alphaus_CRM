'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Loader2, Plus, MoreVertical, Eye, Trash2, Users as UsersIcon } from 'lucide-react'
import { USER_ROLES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import AddUserDialog from '@/components/users/AddUserDialog'
import UserDetailsDrawer from '@/components/users/UserDetailsDrawer'
import UserStatusBadge from '@/components/users/UserStatusBadge'
import { formatDateTime } from '@/lib/utils'

type UserFilter = 'all' | 'with_roles' | 'without_roles'

interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  lastLogin: string | null
  createdAt: string
  emailConfirmed: boolean
  role: string | null
  roleData: {
    id: number
    assigned_at: string
    assigned_by: string | null
    updated_at: string
  } | null
  status: 'active' | 'pending' | 'no_role'
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<UserFilter>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    withRoles: 0,
    withoutRoles: 0,
    active: 0,
    pending: 0,
  })

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/users/all', {
        headers: {
          'Accept': 'application/json',
        }
      })
      
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await res.text()
        console.error('Non-JSON response:', text.substring(0, 200))
        throw new Error('Server returned HTML instead of JSON')
      }

      const data = await res.json()
      
      if (res.ok) {
        setUsers(data.users || [])
        setStats(data.stats || stats)
      } else if (res.status === 403) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to access this page',
        })
      } else {
        throw new Error(data.error || 'Failed to load users')
      }
    } catch (error: any) {
      console.error('Error loading users:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load users',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRoles(prev => new Set(prev).add(userId))
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: `User role updated to ${newRole}`,
        })
        loadUsers()
      } else {
        throw new Error(data.error || 'Failed to update role')
      }
    } catch (error: any) {
      console.error('Error updating role:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An error occurred while updating the role',
      })
    } finally {
      setUpdatingRoles(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleRemoveRole = async (userId: string) => {
    if (!confirm('Remove role from this user? They will lose all permissions.')) return

    setUpdatingRoles(prev => new Set(prev).add(userId))
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'User role removed',
        })
        loadUsers()
      } else {
        throw new Error(data.error || 'Failed to remove role')
      }
    } catch (error: any) {
      console.error('Error removing role:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An error occurred while removing the role',
      })
    } finally {
      setUpdatingRoles(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleBulkRoleChange = async (role: string) => {
    if (selectedUserIds.size === 0) return

    if (!confirm(`Assign role "${role}" to ${selectedUserIds.size} selected user(s)?`)) return

    try {
      const res = await fetch('/api/users/bulk-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          role,
          action: 'assign',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: data.message || `Role assigned to ${data.results.success} user(s)`,
        })
        setSelectedUserIds(new Set())
        loadUsers()
      } else {
        throw new Error(data.error || 'Failed to assign roles')
      }
    } catch (error: any) {
      console.error('Error in bulk role assignment:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to assign roles',
      })
    }
  }

  const handleBulkRemoveRoles = async () => {
    if (selectedUserIds.size === 0) return

    if (!confirm(`Remove roles from ${selectedUserIds.size} selected user(s)?`)) return

    try {
      const res = await fetch('/api/users/bulk-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          action: 'remove',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: data.message || `Roles removed from ${data.results.success} user(s)`,
        })
        setSelectedUserIds(new Set())
        loadUsers()
      } else {
        throw new Error(data.error || 'Failed to remove roles')
      }
    } catch (error: any) {
      console.error('Error in bulk role removal:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove roles',
      })
    }
  }

  const filteredUsers = useMemo(() => {
    let filtered = users

    // Apply filter
    if (filter === 'with_roles') {
      filtered = filtered.filter(u => u.role !== null)
    } else if (filter === 'without_roles') {
      filtered = filtered.filter(u => u.role === null)
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [users, filter, searchQuery])

  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set())
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUserIds(newSelected)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading users...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Total Users</div>
            <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">With Roles</div>
            <div className="text-xl md:text-2xl font-bold">{stats.withRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Without Roles</div>
            <div className="text-xl md:text-2xl font-bold">{stats.withoutRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Active</div>
            <div className="text-xl md:text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs md:text-sm text-muted-foreground mb-1">Pending</div>
            <div className="text-xl md:text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Users</CardTitle>
            <div className="flex items-center gap-2 flex-1 min-w-[300px] max-w-md">
              {/* Filter Tabs */}
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'with_roles' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('with_roles')}
                >
                  With Roles
                </Button>
                <Button
                  variant={filter === 'without_roles' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('without_roles')}
                >
                  Without Roles
                </Button>
              </div>
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUserIds.size > 0 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedUserIds.size} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Assign Role
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {USER_ROLES.map(role => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => handleBulkRoleChange(role)}
                      >
                        Assign {role}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleBulkRemoveRoles}
                      className="text-red-600"
                    >
                      Remove Roles
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserIds(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Table Header - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm text-muted-foreground">
              <div className="col-span-1">
                <Checkbox
                  checked={selectedUserIds.size > 0 && selectedUserIds.size === filteredUsers.length}
                  onCheckedChange={handleSelectAll}
                />
              </div>
              <div className="col-span-3">User</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Last Login</div>
              <div className="col-span-2">Actions</div>
            </div>

            {/* User Rows */}
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg hover:bg-gray-50 items-start md:items-center"
              >
                <div className="hidden md:block md:col-span-1">
                  <Checkbox
                    checked={selectedUserIds.has(user.id)}
                    onCheckedChange={() => handleSelectUser(user.id)}
                  />
                </div>
                <div className="col-span-1 md:col-span-3">
                  <div className="flex items-center gap-3">
                    <div className="md:hidden">
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={() => handleSelectUser(user.id)}
                      />
                    </div>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.name}</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground md:hidden">Role: </span>
                    {updatingRoles.has(user.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : user.role ? (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {USER_ROLES.map(role => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setShowAddDialog(true)
                        }}
                        className="w-full md:w-auto"
                      >
                        Assign Role
                      </Button>
                    )}
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground md:hidden">Status: </span>
                    <UserStatusBadge status={user.status} />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground md:hidden">Last Login: </span>
                    <p className="text-sm">
                      {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setShowDetailsDrawer(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {user.role && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveRole(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Role
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium mb-1">No users found</p>
                <p className="text-sm">
                  {filter !== 'all' || searchQuery ? (
                    <>
                      Try adjusting your filters or search query.
                      <br />
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setFilter('all')
                          setSearchQuery('')
                        }}
                      >
                        Clear filters
                      </Button>
                    </>
                  ) : (
                    <>
                      Get started by adding a new user.
                      <br />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowAddDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <AddUserDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadUsers}
      />

      {/* User Details Drawer */}
      {selectedUser && (
        <UserDetailsDrawer
          open={showDetailsDrawer}
          onOpenChange={setShowDetailsDrawer}
          user={selectedUser}
        />
      )}
    </div>
  )
}
