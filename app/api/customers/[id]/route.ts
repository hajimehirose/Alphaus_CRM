import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { STAGE_PROBABILITIES } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'

export async function GET(
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
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 403 })
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Sales can only view their own customers
    if (role === 'Sales' && customer.alphaus_rep !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    if (!role || !['Admin', 'Manager', 'Sales'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get old customer data for activity log
    const { data: oldCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (fetchError || !oldCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Sales can only update their own customers
    if (role === 'Sales' && oldCustomer.alphaus_rep !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const updateData: any = { ...body }

    // Auto-update probability if stage changes
    if (body.deal_stage && body.deal_stage !== oldCustomer.deal_stage) {
      updateData.deal_probability = STAGE_PROBABILITIES[body.deal_stage] || 10
      updateData.stage_updated_at = new Date().toISOString()
    }

    updateData.updated_at = new Date().toISOString()

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity for changed fields
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'
    
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'updated_at' && oldCustomer[key as keyof typeof oldCustomer] !== value) {
        await logActivity({
          customerId: parseInt(params.id),
          userId: user.id,
          userEmail: user.email || '',
          userName,
          userRole: role,
          action: 'updated',
          entityType: 'customer',
          entityId: parseInt(params.id),
          fieldName: key,
          oldValue: String(oldCustomer[key as keyof typeof oldCustomer] || ''),
          newValue: String(value || ''),
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
        })
      }
    }

    return NextResponse.json({ customer })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole(user.id)
    if (!role || !['Admin', 'Manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await logActivity({
      customerId: parseInt(params.id),
      userId: user.id,
      userEmail: user.email || '',
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
      userRole: role,
      action: 'deleted',
      entityType: 'customer',
      entityId: parseInt(params.id),
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

