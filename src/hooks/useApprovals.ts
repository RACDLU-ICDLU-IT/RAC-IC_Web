import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from './useTenant';
import { logAudit } from './useAuditLog';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApprovalRequestType =
  | 'expense' | 'reimbursement' | 'petty_cash_limit_change' | 'fund_transfer' | 'fp_rate_change';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type SignatoryRole = 'president' | 'treasurer' | 'general_secretary';

export interface ApprovalVote {
  id: string;
  request_id: string;
  voter_id: string;
  voter_role: SignatoryRole;
  decision: 'approve' | 'reject';
  note?: string | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  request_type: ApprovalRequestType;
  required_approvals: 2 | 3;
  status: ApprovalStatus;
  payload: Record<string, any>;
  requested_by: string;
  requested_at: string;
  resolved_at?: string | null;
  executed: boolean;
  executed_at?: string | null;
  created_at: string;
  approval_votes?: ApprovalVote[];
  requester?: { id: string; name: string; email: string };
}

// Only these three roles (by role NAME, not user id — survives yearly handovers)
// may cast a signatory vote. Adjust the role-name strings if your `roles` table
// uses different slugs.
const SIGNATORY_ROLE_NAMES: SignatoryRole[] = ['president', 'treasurer', 'general_secretary'];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApprovals() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { user, profile, role } = useAuth();

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

  /** Is the current user one of the three signatory roles (by role name)? Master admin always eligible (oversight). */
  const isSignatory = useCallback((): boolean => {
    if (profile?.role === 'master_admin') return true;
    const roleName = (role?.name || '').toLowerCase().replace(/\s+/g, '_');
    return SIGNATORY_ROLE_NAMES.includes(roleName as SignatoryRole);
  }, [role, profile]);

  const currentSignatoryRole = useCallback((): SignatoryRole | null => {
    const roleName = (role?.name || '').toLowerCase().replace(/\s+/g, '_');
    if (SIGNATORY_ROLE_NAMES.includes(roleName as SignatoryRole)) return roleName as SignatoryRole;
    return null;
  }, [role]);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchPendingApprovals = useCallback(async (): Promise<ApprovalRequest[]> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*, approval_votes(*)')
        .eq('tenant_id', tenant.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });
      if (error) handleError(error);
      return (data as ApprovalRequest[]) || [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const fetchApprovalHistory = useCallback(async (limit = 100): Promise<ApprovalRequest[]> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*, approval_votes(*)')
        .eq('tenant_id', tenant.id)
        .neq('status', 'pending')
        .order('resolved_at', { ascending: false })
        .limit(limit);
      if (error) handleError(error);
      return (data as ApprovalRequest[]) || [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  // ── Vote ─────────────────────────────────────────────────────────────────────

  const castVote = useCallback(async (
    requestId: string, decision: 'approve' | 'reject', note?: string
  ): Promise<ApprovalRequest | null> => {
    if (!user) { addToast('You must be signed in', 'error'); return null; }
    if (!isSignatory()) {
      addToast('Only President, Treasurer, or General Secretary can cast an approval vote', 'error');
      return null;
    }
    const voterRole = profile?.role === 'master_admin' ? 'treasurer' : currentSignatoryRole();
    if (!voterRole) {
      addToast('Your role is not recognized as a signatory', 'error');
      return null;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('cast_approval_vote', {
        p_request_id: requestId, p_voter_id: user.id, p_voter_role: voterRole,
        p_decision: decision, p_note: note || null,
      });
      if (error) handleError(error);
      await logAudit(tenant.id, 'approval_requests', requestId, decision === 'approve' ? 'approve' : 'reject', user.id, { voter_role: voterRole, note });

      const result = data as ApprovalRequest;
      if (result.status === 'approved') addToast('Request approved and executed', 'success');
      else if (result.status === 'rejected') addToast('Request rejected', 'success');
      else addToast('Vote recorded — awaiting second decision', 'success');
      return result;
    } catch (err: any) {
      addToast(err.message || 'Could not cast vote', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile, tenant.id, isSignatory, currentSignatoryRole]);

  // ── FP rate change request (special case — always routes through approvals) ──

  const requestFpRateChange = useCallback(async (newRate: number): Promise<string | null> => {
    requireAdmin();
    if (newRate <= 0) { addToast('Rate must be > 0', 'error'); return null; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('approval_requests').insert({
        tenant_id: tenant.id, request_type: 'fp_rate_change', required_approvals: 2,
        payload: { new_rate: newRate }, requested_by: user?.id,
      }).select().single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'approval_requests', data.id, 'create', user?.id, { action: 'fp_rate_change_requested', new_rate: newRate });
      addToast('FP rate change submitted for approval', 'success');
      return data.id as string;
    } catch (err: any) {
      addToast(err.message || 'Could not submit rate change', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  return {
    loading,
    isSignatory,
    currentSignatoryRole,
    fetchPendingApprovals,
    fetchApprovalHistory,
    castVote,
    requestFpRateChange,
  };
}
