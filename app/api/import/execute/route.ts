import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { STAGE_PROBABILITIES, DEAL_STAGES } from '@/lib/constants'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BATCH_SIZE = 50 // Process 50 records at a time

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const role = await getUserRole(user.id)
    if (!role || !['Admin', 'Manager'].includes(role)) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { sessionId, duplicateHandling = 'skip', dryRun = false, mappings = {} } = body

    if (!mappings || Object.keys(mappings).length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Field mappings are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get import session
    const serviceClient = await createServiceClient()
    const { data: session, error: sessionError } = await serviceClient
      .from('import_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return new NextResponse(
        JSON.stringify({ error: 'Import session not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('imports')
      .download(session.supabase_file_path)

    if (downloadError) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to download file' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse file based on type
    let rows: any[] = []
    const fileName = session.file_name.toLowerCase()
    
    if (fileName.endsWith('.csv')) {
      // Parse CSV using PapaParse
      const text = await fileData.text()
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      })
      rows = parsed.data as any[]
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel using xlsx
      const arrayBuffer = await fileData.arrayBuffer()
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]
      
      if (jsonData.length === 0) {
        return new NextResponse(
          JSON.stringify({ error: 'Excel file is empty' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      const headers = (jsonData[0] || []).map((h: any) => String(h || '').trim())
      rows = jsonData.slice(1)
        .filter(row => row.some(cell => cell && String(cell).trim()))
        .map(row => {
          const obj: any = {}
          headers.forEach((header, idx) => {
            obj[header] = row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : ''
          })
          return obj
        })
    } else {
      return new NextResponse(
        JSON.stringify({ error: 'Unsupported file type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'File contains no data rows' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const results = {
      success: 0,
      skipped: 0,
      updated: 0,
      errors: [] as any[],
    }

    // Find the mapped name_en column
    const nameEnColumn = Object.keys(mappings).find(col => mappings[col] === 'name_en')
    if (!nameEnColumn) {
      return new NextResponse(
        JSON.stringify({ error: 'name_en field must be mapped' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Process rows in batches
    const batches = []
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE))
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]
      
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i]
        const rowIndex = batchIdx * BATCH_SIZE + i + 1
        
        try {
          // Map CSV columns to database fields using mappings
          const customerData: any = {}
          
          Object.entries(mappings).forEach(([csvColumn, dbField]) => {
            if (dbField && row[csvColumn] !== undefined && row[csvColumn] !== null && String(row[csvColumn]).trim() !== '') {
              let value: any = String(row[csvColumn]).trim()
              
              // Type conversion based on field type
              if (dbField === 'deal_value_usd' || dbField === 'deal_value_jpy') {
                const num = parseFloat(value)
                customerData[dbField] = isNaN(num) ? 0 : num
              } else if (dbField === 'deal_probability') {
                const num = parseInt(value)
                customerData[dbField] = isNaN(num) ? 10 : num
              } else {
                customerData[dbField] = value
              }
            }
          })

          // Validate required field
          if (!customerData.name_en || !customerData.name_en.trim()) {
            results.errors.push({ row: rowIndex, error: 'name_en is required' })
            continue
          }

          // Set defaults
          if (!customerData.deal_stage) {
            customerData.deal_stage = 'Lead'
          }
          if (!customerData.deal_probability) {
            customerData.deal_probability = STAGE_PROBABILITIES[customerData.deal_stage] || 10
          }
          if (customerData.deal_value_usd === undefined) {
            customerData.deal_value_usd = 0
          }
          if (customerData.deal_value_jpy === undefined) {
            customerData.deal_value_jpy = 0
          }

          // Validate enum values
          if (customerData.tier && !['Premier', 'Advanced', 'Selected', '-'].includes(customerData.tier)) {
            customerData.tier = null
          }
          if (customerData.priority && !['High', 'Mid', 'Low'].includes(customerData.priority)) {
            customerData.priority = null
          }
          if (customerData.deal_stage && !DEAL_STAGES.includes(customerData.deal_stage)) {
            customerData.deal_stage = 'Lead'
          }

          // Check for duplicate (case-insensitive)
          const { data: existing } = await serviceClient
            .from('customers')
            .select('id, name_en')
            .ilike('name_en', customerData.name_en.trim())
            .maybeSingle()

          if (existing) {
            if (duplicateHandling === 'skip') {
              results.skipped++
              continue
            } else if (duplicateHandling === 'update') {
              if (!dryRun) {
                const { error: updateError } = await serviceClient
                  .from('customers')
                  .update({
                    ...customerData,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id)
                
                if (updateError) {
                  results.errors.push({ row: rowIndex, error: `Update failed: ${updateError.message}` })
                } else {
                  results.updated++
                }
              } else {
                results.updated++
              }
            } else if (duplicateHandling === 'create') {
              // Create new even if duplicate
              if (!dryRun) {
                const { error: insertError } = await serviceClient
                  .from('customers')
                  .insert(customerData)
                
                if (insertError) {
                  results.errors.push({ row: rowIndex, error: `Insert failed: ${insertError.message}` })
                } else {
                  results.success++
                }
              } else {
                results.success++
              }
            }
          } else {
            // No duplicate, create new
            if (!dryRun) {
              const { error: insertError } = await serviceClient
                .from('customers')
                .insert(customerData)
              
              if (insertError) {
                results.errors.push({ row: rowIndex, error: `Insert failed: ${insertError.message}` })
              } else {
                results.success++
              }
            } else {
              results.success++
            }
          }
        } catch (error: any) {
          results.errors.push({ row: rowIndex, error: error.message || 'Unknown error' })
        }
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

    return new NextResponse(
      JSON.stringify(results),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/import/execute:', error)
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
