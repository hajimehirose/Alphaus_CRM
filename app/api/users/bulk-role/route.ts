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
    const { userIds, role: newRole, action } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'User IDs array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!USER_ROLES.includes(newRole) && action !== 'remove') {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const serviceClient = await createServiceClient()

    // Safety check: Cannot change own role
    if (userIds.includes(user.id) && action !== 'remove') {
      return new NextResponse(
        JSON.stringify({ error: 'Cannot change your own role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Safety check: Cannot remove last Admin if removing roles
    if (action === 'remove') {
      const { data: allRoles } = await serviceClient
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
      
      const removingAdmins = allRoles?.filter(r => r.role === 'Admin') || []
      const totalAdminCount = (await serviceClient
        .from('user_roles')
        .select('role', { count: 'exact', head: true })
        .eq('role', 'Admin')).count || 0

      if (removingAdmins.length > 0 && totalAdminCount <= removingAdmins.length) {
        return new NextResponse(
          JSON.stringify({ error: 'Cannot remove all Admins. At least one Admin must remain.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    }

    for (const userId of userIds) {
      try {
        if (action === 'remove') {
          // Remove role
          const { error } = await serviceClient
            .from('user_roles')
            .delete()
            .eq('user_id', userId)

          if (error) {
            results.failed++
            results.errors.push({ userId, error: error.message })
            continue
          }
        } else {
          // Assign or update role
          const { data: authUser } = await serviceClient.auth.admin.getUserById(userId)
          const userEmail = authUser.user?.email || ''

          const { error } = await serviceClient
            .from('user_roles')
            .upsert({
              user_id: userId,
              user_email: userEmail,
              role: newRole,
              assigned_by: user.id,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id',
            })

          if (error) {
            results.failed++
            results.errors.push({ userId, error: error.message })
            continue
          }
        }

        results.success++

        // Log activity for each user
        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'
        await logActivity({
          userId: user.id,
          userEmail: user.email || '',
          userName,
          userRole: role,
          action: action === 'remove' ? 'deleted' : 'updated',
          entityType: 'user_role',
          metadata: {
            target_user_id: userId,
            action: action === 'remove' ? 'removed' : 'assigned',
            role: action === 'remove' ? null : newRole,
          },
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
        })
      } catch (error: any) {
        results.failed++
        results.errors.push({ userId, error: error.message })
      }
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        results,
        message: `${results.success} user(s) processed successfully${results.failed > 0 ? `, ${results.failed} failed` : ''}`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/users/bulk-role POST:', error)
    return new NextResponse(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack?.substring(0, 200),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

