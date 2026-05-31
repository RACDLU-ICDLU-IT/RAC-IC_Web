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
}

export interface LedgerEntry {
  id: string;
  member_id: string;
  template_id: string;
  label: string;
  amount: number;
  currency: string;
  due_date: string;
  paid_at?: string;
  paid_amount?: number;
  status: 'unpaid' | 'paid' | 'waived' | 'overdue';
  notes?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  created_at: string;
  users?: {
    id: string;
    name: string;
    email: string;
    photo?: string;
    role: string;
    status: string;
    joinDate?: string;
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

export type CreateTemplateInput = Omit<FeeTemplate, 'id' | 'created_at'>;

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
        users!member_id(id,name,email,photo,role,status,"joinDate"),
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
        users!member_id(id,name,email,photo,role,status,"joinDate"),
        fee_templates!template_id(name,type)
      `).eq('member_id', memberId).eq('tenant_id', tenant.id).order('due_date', { ascending: false });

      if (error) handleSupabaseError(error);
      return data as LedgerEntry[];
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
      const { data: entries, error: fetchErr } = await supabase
        .from('fee_ledger')
        .select('*')
        .in('id', ledgerIds)
        .eq('tenant_id', tenant.id);
      
      if (fetchErr) handleSupabaseError(fetchErr);
      if (!entries) return;

      const dateStr = paidDate ? new Date(paidDate).toISOString() : new Date().toISOString();
      const updates = entries.map(e => ({
        ...e,
        status: 'paid',
        paid_at: dateStr,
        paid_amount: paidAmount || e.amount,
        notes: notes || e.notes || null,
        tenant_id: tenant.id
      }));

      const { error } = await supabase.from('fee_ledger').upsert(updates);
      if (error) handleSupabaseError(error);
      
      addToast(`Marked ${ledgerIds.length} entries as paid`, 'success');
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

      const { data, error } = await supabase.rpc('generate_monthly_fees', {
        p_template_id: templateId,
        p_month: month,
        p_year: year,
        p_label: p_label,
        p_amount: finalAmount,
        p_currency: template.currency || 'BDT'
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

      const newEntries = memberIds.map(mId => ({
        id: crypto.randomUUID(),
        template_id: templateId,
        member_id: mId,
        label: template.name,
        amount: template.amount,
        currency: template.currency || 'BDT',
        due_date: template.due_date || new Date().toISOString().split('T')[0],
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
        .select('*')
        .in('id', ledgerIds)
        .in('status', ['unpaid', 'overdue'])
        .eq('tenant_id', tenant.id);
      if (error) handleSupabaseError(error);
      if (!ledgers || !ledgers.length) {
        addToast('No selected entries are unpaid/overdue', 'info');
        return;
      }

      const now = new Date().toISOString();

      // Batch ledger updates — single query instead of N sequential awaits
      const ledgerUpdates = ledgers.map(l => ({
        ...l,
        reminder_count: l.reminder_count + 1,
        reminder_sent_at: now,
      }));
      const { error: updateErr } = await supabase.from('fee_ledger').upsert(ledgerUpdates);
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
      const { data, error } = await supabase.rpc('get_dues_stats');
      if (error) handleSupabaseError(error);
      
      if (data) {
        return data as DuesStats;
      }
      
      throw new Error('Invalid stats returned from RPC');
      
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
    markOverdueFees
  };
}
