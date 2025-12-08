import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
// Note: PapaParse needs to be handled client-side or via dynamic import
// For now, we'll use a simple CSV parser
import { STAGE_PROBABILITIES } from '@/lib/constants'

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

    const body = await request.json()
    const { sessionId, duplicateHandling = 'skip', dryRun = false } = body

    // Get import session
    const serviceClient = await createServiceClient()
    const { data: session, error: sessionError } = await serviceClient
      .from('import_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Import session not found' }, { status: 404 })
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('imports')
      .download(session.supabase_file_path)

    if (downloadError) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Parse CSV (simple parser)
    const text = await fileData.text()
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: any = {}
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || ''
      })
      return obj
    })
    const results = {
      success: 0,
      skipped: 0,
      updated: 0,
      errors: [] as any[],
    }

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      try {
        // Map CSV columns to database fields
        const customerData: any = {
          name_en: row.name_en || row['Name (EN)'] || row.name || '',
        }

        if (!customerData.name_en) {
          results.errors.push({ row: i + 1, error: 'name_en is required' })
          continue
        }

        // Map other fields
        customerData.name_jp = row.name_jp || row['Name (JP)'] || null
        customerData.company_site = row.company_site || row['Company Site'] || null
        customerData.tier = row.tier || row['AWS Tier'] || null
        customerData.priority = row.priority || null
        customerData.deal_stage = row.deal_stage || row['Deal Stage'] || 'Lead'
        customerData.deal_probability = STAGE_PROBABILITIES[customerData.deal_stage] || 10
        customerData.deal_value_usd = parseFloat(row.deal_value_usd || row['Deal Value USD'] || '0') || 0

        // Check for duplicate
        const { data: existing } = await serviceClient
          .from('customers')
          .select('id')
          .eq('name_en', customerData.name_en)
          .maybeSingle()

        if (existing) {
          if (duplicateHandling === 'skip') {
            results.skipped++
            continue
          } else if (duplicateHandling === 'update' && !dryRun) {
            await serviceClient
              .from('customers')
              .update(customerData)
              .eq('id', existing.id)
            results.updated++
          }
        } else if (!dryRun) {
          await serviceClient
            .from('customers')
            .insert(customerData)
          results.success++
        } else {
          results.success++ // Count in dry run
        }
      } catch (error: any) {
        results.errors.push({ row: i + 1, error: error.message })
      }
    }

    // Update session
    await serviceClient
      .from('import_sessions')
      .update({
        status: dryRun ? 'previewed' : 'completed',
        total_rows: rows.length,
        results_json: JSON.stringify(results),
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

