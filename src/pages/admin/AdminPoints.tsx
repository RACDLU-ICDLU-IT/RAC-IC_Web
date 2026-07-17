import React, { useEffect, useState } from 'react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { usePoints, LevelConfig, DonationPointConfig, Donation, FpRedemptionItem, FpRedemptionRequest, FundAccount } from '../../hooks/usePoints';
import { useApprovals } from '../../hooks/useApprovals';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';

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

  const [activeTab, setActiveTab] = useState('levels');

  // Levels
  const [levels, setLevels] = useState<Array<{ level: number; xp_required: number; label: string }>>([]);
  const [levelsDirty, setLevelsDirty] = useState(false);

  // FP rate
  const [currentRate, setCurrentRate] = useState(1);
  const [rateHistory, setRateHistory] = useState<{ rate_bdt: number; effective_from: string }[]>([]);
  const [newRate, setNewRate] = useState('');

  // Donation config
  const [donationConfigs, setDonationConfigs] = useState<Record<string, DonationPointConfig>>({});
  const [donationDirty, setDonationDirty] = useState<Record<string, boolean>>({});

  // Pending donations
  const [pendingDonations, setPendingDonations] = useState<Donation[]>([]);
  const [rejectingDonation, setRejectingDonation] = useState<Donation | null>(null);
  const [donationRejectReason, setDonationRejectReason] = useState('');

  // Redemption catalog
  const [items, setItems] = useState<FpRedemptionItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCost, setItemCost] = useState('');

  // Pending redemptions
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
    setLevels((p) => [...p, { level: (last?.level || 0) + 1, xp_required: (last?.xp_required || 0) + 1000, label: '' }]);
    setLevelsDirty(true);
  };
  const removeLevel = (idx: number) => {
    setLevels((p) => p.filter((_, i) => i !== idx).map((r, i) => ({ ...r, level: i + 1 })));
    setLevelsDirty(true);
  };
  const saveLevels = async () => {
    const sorted = [...levels].sort((a, b) => a.xp_required - b.xp_required).map((r, i) => ({ ...r, level: i + 1 }));
    setLevels(sorted);
    await saveLevelConfig(sorted);
    setLevelsDirty(false);
  };

  const updateDonationConfig = (fa: string, field: 'xp_per_100' | 'fp_per_100', val: number) => {
    setDonationConfigs((p) => ({ ...p, [fa]: { ...p[fa], [field]: val } }));
    setDonationDirty((p) => ({ ...p, [fa]: true }));
  };
  const saveDonationConfig = async (fa: string) => {
    const c = donationConfigs[fa];
    await saveDonationPointConfig({ fund_account: fa as FundAccount, xp_per_100: c.xp_per_100, fp_per_100: c.fp_per_100 });
    setDonationDirty((p) => ({ ...p, [fa]: false }));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Points &amp; FP</h1>
        <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase">{tenant.id}</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="levels">Level Config</TabsTrigger>
          <TabsTrigger value="fprate">FP Exchange Rate</TabsTrigger>
          <TabsTrigger value="donations">Donation Rewards</TabsTrigger>
          <TabsTrigger value="pending-donations">
            Pending Donations {pendingDonations.length > 0 && <span className="ml-1.5 bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingDonations.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="redemption">Redemption Catalog</TabsTrigger>
          <TabsTrigger value="pending-redemptions">
            Pending Redemptions {pendingRedemptions.length > 0 && <span className="ml-1.5 bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingRedemptions.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* ── Level config ── */}
        <TabsContent value="levels">
          <div className="flex justify-end gap-2 mb-4">
            <Button onClick={saveLevels} disabled={!levelsDirty || loading}>Save All</Button>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b px-4 py-3 grid grid-cols-12 gap-3 text-xs font-bold text-gray-500 uppercase">
              <div className="col-span-1">Lv</div><div className="col-span-4">XP Required</div><div className="col-span-6">Label</div><div className="col-span-1" />
            </div>
            <div className="divide-y divide-gray-50">
              {levels.map((row, idx) => (
                <div key={idx} className="px-4 py-3 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-1"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">{row.level}</span></div>
                  <div className="col-span-4">
                    <input type="number" min="1" value={row.xp_required} onChange={(e) => updateLevelRow(idx, 'xp_required', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="col-span-6">
                    <input value={row.label} onChange={(e) => updateLevelRow(idx, 'label', e.target.value)} placeholder={`Level ${row.level}`} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeLevel(idx)} className="text-gray-300 hover:text-red-500">✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-dashed">
              <button onClick={addLevel} className="w-full py-2 rounded-xl border border-dashed text-sm text-gray-400 hover:text-primary">+ Add Level</button>
            </div>
          </div>
        </TabsContent>

        {/* ── FP exchange rate ── */}
        <TabsContent value="fprate">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase">Current Rate</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">1 FP = {currentRate} BDT</div>
            </div>
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Changing the rate requires 2-of-3 signatory approval, rescales every member's FP balance to preserve
              its BDT value, and is blocked if it would push FP-backed value above the Endowment's actual balance.
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Rate (BDT per FP)</label>
                <input type="number" min="0.0001" step="0.0001" value={newRate} onChange={(e) => setNewRate(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <Button disabled={!newRate || Number(newRate) <= 0} onClick={async () => {
                await requestFpRateChange(Number(newRate));
                setNewRate('');
                addToast('Submitted — check Approvals page', 'info');
              }}>Request Rate Change</Button>
            </div>
            {rateHistory.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase">History</span>
                <div className="mt-2 space-y-1">
                  {rateHistory.map((r, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600">
                      <span>1 FP = {r.rate_bdt} BDT</span><span className="text-gray-400">{fmtDateTime(r.effective_from)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Donation point config ── */}
        <TabsContent value="donations">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Rate of XP/FP earned per 100 BDT donated to each fund. Donation amounts are snapped up to yield a
              whole-number XP; FP stays fractional and its BDT value always routes to Endowment.
            </p>
            {(['administrative', 'project', 'endowment'] as FundAccount[]).map((fa) => {
              const c = donationConfigs[fa];
              return (
                <div key={fa} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 text-sm">{FUND_LABELS[fa]}</h4>
                    {donationDirty[fa] && <Button size="sm" onClick={() => saveDonationConfig(fa)}>Save</Button>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-amber-600 mb-1">XP per 100</label>
                      <input type="number" min="0" step="0.1" value={c?.xp_per_100 ?? 0} onChange={(e) => updateDonationConfig(fa, 'xp_per_100', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-600 mb-1">FP per 100</label>
                      <input type="number" min="0" step="0.0001" value={c?.fp_per_100 ?? 0} onChange={(e) => updateDonationConfig(fa, 'fp_per_100', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Pending donations ── */}
        <TabsContent value="pending-donations">
          {pendingDonations.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-gray-200 text-gray-400">No donations pending verification.</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Donor</th><th className="px-4 py-3">Fund</th>
                    <th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Txn ID</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingDonations.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3">{d.users?.name || d.member_name || 'Unknown'}</td>
                      <td className="px-4 py-3">{FUND_LABELS[d.fund_account]}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtAmount(d.amount)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{d.transaction_id}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" className="bg-emerald-600 text-white" onClick={() => verifyDonation(d.id).then(loadAll)}>Verify</Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 ml-2" onClick={() => { setRejectingDonation(d); setDonationRejectReason(''); }}>Reject</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Redemption catalog ── */}
        <TabsContent value="redemption">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setShowItemForm(true); setItemName(''); setItemDesc(''); setItemCost(''); }}>Add Item</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-900">{item.name}</div>
                    {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                  </div>
                  <span className="text-purple-600 font-bold text-sm">{item.fp_cost} FP</span>
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => updateRedemptionItem(item.id, { is_active: !item.is_active }).then(loadAll)}>
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400">No redemption items yet.</div>}
          </div>
        </TabsContent>

        {/* ── Pending redemptions ── */}
        <TabsContent value="pending-redemptions">
          {pendingRedemptions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-gray-200 text-gray-400">No redemption requests pending.</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Member</th><th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">FP Cost</th><th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingRedemptions.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3">{r.users?.name || 'Unknown'}</td>
                      <td className="px-4 py-3">{r.fp_redemption_items?.name}</td>
                      <td className="px-4 py-3 text-right font-semibold">{r.fp_cost} FP</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDateTime(r.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" className="bg-emerald-600 text-white" onClick={() => approveRedemption(r.id).then(loadAll)}>Approve</Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 ml-2" onClick={() => { setRejectingRedemption(r); setRedemptionRejectReason(''); }}>Reject</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add redemption item modal */}
      {showItemForm && (
        <Modal isOpen={true} onClose={() => setShowItemForm(false)} title="Add Redemption Item">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Name</label>
              <input value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g. PHF Award" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
              <textarea value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">FP Cost</label>
              <input type="number" min="0.01" step="0.0001" value={itemCost} onChange={(e) => setItemCost(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowItemForm(false)}>Cancel</Button>
              <Button disabled={!itemName || !itemCost} onClick={async () => {
                await createRedemptionItem({ name: itemName, description: itemDesc, fp_cost: Number(itemCost) });
                setShowItemForm(false);
                loadAll();
              }}>Create</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject donation modal */}
      {rejectingDonation && (
        <Modal isOpen={true} onClose={() => setRejectingDonation(null)} title="Reject Donation">
          <div className="space-y-4">
            <textarea value={donationRejectReason} onChange={(e) => setDonationRejectReason(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded text-sm" placeholder="Reason..." />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectingDonation(null)}>Cancel</Button>
              <Button className="bg-red-600 text-white" disabled={!donationRejectReason.trim()} onClick={async () => {
                await rejectDonation(rejectingDonation.id, donationRejectReason.trim());
                setRejectingDonation(null);
                loadAll();
              }}>Reject</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject redemption modal */}
      {rejectingRedemption && (
        <Modal isOpen={true} onClose={() => setRejectingRedemption(null)} title="Reject Redemption">
          <div className="space-y-4">
            <textarea value={redemptionRejectReason} onChange={(e) => setRedemptionRejectReason(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded text-sm" placeholder="Reason..." />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectingRedemption(null)}>Cancel</Button>
              <Button className="bg-red-600 text-white" disabled={!redemptionRejectReason.trim()} onClick={async () => {
                await rejectRedemption(rejectingRedemption.id, redemptionRejectReason.trim());
                setRejectingRedemption(null);
                loadAll();
              }}>Reject</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
