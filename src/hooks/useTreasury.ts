import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from './useTenant';
import { logAudit } from './useAuditLog';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FundType = 'administrative' | 'project' | 'endowment';
export type EntryType = 'income' | 'expense' | 'transfer' | 'opening_balance' | 'adjustment';
export type ExpenseStatus = 'pending_approval' | 'approved' | 'rejected' | 'petty_cash_auto';

export interface Fund {
  id: string;
  fund_type: FundType;
  balance: number;
  total_in: number;
  total_out: number;
  updated_at: string;
}

export interface TreasuryLedgerEntry {
  id: string;
  fund_type: FundType;
  entry_type: EntryType;
  direction: 'in' | 'out';
  amount: number;
  category?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  project_id?: string | null;
  event_id?: string | null;
  transfer_id?: string | null;
  rotary_year: string;
  entry_date: string;
  note?: string | null;
  attachment_url?: string | null;
  recorded_by?: string | null;
  created_at: string;
  edited_by?: string | null;
  edited_at?: string | null;
  deleted_by?: string | null;
  deleted_at?: string | null;
  delete_reason?: string | null;
}

export interface Expense {
  id: string;
  fund_type: FundType;
  amount: number;
  category: string;
  project_id?: string | null;
  event_id?: string | null;
  is_petty_cash: boolean;
  is_reimbursement: boolean;
  attachment_url?: string | null;
  note?: string | null;
  status: ExpenseStatus;
  approval_request_id?: string | null;
  requested_by: string;
  approved_at?: string | null;
  treasury_ledger_id?: string | null;
  created_at: string;
}

export interface PettyCashLimits {
  fund_type: FundType;
  rotary_year: string;
  per_transaction_limit: number;
  monthly_limit: number;
  yearly_limit: number;
}

export interface FundBudget {
  id: string;
  fund_type: FundType;
  rotary_year: string;
  planned_amount: number;
  approved: boolean;
  approved_at?: string | null;
}

export interface TreasuryLedgerFilters {
  fundType?: FundType;
  entryType?: EntryType;
  direction?: 'in' | 'out';
  category?: string;
  rotaryYear?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
}

