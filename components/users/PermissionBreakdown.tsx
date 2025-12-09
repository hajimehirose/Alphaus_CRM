'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X } from 'lucide-react'
import { PERMISSIONS, USER_ROLES, type UserRole } from '@/lib/constants'

interface PermissionBreakdownProps {
  role: UserRole | null
}

export default function PermissionBreakdown({ role }: PermissionBreakdownProps) {
  if (!role) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No role assigned. User has no permissions.</p>
        </CardContent>
      </Card>
    )
  }

  const getPermissionStatus = (resource: string, action: string): boolean => {
    const resourcePerms = PERMISSIONS[resource as keyof typeof PERMISSIONS]
    if (!resourcePerms) return false

    const allowedRoles = resourcePerms[action as keyof typeof resourcePerms]
    if (!allowedRoles) return false

    return Array.isArray(allowedRoles) && (allowedRoles as readonly UserRole[]).includes(role)
  }

  const formatResourceName = (resource: string): string => {
    return resource.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatActionName = (action: string): string => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions for {role}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(PERMISSIONS).map(([resource, resourcePerms]) => (
          <div key={resource} className="space-y-2">
            <h4 className="font-medium text-sm">{formatResourceName(resource)}</h4>
            <div className="space-y-1 pl-4">
              {Object.keys(resourcePerms).map(action => {
                const hasPermission = getPermissionStatus(resource, action)
                return (
                  <div key={action} className="flex items-center gap-2 text-sm">
                    {hasPermission ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-gray-400" />
                    )}
                    <span className={hasPermission ? 'text-foreground' : 'text-muted-foreground'}>
                      {formatActionName(action)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

