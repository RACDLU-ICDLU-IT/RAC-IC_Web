import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { usePoints, LevelConfig, PointLedgerEntry, FpRedemptionItem, FpRedemptionRequest, FpTransfer, FundAccount, LeaderboardEntry } from '../../hooks/usePoints';
import { supabase } from '../../supabase';
import { Zap, Star, Trophy, TrendingUp, HandCoins, CheckSquare, CreditCard, Wand2, Send, Gift, ArrowLeftRight, Medal } from 'lucide-react';

/* ------------------------------- font loader ------------------------------- */
const INTER_FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
const INTER_LINK_ID = 'rac-dashboard-inter-font';
function useInterFont() {
  useEffect(() => {
    if (document.getElementById(INTER_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = INTER_LINK_ID;
    link.rel = 'stylesheet';
    link.href = INTER_FONT_URL;
    document.head.appendChild(link);
  }, []);
}

/* ------------------------------- palette ------------------------------- */
const PALETTE = {
  rotaract: {
    light: { bg: '#dcd3d6', ptxt: '#161616', pmut: '#8a8f89', dark: '#211c1e', tl: '#eee', lightCard: '#ead9df', td: '#161616', mut: '#7c6c72', border: '#292929', pillBorder: '#3a3a3a', tmid: '#9a9a9a', tsub: '#8f8f8f', green: '#d85283', greenDeep: '#270612', av2: '#db618e', gcA: '#3d0a1c' },
    dark:  { bg: '#0a0a0a', ptxt: '#f2eff0', pmut: '#897e82', dark: '#161616', tl: '#eee', lightCard: '#22181c', td: '#e9dfe3', mut: '#95888d', border: '#262626', pillBorder: '#333', tmid: '#9a9a9a', tsub: '#8f8f8f', green: '#d85283', greenDeep: '#270612', av2: '#db618e', gcA: '#3d0a1c' },
  },
  interact: {
    light: { bg: '#d3d9dc', ptxt: '#161616', pmut: '#8a8f89', dark: '#1c2021', tl: '#eee', lightCard: '#d9e5ea', td: '#161616', mut: '#6c787c', border: '#292929', pillBorder: '#3a3a3a', tmid: '#9a9a9a', tsub: '#8f8f8f', green: '#52b3d8', greenDeep: '#0d1b20', av2: '#61b9db', gcA: '#122b35' },
    dark:  { bg: '#0a0a0a', ptxt: '#eff1f2', pmut: '#7e8689', dark: '#161616', tl: '#eee', lightCard: '#181f22', td: '#dfe6e9', mut: '#889195', border: '#262626', pillBorder: '#333', tmid: '#9a9a9a', tsub: '#8f8f8f', green: '#52b3d8', greenDeep: '#0d1b20', av2: '#61b9db', gcA: '#122b35' },
  },
};
const CLUB_BY_TENANT: Record<string, keyof typeof PALETTE> = { racdlu: 'rotaract', icdlu: 'interact' };
function resolveClub(tenantId: string): keyof typeof PALETTE { return CLUB_BY_TENANT[tenantId] || 'interact'; }

const SOURCE_ICONS: Record<string, React.ElementType> = {
  due_payment: CreditCard, attendance: CheckSquare, donation: HandCoins, manual: Wand2,
  fp_redemption: Gift, fp_transfer_sent: Send, fp_transfer_received: Send, fp_rate_rescale: ArrowLeftRight,
};
const SOURCE_LABELS: Record<string, string> = {
  due_payment: 'Due Payment', attendance: 'Event Attendance', donation: 'Donation', manual: 'Manual Award',
  fp_redemption: 'Redemption', fp_transfer_sent: 'FP Sent', fp_transfer_received: 'FP Received', fp_rate_rescale: 'Rate Adjustment',
};

const FUND_LABELS: Record<FundAccount, string> = { administrative: 'Administrative Fund', project: 'Project Fund', endowment: 'Endowment Fund' };

type Tab = 'overview' | 'wallet' | 'redeem' | 'transfer' | 'donate' | 'leaderboard';

export default function MemberPoints() {
  const { user, profile } = useAuth();
  const { tenant } = useTenant();
  const {
    loading, fetchMemberPoints, fetchMemberPointLedger, fetchLevelConfigs,
    fetchCurrentFpRate, fetchRedemptionItems, requestRedemption, fetchMemberRedemptions,
    transferFp, fetchMemberTransfers, fetchDonationPointConfigs, submitMemberDonation,
    snapDonationForWholeXp, fetchLeaderboard,
  } = usePoints();

  const club = resolveClub(tenant.id);
  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = PALETTE[club][dark ? 'dark' : 'light'];

  const [tab, setTab] = useState<Tab>('overview');
  const [points, setPoints] = useState({ xp: 0, fp: 0, level: 0 });
  const [ledger, setLedger] = useState<PointLedgerEntry[]>([]);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [fpRate, setFpRate] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);

  // Redemption
  const [items, setItems] = useState<FpRedemptionItem[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<FpRedemptionRequest[]>([]);
  const [redeemConfirm, setRedeemConfirm] = useState<FpRedemptionItem | null>(null);
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);

  // Transfer
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [transfers, setTransfers] = useState<FpTransfer[]>([]);
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Donate
  const [donationConfigs, setDonationConfigs] = useState<Record<string, { xp_per_100: number; fp_per_100: number }>>({});
  const [donateFund, setDonateFund] = useState<FundAccount>('administrative');
  const [donateAmount, setDonateAmount] = useState('');
  const [donateTxnId, setDonateTxnId] = useState('');
  const [donateSender, setDonateSender] = useState('');
  const [donateSubmitting, setDonateSubmitting] = useState(false);
  const [donateError, setDonateError] = useState<string | null>(null);
  const [donateSubmitted, setDonateSubmitted] = useState(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);

  useEffect(() => { if (user) loadAll(); }, [user?.id, tenant.id]);
  useEffect(() => { if (user && tab === 'leaderboard' && !leaderboardLoaded) loadLeaderboard(); }, [user?.id, tab]);

  const loadAll = async () => {
    if (!user) return;
    setPageLoading(true);
    const [pts, led, lvls, rate, redItems, myReds, myTransfers, dConfigs] = await Promise.all([
      fetchMemberPoints(user.id), fetchMemberPointLedger(user.id), fetchLevelConfigs(),
      fetchCurrentFpRate(), fetchRedemptionItems(true), fetchMemberRedemptions(),
      fetchMemberTransfers(), fetchDonationPointConfigs(),
    ]);
    setPoints(pts); setLedger(led); setLevelConfigs(lvls); setFpRate(rate);
    setItems(redItems); setMyRedemptions(myReds); setTransfers(myTransfers);

    const map: Record<string, { xp_per_100: number; fp_per_100: number }> = {};
    dConfigs.forEach((c) => { map[c.fund_account] = { xp_per_100: c.xp_per_100, fp_per_100: c.fp_per_100 }; });
    setDonationConfigs(map);

    const { data: memberList } = await supabase.from('users').select('id, name').eq('tenant_id', tenant.id).eq('status', 'active').neq('id', user.id);
    setMembers(memberList || []);

    setPageLoading(false);
  };

  const loadLeaderboard = async () => {
    if (!user) return;
    setLeaderboardError(null);
    try {
      // fetchLeaderboard reads users.xp/fp/level directly (the live schema —
      // see usePoints' fetchMemberPoints), scoped to this tenant, active
      // members only, and already excludes master_admin server-side.
      const rows = await fetchLeaderboard();
      setLeaderboard(rows);
      const mine = rows.find((r) => r.id === user.id);
      setMyRank(mine ? mine.rank : null);
    } catch (err) {
      setLeaderboardError("Couldn't load the leaderboard. Pull to refresh and try again.");
    } finally {
      setLeaderboardLoaded(true);
    }
  };

  const currentLevelConfig = levelConfigs.find((c) => c.level === points.level);
  const nextLevel = levelConfigs.find((c) => c.level === points.level + 1);
  const currentLevelXP = currentLevelConfig?.xp_required || 0;
  const nextLevelXP = nextLevel?.xp_required || currentLevelXP;
  const xpIntoCurrentLevel = Math.max(0, points.xp - currentLevelXP);
  const xpNeededForNextLevel = Math.max(1, nextLevelXP - currentLevelXP);
  const progressPct = nextLevel ? Math.min(100, Math.round((xpIntoCurrentLevel / xpNeededForNextLevel) * 100)) : 100;

  const fmtAmount = (n: number) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(n || 0);

  const handleRedeem = async () => {
    if (!redeemConfirm) return;
    setRedeemSubmitting(true);
    const result = await requestRedemption(redeemConfirm.id);
    setRedeemSubmitting(false);
    if (result) { setRedeemConfirm(null); loadAll(); }
  };

  const handleTransfer = async () => {
    setTransferError(null);
    const amt = Number(transferAmount);
    if (!transferTo) { setTransferError('Select a recipient.'); return; }
    if (amt <= 0) { setTransferError('Enter a valid amount.'); return; }
    if (amt > points.fp) { setTransferError('Insufficient FP balance.'); return; }
    setTransferSubmitting(true);
    const ok = await transferFp(transferTo, amt, transferNote || undefined);
    setTransferSubmitting(false);
    if (ok) { setTransferTo(''); setTransferAmount(''); setTransferNote(''); loadAll(); }
  };

  const donateConfig = donationConfigs[donateFund] || { xp_per_100: 0, fp_per_100: 0 };
  const donateAmountNum = Number(donateAmount) || 0;
  const { snappedAmount, xp: previewXp } = donateAmountNum > 0
    ? snapDonationForWholeXp(donateAmountNum, donateConfig.xp_per_100)
    : { snappedAmount: 0, xp: 0 };
  const previewFp = donateConfig.fp_per_100 > 0 ? (snappedAmount / 100) * donateConfig.fp_per_100 : 0;

  const handleDonate = async () => {
    setDonateError(null);
    if (donateAmountNum <= 0) { setDonateError('Enter an amount.'); return; }
    if (!donateTxnId.trim() || !donateSender.trim()) { setDonateError('Transaction ID and sender bKash number are required.'); return; }
    setDonateSubmitting(true);
    const result = await submitMemberDonation({
      amount: donateAmountNum, fund_account: donateFund,
      transaction_id: donateTxnId.trim(), sender_bkash_number: donateSender.trim(),
    });
    setDonateSubmitting(false);
    if (result) {
      setDonateSubmitted(true);
      setDonateAmount(''); setDonateTxnId(''); setDonateSender('');
      setTimeout(() => setDonateSubmitted(false), 4000);
    } else {
      setDonateError("Couldn't submit — check the details and try again.");
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'wallet', label: 'Wallet' },
    { key: 'redeem', label: 'Redeem' },
    { key: 'transfer', label: 'Send FP' },
    { key: 'donate', label: 'Earn Points' },
    { key: 'leaderboard', label: 'Leaderboard' },
  ];

  if (pageLoading) {
    return (
      <div role="status" aria-busy="true" style={{ background: p.bg, padding: 18, borderRadius: 20 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="!grid-cols-1 sm:!grid-cols-2">
            {[0, 1].map((i) => <div key={i} style={{ height: 140, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rac-points-page">
      <style>{`
        .rac-points-page, .rac-points-page * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
        .rac-points-page ::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, borderRadius: 20 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* page-top */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>My Points</span>
            <span style={{ fontSize: 11, color: p.pmut, fontWeight: 500 }}>1 FP = {fpRate} BDT</span>
          </div>

          {/* tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '7px 14px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', border: `1px solid ${tab === t.key ? p.green : p.pillBorder}`, background: tab === t.key ? p.green : 'none', color: tab === t.key ? '#fff' : p.tmid, cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ============ OVERVIEW ============ */}
          {tab === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="!grid-cols-1 sm:!grid-cols-2">
                <div style={{ borderRadius: 20, padding: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: p.greenDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Zap size={22} color={p.av2} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{points.xp.toLocaleString()}</div>
                  <div style={{ fontSize: 10.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Experience Points</div>
                </div>
                <div style={{ borderRadius: 20, padding: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: p.gcA, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Star size={22} color={p.green} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{points.fp.toFixed(2)}</div>
                  <div style={{ fontSize: 10.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Foundation Points ({fmtAmount(points.fp * fpRate)})</div>
                </div>
              </div>

              <div style={{ borderRadius: 20, padding: 16, marginBottom: 12, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${p.av2}, ${p.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy size={24} color="#1b0c12" />
                    </div>
                    <span style={{ position: 'absolute', top: -6, right: -6, background: p.green, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 20 }}>Lv {points.level}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Current Level</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{currentLevelConfig?.label || `Level ${points.level}`}</div>
                    {nextLevel ? (
                      <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={11} /> Next: <b style={{ color: p.tl }}>{nextLevel.label || `Level ${nextLevel.level}`}</b> at {nextLevel.xp_required.toLocaleString()} XP
                      </div>
                    ) : points.level > 0 ? <div style={{ fontSize: 10.5, color: p.green, fontWeight: 700, marginTop: 3 }}>Max level reached</div> : null}
                  </div>
                </div>
                {nextLevel && (
                  <div style={{ marginTop: 16, borderTop: `1px solid ${p.border}`, paddingTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10.5 }}>
                      <span style={{ color: p.tsub, fontWeight: 600 }}>Progress</span>
                      <span style={{ color: p.tsub, fontWeight: 600 }}>{xpIntoCurrentLevel.toLocaleString()} / {xpNeededForNextLevel.toLocaleString()} XP</span>
                    </div>
                    <div style={{ height: 6, background: p.border, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: p.green, borderRadius: 6, transition: 'width .7s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${p.border}` }}><span style={{ fontSize: 13, fontWeight: 600 }}>Point History</span></div>
                {ledger.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 11.5, color: p.tsub }}>No point history yet.</div>
                ) : (
                  <div>
                    {ledger.map((entry, i) => {
                      const Icon = SOURCE_ICONS[entry.source_type] || Wand2;
                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: p.lightCard, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={15} color={p.mut} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{SOURCE_LABELS[entry.source_type] || entry.source_type}</div>
                            {entry.note && <div style={{ fontSize: 10.5, color: p.tsub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.note}</div>}
                            <div style={{ fontSize: 9.5, color: p.tmid, marginTop: 2 }}>{new Date(entry.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            {entry.xp_delta !== 0 && <div style={{ fontSize: 12, fontWeight: 700, color: entry.xp_delta > 0 ? p.av2 : '#e0726a' }}>{entry.xp_delta > 0 ? '+' : ''}{entry.xp_delta} XP</div>}
                            {entry.fp_delta !== 0 && <div style={{ fontSize: 12, fontWeight: 700, color: entry.fp_delta > 0 ? p.green : '#e0726a' }}>{entry.fp_delta > 0 ? '+' : ''}{entry.fp_delta.toFixed(4)} FP</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ============ WALLET (FP focus, backing info) ============ */}
          {tab === 'wallet' && (
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>FP Wallet</div>
              <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{points.fp.toFixed(4)} FP</div>
              <div style={{ fontSize: 12, color: p.tsub, marginBottom: 16 }}>≈ {fmtAmount(points.fp * fpRate)} at current rate</div>
              <div style={{ borderRadius: 14, padding: 14, background: p.lightCard, color: p.td, fontSize: 11.5, lineHeight: 1.55 }}>
                <b style={{ display: 'block', fontSize: 12.5, marginBottom: 3 }}>What is FP?</b>
                <span style={{ color: p.mut }}>
                  FP is an internal currency backed 1:1 by the club's Endowment Fund. You can pay dues with it,
                  redeem it for rewards, or send it to other members. It never expires.
                </span>
              </div>
            </div>
          )}

          {/* ============ REDEEM ============ */}
          {tab === 'redeem' && (
            <div className="space-y-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="!grid-cols-1 sm:!grid-cols-2">
                {items.map((item) => (
                  <div key={item.id} style={{ borderRadius: 16, padding: 16, background: p.dark, border: `1px solid ${p.border}`, color: p.tl }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{item.name}</div>
                    {item.description && <div style={{ fontSize: 11, color: p.tsub, marginBottom: 10 }}>{item.description}</div>}
                    <div style={{ fontSize: 15, fontWeight: 700, color: p.av2, marginBottom: 12 }}>{item.fp_cost} FP</div>
                    <button type="button" disabled={points.fp < item.fp_cost} onClick={() => setRedeemConfirm(item)}
                      style={{ width: '100%', padding: '9px 0', borderRadius: 12, border: 'none', background: points.fp >= item.fp_cost ? p.green : p.border, color: points.fp >= item.fp_cost ? '#fff' : p.tmid, fontSize: 12, fontWeight: 700, cursor: points.fp >= item.fp_cost ? 'pointer' : 'not-allowed' }}>
                      {points.fp >= item.fp_cost ? 'Redeem' : 'Insufficient FP'}
                    </button>
                  </div>
                ))}
                {items.length === 0 && <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: p.tsub, fontSize: 12 }}>No redemption items available yet.</div>}
              </div>

              {myRedemptions.length > 0 && (
                <div style={{ borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${p.border}` }}><span style={{ fontSize: 13, fontWeight: 600 }}>My Redemptions</span></div>
                  {myRedemptions.map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.fp_redemption_items?.name}</div>
                        <div style={{ fontSize: 10, color: p.tmid }}>{new Date(r.created_at).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, background: r.status === 'approved' || r.status === 'fulfilled' ? '#1c3a2a' : r.status === 'rejected' ? '#3a1a14' : '#3a2f14', color: r.status === 'approved' || r.status === 'fulfilled' ? '#6fcf97' : r.status === 'rejected' ? '#e0726a' : '#e0b96a' }}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ SEND FP ============ */}
          {tab === 'transfer' && (
            <div className="space-y-4">
              <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Send FP to a Member</div>

                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', marginBottom: 6 }}>Recipient</label>
                <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${p.border}`, background: 'none', color: p.tl, fontSize: 13, marginBottom: 12 }}>
                  <option value="">Select member…</option>
                  {members.map((m) => <option key={m.id} value={m.id} style={{ color: '#000' }}>{m.name}</option>)}
                </select>

                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', marginBottom: 6 }}>Amount (max {points.fp.toFixed(4)} FP)</label>
                <input type="number" min="0" step="0.0001" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${p.border}`, background: 'none', color: p.tl, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />

                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', marginBottom: 6 }}>Note (optional)</label>
                <input value={transferNote} onChange={(e) => setTransferNote(e.target.value)}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${p.border}`, background: 'none', color: p.tl, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />

                {transferError && <div style={{ fontSize: 11, color: '#e0726a', marginBottom: 8 }}>{transferError}</div>}

                <button type="button" onClick={handleTransfer} disabled={transferSubmitting}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: p.green, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: transferSubmitting ? 0.6 : 1 }}>
                  {transferSubmitting ? 'Sending…' : 'Send FP'}
                </button>
              </div>

              {transfers.length > 0 && (
                <div style={{ borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${p.border}` }}><span style={{ fontSize: 13, fontWeight: 600 }}>Transfer History</span></div>
                  {transfers.map((t, i) => {
                    const sent = t.from_member_id === user?.id;
                    return (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                        <div style={{ fontSize: 12, color: p.tsub }}>{sent ? 'Sent' : 'Received'} · {new Date(t.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: sent ? '#e0726a' : p.green }}>{sent ? '-' : '+'}{t.amount.toFixed(2)} FP</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============ EARN POINTS (DONATE) ============ */}
          {tab === 'donate' && (
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Donate to Earn Points</div>

              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', marginBottom: 6 }}>Fund</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['administrative', 'project', 'endowment'] as FundAccount[]).map((fa) => (
                  <button key={fa} type="button" onClick={() => setDonateFund(fa)}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 12, border: `1px solid ${donateFund === fa ? p.green : p.pillBorder}`, background: donateFund === fa ? p.green : 'none', color: donateFund === fa ? '#fff' : p.tmid, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {FUND_LABELS[fa].replace(' Fund', '')}
                  </button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', marginBottom: 6 }}>Amount (BDT)</label>
              <input type="number" min="0" step="1" value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${p.border}`, background: 'none', color: p.tl, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />

              {donateAmountNum > 0 && (
                <div style={{ borderRadius: 12, padding: 12, background: p.lightCard, color: p.td, marginBottom: 14, fontSize: 11.5 }}>
                  {snappedAmount !== donateAmountNum && (
                    <div style={{ marginBottom: 6 }}>Rounded up to <b>{fmtAmount(snappedAmount)}</b> for a clean XP reward.</div>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: p.mut }}>You'll earn:</span>
                    {previewXp > 0 && <b style={{ color: '#c99a3c' }}>+{previewXp} XP</b>}
                    {previewFp > 0 && <b style={{ color: p.green }}>+{previewFp.toFixed(4)} FP</b>}
                    {previewXp === 0 && previewFp === 0 && <span style={{ color: p.mut }}>No reward configured for this fund yet.</span>}
                  </div>
                </div>
              )}

              <div style={{ borderRadius: 14, padding: 14, background: p.lightCard, color: p.td, marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, color: p.mut, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Send to bKash (Send Money)</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Contact treasurer for number</div>
              </div>

              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', marginBottom: 6 }}>Your bKash Number</label>
              <input value={donateSender} onChange={(e) => setDonateSender(e.target.value)} placeholder="01XXXXXXXXX"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${p.border}`, background: 'none', color: p.tl, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />

              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', marginBottom: 6 }}>Transaction ID</label>
              <input value={donateTxnId} onChange={(e) => setDonateTxnId(e.target.value)} placeholder="e.g. DFT9TSEI91"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${p.border}`, background: 'none', color: p.tl, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />

              {donateError && <div style={{ fontSize: 11, color: '#e0726a', marginBottom: 8 }}>{donateError}</div>}
              {donateSubmitted && <div style={{ fontSize: 11, color: p.green, marginBottom: 8 }}>Submitted for verification — points will be awarded once confirmed.</div>}

              <button type="button" onClick={handleDonate} disabled={donateSubmitting}
                style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: p.green, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: donateSubmitting ? 0.6 : 1 }}>
                {donateSubmitting ? 'Submitting…' : 'Submit for Verification'}
              </button>
            </div>
          )}

          {/* ============ LEADERBOARD ============ */}
          {tab === 'leaderboard' && (
            <div className="space-y-3">
              {/* Your position */}
              <div style={{ borderRadius: 20, padding: 18, background: `linear-gradient(135deg, ${p.gcA}, ${p.dark})`, color: p.tl, border: `1px solid ${p.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: p.greenDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trophy size={24} color={p.av2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Your Position</div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>
                      {!leaderboardLoaded ? '—' : myRank ? `#${myRank}` : 'Unranked'}
                      {leaderboardLoaded && leaderboard.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: p.tsub, marginLeft: 8 }}>of {leaderboard.length}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: p.av2 }}>{points.xp.toLocaleString()}</div>
                    <div style={{ fontSize: 9.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase' }}>XP</div>
                  </div>
                </div>
              </div>

              {/* Ranked list */}
              <div style={{ borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${p.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Ranked by XP</span>
                  <span style={{ fontSize: 9.5, color: p.tmid, fontWeight: 600 }}>Live standings</span>
                </div>

                {!leaderboardLoaded && !leaderboardError && (
                  <div style={{ padding: 4 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                        <div className="animate-pulse" style={{ width: 26, height: 14, borderRadius: 4, background: p.border }} />
                        <div className="animate-pulse" style={{ width: 34, height: 34, borderRadius: '50%', background: p.border }} />
                        <div className="animate-pulse" style={{ flex: 1, height: 12, borderRadius: 4, background: p.border }} />
                        <div className="animate-pulse" style={{ width: 48, height: 12, borderRadius: 4, background: p.border }} />
                      </div>
                    ))}
                  </div>
                )}

                {leaderboardError && (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11.5, color: p.tsub, marginBottom: 12 }}>{leaderboardError}</div>
                    <button type="button" onClick={() => { setLeaderboardLoaded(false); loadLeaderboard(); }}
                      style={{ padding: '8px 16px', borderRadius: 12, border: `1px solid ${p.pillBorder}`, background: 'none', color: p.tl, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                      Retry
                    </button>
                  </div>
                )}

                {leaderboardLoaded && !leaderboardError && leaderboard.length === 0 && (
                  <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 11.5, color: p.tsub }}>No ranked members yet.</div>
                )}

                {leaderboardLoaded && !leaderboardError && leaderboard.length > 0 && (
                  <div>
                    {leaderboard.map((m, i) => {
                      const isMe = m.id === user?.id;
                      const initials = m.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
                      const medalColor = m.rank === 1 ? '#e0b64a' : m.rank === 2 ? '#c3c9d1' : m.rank === 3 ? '#c17a4a' : null;
                      return (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                          borderTop: i === 0 ? 'none' : `1px solid ${p.border}`,
                          background: isMe ? p.lightCard : 'none',
                        }}>
                          <div style={{ width: 26, flexShrink: 0, textAlign: 'center' }}>
                            {medalColor ? (
                              <Medal size={17} color={medalColor} fill={medalColor} fillOpacity={0.18} />
                            ) : (
                              <span style={{ fontSize: 12, fontWeight: 700, color: p.tmid }}>{m.rank}</span>
                            )}
                          </div>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: isMe ? p.green : p.lightCard, color: isMe ? '#fff' : (dark ? p.td : p.mut),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11.5, fontWeight: 700, overflow: 'hidden',
                          }}>
                            {m.photo ? (
                              <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: isMe ? p.td : p.tl, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {m.name}
                              {isMe && <span style={{ fontSize: 9, fontWeight: 700, color: p.green, textTransform: 'uppercase' }}>You</span>}
                            </div>
                            <div style={{ fontSize: 9.5, color: p.tmid, marginTop: 1 }}>Level {m.level}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: p.av2 }}>{m.xp.toLocaleString()} <span style={{ fontSize: 9.5, fontWeight: 600, color: p.tmid }}>XP</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Redeem confirm modal */}
      {redeemConfirm && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => !redeemSubmitting && setRedeemConfirm(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: p.dark, color: p.tl, borderRadius: 20, width: '100%', maxWidth: 380, border: `1px solid ${p.border}`, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Redeem {redeemConfirm.name}?</div>
            <div style={{ fontSize: 13, color: p.tsub, marginBottom: 16 }}>This will submit a request for admin approval and deduct <b style={{ color: p.tl }}>{redeemConfirm.fp_cost} FP</b> once approved.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setRedeemConfirm(null)} disabled={redeemSubmitting} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${p.pillBorder}`, background: 'none', color: p.tmid, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRedeem} disabled={redeemSubmitting} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: p.green, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: redeemSubmitting ? 0.6 : 1 }}>
                {redeemSubmitting ? 'Submitting…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
