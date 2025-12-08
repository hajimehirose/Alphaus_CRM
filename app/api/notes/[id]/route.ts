import { createClient } from '@/lib/supabase/server'
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

    const body = await request.json()
    const { content } = body

    // Get existing note to check ownership
    const { data: existingNote } = await supabase
      .from('notes')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Only the note owner can edit
    if (existingNote.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: note, error } = await supabase
      .from('notes')
      .update({
        content,
        edited: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const role = await getUserRole(user.id)
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'

    // Log activity
    await logActivity({
      customerId: existingNote.customer_id,
      userId: user.id,
      userEmail: user.email || '',
      userName,
      userRole: role,
      action: 'updated',
      entityType: 'note',
      entityId: note.id,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ note })
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

    // Get existing note to check ownership
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (fetchError || !existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Only the note owner can delete
    if (existingNote.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const role = await getUserRole(user.id)
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'

    // Log activity
    await logActivity({
      customerId: existingNote.customer_id,
      userId: user.id,
      userEmail: user.email || '',
      userName,
      userRole: role,
      action: 'deleted',
      entityType: 'note',
      entityId: parseInt(params.id),
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

