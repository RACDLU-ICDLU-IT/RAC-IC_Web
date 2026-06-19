import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from './useTenant';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LevelConfig {
  id: string;
  tenant_id: string;
  level: number;
  xp_required: number;
  label?: string;
}

export interface DonationPointConfig {
  id: string;
  tenant_id: string;
  fund_account: 'administrative' | 'project' | 'endowment';
  xp_per_100: number;
  fp_per_100: number;
}

export interface FundAccount {
  id: string;
  tenant_id: string;
  account_type: 'administrative' | 'project' | 'endowment';
  balance: number;
  total_in: number;
  total_out: number;
  updated_at: string;
}

export interface Donation {
  id: string;
  member_id?: string;
  member_name?: string;
  member_email?: string;
  amount: number;
  currency: string;
  fund_account: 'administrative' | 'project' | 'endowment';
  xp_reward: number;
  fp_reward: number;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  recorded_by?: string;
  tenant_id: string;
  created_at: string;
  users?: { id: string; name: string; email: string; photo?: string };
}

export interface PointLedgerEntry {
  id: string;
  member_id: string;
  tenant_id: string;
  xp_delta: number;
  fp_delta: number;
  source_type: 'due_payment' | 'attendance' | 'donation' | 'manual';
  source_id?: string;
  note?: string;
  created_at: string;
}

