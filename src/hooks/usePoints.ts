import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from './useTenant';
import { logAudit } from './useAuditLog';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FundAccount = 'administrative' | 'project' | 'endowment';

export interface LevelConfig {
  id: string;
  level: number;
  xp_required: number;
  label?: string;
}

export interface MemberPoints {
  xp: number;
  fp: number;
  level: number;
}

export interface PointLedgerEntry {
  id: string;
  member_id: string;
  xp_delta: number;
  fp_delta: number;
  source_type:
    | 'due_payment' | 'donation' | 'attendance' | 'manual'
    | 'fp_redemption' | 'fp_transfer_sent' | 'fp_transfer_received' | 'fp_rate_rescale';
  source_id?: string;
  note?: string;
  created_at: string;
}

export interface DonationPointConfig {
  id: string;
  fund_account: FundAccount;
  xp_per_100: number;
  fp_per_100: number;
}

export interface Donation {
  id: string;
  member_id?: string;
  member_name?: string;
  member_email?: string;
  amount: number;
  currency: string;
  fund_account: FundAccount;
  xp_reward: number;
  fp_reward: number;
  submission_method: 'admin_direct' | 'member_bkash';
  status: 'pending_verification' | 'completed' | 'rejected' | 'cancelled';
  bkash_number?: string | null;
  sender_bkash_number?: string | null;
  transaction_id?: string | null;
  submitted_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  rejection_reason?: string | null;
  notes?: string;
  recorded_by?: string;
  created_at: string;
  users?: { id: string; name: string; email: string; photo?: string };
}

export interface FpRedemptionItem {
  id: string;
  name: string;
  description?: string;
  fp_cost: number;
  is_active: boolean;
  created_at: string;
}

export interface FpRedemptionRequest {
  id: string;
  member_id: string;
  item_id: string;
  fp_cost: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  fulfilled_at?: string;
  fulfilled_by?: string;
  fulfillment_note?: string;
  created_at: string;
  fp_redemption_items?: FpRedemptionItem;
  users?: { id: string; name: string; email: string };
}

export interface FpTransfer {
  id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  note?: string;
  created_at: string;
}

/** A single row on the XP leaderboard. Sourced from users.xp/fp/level —
 * there is no separate points table (see fetchMemberPoints note below). */
export interface LeaderboardEntry {
  id: string;
  name: string;
  photo?: string | null;
  xp: number;
  fp: number;
  level: number;
  rank: number;
}

/** Attendance-specific status vocabulary. Lives here since
 * awardAttendancePoints/reverseAttendancePoints/adjustAttendanceXpForEdit
 * are typed against it, and AdminAttendance.tsx imports it from here. */
