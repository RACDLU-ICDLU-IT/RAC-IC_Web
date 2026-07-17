import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useDues, FeeTemplate, LedgerEntry, DuesStats, RecurrenceType, FundAccount } from '../../hooks/useDues';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';

function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtAmount(amount: number, currency = 'BDT') {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'one_time', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom dates' },
  { value: 'special_assessment', label: 'Special assessment (2/3 vote required)' },
];

const FUND_OPTIONS: { value: FundAccount; label: string }[] = [
  { value: 'administrative', label: 'Administrative Fund' },
  { value: 'project', label: 'Project Fund' },
  { value: 'endowment', label: 'Endowment Fund' },
];

// ─── Template form ────────────────────────────────────────────────────────────

function TemplateForm({
  isOpen, onClose, onSubmit, editingTemplate, members,
}: {
  isOpen: boolean; onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editingTemplate?: FeeTemplate | null;
  members: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTemplate) {
      setForm({ ...editingTemplate, custom_dates: editingTemplate.custom_dates || [] });
    } else {
      setForm({
        name: '', description: '', category: '', amount: 0, currency: 'BDT',
        recurrence_type: 'monthly', recurrence_interval: 1, recurrence_day: 1, recurrence_month: 1,
        custom_dates: [], due_date: '', applies_to: 'all', specific_member_ids: [],
        xp_reward: 0, fp_reward: 0, fund_account: 'administrative', allow_fp_payment: false,
        is_active: false,
      });
    }
  }, [isOpen, editingTemplate]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) return;
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-lg flex flex-col bg-white shadow-xl">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{editingTemplate ? 'Edit Fee Template' : 'Add Fee Template'}</h2>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full">×</button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form id="templateForm" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={form.name || ''} onChange={(e) => set('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g., Monthly Membership Dues" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" min="0.01" step="0.01" required value={form.amount || ''}
                  onChange={(e) => set('amount', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select value={form.currency || 'BDT'} onChange={(e) => set('currency', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  {['BDT', 'USD', 'GBP', 'EUR'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
              <select value={form.recurrence_type || 'monthly'} onChange={(e) => set('recurrence_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md">
                {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {form.recurrence_type === 'one_time' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input type="date" required value={form.due_date || ''} onChange={(e) => set('due_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            )}

            {form.recurrence_type === 'monthly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                  <input type="number" min="1" max="31" value={form.recurrence_day || 1}
                    onChange={(e) => set('recurrence_day', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Every N months</label>
                  <input type="number" min="1" value={form.recurrence_interval || 1}
                    onChange={(e) => set('recurrence_interval', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
            )}

            {form.recurrence_type === 'yearly' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select value={form.recurrence_month || 1} onChange={(e) => set('recurrence_month', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <input type="number" min="1" max="31" value={form.recurrence_day || 1}
                    onChange={(e) => set('recurrence_day', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
            )}

            {form.recurrence_type === 'daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Every N days</label>
                <input type="number" min="1" value={form.recurrence_interval || 1}
                  onChange={(e) => set('recurrence_interval', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
            )}

            {form.recurrence_type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Dates (comma-separated YYYY-MM-DD)</label>
                <textarea
                  value={(form.custom_dates || []).join(', ')}
                  onChange={(e) => set('custom_dates', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2}
                  placeholder="2026-08-01, 2026-09-15"
                />
              </div>
            )}

            {form.recurrence_type === 'special_assessment' && (
              <div className="bg-amber-50 text-amber-800 text-sm p-3 rounded-lg border border-amber-200">
                Special assessments require a 2/3 member vote before going active, minimum 14 days notice,
                capped at 50% of current annual dues. Set the due date above; activation is gated separately.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select value={form.applies_to || 'all'} onChange={(e) => set('applies_to', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="all">All Active Members</option>
                <option value="specific">Specific Members</option>
              </select>
            </div>

            {form.applies_to === 'specific' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Members</label>
                <select multiple value={form.specific_member_ids || []}
                  onChange={(e) => set('specific_member_ids', Array.from(e.target.selectedOptions, (o) => o.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-32">
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}

            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-4">
              <h4 className="text-sm font-bold text-gray-700">Point Rewards (on payment)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-600 mb-1">XP Reward (whole number)</label>
                  <input type="number" min="0" step="1" value={form.xp_reward || 0}
                    onChange={(e) => set('xp_reward', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-600 mb-1">FP Reward (fractional OK)</label>
                  <input type="number" min="0" step="0.0001" value={form.fp_reward || 0}
                    onChange={(e) => set('fp_reward', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Fund Account (money destination)</label>
                <div className="grid grid-cols-3 gap-2">
                  {FUND_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => set('fund_account', opt.value)}
                      className={`p-2.5 rounded-xl text-center text-xs font-bold border ${form.fund_account === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 bg-white'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">FP reward's BDT value always routes to Endowment regardless of this choice.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={form.allow_fp_payment || false} onChange={(e) => set('allow_fp_payment', e.target.checked)} />
                Allow members to pay this due with FP (full or partial)
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" checked={form.is_active || false} onChange={(e) => set('is_active', e.target.checked)} />
              Is Active
            </label>
          </form>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="templateForm" disabled={loading || (form.amount || 0) <= 0}>
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDues() {
  const { adminTenant: tenant } = useAdminTenant();
  const { user } = useAuth();
  const { addToast } = useToast();
  const {
    loading, fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
    fetchLedger, fetchDuesStats, markOverdueFees, flagOverpayments,
    generateChargesForDate, runAutoGeneration,
    markAsWaived, sendReminder, bulkSendReminders,
    verifyPayment, rejectPayment, resolveOverpayment,
    fetchDuesSettings, updateDuesSettings,
  } = useDues();

  const [stats, setStats] = useState<DuesStats | null>(null);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FeeTemplate | null>(null);

  const [reviewEntry, setReviewEntry] = useState<LedgerEntry | null>(null);
  const [reviewAction, setReviewAction] = useState<'verify' | 'reject' | null>(null);
  const [clubPrefix, setClubPrefix] = useState('CLUB');
  const [rejectReason, setRejectReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [genTarget, setGenTarget] = useState<FeeTemplate | null>(null);
  const [genDate, setGenDate] = useState('');
  const [genAmount, setGenAmount] = useState('');

  const [overpayEntry, setOverpayEntry] = useState<LedgerEntry | null>(null);
  const [overpayResolution, setOverpayResolution] = useState<'refund' | 'credit_future' | 'other'>('refund');
  const [overpayNotes, setOverpayNotes] = useState('');

  useEffect(() => {
    markOverdueFees().catch(console.error);
    flagOverpayments().catch(console.error);
    loadAll();
    fetchDuesSettings().then((s) => setClubPrefix(s.club_prefix || 'CLUB'));
  }, [tenant.id]);

  const loadAll = async () => {
    const [s, t, l] = await Promise.all([fetchDuesStats(), fetchTemplates(), fetchLedger()]);
    setStats(s); setTemplates(t); setLedger(l);
  };

  const pendingEntries = ledger.filter((l) => l.status === 'pending_verification');
  const overpaidEntries = ledger.filter((l) => l.status === 'overpaid');

  const openReview = (entry: LedgerEntry, action: 'verify' | 'reject') => {
    setReviewEntry(entry); setReviewAction(action); setRejectReason('');
  };

  const handleVerify = async () => {
    if (!reviewEntry) return;
    setReviewSubmitting(true);
    await verifyPayment(reviewEntry.id, clubPrefix);
    setReviewSubmitting(false);
    setReviewEntry(null); setReviewAction(null);
    loadAll();
  };

  const handleReject = async () => {
    if (!reviewEntry || !rejectReason.trim()) return;
    setReviewSubmitting(true);
    await rejectPayment(reviewEntry.id, rejectReason.trim());
    setReviewSubmitting(false);
    setReviewEntry(null); setReviewAction(null);
    loadAll();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Dues &amp; Fees</h1>
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase">{tenant.id}</span>
        </div>
        <Button variant="outline" onClick={async () => {
          const n = await runAutoGeneration();
          addToast(`Auto-generation ran: ${n} charge(s) created`, 'info');
          loadAll();
        }}>Run Auto-Generation Now</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Fee Templates</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="verification">
            Verification {pendingEntries.length > 0 && <span className="ml-1.5 bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingEntries.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="overpayments">
            Overpayments {overpaidEntries.length > 0 && <span className="ml-1.5 bg-red-100 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{overpaidEntries.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Total Collected', fmtAmount(stats.totalCollected)],
                ['Outstanding', fmtAmount(stats.totalOutstanding)],
                ['Overdue', `${stats.overdueCount} entries`],
                ['Collection Rate', `${stats.collectionRate.toFixed(1)}%`],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase font-bold">{label}</div>
                  <div className="text-xl font-bold text-gray-900 mt-1">{val}</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Fee Templates</h2>
            <Button onClick={() => { setEditingTemplate(null); setIsTemplateFormOpen(true); }}>Add Template</Button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Recurrence</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{t.recurrence_type}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{t.amount} {t.currency}</td>
                    <td className="px-4 py-3 text-center">
                      {t.is_active
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">Active</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Draft</span>}
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      {t.recurrence_type !== 'monthly' && t.recurrence_type !== 'daily' && t.recurrence_type !== 'yearly' && (
                        <Button size="sm" variant="outline" onClick={() => { setGenTarget(t); setGenDate(t.due_date || ''); setGenAmount(''); }}>Generate</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setEditingTemplate(t); setIsTemplateFormOpen(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={async () => {
                        if (window.confirm('Delete this template?')) { await deleteTemplate(t.id); loadAll(); }
                      }}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="ledger">
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ledger.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">{e.users?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{e.label}</td>
                    <td className="px-4 py-3 text-right">{fmtAmount(e.amount, e.currency)}</td>
                    <td className="px-4 py-3">{new Date(e.due_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {['unpaid', 'overdue'].includes(e.status) && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => sendReminder(e.id).then(loadAll)}>Remind</Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={async () => {
                            if (window.confirm(`Waive "${e.label}" for ${e.users?.name}?`)) { await markAsWaived(e.id); loadAll(); }
                          }}>Waive</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="verification">
          {pendingEntries.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-gray-200 text-gray-400">No payments pending verification.</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Txn ID</th>
                    <th className="px-4 py-3">Sender bKash</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">{e.users?.name || 'Unknown'}</td>
                      <td className="px-4 py-3">{e.label}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtAmount(e.amount, e.currency)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{e.transaction_id || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{e.sender_bkash_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDateTime(e.submitted_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openReview(e, 'verify')}>Verify</Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 ml-2" onClick={() => openReview(e, 'reject')}>Reject</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overpayments">
          {overpaidEntries.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-gray-200 text-gray-400">No unresolved overpayments.</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3 text-right">Overpaid By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {overpaidEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">{e.users?.name || 'Unknown'}</td>
                      <td className="px-4 py-3">{e.label}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{fmtAmount(e.overpaid_amount || 0, e.currency)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" onClick={() => { setOverpayEntry(e); setOverpayResolution('refund'); setOverpayNotes(''); }}>Resolve</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TemplateForm
        isOpen={isTemplateFormOpen}
        onClose={() => setIsTemplateFormOpen(false)}
        editingTemplate={editingTemplate}
        members={members}
        onSubmit={async (data) => {
          if (editingTemplate) await updateTemplate(editingTemplate.id, data);
          else await createTemplate(data);
          setIsTemplateFormOpen(false);
          loadAll();
        }}
      />

      {reviewEntry && reviewAction && (
        <Modal isOpen={true} onClose={() => { setReviewEntry(null); setReviewAction(null); }} title={reviewAction === 'verify' ? 'Verify Payment' : 'Reject Payment'}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Member</span><span className="font-semibold">{reviewEntry.users?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-semibold">{fmtAmount(reviewEntry.amount, reviewEntry.currency)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Txn ID</span><span className="font-mono">{reviewEntry.transaction_id}</span></div>
            </div>
            {reviewAction === 'verify' ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Receipt Prefix</label>
                <input value={clubPrefix} onChange={(e) => setClubPrefix(e.target.value.toUpperCase())} className="w-full px-3 py-2 border rounded font-mono text-sm" />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rejection Reason</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded text-sm" />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setReviewEntry(null); setReviewAction(null); }} disabled={reviewSubmitting}>Cancel</Button>
              {reviewAction === 'verify'
                ? <Button className="bg-emerald-600 text-white" onClick={handleVerify} disabled={reviewSubmitting}>{reviewSubmitting ? 'Verifying…' : 'Confirm'}</Button>
                : <Button className="bg-red-600 text-white" onClick={handleReject} disabled={reviewSubmitting || !rejectReason.trim()}>{reviewSubmitting ? 'Rejecting…' : 'Confirm'}</Button>}
            </div>
          </div>
        </Modal>
      )}

      {genTarget && (
        <Modal isOpen={true} onClose={() => setGenTarget(null)} title={`Generate: ${genTarget.name}`}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Due Date</label>
              <input type="date" value={genDate} onChange={(e) => setGenDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Override Amount (optional)</label>
              <input type="number" min="0" step="0.01" value={genAmount} onChange={(e) => setGenAmount(e.target.value)}
                placeholder={`Default: ${genTarget.amount}`} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setGenTarget(null)}>Cancel</Button>
              <Button onClick={async () => {
                const n = await generateChargesForDate(genTarget.id, genDate, genAmount ? Number(genAmount) : undefined);
                addToast(`Generated ${n} charge(s)`, 'success');
                setGenTarget(null);
                loadAll();
              }}>Generate</Button>
            </div>
          </div>
        </Modal>
      )}

      {overpayEntry && (
        <Modal isOpen={true} onClose={() => setOverpayEntry(null)} title="Resolve Overpayment">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {overpayEntry.users?.name} overpaid by {fmtAmount(overpayEntry.overpaid_amount || 0, overpayEntry.currency)}.
              Bylaws require resolution within 14 days of identification.
            </p>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Resolution</label>
              <select value={overpayResolution} onChange={(e) => setOverpayResolution(e.target.value as any)} className="w-full px-3 py-2 border rounded">
                <option value="refund">Refund</option>
                <option value="credit_future">Credit toward future dues</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes</label>
              <textarea value={overpayNotes} onChange={(e) => setOverpayNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOverpayEntry(null)}>Cancel</Button>
              <Button onClick={async () => {
                await resolveOverpayment(overpayEntry.id, overpayResolution, overpayNotes);
                setOverpayEntry(null);
                loadAll();
              }}>Resolve</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
