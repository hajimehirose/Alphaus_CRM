import { PERMISSIONS, type UserRole } from './constants'
import { createClient } from './supabase/server'

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.role as UserRole
}

export async function hasPermission(
  userId: string,
  action: string,
  resource: keyof typeof PERMISSIONS
): Promise<boolean> {
  const role = await getUserRole(userId)
  
  if (!role) {
    return false
  }

  const resourcePermissions = PERMISSIONS[resource]
  if (!resourcePermissions) {
    return false
  }

  const allowedActions = resourcePermissions[action as keyof typeof resourcePermissions]
  if (!allowedActions) {
    return false
  }

  return Array.isArray(allowedActions) && (allowedActions as readonly UserRole[]).includes(role)
}

export function canPerformAction(role: UserRole | null, action: string, resource: keyof typeof PERMISSIONS): boolean {
  if (!role) {
    return false
  }

  const resourcePermissions = PERMISSIONS[resource]
  if (!resourcePermissions) {
    return false
  }

  const allowedActions = resourcePermissions[action as keyof typeof resourcePermissions]
  if (!allowedActions) {
    return false
  }

  return Array.isArray(allowedActions) && (allowedActions as readonly UserRole[]).includes(role)
}

