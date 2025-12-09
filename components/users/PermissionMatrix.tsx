'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X } from 'lucide-react'
import { PERMISSIONS, USER_ROLES } from '@/lib/constants'

export default function PermissionMatrix() {
  const getPermissionStatus = (resource: string, action: string, role: string): boolean => {
    const resourcePerms = PERMISSIONS[resource as keyof typeof PERMISSIONS]
    if (!resourcePerms) return false

    const allowedRoles = resourcePerms[action as keyof typeof resourcePerms]
    if (!allowedRoles) return false

    return Array.isArray(allowedRoles) && (allowedRoles as readonly string[]).includes(role)
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

  // Build matrix data
  const matrixRows: Array<{ resource: string; action: string }> = []
  Object.entries(PERMISSIONS).forEach(([resource, resourcePerms]) => {
    Object.keys(resourcePerms).forEach(action => {
      matrixRows.push({ resource, action })
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Resource / Action</th>
                {USER_ROLES.map(role => (
                  <th key={role} className="text-center p-2 font-medium min-w-[80px]">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.map(({ resource, action }, idx) => (
                <tr key={`${resource}-${action}`} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="p-2">
                    <div className="font-medium">{formatResourceName(resource)}</div>
                    <div className="text-xs text-muted-foreground">{formatActionName(action)}</div>
                  </td>
                  {USER_ROLES.map(role => {
                    const hasPermission = getPermissionStatus(resource, action, role)
                    return (
                      <td key={role} className="p-2 text-center">
                        {hasPermission ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

