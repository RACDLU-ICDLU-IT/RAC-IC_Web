import React, { useEffect, useState } from 'react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { usePoints, LevelConfig, DonationPointConfig, Donation, FpRedemptionItem, FpRedemptionRequest, FundAccount } from '../../hooks/usePoints';
import { useApprovals } from '../../hooks/useApprovals';
import { useToast } from '../../hooks/useToast';
import { getClubPalette } from '../../theme/racPalette';

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

function fmtAmount(n: number) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(n || 0);
}
function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const FUND_LABELS: Record<FundAccount, string> = {
  administrative: 'Administrative Fund',
  project: 'Project Fund',
  endowment: 'Endowment Fund',
};

const DEFAULT_LABELS = ['Starter', 'Member', 'Active', 'Contributor', 'Senior', 'Leader', 'Champion', 'Foundation Builder', 'Rotary Fellow', 'PHF Candidate'];

/** Redemption limit mode for a catalog item. 'one_time' = each member
 * can redeem once ever. 'unlimited' = no cap. 'limited' = capped at
 * max_redemptions attempts (per member). Stored on FpRedemptionItem as
 * redemption_type + max_redemptions — additive fields, existing items
 * without them are treated as 'unlimited' (today's implicit behavior). */
type RedemptionType = 'one_time' | 'unlimited' | 'limited';

const TABS = [
  { key: 'levels', label: 'Level Config' },
  { key: 'fprate', label: 'FP Exchange Rate' },
  { key: 'donations', label: 'Donation Rewards' },
  { key: 'pending-donations', label: 'Pending Donations' },
  { key: 'redemption', label: 'Redemption Catalog' },
  { key: 'pending-redemptions', label: 'Pending Redemptions' },
] as const;

