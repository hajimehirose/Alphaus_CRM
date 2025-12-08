import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * One-time admin role assignment endpoint
 * This uses the service role key to bypass RLS
 * 
 * Usage: POST /api/admin/assign-role
 * Body: { email: "hajime.hirose@alphaus.cloud", role: "Admin" }
 */
export async function POST(request: Request) {
  try {
    // Only allow this in development or with proper authentication
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to add additional auth checks
      // For now, we'll allow it but log it
      console.warn('Admin role assignment called in production')
    }

    const body = await request.json()
    const { email, role = 'Admin' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Use service client to bypass RLS
    const serviceClient = await createServiceClient()

    // Find user by email from auth.users
    const { data: users, error: userError } = await serviceClient.auth.admin.listUsers()
    
    if (userError) {
      return NextResponse.json({ 
        error: 'Failed to fetch users',
        details: userError.message 
      }, { status: 500 })
    }

    const user = users.users.find(u => u.email === email)

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        email,
        suggestion: 'Make sure the user has logged in at least once with Google OAuth'
      }, { status: 404 })
    }

    // Insert or update role in user_roles table
    const { data: roleData, error: roleError } = await serviceClient
      .from('user_roles')
      .upsert({
        user_id: user.id,
        user_email: email,
        role: role,
        assigned_by: 'system',
        assigned_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (roleError) {
      return NextResponse.json({ 
        error: 'Failed to assign role',
        details: roleError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${role} role to ${email}`,
      user: {
        id: user.id,
        email: user.email,
      },
      role: roleData,
    })

  } catch (error: any) {
    console.error('Error in assign-role:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}

