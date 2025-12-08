import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-log'

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

    // Get existing attachment to check ownership
    const { data: existingAttachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (fetchError || !existingAttachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Only the attachment owner can delete
    if (existingAttachment.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const role = await getUserRole(user.id)
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'

    // Log activity
    await logActivity({
      customerId: existingAttachment.customer_id,
      userId: user.id,
      userEmail: user.email || '',
      userName,
      userRole: role,
      action: 'deleted',
      entityType: 'attachment',
      entityId: parseInt(params.id),
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

