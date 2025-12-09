// Field mapping utilities for CSV import

export type DatabaseField = {
  key: string
  label: string
  required: boolean
  type: 'text' | 'number' | 'dropdown' | 'url'
  options?: string[]
}

export const DATABASE_FIELDS: DatabaseField[] = [
  { key: 'name_en', label: 'English Name', required: true, type: 'text' },
  { key: 'name_jp', label: 'Japanese Name', required: false, type: 'text' },
  { key: 'company_site', label: 'Company Site', required: false, type: 'url' },
  { key: 'tier', label: 'AWS Tier', required: false, type: 'dropdown', options: ['Premier', 'Advanced', 'Selected', '-'] },
  { key: 'cloud_usage', label: 'Cloud Usage', required: false, type: 'text' },
  { key: 'priority', label: 'Priority', required: false, type: 'dropdown', options: ['High', 'Mid', 'Low'] },
  { key: 'ripple_customer', label: 'Ripple Customer', required: false, type: 'dropdown', options: ['✓', '-'] },
  { key: 'archera_customer', label: 'Archera Customer', required: false, type: 'dropdown', options: ['✓', '-'] },
  { key: 'pic', label: 'PIC', required: false, type: 'text' },
  { key: 'exec', label: 'Exec', required: false, type: 'text' },
  { key: 'alphaus_rep', label: 'Alphaus Rep', required: false, type: 'text' },
  { key: 'alphaus_exec', label: 'Alphaus Exec', required: false, type: 'text' },
  { key: 'deal_stage', label: 'Deal Stage', required: false, type: 'dropdown', options: ['Lead', 'Qualified', 'Meeting Scheduled', 'Demo Completed', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'] },
  { key: 'deal_value_usd', label: 'Deal Value USD', required: false, type: 'number' },
  { key: 'deal_value_jpy', label: 'Deal Value JPY', required: false, type: 'number' },
]

export type FieldMapping = {
  csvColumn: string
  databaseField: string | null
}

// Auto-detect field mappings based on column names
export function autoDetectMappings(csvHeaders: string[]): Record<string, string> {
  const mappings: Record<string, string> = {}
  
  csvHeaders.forEach(csvHeader => {
    const normalized = csvHeader.toLowerCase().trim()
    
    // Try to match with database fields
    for (const field of DATABASE_FIELDS) {
      const fieldLower = field.label.toLowerCase()
      const keyLower = field.key.toLowerCase()
      
      // Exact match
      if (normalized === keyLower || normalized === fieldLower) {
        mappings[csvHeader] = field.key
        return
      }
      
      // Partial match
      if (normalized.includes(keyLower) || normalized.includes(fieldLower)) {
        mappings[csvHeader] = field.key
        return
      }
    }
    
    // Common aliases
    const aliases: Record<string, string> = {
      'name': 'name_en',
      'company name': 'name_en',
      'english name': 'name_en',
      'japanese name': 'name_jp',
      'website': 'company_site',
      'url': 'company_site',
      'aws tier': 'tier',
      'stage': 'deal_stage',
      'value': 'deal_value_usd',
      'deal value': 'deal_value_usd',
    }
    
    if (aliases[normalized]) {
      mappings[csvHeader] = aliases[normalized]
    }
  })
  
  return mappings
}

// Validate mapped data
export type ValidationError = {
  row: number
  field: string
  message: string
  level: 'error' | 'warning'
}

export function validateRow(row: any, mapping: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = []
  
  // Check required fields
  for (const field of DATABASE_FIELDS) {
    if (!field.required) continue
    
    const csvColumn = Object.keys(mapping).find(col => mapping[col] === field.key)
    if (!csvColumn || !row[csvColumn]?.trim()) {
      errors.push({
        row: row.__rowIndex || 0,
        field: field.key,
        message: `${field.label} is required`,
        level: 'error',
      })
    }
  }
  
  // Validate URLs
  const urlFields = DATABASE_FIELDS.filter(f => f.type === 'url')
  for (const field of urlFields) {
    const csvColumn = Object.keys(mapping).find(col => mapping[col] === field.key)
    if (csvColumn && row[csvColumn]) {
      try {
        new URL(row[csvColumn])
      } catch {
        errors.push({
          row: row.__rowIndex || 0,
          field: field.key,
          message: `${field.label} must be a valid URL`,
          level: 'warning',
        })
      }
    }
  }
  
  // Validate numbers
  const numberFields = DATABASE_FIELDS.filter(f => f.type === 'number')
  for (const field of numberFields) {
    const csvColumn = Object.keys(mapping).find(col => mapping[col] === field.key)
    if (csvColumn && row[csvColumn] && isNaN(parseFloat(row[csvColumn]))) {
      errors.push({
        row: row.__rowIndex || 0,
        field: field.key,
        message: `${field.label} must be a number`,
        level: 'warning',
      })
    }
  }

  // Validate dropdown values
  const dropdownFields = DATABASE_FIELDS.filter(f => f.type === 'dropdown' && f.options)
  for (const field of dropdownFields) {
    const csvColumn = Object.keys(mapping).find(col => mapping[col] === field.key)
    if (csvColumn && row[csvColumn]) {
      const value = String(row[csvColumn]).trim()
      if (value && field.options && !field.options.includes(value)) {
        errors.push({
          row: row.__rowIndex || 0,
          field: field.key,
          message: `${field.label} must be one of: ${field.options.join(', ')}`,
          level: 'warning',
        })
      }
    }
  }

  // Validate deal_stage against DEAL_STAGES
  const dealStageColumn = Object.keys(mapping).find(col => mapping[col] === 'deal_stage')
  if (dealStageColumn && row[dealStageColumn]) {
    const dealStage = String(row[dealStageColumn]).trim()
    const validStages = ['Lead', 'Qualified', 'Meeting Scheduled', 'Demo Completed', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost']
    if (dealStage && !validStages.includes(dealStage)) {
      errors.push({
        row: row.__rowIndex || 0,
        field: 'deal_stage',
        message: `Deal Stage must be one of: ${validStages.join(', ')}`,
        level: 'warning',
      })
    }
  }
  
  return errors
}

