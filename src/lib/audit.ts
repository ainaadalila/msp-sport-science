import { supabase } from './supabase'

export async function logAction(
  userId: string,
  action: string,
  targetTable?: string,
  targetId?: string,
  ipAddress?: string,
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    target_table: targetTable ?? null,
    target_id: targetId ?? null,
    ip_address: ipAddress ?? null,
  })
}
