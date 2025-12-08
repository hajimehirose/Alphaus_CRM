export const DEAL_STAGES = [
  'Lead',
  'Qualified',
  'Meeting Scheduled',
  'Demo Completed',
  'Proposal Sent',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const

export const STAGE_PROBABILITIES: Record<string, number> = {
  'Lead': 10,
  'Qualified': 25,
  'Meeting Scheduled': 40,
  'Demo Completed': 50,
  'Proposal Sent': 60,
  'Negotiation': 75,
  'Closed Won': 100,
  'Closed Lost': 0,
}

export const USER_ROLES = ['Admin', 'Manager', 'Sales', 'Viewer'] as const

export type UserRole = typeof USER_ROLES[number]

export const PERMISSIONS = {
  customer: {
    create: ['Admin', 'Manager', 'Sales'],
    read: ['Admin', 'Manager', 'Sales', 'Viewer'],
    update: ['Admin', 'Manager', 'Sales'],
    delete: ['Admin', 'Manager'],
  },
  export: {
    all: ['Admin', 'Manager'],
    own: ['Sales'],
  },
  import: {
    customers: ['Admin', 'Manager'],
  },
  users: {
    read: ['Admin'],
    update_role: ['Admin'],
  },
  activity_log: {
    read_all: ['Admin'],
    read_team: ['Manager'],
    read_own: ['Sales'],
  },
} as const

export const DEFAULT_COLUMNS = [
  { field: 'name_en', label: 'English Name', visible: true, locked: true, type: 'text', required: true },
  { field: 'name_jp', label: 'Japanese Name', visible: true, locked: false, type: 'text', required: false },
  { field: 'company_site', label: 'Company Site', visible: true, locked: false, type: 'url', required: false },
  { field: 'tier', label: 'AWS Tier', visible: true, locked: false, type: 'dropdown', options: ['Premier', 'Advanced', 'Selected', '-'], required: false },
  { field: 'cloud_usage', label: 'Cloud Usage', visible: true, locked: false, type: 'text', required: false },
  { field: 'priority', label: 'Priority', visible: true, locked: false, type: 'dropdown', options: ['High', 'Mid', 'Low'], required: false },
  { field: 'ripple_customer', label: 'Ripple Customer', visible: true, locked: false, type: 'dropdown', options: ['✓', '-'], required: false },
  { field: 'archera_customer', label: 'Archera Customer', visible: true, locked: false, type: 'dropdown', options: ['✓', '-'], required: false },
  { field: 'pic', label: 'PIC', visible: true, locked: false, type: 'text', required: false },
  { field: 'exec', label: 'Exec', visible: true, locked: false, type: 'text', required: false },
  { field: 'alphaus_rep', label: 'Alphaus Rep', visible: true, locked: false, type: 'text', required: false },
  { field: 'alphaus_exec', label: 'Alphaus Exec', visible: true, locked: false, type: 'text', required: false },
  { field: 'deal_stage', label: 'Deal Stage', visible: true, locked: false, type: 'dropdown', options: DEAL_STAGES, required: false },
  { field: 'deal_value_usd', label: 'Deal Value USD', visible: true, locked: false, type: 'number', required: false },
  { field: 'deal_value_jpy', label: 'Deal Value JPY', visible: true, locked: false, type: 'number', required: false },
  { field: 'deal_probability', label: 'Deal Probability', visible: true, locked: false, type: 'number', required: false },
] as const

