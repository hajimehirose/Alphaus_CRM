import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/permissions'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Check which imported rows match existing customers in the database
 */
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
    const { rows, mappings } = body

    if (!rows || !Array.isArray(rows) || !mappings) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request. rows and mappings are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Find the mapped name_en column
    const nameEnColumn = Object.keys(mappings).find(col => mappings[col] === 'name_en')
    if (!nameEnColumn) {
      return new NextResponse(
        JSON.stringify({ error: 'name_en field must be mapped to check duplicates.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract all name_en values from import rows
    const importedNames = rows
      .map((row: any, idx: number) => ({
        rowIndex: idx,
        nameEn: String(row[nameEnColumn] || '').trim().toLowerCase(),
        originalValue: String(row[nameEnColumn] || '').trim(),
      }))
      .filter(item => item.nameEn) // Filter out empty names

    if (importedNames.length === 0) {
      return new NextResponse(
        JSON.stringify({
          duplicates: [],
          existingCustomers: {},
          summary: {
            total: rows.length,
            withNames: 0,
            duplicates: 0,
            unique: 0,
          },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Query database for existing customers (case-insensitive)
    const serviceClient = await createServiceClient()
    const nameEnValues = importedNames.map(item => item.nameEn)
    
    // Since Supabase doesn't support case-insensitive ILIKE in IN clause easily,
    // we'll fetch all customers and do comparison client-side for the names we're checking
    // Alternatively, we could use LOWER() in SQL
    const { data: existingCustomers, error: queryError } = await serviceClient
      .from('customers')
      .select('id, name_en')
      .not('name_en', 'is', null)

    if (queryError) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to check duplicates', details: queryError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a map of lowercase names to existing customer data
    const existingMap = new Map<string, any>()
    existingCustomers?.forEach(customer => {
      if (customer.name_en) {
        const lowerName = customer.name_en.trim().toLowerCase()
        if (!existingMap.has(lowerName)) {
          existingMap.set(lowerName, customer)
        }
      }
    })

    // Find duplicates
    const duplicates: Array<{
      rowIndex: number
      importedName: string
      existingCustomer: {
        id: number
        name_en: string
      }
    }> = []

    const existingCustomersMap: Record<number, any> = {}

    importedNames.forEach(({ rowIndex, nameEn, originalValue }) => {
      const existing = existingMap.get(nameEn)
      if (existing) {
        duplicates.push({
          rowIndex,
          importedName: originalValue,
          existingCustomer: {
            id: existing.id,
            name_en: existing.name_en,
          },
        })
        existingCustomersMap[rowIndex] = existing
      }
    })

    const duplicateRowIndices = new Set(duplicates.map(d => d.rowIndex))

    return new NextResponse(
      JSON.stringify({
        duplicates,
        existingCustomers: existingCustomersMap,
        duplicateRowIndices: Array.from(duplicateRowIndices),
        summary: {
          total: rows.length,
          withNames: importedNames.length,
          duplicates: duplicates.length,
          unique: importedNames.length - duplicates.length,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error in /api/import/check-duplicates POST:', error)
    return new NextResponse(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack?.substring(0, 200),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

