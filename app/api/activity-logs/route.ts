import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const entityType = searchParams.get('entity_type')
    const customerId = searchParams.get('customer_id')
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })

    // Role-based filtering
    if (role === 'Sales') {
      query = query.eq('user_id', user.id)
    } else if (role === 'Manager') {
      // Manager sees team activities - filter by user_role to exclude Admin-only activities
      // This is a simplified approach; you might want to implement team membership
      query = query.neq('user_role', 'Admin')
    }
    // Admin sees everything (no filter)

    // Additional filters
    if (action) {
      query = query.eq('action', action)
    }
    if (entityType) {
      query = query.eq('entity_type', entityType)
    }
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: activities, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      activities: activities || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error('Error in /api/activity-logs GET:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.message?.includes('Missing') ? 'Please configure Supabase environment variables in Vercel project settings' : undefined
      },
      { status: 500 }
    )
  }
}

