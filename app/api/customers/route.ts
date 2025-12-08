import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { STAGE_PROBABILITIES } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const priority = searchParams.get('priority')
    const stage = searchParams.get('stage')

    let query = supabase
      .from('customers')
      .select('*')
      .order('updated_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`name_en.ilike.%${search}%,name_jp.ilike.%${search}%,company_site.ilike.%${search}%`)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (stage) {
      query = query.eq('deal_stage', stage)
    }

    // Sales role can only see their own customers (filtered by alphaus_rep)
    if (role === 'Sales') {
      query = query.eq('alphaus_rep', user.email)
    }

    const { data: customers, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ customers: customers || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()
    const { name_en, ...rest } = body

    if (!name_en) {
      return NextResponse.json({ error: 'name_en is required' }, { status: 400 })
    }

    const customerData = {
      name_en,
      ...rest,
      deal_stage: rest.deal_stage || 'Lead',
      deal_probability: STAGE_PROBABILITIES[rest.deal_stage || 'Lead'] || 10,
      deal_value_usd: rest.deal_value_usd || 0,
      deal_value_jpy: rest.deal_value_jpy || 0,
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await logActivity({
      customerId: customer.id,
      userId: user.id,
      userEmail: user.email || '',
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown',
      userRole: role,
      action: 'created',
      entityType: 'customer',
      entityId: customer.id,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

