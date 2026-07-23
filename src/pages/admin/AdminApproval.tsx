import React, { useEffect, useState } from 'react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useAuth } from '../../contexts/AuthContext';
import { useApprovals, ApprovalRequest } from '../../hooks/useApprovals';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';

function fmtAmount(n: number) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(n || 0);
}
function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const TYPE_LABELS: Record<string, string> = {
  expense: 'Expense',
  reimbursement: 'Reimbursement',
  petty_cash_limit_change: 'Petty Cash Limit Change',
  fund_transfer: 'Fund Transfer',
  fp_rate_change: 'FP Exchange Rate Change',
};

function describePayload(req: ApprovalRequest): { title: string; rows: [string, string][] } {
  const p = req.payload;
  switch (req.request_type) {
    case 'expense':
    case 'reimbursement':
      return {
        title: `${TYPE_LABELS[req.request_type]} — ${p.category || 'General'}`,
        rows: [
          ['Fund', p.fund_type], ['Amount', fmtAmount(p.amount)],
          ['Category', p.category || '—'], ['Note', p.note || '—'],
        ],
      };
    case 'petty_cash_limit_change':
      return {
        title: `Petty Cash Limits — ${p.fund_type}`,
        rows: [
          ['Fund', p.fund_type], ['Rotary Year', p.rotary_year],
          ['Per-transaction', fmtAmount(p.per_transaction_limit)],
          ['Monthly', fmtAmount(p.monthly_limit)], ['Yearly', fmtAmount(p.yearly_limit)],
        ],
      };
    case 'fund_transfer':
      return {
        title: `Transfer: ${p.from_fund} → ${p.to_fund}`,
        rows: [['From', p.from_fund], ['To', p.to_fund], ['Amount', fmtAmount(p.amount)], ['Note', p.note || '—']],
      };
    case 'fp_rate_change':
      return {
        title: `FP Rate Change — new rate ${p.new_rate} BDT/FP`,
        rows: [['New Rate', `1 FP = ${p.new_rate} BDT`]],
      };
    default:
      return { title: req.request_type, rows: [] };
  }
}

function RequestCard({
  req, isSignatory, currentVoterId, onVote,
}: {
  req: ApprovalRequest; isSignatory: boolean; currentVoterId?: string;
  onVote: (id: string, decision: 'approve' | 'reject', note?: string) => Promise<void>;
}) {
  const { title, rows } = describePayload(req);
  const votes = req.approval_votes || [];
  const approveCount = votes.filter((v) => v.decision === 'approve').length;
  const rejectCount = votes.filter((v) => v.decision === 'reject').length;
  const myVote = votes.find((v) => v.voter_id === currentVoterId);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="font-bold text-gray-900">{title}</div>
          <div className="text-xs text-gray-400 mt-0.5">Requested {fmtDateTime(req.requested_at)} · Requires {req.required_approvals}/3 approval</div>
        </div>
        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase">{approveCount}/{req.required_approvals} approved</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-gray-50 py-1">
            <span className="text-gray-500">{k}</span><span className="font-medium">{v}</span>
          </div>
        ))}
      </div>

      {votes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {votes.map((v) => (
            <span key={v.id} className={`text-[10px] font-bold px-2 py-1 rounded-full ${v.decision === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {v.voter_role.replace(/_/g, ' ')}: {v.decision}
            </span>
          ))}
        </div>
      )}

      {isSignatory && !myVote && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note"
            className="w-full px-3 py-2 border rounded text-sm" />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="border-red-200 text-red-600" disabled={submitting}
              onClick={async () => { setSubmitting(true); await onVote(req.id, 'reject', note); setSubmitting(false); }}>
              Reject
            </Button>
            <Button size="sm" className="bg-emerald-600 text-white" disabled={submitting}
              onClick={async () => { setSubmitting(true); await onVote(req.id, 'approve', note); setSubmitting(false); }}>
              Approve
            </Button>
          </div>
        </div>
      )}

      {!isSignatory && (
        <p className="text-xs text-gray-400 italic">Only President, Treasurer, or General Secretary can vote.</p>
      )}

      {myVote && (
        <p className="text-xs text-gray-500 italic">You voted: <strong>{myVote.decision}</strong></p>
      )}
    </div>
  );
}

export default function AdminApprovals() {
  const { adminTenant: tenant } = useAdminTenant();
  const { user } = useAuth();
  const { loading, isSignatory, fetchPendingApprovals, fetchApprovalHistory, castVote } = useApprovals();

  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState<ApprovalRequest[]>([]);
  const [history, setHistory] = useState<ApprovalRequest[]>([]);

  const signatory = isSignatory();

  useEffect(() => { loadAll(); }, [tenant.id]);

  const loadAll = async () => {
    const [p, h] = await Promise.all([fetchPendingApprovals(), fetchApprovalHistory()]);
    setPending(p); setHistory(h);
  };

  const handleVote = async (id: string, decision: 'approve' | 'reject', note?: string) => {
    await castVote(id, decision, note);
    loadAll();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase">{tenant.id}</span>
        </div>
        {!signatory && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
            View-only — you are not a signatory (President/Treasurer/General Secretary)
          </span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending {pending.length > 0 && <span className="ml-1.5 bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>}</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-gray-200 text-gray-400">Nothing pending approval.</div>
          ) : (
            <div className="space-y-4">
              {pending.map((r) => (
                <RequestCard key={r.id} req={r} isSignatory={signatory} currentVoterId={user?.id} onVote={handleVote} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {history.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg border border-gray-200 text-gray-400">No resolved requests yet.</div>
          ) : (
            <div className="space-y-3">
              {history.map((r) => {
                const { title } = describePayload(r);
                return (
                  <div key={r.id} className="bg-white border border-gray-100 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{title}</div>
                      <div className="text-xs text-gray-400">{fmtDateTime(r.resolved_at)}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
