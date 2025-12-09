import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create CSV template with headers and example data
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

    // Add example row
    const exampleRow = [
      'Acme Corporation',
      'エイム株式会社',
      'https://acme.com',
      'Premier',
      'AWS, GCP',
      'High',
      '✓',
      '-',
      'John Doe',
      'Jane Smith',
      'sales@example.com',
      'exec@example.com',
      'Qualified',
      '100000',
      '15000000',
    ]

    // Add comments row
    const comments = [
      '# Required: name_en',
      '# Optional: all other fields',
      '# Tier options: Premier, Advanced, Selected, -',
      '# Priority options: High, Mid, Low',
      '# Deal Stage options: Lead, Qualified, Meeting Scheduled, Demo Completed, Proposal Sent, Negotiation, Closed Won, Closed Lost',
      '# Ripple/Archera Customer: ✓ or -',
    ]

    const csvContent = [
      headers.join(','),
      exampleRow.map(v => `"${v}"`).join(','),
      comments.join(','),
    ].join('\n')

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