export interface MemberPoints {
  xp: number;
  fp: number;
  level: number;
}

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

  const err = (e: any) => {
    console.error(e);
    addToast(e?.message || 'An error occurred', 'error');
    throw e;
  };

  // ── Level Configs ──────────────────────────────────────────────────────────

  const fetchLevelConfigs = useCallback(async (): Promise<LevelConfig[]> => {
    const { data, error } = await supabase
      .from('level_config')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('level', { ascending: true });
    if (error) err(error);
    return (data as LevelConfig[]) || [];
  }, [tenant.id]);

  const saveLevelConfig = useCallback(async (configs: Omit<LevelConfig, 'id'>[]): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      await supabase.from('level_config').delete().eq('tenant_id', tenant.id);
      const rows = configs.map((c, i) => ({
        id: `${tenant.id}-lvl-${c.level}-${Date.now()}-${i}`,
        tenant_id: tenant.id,
        level: c.level,
        xp_required: c.xp_required,
        label: c.label || null,
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from('level_config').insert(rows);
        if (error) err(error);
      }
      addToast('Level configuration saved', 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, isAdmin]);

  // ── Donation Point Configs ─────────────────────────────────────────────────

  const fetchDonationPointConfigs = useCallback(async (): Promise<DonationPointConfig[]> => {
    const { data, error } = await supabase
      .from('donation_point_config')
      .select('*')
      .eq('tenant_id', tenant.id);
    if (error) err(error);
    return (data as DonationPointConfig[]) || [];
  }, [tenant.id]);

  const saveDonationPointConfig = useCallback(async (config: Omit<DonationPointConfig, 'id'>): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const id = `${tenant.id}-dpc-${config.fund_account}`;
      const { error } = await supabase.from('donation_point_config').upsert({
        id,
        ...config,
        tenant_id: tenant.id,
      });
      if (error) err(error);
      addToast(`Point config for ${config.fund_account} saved`, 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, isAdmin]);

  // ── Fund Accounts ──────────────────────────────────────────────────────────

  const fetchFundAccounts = useCallback(async (): Promise<FundAccount[]> => {
    const { data, error } = await supabase
      .from('fund_accounts')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('account_type');
    if (error) err(error);
    return (data as FundAccount[]) || [];
  }, [tenant.id]);

  const adjustFundBalance = useCallback(async (
    accountType: 'administrative' | 'project' | 'endowment',
    amount: number,
    direction: 'in' | 'out'
  ): Promise<void> => {
    const id = `${tenant.id}-${accountType}`;
    const { data: existing } = await supabase.from('fund_accounts').select('*').eq('id', id).single();

    const current = existing || { balance: 0, total_in: 0, total_out: 0 };
    const newBalance = (current.balance || 0) + (direction === 'in' ? amount : -amount);
    const newTotalIn = (current.total_in || 0) + (direction === 'in' ? amount : 0);
    const newTotalOut = (current.total_out || 0) + (direction === 'out' ? amount : 0);

    const { error } = await supabase.from('fund_accounts').upsert({
      id,
      tenant_id: tenant.id,
      account_type: accountType,
      balance: Math.max(0, newBalance),
      total_in: newTotalIn,
      total_out: newTotalOut,
      updated_at: new Date().toISOString(),
    });
    if (error) err(error);
  }, [tenant.id]);

  // ── Points Awarding ────────────────────────────────────────────────────────

  const awardPoints = useCallback(async (
    memberId: string,
    xpDelta: number,
    fpDelta: number,
    sourceType: PointLedgerEntry['source_type'],
    sourceId?: string,
    note?: string
  ): Promise<void> => {
    requireAdmin();
    if (xpDelta === 0 && fpDelta === 0) return;

    const { error: ledgerError } = await supabase.from('point_ledger').insert({
      id: crypto.randomUUID(),
      member_id: memberId,
      tenant_id: tenant.id,
      xp_delta: xpDelta,
      fp_delta: fpDelta,
      source_type: sourceType,
      source_id: sourceId || null,
      note: note || null,
    });
    if (ledgerError) err(ledgerError);

    const { data: memberData } = await supabase
      .from('users')
      .select('xp, fp')
      .eq('id', memberId)
      .single();

    const currentXP = memberData?.xp || 0;
    const currentFP = memberData?.fp || 0;
    const newXP = Math.max(0, currentXP + xpDelta);
    const newFP = Math.max(0, currentFP + fpDelta);

    const { data: levelData } = await supabase
      .from('level_config')
      .select('level, xp_required')
      .eq('tenant_id', tenant.id)
      .lte('xp_required', newXP)
      .order('level', { ascending: false })
      .limit(1);

    const newLevel = levelData?.[0]?.level || 0;

    const { error: updateError } = await supabase
      .from('users')
      .update({ xp: newXP, fp: newFP, level: newLevel })
      .eq('id', memberId);
    if (updateError) err(updateError);
  }, [tenant.id, isAdmin]);

  // ── Donations ──────────────────────────────────────────────────────────────

  const fetchDonations = useCallback(async (): Promise<Donation[]> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*, users!member_id(id,name,email,photo)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });
      if (error) err(error);
      return (data as Donation[]) || [];
    } finally {
      setLoading(false);
    }
  }, [tenant.id, isAdmin]);

  const recordDonation = useCallback(async (input: {
    member_id?: string;
    member_name?: string;
    member_email?: string;
    amount: number;
    currency?: string;
    fund_account: 'administrative' | 'project' | 'endowment';
    notes?: string;
    xp_override?: number;
    fp_override?: number;
  }): Promise<void> => {
    requireAdmin();
    setLoading(true);
    try {
      const { data: configData } = await supabase
        .from('donation_point_config')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('fund_account', input.fund_account)
        .single();

      const config = configData as DonationPointConfig | null;
      const xpReward = input.xp_override !== undefined
        ? input.xp_override
        : config ? Math.floor((input.amount / 100) * config.xp_per_100) : 0;
      const fpReward = input.fp_override !== undefined
        ? input.fp_override
        : config ? Math.floor((input.amount / 100) * config.fp_per_100) : 0;

      const donationId = crypto.randomUUID();
      const { error: donationError } = await supabase.from('donations').insert({
        id: donationId,
        member_id: input.member_id || null,
        member_name: input.member_name || null,
        member_email: input.member_email || null,
        amount: input.amount,
        currency: input.currency || 'BDT',
        fund_account: input.fund_account,
        xp_reward: xpReward,
        fp_reward: fpReward,
        notes: input.notes || null,
        status: 'completed',
        recorded_by: user?.id || null,
        tenant_id: tenant.id,
      });
      if (donationError) err(donationError);

      await adjustFundBalance(input.fund_account, input.amount, 'in');

      if (fpReward > 0 && input.fund_account !== 'endowment') {
        await adjustFundBalance('endowment', fpReward, 'in');
      }

      if (input.member_id && (xpReward > 0 || fpReward > 0)) {
        await awardPoints(
          input.member_id, xpReward, fpReward, 'donation', donationId,
          `Donation to ${input.fund_account} fund`
        );
      }

      addToast(`Donation recorded. XP: +${xpReward}, FP: +${fpReward}`, 'success');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, user, isAdmin, adjustFundBalance, awardPoints]);

  // ── Point Ledger (member self-view) ───────────────────────────────────────

  const fetchMemberPointLedger = useCallback(async (memberId: string): Promise<PointLedgerEntry[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('point_ledger')
      .select('*')
      .eq('member_id', memberId)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error(error); return []; }
    return (data as PointLedgerEntry[]) || [];
  }, [tenant.id, user]);

  const fetchMemberPoints = useCallback(async (memberId: string): Promise<MemberPoints> => {
    const { data } = await supabase
      .from('users')
      .select('xp, fp, level')
      .eq('id', memberId)
      .single();
    return { xp: data?.xp || 0, fp: data?.fp || 0, level: data?.level || 0 };
  }, []);

  // ── Award on Fee Payment (called from AdminDues) ───────────────────────────

  const awardDuePoints = useCallback(async (
    memberId: string,
    templateId: string,
    ledgerId: string
  ): Promise<void> => {
    const { data: existing } = await supabase
      .from('point_ledger')
      .select('id')
      .eq('member_id', memberId)
      .eq('source_type', 'due_payment')
      .eq('source_id', ledgerId)
      .eq('tenant_id', tenant.id)
      .limit(1);
    if (existing && existing.length > 0) return;

    const { data: template } = await supabase
      .from('fee_templates')
      .select('xp_reward, fp_reward, amount, fund_account')
      .eq('id', templateId)
      .single();
    if (!template) return;

    const xp = template.xp_reward || 0;
    const fp = template.fp_reward || 0;
    const fundAccount = (template.fund_account || 'administrative') as 'administrative' | 'project' | 'endowment';

    await adjustFundBalance(fundAccount, template.amount || 0, 'in');

    if (fp > 0 && fundAccount !== 'endowment') {
      await adjustFundBalance('endowment', fp, 'in');
    }

    if (xp > 0 || fp > 0) {
      await awardPoints(memberId, xp, fp, 'due_payment', ledgerId, 'Fee/due payment');
    }
  }, [adjustFundBalance, awardPoints, tenant.id]);

  // ── Award on Event Attendance ──────────────────────────────────────────────

  const awardAttendancePoints = useCallback(async (
    memberId: string,
    eventId: string
  ): Promise<void> => {
    const { data: event } = await supabase
      .from('events')
      .select('xp_reward, fp_reward')
      .eq('id', eventId)
      .single();
    if (!event) return;

    const xp = event.xp_reward || 0;
    const fp = event.fp_reward || 0;
    if (xp === 0 && fp === 0) return;

    const { data: existing } = await supabase
      .from('point_ledger')
      .select('id')
      .eq('member_id', memberId)
      .eq('source_type', 'attendance')
      .eq('source_id', eventId)
      .eq('tenant_id', tenant.id)
      .limit(1);
    if (existing && existing.length > 0) return;

    await awardPoints(memberId, xp, fp, 'attendance', eventId, 'Event attendance');
  }, [awardPoints, tenant.id]);

  return {
    loading,
    fetchLevelConfigs,
    saveLevelConfig,
    fetchDonationPointConfigs,
    saveDonationPointConfig,
    fetchFundAccounts,
    adjustFundBalance,
    awardPoints,
    fetchDonations,
    recordDonation,
    fetchMemberPointLedger,
    fetchMemberPoints,
    awardDuePoints,
    awardAttendancePoints,
  };
}
