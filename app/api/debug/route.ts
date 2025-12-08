import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        user: null,
        authError: authError?.message 
      }, { status: 401 })
    }

    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // Get total customer count (no filters)
    const { count: totalCustomers, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })

    // Get customers without any filters
    const { data: allCustomers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(5)

    // Check if Sales role filter would apply
    let salesFilteredCount = null
    if (roleData?.role === 'Sales') {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('alphaus_rep', user.email)
      salesFilteredCount = count
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
      },
      role: roleData?.role || null,
      roleError: roleError?.message || null,
      customerStats: {
        total: totalCustomers || 0,
        countError: countError?.message || null,
        sampleCount: allCustomers?.length || 0,
        sampleCustomers: allCustomers?.map(c => ({
          id: c.id,
          name_en: c.name_en,
          alphaus_rep: c.alphaus_rep,
        })) || [],
        salesFilteredCount: salesFilteredCount,
      },
      customersError: customersError?.message || null,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Internal server error',
      stack: error.stack,
    }, { status: 500 })
  }
}