export default function AdminPoints() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const {
    loading,
    fetchCurrentFpRate, fetchFpRateHistory,
    fetchLevelConfigs, saveLevelConfig,
    fetchDonationPointConfigs, saveDonationPointConfig,
    fetchPendingDonations, verifyDonation, rejectDonation,
    fetchRedemptionItems, createRedemptionItem, updateRedemptionItem,
    fetchPendingRedemptions, approveRedemption, rejectRedemption, markRedemptionFulfilled,
  } = usePoints();
  const { requestFpRateChange } = useApprovals();

  // Palette — same source DashboardHome.tsx uses, so this page matches
  // its exact visual identity (dark cards, club-colored accent, Inter).
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');
  useInterFont();

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('levels');

  const [levels, setLevels] = useState<Array<{ level: number; xp_required: number; label: string }>>([]);
  const [levelsDirty, setLevelsDirty] = useState(false);

  const [currentRate, setCurrentRate] = useState(1);
  const [rateHistory, setRateHistory] = useState<{ rate_bdt: number; effective_from: string }[]>([]);
  const [newRate, setNewRate] = useState('');

  const [donationConfigs, setDonationConfigs] = useState<Record<string, DonationPointConfig>>({});
  const [donationDirty, setDonationDirty] = useState<Record<string, boolean>>({});

  const [pendingDonations, setPendingDonations] = useState<Donation[]>([]);
  const [rejectingDonation, setRejectingDonation] = useState<Donation | null>(null);
  const [donationRejectReason, setDonationRejectReason] = useState('');

  const [items, setItems] = useState<FpRedemptionItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemRedemptionType, setItemRedemptionType] = useState<RedemptionType>('unlimited');
  const [itemMaxRedemptions, setItemMaxRedemptions] = useState('');

  const [pendingRedemptions, setPendingRedemptions] = useState<FpRedemptionRequest[]>([]);
  const [rejectingRedemption, setRejectingRedemption] = useState<FpRedemptionRequest | null>(null);
  const [redemptionRejectReason, setRedemptionRejectReason] = useState('');

  useEffect(() => { loadAll(); }, [tenant.id]);

  const loadAll = async () => {
    const [lvls, rate, hist, dConfigs, pDonations, redItems, pRedemptions] = await Promise.all([
      fetchLevelConfigs(), fetchCurrentFpRate(), fetchFpRateHistory(),
      fetchDonationPointConfigs(), fetchPendingDonations(),
      fetchRedemptionItems(false), fetchPendingRedemptions(),
    ]);

    setLevels(lvls.length ? lvls.map((d) => ({ level: d.level, xp_required: d.xp_required, label: d.label || '' })) : generateDefaultLevels(10));
    setCurrentRate(rate);
    setRateHistory(hist);

    const map: Record<string, DonationPointConfig> = {};
    dConfigs.forEach((c) => { map[c.fund_account] = c; });
    (['administrative', 'project', 'endowment'] as FundAccount[]).forEach((fa) => {
      if (!map[fa]) map[fa] = { id: '', fund_account: fa, xp_per_100: 0, fp_per_100: 0 };
    });
    setDonationConfigs(map);

    setPendingDonations(pDonations);
    setItems(redItems);
    setPendingRedemptions(pRedemptions);
  };

  function generateDefaultLevels(count: number) {
    const out = [];
    let xp = 500;
    for (let i = 1; i <= count; i++) {
      out.push({ level: i, xp_required: xp, label: DEFAULT_LABELS[i - 1] || `Level ${i}` });
      xp += i <= 5 ? 1000 : 1500;
    }
    return out;
  }

  const updateLevelRow = (idx: number, field: string, val: any) => {
    setLevels((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
    setLevelsDirty(true);
  };
  const addLevel = () => {
    const last = levels[levels.length - 1];
    setLevels((p2) => [...p2, { level: (last?.level || 0) + 1, xp_required: (last?.xp_required || 0) + 1000, label: '' }]);
    setLevelsDirty(true);
  };
  const removeLevel = (idx: number) => {
    setLevels((p2) => p2.filter((_, i) => i !== idx).map((r, i) => ({ ...r, level: i + 1 })));
    setLevelsDirty(true);
  };
  const saveLevels = async () => {
    const sorted = [...levels].sort((a, b) => a.xp_required - b.xp_required).map((r, i) => ({ ...r, level: i + 1 }));
    setLevels(sorted);
    await saveLevelConfig(sorted);
    setLevelsDirty(false);
  };

  const updateDonationConfig = (fa: string, field: 'xp_per_100' | 'fp_per_100', val: number) => {
    setDonationConfigs((p2) => ({ ...p2, [fa]: { ...p2[fa], [field]: val } }));
    setDonationDirty((p2) => ({ ...p2, [fa]: true }));
  };
  const saveDonationConfig = async (fa: string) => {
    const c = donationConfigs[fa];
    await saveDonationPointConfig({ fund_account: fa as FundAccount, xp_per_100: c.xp_per_100, fp_per_100: c.fp_per_100 });
    setDonationDirty((p2) => ({ ...p2, [fa]: false }));
  };

  const openItemForm = () => {
    setEditingItemId(null);
    setItemName(''); setItemDesc(''); setItemCost('');
    setItemRedemptionType('unlimited'); setItemMaxRedemptions('');
    setShowItemForm(true);
  };

  const openEditItemForm = (item: FpRedemptionItem) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemDesc(item.description || '');
    setItemCost(String(item.fp_cost));
    setItemRedemptionType(((item as any).redemption_type || 'unlimited') as RedemptionType);
    setItemMaxRedemptions((item as any).max_redemptions != null ? String((item as any).max_redemptions) : '');
    setShowItemForm(true);
  };

  const submitItemForm = async () => {
    const payload = {
      name: itemName,
      description: itemDesc,
      fp_cost: Number(itemCost),
      redemption_type: itemRedemptionType,
      max_redemptions: itemRedemptionType === 'limited' ? Number(itemMaxRedemptions) : null,
    } as any;
    if (editingItemId) {
      await updateRedemptionItem(editingItemId, payload);
    } else {
      await createRedemptionItem(payload);
    }
    setShowItemForm(false);
    setEditingItemId(null);
    loadAll();
  };

  const canSubmitItem = itemName && itemCost && (itemRedemptionType !== 'limited' || Number(itemMaxRedemptions) > 0);

  const redemptionTypeLabel = (item: FpRedemptionItem) => {
    const t: RedemptionType = (item as any).redemption_type || 'unlimited';
    if (t === 'one_time') return 'One-time';
    if (t === 'limited') return `Limited · ${(item as any).max_redemptions ?? '—'}x`;
    return 'Unlimited';
  };

  /* ---------------- shared style tokens (mirrors DashboardHome) ---------------- */
  const cardDark: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` };
  const cardLight: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.lightCard, color: p.td };
  const label: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: p.tsub, marginBottom: 6, display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: `1px solid ${p.border}`, background: p.lightCard, color: p.td, fontSize: 13, outline: 'none' };
  const inputStyleDark: React.CSSProperties = { ...inputStyle, background: '#1c1c1c', color: p.tl, border: `1px solid ${p.border}` };

  const btnPrimary: React.CSSProperties = { background: p.green, color: '#0d1f14', border: 'none', borderRadius: 20, fontSize: 11.5, fontWeight: 700, padding: '9px 16px', cursor: 'pointer' };
  const btnGhost: React.CSSProperties = { background: 'none', border: `1px solid ${p.pillBorder}`, color: p.tmid, borderRadius: 20, fontSize: 11, fontWeight: 600, padding: '7px 13px', cursor: 'pointer' };
  const btnDanger: React.CSSProperties = { background: 'none', border: '1px solid #7a3a32', color: '#e08a72', borderRadius: 20, fontSize: 11, fontWeight: 600, padding: '7px 13px', cursor: 'pointer' };
  const btnSuccess: React.CSSProperties = { background: p.green, color: '#0d1f14', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '7px 13px', cursor: 'pointer' };

  const btnDisabled: React.CSSProperties = { opacity: 0.4, cursor: 'not-allowed' };

  return (
    <div className="admin-points-page">
      <style>{`
        .admin-points-page, .admin-points-page * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .admin-points-page ::-webkit-scrollbar { display: none; }
        .ap-tabs { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .ap-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .ap-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 700px) {
          .ap-grid-2, .ap-grid-3 { grid-template-columns: 1fr; }
        }
        .ap-checkbox-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 10px; cursor: pointer;
          border: 1px solid ${p.border};
        }
        .ap-checkbox-row input { width: 15px; height: 15px; accent-color: ${p.green}; cursor: pointer; }
      `}</style>

      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* ---------------- page-top ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>Points &amp; FP</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: p.tsub, background: p.lightCard, border: `1px solid ${p.border}`, borderRadius: 20, padding: '4px 11px', textTransform: 'uppercase' }}>
              {tenant.id}
            </span>
          </div>

          {/* ---------------- tabs ---------------- */}
          <div className="ap-tabs" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
            {TABS.map((t) => {
              const active = activeTab === t.key;
              const count = t.key === 'pending-donations' ? pendingDonations.length : t.key === 'pending-redemptions' ? pendingRedemptions.length : 0;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 11.5, fontWeight: 700, padding: '9px 15px', borderRadius: 20,
                    border: `1px solid ${active ? p.green : p.border}`,
                    background: active ? p.greenDeep : p.dark,
                    color: active ? '#ffffff' : p.tmid,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {t.label}
                  {count > 0 && (
                    <span style={{ background: active ? '#ffffff' : p.green, color: active ? p.greenDeep : '#0d1f14', fontSize: 9.5, fontWeight: 800, borderRadius: 10, padding: '1px 6px' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ---------------- Level Config ---------------- */}
          {activeTab === 'levels' && (
            <div style={cardDark}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Level thresholds</span>
                <button style={{ ...btnPrimary, ...(!levelsDirty || loading ? btnDisabled : {}) }} disabled={!levelsDirty || loading} onClick={saveLevels}>
                  Save all
                </button>
              </div>
              <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${p.border}` }}>
                <div style={{ background: p.greenDeep, padding: '9px 12px', display: 'grid', gridTemplateColumns: '40px 1fr 1.4fr 30px', gap: 10, fontSize: 9.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: p.tsub }}>
                  <span>Lv</span><span>XP Required</span><span>Label</span><span />
                </div>
                {levels.map((row, idx) => (
                  <div key={idx} style={{ padding: '9px 12px', display: 'grid', gridTemplateColumns: '40px 1fr 1.4fr 30px', gap: 10, alignItems: 'center', borderTop: `1px solid ${p.border}` }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: p.greenDeep, color: p.green, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.level}</span>
                    <input type="number" min="1" value={row.xp_required} onChange={(e) => updateLevelRow(idx, 'xp_required', parseInt(e.target.value) || 0)} style={inputStyleDark} />
                    <input value={row.label} onChange={(e) => updateLevelRow(idx, 'label', e.target.value)} placeholder={`Level ${row.level}`} style={inputStyleDark} />
                    <button onClick={() => removeLevel(idx)} style={{ background: 'none', border: 'none', color: p.tsub, cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addLevel} style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 12, border: `1px dashed ${p.border}`, background: 'none', color: p.tsub, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                + Add level
              </button>
            </div>
          )}

          {/* ---------------- FP Exchange Rate ---------------- */}
          {activeTab === 'fprate' && (
            <div style={cardDark}>
              <span style={label}>Current rate</span>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.3px', marginBottom: 14 }}>1 FP = {currentRate} BDT</div>
              <div style={{ background: p.greenDeep, border: `1px solid ${p.recBd}`, borderRadius: 12, padding: 12, fontSize: 11, color: p.recTx, lineHeight: 1.5, marginBottom: 16 }}>
                Changing the rate needs 2-of-3 signatory approval, rescales every member's FP balance to
                preserve its BDT value, and is blocked if it would push FP-backed value above the
                Endowment's actual balance.
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <span style={label}>New rate (BDT per FP)</span>
                  <input type="number" min="0.0001" step="0.0001" value={newRate} onChange={(e) => setNewRate(e.target.value)} style={inputStyleDark} />
                </div>
                <button
                  style={{ ...btnPrimary, ...(!newRate || Number(newRate) <= 0 ? btnDisabled : {}) }}
                  disabled={!newRate || Number(newRate) <= 0}
                  onClick={async () => { await requestFpRateChange(Number(newRate)); setNewRate(''); addToast('Submitted — check Approvals page', 'info'); }}
                >
                  Request change
                </button>
              </div>
              {rateHistory.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${p.border}` }}>
                  <span style={label}>History</span>
                  {rateHistory.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: p.tsub, padding: '5px 0' }}>
                      <span style={{ color: p.tl }}>1 FP = {r.rate_bdt} BDT</span><span>{fmtDateTime(r.effective_from)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- Donation Rewards ---------------- */}
          {activeTab === 'donations' && (
            <div>
              <p style={{ fontSize: 11.5, color: p.mut, lineHeight: 1.5, marginBottom: 12, padding: '0 2px' }}>
                XP/FP earned per 100 BDT donated to each fund. Donation amounts snap up to a whole-number
                XP; FP stays fractional and its BDT value always routes to Endowment.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(['administrative', 'project', 'endowment'] as FundAccount[]).map((fa) => {
                  const c = donationConfigs[fa];
                  return (
                    <div key={fa} style={cardDark}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{FUND_LABELS[fa]}</span>
                        {donationDirty[fa] && <button style={btnSuccess} onClick={() => saveDonationConfig(fa)}>Save</button>}
                      </div>
                      <div className="ap-grid-2">
                        <div>
                          <span style={{ ...label, color: '#c9a45c' }}>XP per 100</span>
                          <input type="number" min="0" step="0.1" value={c?.xp_per_100 ?? 0} onChange={(e) => updateDonationConfig(fa, 'xp_per_100', parseFloat(e.target.value) || 0)} style={inputStyleDark} />
                        </div>
                        <div>
                          <span style={{ ...label, color: p.av2 }}>FP per 100</span>
                          <input type="number" min="0" step="0.0001" value={c?.fp_per_100 ?? 0} onChange={(e) => updateDonationConfig(fa, 'fp_per_100', parseFloat(e.target.value) || 0)} style={inputStyleDark} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------------- Pending Donations ---------------- */}
          {activeTab === 'pending-donations' && (
            pendingDonations.length === 0 ? (
              <div style={{ ...cardDark, textAlign: 'center', color: p.tsub, fontSize: 12, padding: 40 }}>No donations pending verification.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingDonations.map((d) => (
                  <div key={d.id} style={cardDark}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{d.users?.name || d.member_name || 'Unknown'}</div>
                        <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 2 }}>{FUND_LABELS[d.fund_account]}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: p.green }}>{fmtAmount(d.amount)}</div>
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: p.tsub, marginBottom: 12 }}>Txn: {d.transaction_id}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={btnDanger} onClick={() => { setRejectingDonation(d); setDonationRejectReason(''); }}>Reject</button>
                      <button style={btnSuccess} onClick={() => verifyDonation(d.id).then(loadAll)}>Verify</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ---------------- Redemption Catalog ---------------- */}
          {activeTab === 'redemption' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button style={btnPrimary} onClick={openItemForm}>Add item</button>
              </div>
              <div className="ap-grid-2">
                {items.map((item) => (
                  <div key={item.id} style={cardDark}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                        {item.description && <p style={{ fontSize: 11, color: p.tsub, marginTop: 4, lineHeight: 1.4 }}>{item.description}</p>}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.av2, whiteSpace: 'nowrap' }}>{item.fp_cost} FP</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: item.is_active ? p.greenDeep : p.lightCard, color: item.is_active ? p.green : p.tsub }}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: p.lightCard, color: p.tmid }}>
                        {redemptionTypeLabel(item)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
                      <button style={btnGhost} onClick={() => openEditItemForm(item)}>Edit</button>
                      <button style={btnGhost} onClick={() => updateRedemptionItem(item.id, { is_active: !item.is_active }).then(loadAll)}>
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div style={{ ...cardDark, gridColumn: '1 / -1', textAlign: 'center', color: p.tsub, fontSize: 12, padding: 40 }}>No redemption items yet.</div>
                )}
              </div>
            </div>
          )}

          {/* ---------------- Pending Redemptions ---------------- */}
          {activeTab === 'pending-redemptions' && (
            pendingRedemptions.length === 0 ? (
              <div style={{ ...cardDark, textAlign: 'center', color: p.tsub, fontSize: 12, padding: 40 }}>No redemption requests pending.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingRedemptions.map((r) => (
                  <div key={r.id} style={cardDark}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{r.users?.name || 'Unknown'}</div>
                        <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 2 }}>{r.fp_redemption_items?.name}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: p.av2 }}>{r.fp_cost} FP</div>
                    </div>
                    <div style={{ fontSize: 10, color: p.tsub, marginBottom: 12 }}>{fmtDateTime(r.created_at)}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={btnDanger} onClick={() => { setRejectingRedemption(r); setRedemptionRejectReason(''); }}>Reject</button>
                      <button style={btnSuccess} onClick={() => approveRedemption(r.id).then(loadAll)}>Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ---------------- Add/edit redemption item modal ---------------- */}
      {showItemForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => { setShowItemForm(false); setEditingItemId(null); }}>
          <div style={{ background: p.dark, border: `1px solid ${p.border}`, borderRadius: 20, padding: 20, width: '100%', maxWidth: 420, color: p.tl }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{editingItemId ? 'Edit redemption item' : 'Add redemption item'}</div>

            <span style={label}>Name</span>
            <input value={itemName} onChange={(e) => setItemName(e.target.value)} style={{ ...inputStyleDark, marginBottom: 12 }} placeholder="e.g. PHF Award" />

            <span style={label}>Description</span>
            <textarea value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} rows={2} style={{ ...inputStyleDark, marginBottom: 12, resize: 'vertical' }} />

            <span style={label}>FP cost</span>
            <input type="number" min="0.01" step="0.0001" value={itemCost} onChange={(e) => setItemCost(e.target.value)} style={{ ...inputStyleDark, marginBottom: 14 }} />

            <span style={label}>Redemption limit</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
              <label className="ap-checkbox-row" style={{ background: itemRedemptionType === 'one_time' ? p.greenDeep : 'none' }}>
                <input type="checkbox" checked={itemRedemptionType === 'one_time'} onChange={() => setItemRedemptionType('one_time')} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>One-time redemption</div>
                  <div style={{ fontSize: 10, color: p.tsub }}>Each member can redeem once, ever</div>
                </div>
              </label>
              <label className="ap-checkbox-row" style={{ background: itemRedemptionType === 'unlimited' ? p.greenDeep : 'none' }}>
                <input type="checkbox" checked={itemRedemptionType === 'unlimited'} onChange={() => setItemRedemptionType('unlimited')} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Unlimited redemption</div>
                  <div style={{ fontSize: 10, color: p.tsub }}>No cap on redemption count</div>
                </div>
              </label>
              <label className="ap-checkbox-row" style={{ background: itemRedemptionType === 'limited' ? p.greenDeep : 'none' }}>
                <input type="checkbox" checked={itemRedemptionType === 'limited'} onChange={() => setItemRedemptionType('limited')} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Limited redemption</div>
                  <div style={{ fontSize: 10, color: p.tsub }}>Cap at a max number of attempts</div>
                </div>
              </label>
            </div>

            {itemRedemptionType === 'limited' && (
              <div style={{ marginBottom: 6 }}>
                <span style={label}>Max redemption attempts</span>
                <input type="number" min="1" step="1" value={itemMaxRedemptions} onChange={(e) => setItemMaxRedemptions(e.target.value)} style={inputStyleDark} placeholder="e.g. 3" />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={btnGhost} onClick={() => { setShowItemForm(false); setEditingItemId(null); }}>Cancel</button>
              <button style={{ ...btnPrimary, ...(!canSubmitItem ? btnDisabled : {}) }} disabled={!canSubmitItem} onClick={submitItemForm}>{editingItemId ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Reject donation modal ---------------- */}
      {rejectingDonation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setRejectingDonation(null)}>
          <div style={{ background: p.dark, border: `1px solid ${p.border}`, borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, color: p.tl }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Reject donation</div>
            <textarea value={donationRejectReason} onChange={(e) => setDonationRejectReason(e.target.value)} rows={3} style={{ ...inputStyleDark, resize: 'vertical' }} placeholder="Reason..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button style={btnGhost} onClick={() => setRejectingDonation(null)}>Cancel</button>
              <button
                style={{ ...btnDanger, background: '#7a3a32', color: '#fff', ...(!donationRejectReason.trim() ? btnDisabled : {}) }}
                disabled={!donationRejectReason.trim()}
                onClick={async () => { await rejectDonation(rejectingDonation.id, donationRejectReason.trim()); setRejectingDonation(null); loadAll(); }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Reject redemption modal ---------------- */}
      {rejectingRedemption && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setRejectingRedemption(null)}>
          <div style={{ background: p.dark, border: `1px solid ${p.border}`, borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, color: p.tl }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Reject redemption</div>
            <textarea value={redemptionRejectReason} onChange={(e) => setRedemptionRejectReason(e.target.value)} rows={3} style={{ ...inputStyleDark, resize: 'vertical' }} placeholder="Reason..." />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button style={btnGhost} onClick={() => setRejectingRedemption(null)}>Cancel</button>
              <button
                style={{ ...btnDanger, background: '#7a3a32', color: '#fff', ...(!redemptionRejectReason.trim() ? btnDisabled : {}) }}
                disabled={!redemptionRejectReason.trim()}
                onClick={async () => { await rejectRedemption(rejectingRedemption.id, redemptionRejectReason.trim()); setRejectingRedemption(null); loadAll(); }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