export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePoints() {
  const { tenant } = useTenant();
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const isAdmin = profile && ['admin', 'master_admin'].includes(profile.role ?? '');

  const requireAdmin = () => {
    if (!isAdmin) throw new Error('Unauthorized');
  };

  const handleError = (e: any) => {
    console.error(e);
    addToast(e?.message || 'An error occurred', 'error');
    throw e;
  };

  // ── FP exchange rate ─────────────────────────────────────────────────────────

  const fetchCurrentFpRate = useCallback(async (): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_current_fp_rate', { p_tenant_id: tenant.id });
      if (error) throw error;
      return (data as number) ?? 1;
    } catch (err) {
      console.error('fetchCurrentFpRate failed', err);
      return 1;
    }
  }, [tenant.id]);

  const fetchFpRateHistory = useCallback(async (): Promise<{ rate_bdt: number; effective_from: string }[]> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.from('fp_exchange_rate')
        .select('rate_bdt, effective_from').eq('tenant_id', tenant.id)
        .order('effective_from', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('fetchFpRateHistory failed', err);
      return [];
    }
  }, [tenant.id]);

  // Note: applying an FP rate change is NOT here — it happens only via the
  // approvals flow (useApprovals.requestFpRateChange -> cast_approval_vote ->
  // execute_approval_request -> apply_fp_rate_change RPC). Keeping the write
  // path single-entry through approvals prevents a rate change from ever
  // bypassing the required signatory vote.

  // ── Level configs ────────────────────────────────────────────────────────────

  const fetchLevelConfigs = useCallback(async (): Promise<LevelConfig[]> => {
    const { data, error } = await supabase.from('level_config').select('*')
      .eq('tenant_id', tenant.id).order('level', { ascending: true });
    if (error) handleError(error);
    return (data as LevelConfig[]) || [];
  }, [tenant.id]);

  const saveLevelConfig = useCallback(async (configs: Omit<LevelConfig, 'id'>[]): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      await supabase.from('level_config').delete().eq('tenant_id', tenant.id);
      const rows = configs.map((c) => ({ id: crypto.randomUUID(), tenant_id: tenant.id, level: c.level, xp_required: c.xp_required, label: c.label || null }));
      if (rows.length) {
        const { error } = await supabase.from('level_config').insert(rows);
        if (error) handleError(error);
      }
      // FIX: was passing tenant.id (text, e.g. "racdlu") into
      // audit_log.record_id (uuid column) — caused a 22P02 "invalid input
      // syntax for type uuid" error every time level config was saved.
      // This action covers multiple rows at once, so there's no single
      // natural record id; generate a fresh uuid to represent this event.
      await logAudit(tenant.id, 'level_config', crypto.randomUUID(), 'update', user?.id, { count: rows.length });
      addToast('Level configuration saved', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, isAdmin, user]);

  // ── Member points read ───────────────────────────────────────────────────────
  // Reads from users.xp/fp/level (confirmed live schema — member_points was
  // never created; points storage was migrated to users directly).

  const fetchMemberPoints = useCallback(async (memberId: string): Promise<MemberPoints> => {
    const { data } = await supabase.from('users').select('xp, fp, level').eq('id', memberId).eq('tenant_id', tenant.id).maybeSingle();
    return { xp: data?.xp || 0, fp: data?.fp || 0, level: data?.level || 0 };
  }, [tenant.id]);
  
  const fetchMemberPointLedger = useCallback(async (memberId: string): Promise<PointLedgerEntry[]> => {
    if (!user) return [];
    const { data, error } = await supabase.from('point_ledger').select('*')
      .eq('member_id', memberId).eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false }).limit(100);
    if (error) { console.error(error); return []; }
    return (data as PointLedgerEntry[]) || [];
  }, [tenant.id, user]);

  /** XP leaderboard for the current tenant, ranked descending by XP.
   * Reads users.xp/fp/level directly (same table fetchMemberPoints reads —
   * there is no separate points table). Excludes 'master_admin' since that
   * role is a system/ops account, not a competing member; also excludes
   * inactive users so departed/suspended accounts don't clutter rankings.
   * Ties on XP are broken by name so the ordering is stable across reloads. */
  const fetchLeaderboard = useCallback(async (limit = 200): Promise<LeaderboardEntry[]> => {
    try {
      const { data, error } = await supabase.from('users')
        .select('id, name, photo, xp, fp, level')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .neq('role', 'master_admin')
        .order('xp', { ascending: false })
        .order('name', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((row: any, i: number) => ({
        id: row.id,
        name: row.name || 'Member',
        photo: row.photo ?? null,
        xp: row.xp || 0,
        fp: row.fp || 0,
        level: row.level || 0,
        rank: i + 1,
      }));
    } catch (err) {
      console.error('fetchLeaderboard failed', err);
      return [];
    }
  }, [tenant.id]);

  // ── Award points (generic — used by admin manual award) ────────────────────

  const awardPoints = useCallback(async (
    memberId: string, xpDelta: number, fpDelta: number, note?: string
  ): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.rpc('award_points', {
        p_tenant_id: tenant.id, p_member_id: memberId, p_xp_delta: Math.round(xpDelta),
        p_fp_delta: fpDelta, p_source_type: 'manual', p_source_id: null, p_note: note || 'Manual award',
      });
      if (error) handleError(error);
      // memberId is a valid uuid here (it's the target member's id) — this
      // call site was already correct, unlike the others fixed above.
      await logAudit(tenant.id, 'member_points', memberId, 'update', user?.id, { action: 'manual_award', xp: xpDelta, fp: fpDelta, note });
      addToast(`Awarded ${xpDelta} XP, ${fpDelta} FP`, 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, isAdmin, user]);

  // ── Attendance points (additive, independent of dues) ──────────────────────
  // Writes to users.xp/fp via the award_points_sourced RPC.
  //
  // ── Ledger convention (all three functions below share this contract) ──────
  // An attendance award's source_id is `${eventId}:${status}:${awardId}`,
  // where awardId is a fresh uuid per award — NOT a fixed "eventId:status"
  // key. A fixed key was an earlier bug: reversing an award never removed
  // or relabeled the original row, so re-award checks kept matching stale
  // rows and silently no-op'd. Fix: every award gets a unique id; reversal
  // deletes the original ledger row (after writing an equal-and-opposite
  // audit delta) so a row is either "live" (present, counts) or "gone"
  // (deleted, cannot be matched again).

  const awardAttendancePoints = useCallback(async (
    memberId: string, eventId: string, status: AttendanceStatus, xpAmount: number
  ): Promise<void> => {
    if (xpAmount === 0) return;
    const sourceId = `${eventId}:${status}:${crypto.randomUUID()}`;

    const { error } = await supabase.rpc('award_points_sourced', {
      p_tenant_id: tenant.id, p_member_id: memberId, p_xp_delta: Math.round(xpAmount),
      p_fp_delta: 0, p_source_type: 'attendance', p_source_id: sourceId,
      p_note: `Event attendance — ${status}`,
    });
    if (error) { console.error(error); throw error; }
  }, [tenant.id]);

  /** Reverses every LIVE attendance-sourced ledger entry this member has for
   * one event — used on event delete, and on event edit / status change
   * (old award must be undone before the new one applies). Matches on
   * source_id prefix `${eventId}:`, then filters OUT rows that are
   * themselves reversal audit entries.
   *
   * FIX: a reversal row's own source_id is built as
   * `${originalSourceId}:reversed:${uuid}`, and originalSourceId already
   * starts with `${eventId}:` — so the raw `like` scan matches reversal
   * rows too, not just live awards. Without excluding them, calling
   * reverse a second time for the same event (e.g. two separate edits, or
   * edit-then-delete) re-reverses its own past reversal rows and the
   * balance snowballs up or down depending on call order — this was
   * reproduced exactly (175 -> 225 -> 200 -> edit -> 255 instead of 205
   * -> delete -> 200 instead of 175). Only rows whose source_id does NOT
   * contain ':reversed:' represent a live, un-reversed award; those are
   * the only ones eligible to be reversed and deleted here. */
  const reverseAttendancePoints = useCallback(async (
    memberId: string, eventId: string, reasonNote: string
  ): Promise<void> => {
    const { data: priorEntries } = await supabase.from('point_ledger')
      .select('id, xp_delta, fp_delta, source_id')
      .eq('member_id', memberId).eq('tenant_id', tenant.id)
      .eq('source_type', 'attendance').like('source_id', `${eventId}:%`);

    if (!priorEntries || priorEntries.length === 0) return;

    const liveEntries = priorEntries.filter((e: any) => !e.source_id.includes(':reversed:'));
    if (liveEntries.length === 0) return;

    for (const entry of liveEntries) {
      if (entry.xp_delta || entry.fp_delta) {
        const { error } = await supabase.rpc('award_points_sourced', {
          p_tenant_id: tenant.id, p_member_id: memberId,
          p_xp_delta: -Math.round(entry.xp_delta || 0), p_fp_delta: -(entry.fp_delta || 0),
          p_source_type: 'attendance', p_source_id: `${entry.source_id}:reversed:${crypto.randomUUID()}`,
          p_note: reasonNote,
        });
        if (error) { console.error(error); continue; }
      }
      // Delete the original row so it's structurally impossible for a
      // future reverse/award call to see it again.
      const { error: delErr } = await supabase.from('point_ledger').delete().eq('id', entry.id);
      if (delErr) console.error(delErr);
    }
  }, [tenant.id]);

  /** Used both when an event's per-status XP config is edited AND when a
   * member's marked status changes: reverses whatever was previously
   * awarded to this member for this event (any status), then re-awards at
   * the given status using the given (current/new) xp amount. Since
   * reverseAttendancePoints deletes live original rows and ignores its own
   * past reversal rows, this is a true "set to new value" operation. */
  const adjustAttendanceXpForEdit = useCallback(async (
    memberId: string, eventId: string, currentStatus: AttendanceStatus, newXpAmount: number
  ): Promise<void> => {
    await reverseAttendancePoints(memberId, eventId, 'Event XP config edited — prior award reversed');
    if (newXpAmount !== 0) {
      await awardAttendancePoints(memberId, eventId, currentStatus, newXpAmount);
    }
  }, [reverseAttendancePoints, awardAttendancePoints]);

  // ── Donations (fund-earning) ─────────────────────────────────────────────────

  const fetchDonationPointConfigs = useCallback(async (): Promise<DonationPointConfig[]> => {
    const { data, error } = await supabase.from('donation_point_config').select('*').eq('tenant_id', tenant.id);
    if (error) handleError(error);
    return (data as DonationPointConfig[]) || [];
  }, [tenant.id]);

  const saveDonationPointConfig = useCallback(async (config: Omit<DonationPointConfig, 'id'>): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const id = `${tenant.id}-dpc-${config.fund_account}`;
      const { error } = await supabase.from('donation_point_config').upsert(
        { id, tenant_id: tenant.id, ...config, updated_by: user?.id, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id,fund_account' }
      );
      if (error) handleError(error);
      await logAudit(tenant.id, 'donation_point_config', id, 'update', user?.id, config);
      addToast(`Point config for ${config.fund_account} saved`, 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, isAdmin, user]);

  const snapDonationForWholeXp = useCallback((
    desiredAmount: number, xpPer100: number
  ): { snappedAmount: number; xp: number } => {
    if (xpPer100 <= 0) return { snappedAmount: desiredAmount, xp: 0 };
    const bdtPerXp = 100 / xpPer100;
    const rawXp = desiredAmount / bdtPerXp;
    const wholeXp = Math.ceil(rawXp);
    const snappedAmount = Math.ceil(wholeXp * bdtPerXp * 100) / 100;
    return { snappedAmount, xp: wholeXp };
  }, []);

  const fetchDonations = useCallback(async (): Promise<Donation[]> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('donations')
        .select('*, users!member_id(id,name,email,photo)')
        .eq('tenant_id', tenant.id).order('created_at', { ascending: false });
      if (error) handleError(error);
      return (data as Donation[]) || [];
    } finally {
      setLoading(false);
    }
  }, [tenant.id, isAdmin]);

  const fetchPendingDonations = useCallback(async (): Promise<Donation[]> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.from('donations')
        .select('*, users!member_id(id,name,email,photo)')
        .eq('tenant_id', tenant.id).eq('status', 'pending_verification')
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      return (data as Donation[]) || [];
    } catch (err) {
      console.error('fetchPendingDonations failed', err);
      return [];
    }
  }, [tenant.id]);

  const recordDonation = useCallback(async (input: {
    member_id?: string; member_name?: string; member_email?: string;
    amount: number; currency?: string; fund_account: FundAccount; notes?: string;
  }): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const configs = await fetchDonationPointConfigs();
      const config = configs.find((c) => c.fund_account === input.fund_account);
      const xpRate = config?.xp_per_100 || 0;
      const fpRate = config?.fp_per_100 || 0;

      const { snappedAmount, xp } = snapDonationForWholeXp(input.amount, xpRate);
      const fp = fpRate > 0 ? (snappedAmount / 100) * fpRate : 0;

      const donationId = crypto.randomUUID();
      const { error: dErr } = await supabase.from('donations').insert({
        id: donationId, member_id: input.member_id || null, member_name: input.member_name || null,
        member_email: input.member_email || null, amount: snappedAmount, currency: input.currency || 'BDT',
        fund_account: input.fund_account, xp_reward: xp, fp_reward: fp,
        submission_method: 'admin_direct', status: 'completed',
        notes: input.notes || null, recorded_by: user?.id, tenant_id: tenant.id,
      });
      if (dErr) handleError(dErr);

      const { error: sErr } = await supabase.rpc('settle_donation', { p_donation_id: donationId });
      if (sErr) handleError(sErr);

      await logAudit(tenant.id, 'donations', donationId, 'create', user?.id, { ...input, snapped_amount: snappedAmount, xp, fp });
      addToast(`Donation recorded. XP: +${xp}, FP: +${fp.toFixed(4)}`, 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin, fetchDonationPointConfigs, snapDonationForWholeXp]);

  const submitMemberDonation = useCallback(async (input: {
    amount: number; fund_account: FundAccount; transaction_id: string; sender_bkash_number: string;
  }): Promise<Donation | null> => {
    if (!user) { addToast('You must be signed in', 'error'); return null; }
    if (!input.transaction_id.trim() || !input.sender_bkash_number.trim()) {
      addToast('Transaction ID and sender bKash number are required', 'error');
      return null;
    }
    setLoading(true);
    try {
      const configs = await fetchDonationPointConfigs();
      const config = configs.find((c) => c.fund_account === input.fund_account);
      const xpRate = config?.xp_per_100 || 0;
      const fpRate = config?.fp_per_100 || 0;
      const { snappedAmount, xp } = snapDonationForWholeXp(input.amount, xpRate);
      const fp = fpRate > 0 ? (snappedAmount / 100) * fpRate : 0;

      const { data, error } = await supabase.from('donations').insert({
        member_id: user.id, amount: snappedAmount, currency: 'BDT', fund_account: input.fund_account,
        xp_reward: xp, fp_reward: fp, submission_method: 'member_bkash', status: 'pending_verification',
        transaction_id: input.transaction_id.trim(), sender_bkash_number: input.sender_bkash_number.trim(),
        submitted_at: new Date().toISOString(), tenant_id: tenant.id,
      }).select().single();
      if (error) handleError(error);
      addToast('Donation submitted for verification', 'success');
      return data as Donation;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id, fetchDonationPointConfigs, snapDonationForWholeXp]);

  const verifyDonation = useCallback(async (donationId: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error: uErr } = await supabase.from('donations')
        .update({ status: 'completed', verified_at: new Date().toISOString(), verified_by: user?.id })
        .eq('id', donationId).eq('tenant_id', tenant.id);
      if (uErr) handleError(uErr);

      const { error: sErr } = await supabase.rpc('settle_donation', { p_donation_id: donationId });
      if (sErr) handleError(sErr);

      await logAudit(tenant.id, 'donations', donationId, 'approve', user?.id, { action: 'donation_verified' });
      addToast('Donation verified', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin]);

  const rejectDonation = useCallback(async (donationId: string, reason: string): Promise<void> => {
    requireAdmin();
    if (!reason.trim()) { addToast('A rejection reason is required', 'error'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('donations')
        .update({ status: 'rejected', rejection_reason: reason.trim() })
        .eq('id', donationId).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'donations', donationId, 'reject', user?.id, { reason });
      addToast('Donation rejected', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin]);

  // ── FP redemption catalog ────────────────────────────────────────────────────

  const fetchRedemptionItems = useCallback(async (activeOnly = true): Promise<FpRedemptionItem[]> => {
    let query = supabase.from('fp_redemption_items').select('*').eq('tenant_id', tenant.id).order('fp_cost', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) { console.error(error); return []; }
    return (data as FpRedemptionItem[]) || [];
  }, [tenant.id]);

  const createRedemptionItem = useCallback(async (input: { name: string; description?: string; fp_cost: number }): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase.from('fp_redemption_items').insert({
        tenant_id: tenant.id, ...input, created_by: user?.id,
      }).select().single();
      if (error) handleError(error);
      await logAudit(tenant.id, 'fp_redemption_items', data.id, 'create', user?.id, input);
      addToast('Redemption item created', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin]);

  const updateRedemptionItem = useCallback(async (id: string, updates: Partial<FpRedemptionItem>): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.from('fp_redemption_items').update(updates).eq('id', id).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'fp_redemption_items', id, 'update', user?.id, updates);
      addToast('Redemption item updated', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin]);

  const requestRedemption = useCallback(async (itemId: string): Promise<FpRedemptionRequest | null> => {
    if (!user) { addToast('You must be signed in', 'error'); return null; }
    setLoading(true);
    try {
      const { data: item, error: iErr } = await supabase.from('fp_redemption_items').select('*').eq('id', itemId).single();
      if (iErr) handleError(iErr);

      const points = await fetchMemberPoints(user.id);
      if (points.fp < item.fp_cost) {
        addToast('Insufficient FP balance', 'error');
        return null;
      }

      const { data, error } = await supabase.from('fp_redemption_requests').insert({
        tenant_id: tenant.id, member_id: user.id, item_id: itemId, fp_cost: item.fp_cost,
      }).select().single();
      if (error) handleError(error);
      addToast('Redemption request submitted', 'success');
      return data as FpRedemptionRequest;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id, fetchMemberPoints]);

  const fetchMemberRedemptions = useCallback(async (): Promise<FpRedemptionRequest[]> => {
    if (!user) return [];
    const { data, error } = await supabase.from('fp_redemption_requests')
      .select('*, fp_redemption_items(*)').eq('member_id', user.id).eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data as FpRedemptionRequest[]) || [];
  }, [user, tenant.id]);

  const fetchPendingRedemptions = useCallback(async (): Promise<FpRedemptionRequest[]> => {
    requireAdmin();
    try {
      const { data, error } = await supabase.from('fp_redemption_requests')
        .select('*, fp_redemption_items(*), users!member_id(id,name,email)')
        .eq('tenant_id', tenant.id).eq('status', 'pending').order('created_at', { ascending: true });
      if (error) throw error;
      return (data as FpRedemptionRequest[]) || [];
    } catch (err) {
      console.error('fetchPendingRedemptions failed', err);
      return [];
    }
  }, [tenant.id]);

  const approveRedemption = useCallback(async (requestId: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.rpc('approve_fp_redemption', {
        p_request_id: requestId, p_approver_id: user?.id,
      });
      if (error) handleError(error);
      await logAudit(tenant.id, 'fp_redemption_requests', requestId, 'approve', user?.id);
      addToast('Redemption approved', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin]);

  const rejectRedemption = useCallback(async (requestId: string, reason: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.from('fp_redemption_requests')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', requestId).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'fp_redemption_requests', requestId, 'reject', user?.id, { reason });
      addToast('Redemption rejected', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin]);

  const markRedemptionFulfilled = useCallback(async (requestId: string, note?: string): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { error } = await supabase.from('fp_redemption_requests')
        .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString(), fulfilled_by: user?.id, fulfillment_note: note || null })
        .eq('id', requestId).eq('tenant_id', tenant.id);
      if (error) handleError(error);
      await logAudit(tenant.id, 'fp_redemption_requests', requestId, 'update', user?.id, { action: 'fulfilled', note });
      addToast('Redemption marked fulfilled', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin]);

  // ── FP member-to-member transfers ────────────────────────────────────────────
  // FIX: transfer_fp's old signature (p_tenant_id, p_from_member_id,
  // p_to_member_id, p_amount, p_note) has been DROPPED from the database —
  // only the hardened version (p_tenant_id, p_to_member_id, p_amount,
  // p_note) remains, which resolves the sender from auth.uid() server-side
  // instead of trusting a client-supplied "from" id. p_from_member_id is no
  // longer sent; calling the old signature would now fail with
  // "function transfer_fp(...) does not exist".

  const transferFp = useCallback(async (toMemberId: string, amount: number, note?: string): Promise<boolean> => {
    if (!user) { addToast('You must be signed in', 'error'); return false; }
    if (amount <= 0) { addToast('Amount must be > 0', 'error'); return false; }
    setLoading(true);
    try {
      const { error } = await supabase.rpc('transfer_fp', {
        p_tenant_id: tenant.id, p_to_member_id: toMemberId,
        p_amount: amount, p_note: note || null,
      });
      if (error) throw error;
      addToast(`Sent ${amount} FP`, 'success');
      return true;
    } catch (err: any) {
      addToast(err.message || 'Transfer failed', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  const fetchMemberTransfers = useCallback(async (): Promise<FpTransfer[]> => {
    if (!user) return [];
    const { data, error } = await supabase.from('fp_transfers')
      .select('*').or(`from_member_id.eq.${user.id},to_member_id.eq.${user.id}`)
      .eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(50);
    if (error) { console.error(error); return []; }
    return (data as FpTransfer[]) || [];
  }, [user, tenant.id]);

  return {
    loading,
    fetchCurrentFpRate, fetchFpRateHistory,
    fetchLevelConfigs, saveLevelConfig,
    fetchMemberPoints, fetchMemberPointLedger, fetchLeaderboard, awardPoints,
    awardAttendancePoints, reverseAttendancePoints, adjustAttendanceXpForEdit,
    fetchDonationPointConfigs, saveDonationPointConfig, snapDonationForWholeXp,
    fetchDonations, fetchPendingDonations, recordDonation, submitMemberDonation, verifyDonation, rejectDonation,
    fetchRedemptionItems, createRedemptionItem, updateRedemptionItem,
    requestRedemption, fetchMemberRedemptions, fetchPendingRedemptions,
    approveRedemption, rejectRedemption, markRedemptionFulfilled,
    transferFp, fetchMemberTransfers,
  };
}
