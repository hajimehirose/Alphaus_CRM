import { createServiceClient } from './supabase/server'

export async function logActivity(data: {
  customerId?: number
  userId: string
  userEmail: string
  userName: string
  userRole: string | null
  action: string
  entityType: string
  entityId?: number
  fieldName?: string
  oldValue?: string | null
  newValue?: string | null
  metadata?: any
  ipAddress?: string
}) {
  const supabase = await createServiceClient()

  const { error } = await supabase.from('activity_logs').insert({
    customer_id: data.customerId || null,
    user_id: data.userId,
    user_email: data.userEmail,
    user_name: data.userName,
    user_role: data.userRole,
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId || null,
    field_name: data.fieldName || null,
    old_value: data.oldValue || null,
    new_value: data.newValue || null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    ip_address: data.ipAddress || null,
  })

  if (error) {
    console.error('Error logging activity:', error)
  }
}

