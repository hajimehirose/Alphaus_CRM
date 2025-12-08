import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email?.split('@')[0],
      role: roleData?.role || null,
      roleData,
    })
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Please configure Supabase environment variables in Vercel project settings'
      },
      { status: 500 }
    )
  }
}

