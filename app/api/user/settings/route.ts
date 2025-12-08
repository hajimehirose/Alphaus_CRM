import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert array to object
    const settingsObj: Record<string, any> = {}
    settings?.forEach(setting => {
      try {
        settingsObj[setting.setting_key] = JSON.parse(setting.setting_value)
      } catch {
        settingsObj[setting.setting_key] = setting.setting_value
      }
    })

    return NextResponse.json({ settings: settingsObj })
  } catch (error: any) {
    console.error('Error in /api/user/settings GET:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 })
    }

    // Convert value to JSON string if it's an object
    const settingValue = typeof value === 'string' ? value : JSON.stringify(value)

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        user_email: user.email || '',
        setting_key: key,
        setting_value: settingValue,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,setting_key',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, setting: data })
  } catch (error: any) {
    console.error('Error in /api/user/settings POST:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user.id)
      .eq('setting_key', key)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in /api/user/settings DELETE:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

