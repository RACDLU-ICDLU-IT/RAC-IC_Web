import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../hooks/useTenant';

export interface FeeTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'monthly' | 'event' | 'custom';
  amount: number;
  currency: string;
  is_active: boolean;
  recur_day: number;
  event_id?: string;
  due_date?: string;
  applies_to: string;
  created_at: string;
  category?: string | null;
  bkash_number?: string | null; // per-template override; falls back to dues_settings.default_bkash_number
  // Points system fields
  xp_reward: number;
  fp_reward: number;
  fund_account: 'administrative' | 'project' | 'endowment';
}

export interface LedgerEntry {
  id: string;
  member_id: string;
  template_id: string;
  label: string;
  category?: string | null;
  amount: number;
  currency: string;
  due_date: string;
  paid_at?: string;
  paid_amount?: number;
  status: 'unpaid' | 'pending_verification' | 'paid' | 'overdue' | 'waived' | 'rejected';
  notes?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  rotary_year?: string | null;
  // bKash payment verification fields
  bkash_number?: string | null;
  sender_bkash_number?: string | null;
  transaction_id?: string | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  rejection_reason?: string | null;
  receipt_no?: string | null;
  created_at: string;
  users?: {
    id: string;
    name: string;
    email: string;
    photo?: string;
    role: string;
    status: string;
    joinDate?: string;
    tenant_id?: string;
  };
  fee_templates?: {
    name: string;
    type: string;
  };
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
  type?: string;
}

export interface DuesSettings {
  club_prefix: string;
  default_bkash_number: string | null;
}

export type CreateTemplateInput = Omit<FeeTemplate, 'id' | 'created_at'>;

