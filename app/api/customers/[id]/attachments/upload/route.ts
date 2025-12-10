import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds the maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `customer-${params.id}/${timestamp}_${sanitizedFilename}`

    // Upload to Supabase Storage
    const serviceClient = await createServiceClient()
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('customer-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload file to storage',
        details: uploadError.message 
      }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = serviceClient.storage
      .from('customer-attachments')
      .getPublicUrl(filePath)

    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'

    // Create attachment record
    const { data: attachment, error: dbError } = await serviceClient
      .from('attachments')
      .insert({
        customer_id: parseInt(params.id),
        user_id: user.id,
        user_email: user.email || '',
        user_name: userName,
        title: file.name,
        description: null,
        url: urlData.publicUrl,
        storage_type: 'Supabase Storage',
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath,
        is_file_upload: true,
      })
      .select()
      .single()

    if (dbError) {
      // Try to clean up uploaded file if DB insert fails
      await serviceClient.storage
        .from('customer-attachments')
        .remove([filePath])
      
      return NextResponse.json({ 
        error: 'Failed to create attachment record',
        details: dbError.message 
      }, { status: 500 })
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
      metadata: { 
        filename: file.name, 
        file_size: file.size,
        file_type: file.type,
        is_file_upload: true,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (error: any) {
    console.error('Error uploading attachment:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

