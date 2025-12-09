import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole(user.id)
    if (!role || !['Admin', 'Manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const serviceClient = await createServiceClient()
    const filePath = `imports/${Date.now()}_${file.name}`

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('imports')
      .upload(filePath, file, {
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Create import session
    const sessionId = `session_${Date.now()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { error: sessionError } = await serviceClient
      .from('import_sessions')
      .insert({
        id: sessionId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        supabase_file_path: filePath,
        expires_at: expiresAt.toISOString(),
      })

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    return NextResponse.json({ sessionId, filePath })
  } catch (error: any) {
    console.error('Error in /api/import/upload POST:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.message?.includes('Missing') ? 'Please configure Supabase environment variables in Vercel project settings' : undefined
      },
      { status: 500 }
    )
  }
}