// Rotary year runs July -> June. Shared by the hook and by callers that
// need to derive a year label before an entry has been persisted.
// IMPORTANT: this must be called with the entry's DUE DATE, not "now" —
// the receipt's rotary year reflects when the due was assigned, not
// when it was paid/verified. See createLedgerEntries / generateMonthlyFees
// below for where this is actually stamped.
export function getRotaryYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed, so July = 6
  if (m >= 6) {
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  }
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

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

  const handleSupabaseError = (err: any) => {
    console.error(err);
    addToast(err.message || 'An error occurred', 'error');
    throw err;
  };

  const fetchTemplates = useCallback(async (): Promise<FeeTemplate[]> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fee_templates')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });
      if (error) handleSupabaseError(error);
      return (data as FeeTemplate[]) || [];
    } catch (err) {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const createTemplate = useCallback(async (data: CreateTemplateInput): Promise<FeeTemplate | null> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('fee_templates')
        .insert([{ ...data, id: crypto.randomUUID(), tenant_id: tenant.id }])
        .select()
        .single();
      if (error) handleSupabaseError(error);
      addToast('Template created successfully', 'success');
      return result as FeeTemplate;
    } catch (err) {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const updateTemplate = useCallback(async (id: string, data: Partial<FeeTemplate>): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fee_templates')
        .update(data)
        .eq('id', id);
      if (error) handleSupabaseError(error);
      addToast('Template updated successfully', 'success');
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { count, error: countErr } = await supabase
        .from('fee_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('template_id', id)
        .eq('tenant_id', tenant.id);
        
      if (countErr) handleSupabaseError(countErr);
      if (count && count > 0) {
        throw new Error('Template has existing ledger entries');
      }

      const { error } = await supabase.from('fee_templates').delete().eq('id', id);
      if (error) handleSupabaseError(error);
      addToast('Template deleted successfully', 'success');
    } catch (err: any) {
      if (err.message === 'Template has existing ledger entries') {
        addToast(err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const toggleTemplate = useCallback(async (id: string, isActive: boolean): Promise<void> => {
    return updateTemplate(id, { is_active: isActive });
  }, [updateTemplate]);

  const fetchLedger = useCallback(async (filters?: LedgerFilters): Promise<LedgerEntry[]> => {
    requireAdmin();
    setLoading(true);
    try {
      let query = supabase.from('fee_ledger').select(`
        *,
        users!member_id(id,name,email,photo,role,status,"joinDate",tenant_id),
        fee_templates!template_id(name,type)
      `).eq('tenant_id', tenant.id).order('due_date', { ascending: false }).range(0, 499);

      if (filters?.memberId) query = query.eq('member_id', filters.memberId);
      if (filters?.templateId) query = query.eq('template_id', filters.templateId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.dateFrom) query = query.gte('due_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('due_date', filters.dateTo);

      const { data, error } = await query;
      if (error) handleSupabaseError(error);
      
      let results = data as any[];
      if (filters?.type) {
        results = results.filter((r) => r.fee_templates?.type === filters.type);
      }
      
      // Filter out any results where the associated user does not belong to the current active tenant
      results = results.filter((r) => !r.users || r.users.tenant_id === tenant.id);
      
      return results as LedgerEntry[];
    } catch (err) {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const fetchMemberLedger = useCallback(async (memberId: string): Promise<LedgerEntry[]> => {
    const isAdmin = profile && ['admin', 'master_admin'].includes(profile.role ?? '');
    if (!user || (!isAdmin && user.id !== memberId)) {
      throw new Error('Unauthorized');
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fee_ledger').select(`
        *,
        users!member_id(id,name,email,photo,role,status,"joinDate",tenant_id),
        fee_templates!template_id(name,type)
      `).eq('member_id', memberId).eq('tenant_id', tenant.id).order('due_date', { ascending: false });

      if (error) handleSupabaseError(error);
      
      let results = data as any[];
      // Filter out any entries where user belongs to another tenant
      results = results.filter((r) => !r.users || r.users.tenant_id === tenant.id);
      
      return results as LedgerEntry[];
    } catch (err) {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const markAsPaid = useCallback(async (ledgerId: string, paidAmount: number, notes?: string): Promise<void> => {
    requireAdmin();
    if (paidAmount <= 0) {
      addToast('Paid amount must be > 0', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fee_ledger')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: paidAmount,
          notes: notes || null
        })
        .eq('id', ledgerId);
        
      if (error) handleSupabaseError(error);
      addToast('Marked as paid', 'success');
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const markAsWaived = useCallback(async (ledgerId: string, notes?: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('fee_ledger')
        .update({
          status: 'waived',
          notes: notes || null
        })
        .eq('id', ledgerId);
      
      if (error) handleSupabaseError(error);
      addToast('Marked as waived', 'success');
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const bulkMarkPaid = useCallback(async (
    ledgerIds: string[],
    paidAmount?: number,
    paidDate?: string,
    notes?: string
  ): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      // When no explicit paidAmount override is given, each entry must be
      // paid at its own `amount` (not a shared value), so we still need to
      // read the rows first. But we only ever write back the fields that
      // actually change — never the full row — so a concurrent bulkMarkPaid
      // or bulkSendReminders call on overlapping IDs can't stomp fields it
      // just wrote (e.g. reminder_count, receipt_no, verified_by) with stale
      // data from this fetch.
      const { data: entries, error: fetchErr } = await supabase
        .from('fee_ledger')
        .select('id, amount, notes')
        .in('id', ledgerIds)
        .eq('tenant_id', tenant.id);

      if (fetchErr) handleSupabaseError(fetchErr);
      if (!entries || entries.length === 0) return;

      const dateStr = paidDate ? new Date(paidDate).toISOString() : new Date().toISOString();

      // Narrow, per-row updates — only status/paid_at/paid_amount/notes change.
      await Promise.all(
        entries.map(e =>
          supabase
            .from('fee_ledger')
            .update({
              status: 'paid',
              paid_at: dateStr,
              paid_amount: paidAmount || e.amount,
              notes: notes || e.notes || null,
            })
            .eq('id', e.id)
            .eq('tenant_id', tenant.id)
        )
      );

      addToast(`Marked ${entries.length} entries as paid`, 'success');
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const generateMonthlyFees = useCallback(async (templateId: string, month: number, year: number, overrideAmount?: number): Promise<number> => {
    requireAdmin();
    
    // Validation
    if (month < 1 || month > 12) {
      addToast('Month must be between 1 and 12', 'error');
      return 0;
    }
    if (year < 2000 || year > 2100) {
      addToast('Year must be between 2000 and 2100', 'error');
      return 0;
    }
    
    setLoading(true);
    try {
      const { data: template, error: tmplErr } = await supabase.from('fee_templates').select('*').eq('id', templateId).eq('tenant_id', tenant.id).single();
      if (tmplErr) handleSupabaseError(tmplErr);
      if (!template) return 0;
      
      const finalAmount = (overrideAmount !== undefined && overrideAmount !== null && overrideAmount > 0) ? overrideAmount : template.amount;
      
      if (finalAmount <= 0) {
         addToast('Amount must be > 0', 'error');
         return 0;
      }
      
      const p_label = `${template.name} - ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`;

      // Rotary year is derived from the FEE PERIOD being generated (month/year),
      // not from today's date — a treasurer backfilling August dues in October
      // still gets the rotary year that August falls in.
      const p_rotary_year = getRotaryYear(new Date(year, month - 1, 1));

      const { data, error } = await supabase.rpc('generate_monthly_fees', {
        p_template_id: templateId,
        p_month: month,
        p_year: year,
        p_label: p_label,
        p_amount: finalAmount,
        p_currency: template.currency || 'BDT',
        p_rotary_year: p_rotary_year,
        p_bkash_number: template.bkash_number || null,
      });
      
      if (error) handleSupabaseError(error);
      addToast(`Monthly fees generated successfully`, 'success');
      return (data as number) || 0;
    } catch (err) {
      return 0;
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const createLedgerEntries = useCallback(async (templateId: string, memberIds: string[]): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: template, error: tmplErr } = await supabase.from('fee_templates').select('*').eq('id', templateId).eq('tenant_id', tenant.id).single();
      if (tmplErr) handleSupabaseError(tmplErr);
      if (!template) return;

      const dueDate = template.due_date || new Date().toISOString().split('T')[0];
      // Rotary year stamped from the due date at creation time — this is
      // the value the receipt will show later, regardless of when the
      // fee actually gets paid/verified.
      const rotaryYear = getRotaryYear(dueDate);

      const newEntries = memberIds.map(mId => ({
        id: crypto.randomUUID(),
        template_id: templateId,
        member_id: mId,
        label: template.name,
        category: template.category || null,
        amount: template.amount,
        currency: template.currency || 'BDT',
        due_date: dueDate,
        rotary_year: rotaryYear,
        bkash_number: template.bkash_number || null,
        status: 'unpaid',
        reminder_count: 0,
        tenant_id: tenant.id
      }));

      if (newEntries.length > 0) {
        const { error: insErr } = await supabase.from('fee_ledger').insert(newEntries);
        if (insErr) handleSupabaseError(insErr);
        addToast(`Applied fee to ${newEntries.length} members`, 'success');
      }
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const sendReminder = useCallback(async (ledgerId: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: ledger, error: ledgErr } = await supabase.from('fee_ledger').select('*').eq('id', ledgerId).eq('tenant_id', tenant.id).single();
      if (ledgErr) handleSupabaseError(ledgErr);
      if (!ledger) return;

      await supabase
        .from('fee_ledger')
        .update({
          reminder_count: ledger.reminder_count + 1,
          reminder_sent_at: new Date().toISOString()
        })
        .eq('id', ledgerId);

      await supabase.from('reminders').insert({
        id: crypto.randomUUID(),
        user_id: ledger.member_id,
        title: `Payment Reminder: ${ledger.label}`,
        message: `You have an outstanding fee of ${ledger.currency} ${ledger.amount} due on ${ledger.due_date}. Please pay at the earliest.`,
        type: 'fee_reminder',
        is_read: false,
        metadata: { ledger_id: ledger.id, amount: ledger.amount, due_date: ledger.due_date },
        tenant_id: tenant.id
      });
      
      addToast('Reminder sent', 'success');
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const bulkSendReminders = useCallback(async (ledgerIds: string[]): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: ledgers, error } = await supabase
        .from('fee_ledger')
        .select('id, member_id, label, amount, currency, due_date, reminder_count')
        .in('id', ledgerIds)
        .in('status', ['unpaid', 'overdue'])
        .eq('tenant_id', tenant.id);
      if (error) handleSupabaseError(error);
      if (!ledgers || !ledgers.length) {
        addToast('No selected entries are unpaid/overdue', 'info');
        return;
      }

      const now = new Date().toISOString();

      // Narrow, per-row updates — only reminder_count/reminder_sent_at change,
      // so this can't clobber other fields (status, paid_amount, receipt_no,
      // etc.) that a concurrent bulkMarkPaid/verifyPayment call may have just
      // written on the same rows.
      const { error: updateErr } = await supabase.from('fee_ledger').upsert(
        ledgers.map(l => ({
          id: l.id,
          reminder_count: l.reminder_count + 1,
          reminder_sent_at: now,
        }))
      );
      if (updateErr) handleSupabaseError(updateErr);

      // Batch reminder inserts — single query instead of N sequential awaits
      const reminderInserts = ledgers.map(l => ({
        id: crypto.randomUUID(),
        user_id: l.member_id,
        title: `Payment Reminder: ${l.label}`,
        message: `You have an outstanding fee of ${l.currency} ${l.amount} due on ${l.due_date}. Please pay at the earliest.`,
        type: 'fee_reminder',
        is_read: false,
        metadata: { ledger_id: l.id, amount: l.amount, due_date: l.due_date },
        tenant_id: tenant.id,
      }));
      const { error: insertErr } = await supabase.from('reminders').insert(reminderInserts);
      if (insertErr) handleSupabaseError(insertErr);

      addToast(`Sent ${ledgers.length} reminders`, 'success');
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const fetchDuesStats = useCallback(async (): Promise<DuesStats> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_dues_stats', { p_tenant_id: tenant.id });
      if (error) handleSupabaseError(error);

      // get_dues_stats() is declared `returns table (...)`, so PostgREST/
      // supabase-js returns an ARRAY of rows (one row here), not a bare
      // object — even though there's exactly one row. Casting the array
      // directly `as DuesStats` compiles fine but leaves every field
      // undefined at runtime (e.g. stats.collectionRate.toFixed(1) then
      // throws in DuesSummaryCards). Unwrap the first row here.
      const row = Array.isArray(data) ? data[0] : data;

      // Validate the unwrapped row actually has the shape we expect
      // before trusting it — guards against silently returning
      // undefined-filled stats if the RPC's column set ever drifts
      // from DuesStats.
      if (row && typeof row.collectionRate === 'number') {
        return row as DuesStats;
      }

      throw new Error('Invalid stats shape returned from RPC');

    } catch (err) {
      console.warn('RPC failed, calculating locally', err);
      const { data: entries } = await supabase.from('fee_ledger').select('*').eq('tenant_id', tenant.id);
      const all: any[] = entries || [];
      
      let totalCollected = 0;
      let totalOutstanding = 0;
      let totalWaived = 0;
      let totalCharged = 0;
      let overdueCount = 0;
      let paidThisMonth = 0;
      let unpaidThisMonth = 0;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      all.forEach(e => {
        const dueDate = new Date(e.due_date);
        const isCurrentMonth = dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
        
        if (e.status === 'waived') {
          totalWaived += Number(e.amount);
        } else {
          totalCharged += Number(e.amount);
          
          if (e.status === 'paid') {
            totalCollected += Number(e.paid_amount || e.amount);
            if (e.paid_at) {
              const paidAt = new Date(e.paid_at);
              if (paidAt.getMonth() === currentMonth && paidAt.getFullYear() === currentYear) {
                paidThisMonth += Number(e.paid_amount || e.amount);
              }
            }
          } else {
            totalOutstanding += Number(e.amount) - Number(e.paid_amount || 0);
            if (e.status === 'overdue') overdueCount++;
            if (isCurrentMonth) unpaidThisMonth += Number(e.amount) - Number(e.paid_amount || 0);
          }
        }
      });
      
      const collectionRate = (totalCharged - totalWaived) > 0 ? (totalCollected / (totalCharged - totalWaived)) * 100 : 0;

      return {
        totalCollected,
        totalOutstanding,
        totalWaived,
        totalCharged,
        overdueCount,
        paidThisMonth,
        unpaidThisMonth,
        collectionRate
      };
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  const markOverdueFees = useCallback(async (): Promise<void> => {
    requireAdmin();
    try {
      await supabase.rpc('mark_overdue_fees');
    } catch (err) {
      console.error('Failed to run mark_overdue_fees via RPC, trying direct update', err);
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('fee_ledger')
        .update({ status: 'overdue' })
        .eq('status', 'unpaid')
        .lt('due_date', today);
    }
  }, [user, tenant.id]);

  // ----------------------------------------------------------------
  // bKash payment submission + verification flow
  // ----------------------------------------------------------------

  /**
   * Member submits a transaction ID against their own unpaid entry.
   * Moves status to pending_verification, stamps submitted_at.
   * Does NOT verify — an admin does that separately via verifyPayment.
   * Clears any prior rejection_reason so a resubmit doesn't show stale text.
   */
  const submitPayment = useCallback(async (
    entryId: string,
    transactionId: string,
    senderBkashNumber: string
  ): Promise<LedgerEntry | null> => {
    if (!user) {
      addToast('You must be signed in to submit a payment', 'error');
      return null;
    }
    if (!transactionId.trim() || !senderBkashNumber.trim()) {
      addToast('Transaction ID and sender bKash number are required', 'error');
      return null;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fee_ledger')
        .update({
          status: 'pending_verification',
          transaction_id: transactionId.trim(),
          sender_bkash_number: senderBkashNumber.trim(),
          submitted_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', entryId)
        .eq('member_id', user.id) // guard: members can only submit against their own entries
        .in('status', ['unpaid', 'rejected']) // guard: fresh or previously-rejected entries can be (re)submitted
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) handleSupabaseError(error);
      addToast('Payment submitted for verification', 'success');
      return data as LedgerEntry;
    } catch (err) {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  /**
   * Fetches receipt data for a single paid entry, joined with member name.
   * Used by the in-app receipt view. Accessible by the owning member or an admin.
   */
  const fetchReceipt = useCallback(async (
    entryId: string
  ): Promise<(LedgerEntry & { users: { name: string } }) | null> => {
    if (!user) {
      throw new Error('Unauthorized');
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fee_ledger')
        .select('*, users!member_id(name)')
        .eq('id', entryId)
        .eq('status', 'paid')
        .eq('tenant_id', tenant.id)
        .single();

      if (error) handleSupabaseError(error);

      const isAdmin = profile && ['admin', 'master_admin'].includes(profile.role ?? '');
      if (!isAdmin && data?.member_id !== user.id) {
        throw new Error('Unauthorized');
      }

      return data as LedgerEntry & { users: { name: string } };
    } catch (err) {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile, tenant.id]);

  /**
   * Fetches the current tenant's default receiving bKash number, falling back
   * gracefully if the dues_settings row doesn't exist yet.
   */
  const fetchDefaultBkashNumber = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('dues_settings')
        .select('default_bkash_number')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error) {
        console.warn('[dues] Could not fetch default bKash number:', error);
        return null;
      }
      return data?.default_bkash_number ?? null;
    } catch (err) {
      console.warn('[dues] Could not fetch default bKash number:', err);
      return null;
    }
  }, [tenant.id]);

  /**
   * Fetches the tenant's dues settings row (club_prefix + default bKash).
   * Returns safe empty defaults if the row doesn't exist yet, so the
   * admin Settings tab can render an empty form instead of throwing.
   */
  const fetchDuesSettings = useCallback(async (): Promise<DuesSettings> => {
    try {
      const { data, error } = await supabase
        .from('dues_settings')
        .select('club_prefix, default_bkash_number')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error) {
        console.warn('[dues] Could not fetch dues settings:', error);
        return { club_prefix: '', default_bkash_number: null };
      }
      return {
        club_prefix: data?.club_prefix || '',
        default_bkash_number: data?.default_bkash_number ?? null,
      };
    } catch (err) {
      console.warn('[dues] Could not fetch dues settings:', err);
      return { club_prefix: '', default_bkash_number: null };
    }
  }, [tenant.id]);

  /**
   * Upserts the tenant's dues settings row (club_prefix + default bKash).
   * Returns true on success so the caller (admin Settings tab) can clear
   * its "dirty" flag.
   */
  const updateDuesSettings = useCallback(async (
    settings: { default_bkash_number: string | null; club_prefix: string }
  ): Promise<boolean> => {
    requireAdmin();
    try {
      const { error } = await supabase
        .from('dues_settings')
        .upsert(
          {
            tenant_id: tenant.id,
            default_bkash_number: settings.default_bkash_number,
            club_prefix: settings.club_prefix,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id' }
        );

      if (error) {
        console.error('[dues] Failed to update dues settings:', error);
        addToast(error.message || 'Failed to save settings', 'error');
        return false;
      }
      addToast('Payment settings saved', 'success');
      return true;
    } catch (err: any) {
      console.error('[dues] Failed to update dues settings:', err);
      addToast(err?.message || 'Failed to save settings', 'error');
      return false;
    }
  }, [user, addToast, tenant.id]);

  /**
   * Admin verifies a pending_verification entry. Atomically assigns receipt_no
   * via the next_receipt_seq() RPC, so two simultaneous verifications never
   * collide on sequence number. Also stamps paid_at so the entry is picked up
   * correctly by fetchDuesStats' "paid this month" calculation.
   *
   * Uses the entry's ALREADY-STAMPED rotary_year (set at creation time in
   * createLedgerEntries / generateMonthlyFees) — falls back to deriving from
   * due_date, and only as a last resort from today's date, for legacy entries
   * created before rotary_year existed on the schema.
   */
  const verifyPayment = useCallback(async (
    entryId: string,
    clubPrefix: string
  ): Promise<LedgerEntry | null> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: entry, error: fetchErr } = await supabase
        .from('fee_ledger')
        .select('rotary_year, due_date, amount, paid_amount')
        .eq('id', entryId)
        .eq('tenant_id', tenant.id)
        .single();
      if (fetchErr) handleSupabaseError(fetchErr);
      if (!entry) return null;

      const rotaryYear = entry.rotary_year || (entry.due_date ? getRotaryYear(entry.due_date) : getRotaryYear(new Date()));

      const { data: seqData, error: seqErr } = await supabase.rpc('next_receipt_seq', {
        p_tenant_id: tenant.id,
        p_rotary_year: rotaryYear,
      });
      if (seqErr) handleSupabaseError(seqErr);

      const receiptNo = `${clubPrefix}/RCPT/${rotaryYear}/${String(seqData).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('fee_ledger')
        .update({
          status: 'paid',
          paid_amount: entry.amount,
          paid_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          verified_by: user?.id ?? null,
          receipt_no: receiptNo,
          rotary_year: rotaryYear, // backfill for legacy rows that had none
        })
        .eq('id', entryId)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) handleSupabaseError(error);
      addToast('Payment verified', 'success');
      return data as LedgerEntry;
    } catch (err) {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  /**
   * Admin rejects a pending_verification entry. Status becomes 'rejected'
   * (a first-class status in the fee_ledger check constraint) rather than
   * 'unpaid', so the member-facing UI can distinguish "never submitted"
   * from "submitted and rejected" and surface the rejection_reason. The
   * member can still resubmit from this state — submitPayment's guard
   * only requires an unpaid-style entry client-side (MemberDues.tsx
   * treats unpaid/overdue/rejected as needing payment).
   */
  const rejectPayment = useCallback(async (
    entryId: string,
    reason: string
  ): Promise<LedgerEntry | null> => {
    requireAdmin();
    if (!reason.trim()) {
      addToast('A rejection reason is required', 'error');
      return null;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fee_ledger')
        .update({
          status: 'rejected',
          rejection_reason: reason.trim(),
          transaction_id: null,
          sender_bkash_number: null,
          submitted_at: null,
        })
        .eq('id', entryId)
        .eq('tenant_id', tenant.id)
        .select()
        .single();

      if (error) handleSupabaseError(error);
      addToast('Payment rejected', 'success');
      return data as LedgerEntry;
    } catch (err) {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, addToast, tenant.id]);

  return {
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplate,
    fetchLedger,
    fetchMemberLedger,
    markAsPaid,
    markAsWaived,
    bulkMarkPaid,
    generateMonthlyFees,
    createLedgerEntries,
    sendReminder,
    bulkSendReminders,
    fetchDuesStats,
    markOverdueFees,
    submitPayment,
    fetchReceipt,
    fetchDefaultBkashNumber,
    fetchDuesSettings,
    updateDuesSettings,
    verifyPayment,
    rejectPayment,
  };
}
