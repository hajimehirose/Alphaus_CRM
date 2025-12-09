import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { PERMISSIONS, USER_ROLES } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const role = await getUserRole(user.id)
    if (!role || role !== 'Admin') {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build permission matrix
    const matrix: Record<string, Record<string, boolean>> = {}

    Object.entries(PERMISSIONS).forEach(([resource, resourcePerms]) => {
      if (!matrix[resource]) {
        matrix[resource] = {}
      }

      Object.entries(resourcePerms).forEach(([action, allowedRoles]) => {
        const key = `${resource}.${action}`
        matrix[resource][action] = {}
        
        USER_ROLES.forEach(roleName => {
          matrix[resource][action][roleName] = (allowedRoles as readonly string[]).includes(roleName)
        })
      })
    })

    return new NextResponse(
      JSON.stringify({
        matrix,
        roles: USER_ROLES,
        permissions: PERMISSIONS,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/users/permissions-matrix GET:', error)
    return new NextResponse(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

