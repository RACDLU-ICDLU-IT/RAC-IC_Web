import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from './useTenant';
import { logAudit } from './useAuditLog';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecurrenceType = 'one_time' | 'daily' | 'monthly' | 'yearly' | 'custom' | 'special_assessment';
export type FundAccount = 'administrative' | 'project' | 'endowment';
export type LedgerStatus =
  | 'unpaid' | 'pending_verification' | 'paid' | 'overdue' | 'waived' | 'rejected' | 'overpaid';

export interface FeeTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string | null;
  amount: number;
  currency: string;

  recurrence_type: RecurrenceType;
  recurrence_interval: number;
  recurrence_day?: number | null;
  recurrence_month?: number | null;
  custom_dates?: string[] | null;

  due_date?: string | null;
  event_id?: string | null;

  applies_to: 'all' | 'specific';
  specific_member_ids?: string[];

  xp_reward: number;
  fp_reward: number;
  fund_account: FundAccount;
  allow_fp_payment: boolean;

  special_assessment_approved?: boolean;
  special_assessment_vote_id?: string | null;

  is_active: boolean;
  last_generated_period?: string | null;

  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type CreateTemplateInput = Omit<FeeTemplate, 'id' | 'created_at' | 'updated_at'>;

export interface LedgerEntry {
  id: string;
  member_id: string;
  template_id: string;
  label: string;
  category?: string | null;
  amount: number;
  currency: string;
  due_date: string;
  status: LedgerStatus;

  paid_at?: string;
  paid_amount?: number;

  bkash_number?: string | null;
  sender_bkash_number?: string | null;
  transaction_id?: string | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  rejection_reason?: string | null;

  fp_paid?: number;
  fp_paid_bdt_value?: number;

  overpaid_amount?: number | null;
  overpayment_resolution?: 'refund' | 'credit_future' | 'other' | null;
  overpayment_resolved_at?: string | null;
  overpayment_resolved_by?: string | null;
  overpayment_notes?: string | null;

  receipt_no?: string | null;
  rotary_year?: string | null;

  notes?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  created_at: string;

  users?: {
    id: string; name: string; email: string; photo?: string;
    role: string; status: string; joinDate?: string; tenant_id?: string;
  };
  fee_templates?: { name: string; type: string; recurrence_type?: string };
}

export interface DuesStats {
  totalCollected: number;
  totalOutstanding: number;
  totalWaived: number;
  totalCharged: number;
  overdueCount: number;
  paidThisMonth: number;
  unpaidThisMonth: number;
  collectionRate: number;
}

