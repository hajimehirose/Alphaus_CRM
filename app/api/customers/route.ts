import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { STAGE_PROBABILITIES } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'

// Force dynamic rendering to prevent static optimization issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    let supabase
    try {
      supabase = await createClient()
    } catch (clientError: any) {
      console.error('Failed to create Supabase client:', clientError)
      return NextResponse.json({ 
        error: 'Configuration error',
        message: clientError.message || 'Failed to initialize database connection. Please check environment variables.',
        details: 'Check Vercel environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY'
      }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let role
    try {
      role = await getUserRole(user.id)
    } catch (roleError: any) {
      console.error('Failed to get user role:', roleError)
      return NextResponse.json({ 
        error: 'Database error',
        message: 'Failed to retrieve user role. Please check database connection.',
        details: roleError.message
      }, { status: 500 })
    }

    if (!role) {
      return NextResponse.json({ 
        error: 'Role not found',
        message: 'You do not have a role assigned. Please contact an administrator to assign you a role in the user_roles table.',
        userId: user.id,
        userEmail: user.email,
      }, { status: 403 })
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
      console.error('Supabase query error:', error)
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }, { status: 500 })
    }

    // Log info for debugging
    if (role === 'Sales') {
      console.log(`Sales user ${user.email} found ${customers?.length || 0} customers`)
    }

    return NextResponse.json({ 
      customers: customers || [],
      count: customers?.length || 0,
      role: role,
      filters: {
        search,
        priority,
        stage,
        salesFilter: role === 'Sales' ? user.email : null,
      },
    })
  } catch (error: any) {
    console.error('Error in /api/customers GET:', error)
    console.error('Error stack:', error.stack)
    
    // Ensure we always return JSON, never HTML
    const errorMessage = error.message || 'Internal server error'
    const errorDetails = error.message?.includes('Missing') 
      ? 'Please configure Supabase environment variables in Vercel project settings'
      : error.stack?.substring(0, 200)
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        type: 'api_error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
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
  } catch (error: any) {
    console.error('Error in /api/customers POST:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.message?.includes('Missing') ? 'Please configure Supabase environment variables in Vercel project settings' : undefined
      },
      { status: 500 }
    )
  }
}

