import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create CSV template with headers
    const headers = [
      'name_en',
      'name_jp',
      'company_site',
      'tier',
      'cloud_usage',
      'priority',
      'ripple_customer',
      'archera_customer',
      'pic',
      'exec',
      'alphaus_rep',
      'alphaus_exec',
      'deal_stage',
      'deal_value_usd',
      'deal_value_jpy',
    ]

    const csvContent = headers.join(',') + '\n'

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="customer-import-template.csv"',
      },
    })
  } catch (error: any) {
    console.error('Error generating template:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

