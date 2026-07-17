import { supabase } from '../supabase';

export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject';

/**
 * Writes one row to audit_log. Called by every mutating function in every
 * treasury/dues/points hook — nothing that changes state skips this.
 * Never throws into the caller's flow: audit logging failing should not
 * block the actual action from completing, but IS logged to console so
 * a silent audit gap doesn't go unnoticed either.
 */
export async function logAudit(
  tenantId: string,
  tableName: string,
  recordId: string,
  action: AuditAction,
  actorId: string | undefined | null,
  changes?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      table_name: tableName,
      record_id: recordId,
      action,
      actor_id: actorId || null,
      changes: changes || null,
    });
    if (error) {
      console.error(`[audit] Failed to log ${action} on ${tableName}/${recordId}:`, error);
    }
  } catch (err) {
    console.error(`[audit] Exception logging ${action} on ${tableName}/${recordId}:`, err);
  }
}