export interface LedgerFilters {
  memberId?: string;
  templateId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DuesSettings {
  club_prefix: string;
  default_bkash_number: string | null;
}

export function getRotaryYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 6) return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDues() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { user, profile } = useAuth();

  const requireAdmin = () => {
    if (!user || !profile || !['admin', 'master_admin'].includes(profile.role ?? '')) {
      throw new Error('Unauthorized');
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    addToast(err.message || 'An error occurred', 'error');
    throw err;
  };

  // ── Templates ──────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async (): Promise<FeeTemplate[]> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fee_templates')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });
      if (error) handleError(error);
      return (data as FeeTemplate[]) || [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const createTemplate = useCallback(async (data: CreateTemplateInput): Promise<FeeTemplate | null> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('fee_templates')
        .insert([{ ...data, id: crypto.randomUUID(), tenant_id: tenant.id, created_by: user?.id }])
        .select()
        .single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_templates', result.id, 'create', user?.id, data);
      addToast('Template created', 'success');
      return result as FeeTemplate;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const updateTemplate = useCallback(async (id: string, data: Partial<FeeTemplate>): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.from('fee_templates').update(data).eq('id', id).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_templates', id, 'update', user?.id, data);
      addToast('Template updated', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { count, error: countErr } = await supabase
        .from('fee_ledger').select('*', { count: 'exact', head: true })
        .eq('template_id', id).eq('tenant_id', tenant.id);
      if (countErr) handleError(countErr);
      if (count && count > 0) throw new Error('Template has existing ledger entries — cannot delete');

      const { error } = await supabase.from('fee_templates').delete().eq('id', id).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_templates', id, 'delete', user?.id);
      addToast('Template deleted', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const toggleTemplate = useCallback(async (id: string, isActive: boolean): Promise<void> => {
    return updateTemplate(id, { is_active: isActive });
  }, [updateTemplate]);

  // ── Generation ──────────────────────────────────────────────────────────────

  /** Manual "Generate Now" override — same dedupe as auto job (unique index). */
  const generateChargesForDate = useCallback(async (
    templateId: string, dueDate: string, overrideAmount?: number
  ): Promise<number> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_charges_for_date', {
        p_template_id: templateId,
        p_due_date: dueDate,
        p_override_amount: overrideAmount ?? null,
      });
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_ledger', templateId, 'create', user?.id, {
        action: 'manual_generation', due_date: dueDate, override_amount: overrideAmount, generated: data,
      });
      addToast(`Generated ${data} charge(s)`, 'success');
      return (data as number) || 0;
    } catch {
      return 0;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const runAutoGeneration = useCallback(async (): Promise<number> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('run_auto_generation', { p_tenant_id: tenant.id });
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_ledger', tenant.id, 'create', user?.id, { action: 'auto_generation', generated: data });
      addToast(`Auto-generated ${data} charge(s)`, 'success');
      return (data as number) || 0;
    } catch {
      return 0;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Ledger reads ────────────────────────────────────────────────────────────

  const fetchLedger = useCallback(async (filters?: LedgerFilters): Promise<LedgerEntry[]> => {
    requireAdmin();
    setLoading(true);
    try {
      let query = supabase.from('fee_ledger').select(`
        *,
        users!member_id(id,name,email,photo,role,status,"joinDate",tenant_id),
        fee_templates!template_id(name,recurrence_type)
      `).eq('tenant_id', tenant.id).order('due_date', { ascending: false }).range(0, 499);

      if (filters?.memberId) query = query.eq('member_id', filters.memberId);
      if (filters?.templateId) query = query.eq('template_id', filters.templateId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.dateFrom) query = query.gte('due_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('due_date', filters.dateTo);

      const { data, error } = await query;
      if (error) handleError(error);

      let results = (data as any[]) || [];
      results = results.filter((r) => !r.users || r.users.tenant_id === tenant.id);
      return results as LedgerEntry[];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const fetchMemberLedger = useCallback(async (memberId: string): Promise<LedgerEntry[]> => {
    const isAdmin = profile && ['admin', 'master_admin'].includes(profile.role ?? '');
    if (!user || (!isAdmin && user.id !== memberId)) throw new Error('Unauthorized');
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fee_ledger').select(`
        *,
        users!member_id(id,name,email,photo,role,status,"joinDate",tenant_id),
        fee_templates!template_id(name,recurrence_type)
      `).eq('member_id', memberId).eq('tenant_id', tenant.id).order('due_date', { ascending: false });
      if (error) handleError(error);
      let results = (data as any[]) || [];
      results = results.filter((r) => !r.users || r.users.tenant_id === tenant.id);
      return results as LedgerEntry[];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const fetchDuesStats = useCallback(async (): Promise<DuesStats> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: entries } = await supabase.from('fee_ledger').select('*').eq('tenant_id', tenant.id);
      const all: any[] = entries || [];

      let totalCollected = 0, totalOutstanding = 0, totalWaived = 0, totalCharged = 0;
      let overdueCount = 0, paidThisMonth = 0, unpaidThisMonth = 0;
      const now = new Date();
      const cm = now.getMonth(), cy = now.getFullYear();

      all.forEach((e) => {
        const due = new Date(e.due_date);
        const isCurrentMonth = due.getMonth() === cm && due.getFullYear() === cy;
        if (e.status === 'waived') {
          totalWaived += Number(e.amount);
        } else {
          totalCharged += Number(e.amount);
          if (e.status === 'paid' || e.status === 'overpaid') {
            totalCollected += Number(e.paid_amount || e.amount);
            if (e.paid_at) {
              const pd = new Date(e.paid_at);
              if (pd.getMonth() === cm && pd.getFullYear() === cy) paidThisMonth += Number(e.paid_amount || e.amount);
            }
          } else {
            totalOutstanding += Number(e.amount) - Number(e.paid_amount || 0);
            if (e.status === 'overdue') overdueCount++;
            if (isCurrentMonth) unpaidThisMonth += Number(e.amount) - Number(e.paid_amount || 0);
          }
        }
      });

      const collectionRate = (totalCharged - totalWaived) > 0 ? (totalCollected / (totalCharged - totalWaived)) * 100 : 0;
      return { totalCollected, totalOutstanding, totalWaived, totalCharged, overdueCount, paidThisMonth, unpaidThisMonth, collectionRate };
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const markOverdueFees = useCallback(async (): Promise<void> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.rpc('mark_overdue_fees', { p_tenant_id: tenant.id });
      if (error) throw error;
      if (data > 0) await logAudit(tenant.id, 'fee_ledger', tenant.id, 'update', user?.id, { action: 'mark_overdue', count: data });
    } catch (err) {
      console.error('mark_overdue_fees failed', err);
    }
  }, [user, tenant.id]);

  const flagOverpayments = useCallback(async (): Promise<void> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.rpc('flag_overpayments', { p_tenant_id: tenant.id });
      if (error) throw error;
      if (data > 0) await logAudit(tenant.id, 'fee_ledger', tenant.id, 'update', user?.id, { action: 'flag_overpayments', count: data });
    } catch (err) {
      console.error('flag_overpayments failed', err);
    }
  }, [user, tenant.id]);

  // ── Waive / bulk actions ────────────────────────────────────────────────────

  const markAsWaived = useCallback(async (ledgerId: string, notes?: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.from('fee_ledger')
        .update({ status: 'waived', notes: notes || null })
        .eq('id', ledgerId).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_ledger', ledgerId, 'update', user?.id, { action: 'waive', notes });
      addToast('Marked as waived', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const sendReminder = useCallback(async (ledgerId: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: ledger, error: fErr } = await supabase.from('fee_ledger').select('*').eq('id', ledgerId).eq('tenant_id', tenant.id).single();
      if (fErr) handleError(fErr);
      if (!ledger) return;

      await supabase.from('fee_ledger')
        .update({ reminder_count: ledger.reminder_count + 1, reminder_sent_at: new Date().toISOString() })
        .eq('id', ledgerId);

      await supabase.from('reminders').insert({
        id: crypto.randomUUID(), user_id: ledger.member_id,
        title: `Payment Reminder: ${ledger.label}`,
        message: `You have an outstanding fee of ${ledger.currency} ${ledger.amount} due on ${ledger.due_date}.`,
        type: 'fee_reminder', is_read: false,
        metadata: { ledger_id: ledger.id, amount: ledger.amount, due_date: ledger.due_date },
        tenant_id: tenant.id,
      });
      await logAudit(tenant.id, 'fee_ledger', ledgerId, 'update', user?.id, { action: 'reminder_sent' });
      addToast('Reminder sent', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const bulkSendReminders = useCallback(async (ledgerIds: string[]): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: ledgers, error } = await supabase.from('fee_ledger')
        .select('id, member_id, label, amount, currency, due_date, reminder_count')
        .in('id', ledgerIds).in('status', ['unpaid', 'overdue']).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      if (!ledgers?.length) { addToast('No selected entries are unpaid/overdue', 'info'); return; }

      const now = new Date().toISOString();
      const { error: updErr } = await supabase.from('fee_ledger').upsert(
        ledgers.map((l) => ({ id: l.id, reminder_count: l.reminder_count + 1, reminder_sent_at: now }))
      );
      if (updErr) handleError(updErr);

      const inserts = ledgers.map((l) => ({
        id: crypto.randomUUID(), user_id: l.member_id, title: `Payment Reminder: ${l.label}`,
        message: `You have an outstanding fee of ${l.currency} ${l.amount} due on ${l.due_date}.`,
        type: 'fee_reminder', is_read: false,
        metadata: { ledger_id: l.id, amount: l.amount, due_date: l.due_date }, tenant_id: tenant.id,
      }));
      const { error: insErr } = await supabase.from('reminders').insert(inserts);
      if (insErr) handleError(insErr);

      await logAudit(tenant.id, 'fee_ledger', tenant.id, 'update', user?.id, { action: 'bulk_reminders', count: ledgers.length });
      addToast(`Sent ${ledgers.length} reminders`, 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── bKash payment submission + verification ─────────────────────────────────

  const submitPayment = useCallback(async (
    entryId: string, transactionId: string, senderBkashNumber: string
  ): Promise<LedgerEntry | null> => {
    if (!user) { addToast('You must be signed in', 'error'); return null; }
    if (!transactionId.trim() || !senderBkashNumber.trim()) {
      addToast('Transaction ID and sender bKash number are required', 'error');
      return null;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fee_ledger')
        .update({
          status: 'pending_verification', transaction_id: transactionId.trim(),
          sender_bkash_number: senderBkashNumber.trim(), submitted_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', entryId).eq('member_id', user.id)
        .in('status', ['unpaid', 'overdue', 'rejected']).eq('tenant_id', tenant.id)
        .select().single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_ledger', entryId, 'update', user.id, { action: 'payment_submitted', transaction_id: transactionId });
      addToast('Payment submitted for verification', 'success');
      return data as LedgerEntry;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const verifyPayment = useCallback(async (entryId: string, clubPrefix: string): Promise<LedgerEntry | null> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_due_payment', {
        p_ledger_id: entryId, p_club_prefix: clubPrefix, p_verifier_id: user?.id,
      });
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_ledger', entryId, 'approve', user?.id, { action: 'payment_verified', club_prefix: clubPrefix });
      addToast('Payment verified', 'success');
      return data as LedgerEntry;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const rejectPayment = useCallback(async (entryId: string, reason: string): Promise<LedgerEntry | null> => {
    requireAdmin();
    if (!reason.trim()) { addToast('A rejection reason is required', 'error'); return null; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fee_ledger')
        .update({
          status: 'rejected', rejection_reason: reason.trim(),
          transaction_id: null, sender_bkash_number: null, submitted_at: null,
        })
        .eq('id', entryId).eq('tenant_id', tenant.id).select().single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_ledger', entryId, 'reject', user?.id, { action: 'payment_rejected', reason });
      addToast('Payment rejected', 'success');
      return data as LedgerEntry;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── FP payment (instant settle) ─────────────────────────────────────────────

  const payDueWithFp = useCallback(async (entryId: string, fpAmount: number): Promise<LedgerEntry | null> => {
    if (!user) { addToast('You must be signed in', 'error'); return null; }
    if (fpAmount <= 0) { addToast('FP amount must be positive', 'error'); return null; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('pay_due_with_fp', {
        p_ledger_id: entryId, p_member_id: user.id, p_fp_amount: fpAmount,
      });
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_ledger', entryId, 'update', user.id, { action: 'fp_payment', fp_amount: fpAmount });
      addToast('Paid with FP', 'success');
      return data as LedgerEntry;
    } catch (err: any) {
      addToast(err.message || 'Could not pay with FP', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Overpayment resolution ───────────────────────────────────────────────────

  const resolveOverpayment = useCallback(async (
    entryId: string, resolution: 'refund' | 'credit_future' | 'other', notes?: string
  ): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.from('fee_ledger')
        .update({
          overpayment_resolution: resolution, overpayment_resolved_at: new Date().toISOString(),
          overpayment_resolved_by: user?.id, overpayment_notes: notes || null,
        })
        .eq('id', entryId).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'fee_ledger', entryId, 'update', user?.id, { action: 'overpayment_resolved', resolution, notes });
      addToast('Overpayment resolved', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Receipt ──────────────────────────────────────────────────────────────────

  const fetchReceipt = useCallback(async (entryId: string): Promise<(LedgerEntry & { users: { name: string } }) | null> => {
    if (!user) throw new Error('Unauthorized');
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fee_ledger')
        .select('*, users!member_id(name)')
        .eq('id', entryId).in('status', ['paid', 'overpaid']).eq('tenant_id', tenant.id).single();
      if (error) handleError(error);
      const isAdmin = profile && ['admin', 'master_admin'].includes(profile.role ?? '');
      if (!isAdmin && data?.member_id !== user.id) throw new Error('Unauthorized');
      return data as LedgerEntry & { users: { name: string } };
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile, tenant.id]);

  // ── Dues settings ────────────────────────────────────────────────────────────

  const fetchDuesSettings = useCallback(async (): Promise<DuesSettings> => {
    try {
      const { data, error } = await supabase.from('dues_settings')
        .select('club_prefix, default_bkash_number').eq('tenant_id', tenant.id).maybeSingle();
      if (error) { console.warn('[dues] settings fetch failed', error); return { club_prefix: '', default_bkash_number: null }; }
      return { club_prefix: data?.club_prefix || '', default_bkash_number: data?.default_bkash_number ?? null };
    } catch {
      return { club_prefix: '', default_bkash_number: null };
    }
  }, [tenant.id]);

  const updateDuesSettings = useCallback(async (settings: DuesSettings): Promise<boolean> => {
    requireAdmin();
    try {
      const { error } = await supabase.from('dues_settings').upsert(
        { tenant_id: tenant.id, ...settings, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      );
      if (error) { addToast(error.message || 'Failed to save settings', 'error'); return false; }
      await logAudit(tenant.id, 'dues_settings', tenant.id, 'update', user?.id, settings);
      addToast('Payment settings saved', 'success');
      return true;
    } catch (err: any) {
      addToast(err?.message || 'Failed to save settings', 'error');
      return false;
    }
  }, [user, tenant.id]);

  const fetchDefaultBkashNumber = useCallback(async (): Promise<string | null> => {
    const s = await fetchDuesSettings();
    return s.default_bkash_number;
  }, [fetchDuesSettings]);

  return {
    loading,
    // templates
    fetchTemplates, createTemplate, updateTemplate, deleteTemplate, toggleTemplate,
    // generation
    generateChargesForDate, runAutoGeneration,
    // ledger reads
    fetchLedger, fetchMemberLedger, fetchDuesStats, markOverdueFees, flagOverpayments,
    // waive / reminders
    markAsWaived, sendReminder, bulkSendReminders,
    // bKash flow
    submitPayment, verifyPayment, rejectPayment,
    // FP flow
    payDueWithFp,
    // overpayment
    resolveOverpayment,
    // receipt
    fetchReceipt,
    // settings
    fetchDuesSettings, updateDuesSettings, fetchDefaultBkashNumber,
  };
}
