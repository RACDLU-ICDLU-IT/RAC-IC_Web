import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabase';
import { usePoints, Donation, DonationPointConfig } from '../../hooks/usePoints';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import {
  HandCoins, TrendingUp, Database, Landmark, Briefcase,
  Plus, Search, RefreshCw, Zap, Star, Settings2, Loader2,
  ChevronRight, CircleDollarSign, Users
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FUND_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  administrative: { label: 'Administrative Fund', color: 'text-blue-600 bg-blue-50', icon: Briefcase },
  project:        { label: 'Project Fund',         color: 'text-green-600 bg-green-50', icon: TrendingUp },
  endowment:      { label: 'Endowment Fund',       color: 'text-purple-600 bg-purple-50', icon: Landmark },
};

function FundBadge({ type }: { type: string }) {
  const cfg = FUND_LABELS[type] || { label: type, color: 'text-gray-600 bg-gray-100', icon: Database };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function fmt(n: number) {
  return n.toLocaleString('en-BD', { minimumFractionDigits: 0 });
}

// ─── Record Donation Modal ────────────────────────────────────────────────────

function RecordDonationModal({
  isOpen, onClose, onSuccess, tenantId
}: { isOpen: boolean; onClose: () => void; onSuccess: () => void; tenantId: string }) {
  const { recordDonation, loading } = usePoints();
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState({
    member_id: '',
    member_name: '',
    member_email: '',
    amount: '',
    currency: 'BDT',
    fund_account: 'administrative' as 'administrative' | 'project' | 'endowment',
    notes: '',
  });
  const [isAnon, setIsAnon] = useState(false);
  const [pointConfigs, setPointConfigs] = useState<DonationPointConfig[]>([]);
  const { fetchDonationPointConfigs } = usePoints();

  useEffect(() => {
    if (!isOpen) return;
    supabase.from('users').select('id,name,email').eq('status', 'active').eq('tenant_id', tenantId)
      .then(({ data }) => setMembers(data || []));
    fetchDonationPointConfigs().then(setPointConfigs);
  }, [isOpen, tenantId]);

  const selectedConfig = pointConfigs.find(c => c.fund_account === form.fund_account);
  const amount = parseFloat(form.amount) || 0;
  const previewXP = selectedConfig ? Math.floor((amount / 100) * selectedConfig.xp_per_100) : 0;
  const previewFP = selectedConfig ? Math.floor((amount / 100) * selectedConfig.fp_per_100) : 0;

  const handleSubmit = async () => {
    if (!amount || amount <= 0) return;
    await recordDonation({
      member_id: isAnon ? undefined : form.member_id || undefined,
      member_name: isAnon ? form.member_name : undefined,
      member_email: isAnon ? form.member_email : undefined,
      amount,
      currency: form.currency,
      fund_account: form.fund_account,
      notes: form.notes,
    });
    onSuccess();
    onClose();
    setForm({ member_id: '', member_name: '', member_email: '', amount: '', currency: 'BDT', fund_account: 'administrative', notes: '' });
    setIsAnon(false);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Donation">
      <div className="space-y-5 p-1">
        {/* Donor type toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsAnon(false)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${!isAnon ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
          >
            Registered Member
          </button>
          <button
            onClick={() => setIsAnon(true)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${isAnon ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
          >
            Anonymous / External
          </button>
        </div>

        {!isAnon ? (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Member</label>
            <select
              value={form.member_id}
              onChange={e => setForm(p => ({ ...p, member_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              <option value="">Select member (optional)</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} – {m.email}</option>)}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Donor Name</label>
              <input
                value={form.member_name}
                onChange={e => setForm(p => ({ ...p, member_name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Email (optional)</label>
              <input
                value={form.member_email}
                onChange={e => setForm(p => ({ ...p, member_email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="donor@email.com"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Amount</label>
            <input
              type="number" min="0"
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Currency</label>
            <select
              value={form.currency}
              onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {['BDT', 'USD', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Fund Account</label>
          <div className="grid grid-cols-3 gap-2">
            {(['administrative', 'project', 'endowment'] as const).map(fa => {
              const cfg = FUND_LABELS[fa];
              const Icon = cfg.icon;
              return (
                <button
                  key={fa}
                  onClick={() => setForm(p => ({ ...p, fund_account: fa }))}
                  className={`p-3 rounded-xl text-center text-xs font-bold border transition-colors ${
                    form.fund_account === fa ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} className="mx-auto mb-1" />
                  {fa.charAt(0).toUpperCase() + fa.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Point preview */}
        {amount > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-amber-700 font-bold">
              <Zap size={14} className="text-amber-500" />
              +{previewXP} XP
            </div>
            <div className="flex items-center gap-1.5 text-purple-700 font-bold">
              <Star size={14} className="text-purple-500" />
              +{previewFP} FP
            </div>
            <p className="text-gray-500 text-xs ml-auto self-center">
              Based on current config
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Notes (optional)</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            placeholder="Any additional notes..."
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !amount}>
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <HandCoins size={16} className="mr-2" />}
            Record Donation
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Point Config Panel ───────────────────────────────────────────────────────

function PointConfigPanel({ tenantId }: { tenantId: string }) {
  const { fetchDonationPointConfigs, saveDonationPointConfig, loading } = usePoints();
  const [configs, setConfigs] = useState<Record<string, DonationPointConfig>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchDonationPointConfigs().then(data => {
      const map: Record<string, DonationPointConfig> = {};
      data.forEach(c => { map[c.fund_account] = c; });
      // Ensure all three funds exist
      (['administrative', 'project', 'endowment'] as const).forEach(fa => {
        if (!map[fa]) map[fa] = { id: '', tenant_id: tenantId, fund_account: fa, xp_per_100: 0, fp_per_100: 0 };
      });
      setConfigs(map);
    });
  }, [tenantId]);

  const update = (fa: string, field: 'xp_per_100' | 'fp_per_100', val: number) => {
    setConfigs(p => ({ ...p, [fa]: { ...p[fa], [field]: val } }));
    setDirty(p => ({ ...p, [fa]: true }));
  };

  const save = async (fa: string) => {
    const c = configs[fa];
    await saveDonationPointConfig({ tenant_id: tenantId, fund_account: fa as any, xp_per_100: c.xp_per_100, fp_per_100: c.fp_per_100 });
    setDirty(p => ({ ...p, [fa]: false }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Set how many XP and FP points are awarded per 100 units of currency donated to each fund.
        The <strong>Endowment Fund</strong> is the backing reserve — FP points issued are always backed here.
      </p>
      {(['administrative', 'project', 'endowment'] as const).map(fa => {
        const cfg = FUND_LABELS[fa];
        const Icon = cfg.icon;
        const c = configs[fa];
        return (
          <div key={fa} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.color}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{cfg.label}</h4>
                  <p className="text-xs text-gray-400">Per 100 {c?.fund_account === 'endowment' ? '• Backed reserve' : 'currency donated'}</p>
                </div>
              </div>
              {dirty[fa] && (
                <Button size="sm" onClick={() => save(fa)} disabled={loading}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-600 mb-1 flex items-center gap-1"><Zap size={11} /> XP per 100</label>
                <input
                  type="number" min="0" step="0.1"
                  value={c?.xp_per_100 ?? 0}
                  onChange={e => update(fa, 'xp_per_100', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-600 mb-1 flex items-center gap-1"><Star size={11} /> FP per 100</label>
                <input
                  type="number" min="0" step="0.1"
                  value={c?.fp_per_100 ?? 0}
                  onChange={e => update(fa, 'fp_per_100', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Admin Donations Page ────────────────────────────────────────────────

export default function AdminDonations() {
  const { adminTenant: tenant } = useAdminTenant();
  const { fetchDonations, fetchFundAccounts } = usePoints();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRecord, setShowRecord] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [d, f] = await Promise.all([fetchDonations(), fetchFundAccounts()]);
    setDonations(d);
    setFunds(f);
    setLoading(false);
  }, [tenant.id]);

  useEffect(() => { loadData(); }, [tenant.id]);

  const filtered = donations.filter(d => {
    const name = d.users?.name || d.member_name || '';
    return name.toLowerCase().includes(search.toLowerCase()) ||
      d.fund_account.includes(search.toLowerCase());
  });

  const totalDonated = donations.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
            <HandCoins className="text-accent" size={28} /> Donations
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track extra donations, fund balances, and configure point rewards.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-500">
            <RefreshCw size={18} />
          </button>
          <Button onClick={() => setShowRecord(true)}>
            <Plus size={16} className="mr-2" /> Record Donation
          </Button>
        </div>
      </div>

      {/* Fund Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['administrative', 'project', 'endowment'] as const).map(fa => {
          const cfg = FUND_LABELS[fa];
          const Icon = cfg.icon;
          const fund = funds.find(f => f.account_type === fa);
          return (
            <div key={fa} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{fa}</span>
              </div>
              <p className="text-xs text-gray-500 font-bold mb-1">{cfg.label}</p>
              <p className="text-2xl font-heading font-bold text-gray-900">
                {loading ? '–' : fmt(fund?.balance || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Total in: {fmt(fund?.total_in || 0)} | Out: {fmt(fund?.total_out || 0)}
              </p>
            </div>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Donations List</TabsTrigger>
          <TabsTrigger value="config">Point Config</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          {/* Search */}
          <div className="mb-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or fund…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <HandCoins size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No donations recorded yet</p>
              <p className="text-sm mt-1">Click "Record Donation" to add one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-bold uppercase tracking-widest">
                  <tr>
                    <th className="text-left px-4 py-3">Donor</th>
                    <th className="text-left px-4 py-3">Fund</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-right px-4 py-3">XP</th>
                    <th className="text-right px-4 py-3">FP</th>
                    <th className="text-left px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {d.users?.photo ? (
                            <img src={d.users.photo} className="w-8 h-8 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
                              {(d.users?.name || d.member_name || '?')[0]}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-gray-900">{d.users?.name || d.member_name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-400">{d.users?.email || d.member_email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><FundBadge type={d.fund_account} /></td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{d.currency} {fmt(d.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        {d.xp_reward > 0 && (
                          <span className="text-amber-600 font-bold text-xs flex items-center justify-end gap-0.5">
                            <Zap size={11} /> +{d.xp_reward}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.fp_reward > 0 && (
                          <span className="text-purple-600 font-bold text-xs flex items-center justify-end gap-0.5">
                            <Star size={11} /> +{d.fp_reward}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(d.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-500 font-bold text-right">
                Total: BDT {fmt(totalDonated)} across {donations.length} donation{donations.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="config" className="pt-4">
          <PointConfigPanel tenantId={tenant.id} />
        </TabsContent>
      </Tabs>

      <RecordDonationModal
        isOpen={showRecord}
        onClose={() => setShowRecord(false)}
        onSuccess={loadData}
        tenantId={tenant.id}
      />
    </div>
  );
}
