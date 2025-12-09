import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-log'
import { USER_ROLES } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
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

    const body = await request.json()
    const { email, role: newRole } = body

    if (!email || !newRole) {
      return new NextResponse(
        JSON.stringify({ error: 'Email and role are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    if (!USER_ROLES.includes(newRole)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const serviceClient = await createServiceClient()

    // Check if user exists in auth.users
    const { data: authUsersData, error: usersError } = await serviceClient.auth.admin.listUsers()
    if (usersError) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to check user existence', details: usersError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const authUsers = authUsersData?.users || []
    const existingUser = authUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!existingUser) {
      // User doesn't exist yet - they need to log in first
      // We could create a pending_invites table, but for simplicity,
      // require user to log in first via Google OAuth
      return new NextResponse(
        JSON.stringify({
          error: 'User not found',
          message: 'User must log in via Google OAuth first.',
          email,
          instructions: [
            '1. Ask the user to visit the application and log in with Google',
            '2. Once they have logged in, their account will be created',
            '3. Then you can assign a role to them',
            'Alternatively, if the user already has an account, verify the email address is correct.',
          ],
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userId = existingUser.id

    // Check if role already assigned
    const { data: existingRole } = await serviceClient
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingRole) {
      return new NextResponse(
        JSON.stringify({
          error: 'Role already assigned',
          message: `User already has role: ${existingRole.role}`,
          currentRole: existingRole.role,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Assign role
    const { data: roleData, error: roleError } = await serviceClient
      .from('user_roles')
      .insert({
        user_id: userId,
        user_email: email,
        role: newRole,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (roleError) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to assign role', details: roleError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Log activity
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'
    await logActivity({
      userId: user.id,
      userEmail: user.email || '',
      userName,
      userRole: role,
      action: 'created',
      entityType: 'user_role',
      entityId: roleData.id,
      metadata: {
        target_user_id: userId,
        target_user_email: email,
        role: newRole,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: `Role ${newRole} assigned to ${email}`,
        role: roleData,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/users/invite POST:', error)
    return new NextResponse(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack?.substring(0, 200),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

