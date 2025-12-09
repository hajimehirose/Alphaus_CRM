import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(
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

    const body = await request.json()
    const { role: newRole } = body

    if (!['Admin', 'Manager', 'Sales', 'Viewer'].includes(newRole)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Safety check: Cannot change own role
    if (params.id === user.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Cannot change your own role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const serviceClient = await createServiceClient()

    // Get old role data first
    const { data: oldRoleData } = await serviceClient
      .from('user_roles')
      .select('*')
      .eq('user_id', params.id)
      .maybeSingle()

    // Safety check: Cannot remove last Admin
    if (newRole !== 'Admin') {
      const { data: allRoles } = await serviceClient
        .from('user_roles')
        .select('role')
      
      const adminCount = allRoles?.filter(r => r.role === 'Admin').length || 0
      const isCurrentlyAdmin = oldRoleData?.role === 'Admin'
      
      if (isCurrentlyAdmin && adminCount <= 1) {
        return new NextResponse(
          JSON.stringify({ error: 'Cannot remove the last Admin. Please assign another Admin first.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get user email for the role assignment
    const { data: authUser } = await serviceClient.auth.admin.getUserById(params.id)
    const userEmail = authUser.user?.email || oldRoleData?.user_email || ''

    const { data: updatedRole, error } = await serviceClient
      .from('user_roles')
      .upsert({
        user_id: params.id,
        user_email: userEmail,
        role: newRole,
        assigned_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'

    // Log activity
    await logActivity({
      userId: user.id,
      userEmail: user.email || '',
      userName,
      userRole: role,
      action: 'updated',
      entityType: 'user_role',
      entityId: updatedRole.id,
      fieldName: 'role',
      oldValue: oldRoleData?.role || 'none',
      newValue: newRole,
      metadata: {
        target_user_id: params.id,
        target_user_email: userEmail,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return new NextResponse(
      JSON.stringify({ role: updatedRole }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/users/[id]/role PUT:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(
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

    // Safety check: Cannot remove own role
    if (params.id === user.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Cannot remove your own role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const serviceClient = await createServiceClient()

    // Get role data before deleting
    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('*')
      .eq('user_id', params.id)
      .maybeSingle()

    // Safety check: Cannot remove last Admin
    if (roleData?.role === 'Admin') {
      const { data: allRoles } = await serviceClient
        .from('user_roles')
        .select('role')
      
      const adminCount = allRoles?.filter(r => r.role === 'Admin').length || 0
      
      if (adminCount <= 1) {
        return new NextResponse(
          JSON.stringify({ error: 'Cannot remove the last Admin. Please assign another Admin first.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const { error } = await serviceClient
      .from('user_roles')
      .delete()
      .eq('user_id', params.id)

    if (error) {
      return new NextResponse(
        JSON.stringify({ error: error.message }),
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
      action: 'deleted',
      entityType: 'user_role',
      entityId: roleData?.id || null,
      metadata: {
        target_user_id: params.id,
        target_user_email: roleData?.user_email || '',
        removed_role: roleData?.role || '',
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return new NextResponse(
      JSON.stringify({ success: true, message: 'Role removed successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/users/[id]/role DELETE:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
