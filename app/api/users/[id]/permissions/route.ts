import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { PERMISSIONS } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Get target user's role
    const { data: userRoleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', params.id)
      .maybeSingle()

    const targetRole = userRoleData?.role || null

    // Build permission breakdown
    const permissions: Record<string, any> = {}

    Object.entries(PERMISSIONS).forEach(([resource, resourcePerms]) => {
      permissions[resource] = {}
      Object.entries(resourcePerms).forEach(([action, allowedRoles]) => {
        const hasPermission = targetRole && (allowedRoles as readonly string[]).includes(targetRole)
        permissions[resource][action] = {
          allowed: hasPermission,
          roles: allowedRoles,
        }
      })
    })

    return new NextResponse(
      JSON.stringify({
        userId: params.id,
        role: targetRole,
        permissions,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/users/[id]/permissions GET:', error)
    return new NextResponse(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

