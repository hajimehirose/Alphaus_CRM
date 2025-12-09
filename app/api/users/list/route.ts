import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Simplified endpoint for mention dropdowns - returns all users with minimal data
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = await createServiceClient()
    const { data: authUsersData, error: usersError } = await serviceClient.auth.admin.listUsers()

    if (usersError) {
      return NextResponse.json({ 
        error: 'Failed to fetch users', 
        details: usersError.message 
      }, { status: 500 })
    }

    const authUsers = authUsersData?.users || []

    const users = authUsers.map(authUser => ({
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
      avatar: authUser.user_metadata?.avatar_url || null,
    }))

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('Error in /api/users/list GET:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