export function getCurrentRotaryYear(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 6) return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTreasury() {
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

  // ── Funds ────────────────────────────────────────────────────────────────────

  const fetchFunds = useCallback(async (): Promise<Fund[]> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('funds').select('*').eq('tenant_id', tenant.id).order('fund_type');
      if (error) handleError(error);
      return (data as Fund[]) || [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const fetchEndowmentSpendable = useCallback(async (): Promise<number> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.rpc('get_endowment_spendable', { p_tenant_id: tenant.id });
      if (error) throw error;
      return (data as number) || 0;
    } catch (err) {
      console.error('get_endowment_spendable failed', err);
      return 0;
    }
  }, [tenant.id]);

  const fetchFpBackedValue = useCallback(async (): Promise<number> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.rpc('get_fp_backed_value', { p_tenant_id: tenant.id });
      if (error) throw error;
      return (data as number) || 0;
    } catch (err) {
      console.error('get_fp_backed_value failed', err);
      return 0;
    }
  }, [tenant.id]);

  // ── Ledger (full transaction history) ───────────────────────────────────────

  const fetchTreasuryLedger = useCallback(async (filters?: TreasuryLedgerFilters): Promise<TreasuryLedgerEntry[]> => {
    requireAdmin();
    setLoading(true);
    try {
      let query = supabase.from('treasury_ledger').select('*')
        .eq('tenant_id', tenant.id).is('deleted_at', null)
        .order('entry_date', { ascending: false }).order('created_at', { ascending: false })
        .range(0, 999);

      if (filters?.fundType) query = query.eq('fund_type', filters.fundType);
      if (filters?.entryType) query = query.eq('entry_type', filters.entryType);
      if (filters?.direction) query = query.eq('direction', filters.direction);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.rotaryYear) query = query.eq('rotary_year', filters.rotaryYear);
      if (filters?.dateFrom) query = query.gte('entry_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('entry_date', filters.dateTo);
      if (filters?.projectId) query = query.eq('project_id', filters.projectId);

      const { data, error } = await query;
      if (error) handleError(error);
      return (data as TreasuryLedgerEntry[]) || [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  /** Soft-delete a ledger entry — never hard-deleted, per audit trail requirement. */
  const softDeleteLedgerEntry = useCallback(async (id: string, reason: string): Promise<void> => {
    requireAdmin();
    if (!reason.trim()) { addToast('A reason is required to remove a ledger entry', 'error'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('treasury_ledger')
        .update({ deleted_by: user?.id, deleted_at: new Date().toISOString(), delete_reason: reason.trim() })
        .eq('id', id).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'treasury_ledger', id, 'delete', user?.id, { reason });
      addToast('Ledger entry removed', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const editLedgerNote = useCallback(async (id: string, note: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.from('treasury_ledger')
        .update({ note, edited_by: user?.id, edited_at: new Date().toISOString() })
        .eq('id', id).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'treasury_ledger', id, 'update', user?.id, { note });
      addToast('Note updated', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Opening balance ──────────────────────────────────────────────────────────

  const recordOpeningBalance = useCallback(async (
    fundType: FundType, amount: number, note?: string
  ): Promise<void> => {
    requireAdmin();
    if (amount <= 0) { addToast('Opening balance must be > 0', 'error'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('treasury_ledger').insert({
        tenant_id: tenant.id, fund_type: fundType, entry_type: 'opening_balance', direction: 'in',
        amount, category: 'opening_balance', source_type: 'opening_balance',
        rotary_year: getCurrentRotaryYear(), entry_date: new Date().toISOString().split('T')[0],
        note: note || 'Opening balance', recorded_by: user?.id,
      }).select().single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'treasury_ledger', data.id, 'create', user?.id, { action: 'opening_balance', fund_type: fundType, amount });
      addToast('Opening balance recorded', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Petty cash limits ────────────────────────────────────────────────────────

  const fetchPettyCashLimits = useCallback(async (rotaryYear: string): Promise<PettyCashLimits[]> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.from('petty_cash_limits')
        .select('fund_type, rotary_year, per_transaction_limit, monthly_limit, yearly_limit')
        .eq('tenant_id', tenant.id).eq('rotary_year', rotaryYear);
      if (error) throw error;
      return (data as PettyCashLimits[]) || [];
    } catch (err) {
      console.error('fetchPettyCashLimits failed', err);
      return [];
    }
  }, [tenant.id]);

  /** Petty cash limit CHANGES require 2-of-3 approval — this creates the request, doesn't apply directly. */
  const requestPettyCashLimitChange = useCallback(async (
    fundType: FundType, rotaryYear: string, limits: { per_transaction_limit: number; monthly_limit: number; yearly_limit: number }
  ): Promise<string | null> => {
    requireAdmin();
    setLoading(true);
    try {
      const required = fundType === 'endowment' ? 3 : 2;
      const { data, error } = await supabase.from('approval_requests').insert({
        tenant_id: tenant.id, request_type: 'petty_cash_limit_change', required_approvals: required,
        payload: { fund_type: fundType, rotary_year: rotaryYear, ...limits },
        requested_by: user?.id,
      }).select().single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'approval_requests', data.id, 'create', user?.id, { action: 'petty_cash_limit_change_requested', fund_type: fundType, ...limits });
      addToast('Petty cash limit change submitted for approval', 'success');
      return data.id as string;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const checkPettyCashEligible = useCallback(async (
    fundType: FundType, amount: number
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_petty_cash_eligible', {
        p_tenant_id: tenant.id, p_fund_type: fundType, p_amount: amount,
      });
      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error('checkPettyCashEligible failed', err);
      return false;
    }
  }, [tenant.id]);

  // ── Expenses (routes to petty cash auto or approval queue) ──────────────────

  const recordExpense = useCallback(async (input: {
    fundType: FundType; amount: number; category: string; note?: string;
    attachmentUrl: string; // required for expenses
    projectId?: string; eventId?: string; isReimbursement?: boolean;
  }): Promise<Expense | null> => {
    requireAdmin();
    if (!input.attachmentUrl) { addToast('An attachment/receipt is required for expenses', 'error'); return null; }
    if (input.amount <= 0) { addToast('Amount must be > 0', 'error'); return null; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('record_expense', {
        p_tenant_id: tenant.id, p_fund_type: input.fundType, p_amount: input.amount,
        p_category: input.category, p_note: input.note || null, p_attachment_url: input.attachmentUrl,
        p_requested_by: user?.id, p_project_id: input.projectId || null, p_event_id: input.eventId || null,
        p_is_reimbursement: input.isReimbursement || false,
      });
      if (error) handleError(error);
      const expense = data as Expense;
      await logAudit(tenant.id, 'expenses', expense.id, 'create', user?.id, input);
      if (expense.status === 'petty_cash_auto') {
        addToast('Petty cash expense recorded', 'success');
      } else {
        addToast('Expense submitted for approval', 'success');
      }
      return expense;
    } catch (err: any) {
      addToast(err.message || 'Could not record expense', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const fetchExpenses = useCallback(async (status?: ExpenseStatus): Promise<Expense[]> => {
    requireAdmin();
    setLoading(true);
    try {
      let query = supabase.from('expenses').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) handleError(error);
      return (data as Expense[]) || [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Fund transfers (needs 2-of-3 approval) ──────────────────────────────────

  const requestFundTransfer = useCallback(async (
    fromFund: FundType, toFund: FundType, amount: number, note?: string
  ): Promise<string | null> => {
    requireAdmin();
    if (fromFund === toFund) { addToast('Source and destination funds must differ', 'error'); return null; }
    if (amount <= 0) { addToast('Amount must be > 0', 'error'); return null; }
    setLoading(true);
    try {
      const required = (fromFund === 'endowment' || toFund === 'endowment') ? 3 : 2;
      const { data, error } = await supabase.from('approval_requests').insert({
        tenant_id: tenant.id, request_type: 'fund_transfer', required_approvals: required,
        payload: { from_fund: fromFund, to_fund: toFund, amount, note },
        requested_by: user?.id,
      }).select().single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'approval_requests', data.id, 'create', user?.id, { action: 'fund_transfer_requested', from_fund: fromFund, to_fund: toFund, amount });
      addToast('Fund transfer submitted for approval', 'success');
      return data.id as string;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Budgets ──────────────────────────────────────────────────────────────────

  const fetchBudgets = useCallback(async (rotaryYear: string): Promise<FundBudget[]> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.from('fund_budgets').select('*')
        .eq('tenant_id', tenant.id).eq('rotary_year', rotaryYear);
      if (error) throw error;
      return (data as FundBudget[]) || [];
    } catch (err) {
      console.error('fetchBudgets failed', err);
      return [];
    }
  }, [tenant.id]);

  const saveBudget = useCallback(async (fundType: FundType, rotaryYear: string, plannedAmount: number): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fund_budgets').upsert({
        tenant_id: tenant.id, fund_type: fundType, rotary_year: rotaryYear,
        planned_amount: plannedAmount, created_by: user?.id,
      }, { onConflict: 'tenant_id,fund_type,rotary_year' }).select().single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'fund_budgets', data.id, 'update', user?.id, { fund_type: fundType, rotary_year: rotaryYear, planned_amount: plannedAmount });
      addToast('Budget saved', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const approveBudget = useCallback(async (budgetId: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.from('fund_budgets')
        .update({ approved: true, approved_at: new Date().toISOString() })
        .eq('id', budgetId).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'fund_budgets', budgetId, 'approve', user?.id);
      addToast('Budget approved', 'success');
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Financial statement export data ─────────────────────────────────────────

  const fetchFinancialStatement = useCallback(async (rotaryYear: string): Promise<{
    funds: Fund[]; ledger: TreasuryLedgerEntry[]; budgets: FundBudget[];
  }> => {
    requireAdmin();
    setLoading(true);
    try {
      const [funds, ledger, budgets] = await Promise.all([
        fetchFunds(),
        fetchTreasuryLedger({ rotaryYear }),
        fetchBudgets(rotaryYear),
      ]);
      return { funds, ledger, budgets };
    } finally {
      setLoading(false);
    }
  }, [fetchFunds, fetchTreasuryLedger, fetchBudgets]);

  return {
    loading,
    // funds
    fetchFunds, fetchEndowmentSpendable, fetchFpBackedValue,
    // ledger
    fetchTreasuryLedger, softDeleteLedgerEntry, editLedgerNote, recordOpeningBalance,
    // petty cash
    fetchPettyCashLimits, requestPettyCashLimitChange, checkPettyCashEligible,
    // expenses
    recordExpense, fetchExpenses,
    // transfers
    requestFundTransfer,
    // budgets
    fetchBudgets, saveBudget, approveBudget,
    // reporting
    fetchFinancialStatement,
  };
}
