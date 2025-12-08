import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-log'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole(user.id)
    if (!role || role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { role: newRole } = body

    if (!['Admin', 'Manager', 'Sales', 'Viewer'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get old role data
    const serviceClient = await createServiceClient()
    const { data: oldRoleData } = await serviceClient
      .from('user_roles')
      .select('*')
      .eq('user_id', params.id)
      .single()

    const { data: updatedRole, error } = await serviceClient
      .from('user_roles')
      .upsert({
        user_id: params.id,
        role: newRole,
        assigned_by: user.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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
        target_user_email: oldRoleData?.user_email || params.id,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ role: updatedRole })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

