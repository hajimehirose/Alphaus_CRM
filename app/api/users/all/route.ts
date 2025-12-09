import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'

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

    // Get all authenticated users
    const serviceClient = await createServiceClient()
    const { data: { users: authUsers }, error: usersError } = await serviceClient.auth.admin.listUsers()

    if (usersError) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to fetch users', details: usersError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all role assignments
    const { data: userRoles, error: rolesError } = await serviceClient
      .from('user_roles')
      .select('*')
      .order('user_email', { ascending: true })

    if (rolesError) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to fetch roles', details: rolesError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a map of user_id to role
    const roleMap = new Map<string, typeof userRoles[0]>()
    userRoles?.forEach(roleData => {
      roleMap.set(roleData.user_id, roleData)
    })

    // Merge authenticated users with roles
    const mergedUsers = authUsers.users.map(authUser => {
      const roleData = roleMap.get(authUser.id)
      return {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
        avatar: authUser.user_metadata?.avatar_url || null,
        lastLogin: authUser.last_sign_in_at || authUser.created_at,
        createdAt: authUser.created_at,
        emailConfirmed: authUser.email_confirmed_at !== null,
        role: roleData?.role || null,
        roleData: roleData || null,
        status: roleData ? 'active' : (authUser.email_confirmed_at ? 'pending' : 'no_role'),
      }
    })

    // Sort: users with roles first, then by email
    mergedUsers.sort((a, b) => {
      if (a.role && !b.role) return -1
      if (!a.role && b.role) return 1
      return a.email.localeCompare(b.email)
    })

    return new NextResponse(
      JSON.stringify({
        users: mergedUsers,
        stats: {
          total: mergedUsers.length,
          withRoles: mergedUsers.filter(u => u.role).length,
          withoutRoles: mergedUsers.filter(u => !u.role).length,
          active: mergedUsers.filter(u => u.status === 'active').length,
          pending: mergedUsers.filter(u => u.status === 'pending').length,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/users/all GET:', error)
    return new NextResponse(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack?.substring(0, 200),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

