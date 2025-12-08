import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
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

    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ attachments: attachments || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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

    const body = await request.json()
    const { title, description, url, storage_type } = body

    if (!title || !url || !storage_type) {
      return NextResponse.json({ error: 'title, url, and storage_type are required' }, { status: 400 })
    }

    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'

    const { data: attachment, error } = await supabase
      .from('attachments')
      .insert({
        customer_id: parseInt(params.id),
        user_id: user.id,
        user_email: user.email || '',
        user_name: userName,
        title,
        description: description || null,
        url,
        storage_type,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await logActivity({
      customerId: parseInt(params.id),
      userId: user.id,
      userEmail: user.email || '',
      userName,
      userRole: role,
      action: 'created',
      entityType: 'attachment',
      entityId: attachment.id,
      metadata: { title, storage_type },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

