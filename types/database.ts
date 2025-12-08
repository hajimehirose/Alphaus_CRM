export type Customer = {
  id: number
  name_en: string
  name_jp: string | null
  company_site: string | null
  tier: string | null
  cloud_usage: string | null
  priority: string | null
  ripple_customer: string | null
  archera_customer: string | null
  pic: string | null
  exec: string | null
  alphaus_rep: string | null
  alphaus_exec: string | null
  deal_stage: string
  deal_value_usd: number
  deal_value_jpy: number
  deal_probability: number
  created_at: string
  updated_at: string
  stage_updated_at: string
}

export type UserRole = {
  id: number
  user_id: string
  user_email: string
  role: 'Admin' | 'Manager' | 'Sales' | 'Viewer'
  assigned_by: string | null
  assigned_at: string
  updated_at: string
}

export type Note = {
  id: number
  customer_id: number
  user_id: string
  user_email: string
  user_name: string
  content: string
  mentions: string | null
  created_at: string
  updated_at: string
  edited: number
}

export type Attachment = {
  id: number
  customer_id: number
  user_id: string
  user_email: string
  user_name: string
  title: string
  description: string | null
  url: string
  storage_type: string
  created_at: string
}

export type ActivityLog = {
  id: number
  customer_id: number | null
  user_id: string
  user_email: string
  user_name: string
  user_role: string | null
  action: string
  entity_type: string
  entity_id: number | null
  field_name: string | null
  old_value: string | null
  new_value: string | null
  metadata: string | null
  ip_address: string | null
  created_at: string
}

export type Setting = {
  key: string
  value: string
  updated_at: string
}

export type ImportSession = {
  id: string
  file_name: string
  file_size: number
  file_type: string
  supabase_file_path: string
  total_rows: number
  status: string
  duplicate_handling: string | null
  dry_run: number
  results_json: string | null
  created_at: string
  completed_at: string | null
  expires_at: string
}

