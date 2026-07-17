import React, { useEffect, useState } from 'react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTreasury, Fund, TreasuryLedgerEntry, Expense, FundType, FundBudget } from '../../hooks/useTreasury';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';

function fmtAmount(n: number) {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(n || 0);
}

function getCurrentRotaryYear(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 6) return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

const FUND_LABELS: Record<FundType, string> = {
  administrative: 'Administrative Fund',
  project: 'Project Fund',
  endowment: 'Endowment Fund',
};

export default function AdminTreasury() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const {
    loading, fetchFunds, fetchEndowmentSpendable, fetchFpBackedValue,
    fetchTreasuryLedger, recordOpeningBalance,
    fetchPettyCashLimits, requestPettyCashLimitChange, checkPettyCashEligible,
    recordExpense, fetchExpenses,
    requestFundTransfer,
    fetchBudgets, saveBudget, approveBudget,
  } = useTreasury();

  const rotaryYear = getCurrentRotaryYear();
  const [activeTab, setActiveTab] = useState('overview');

  const [funds, setFunds] = useState<Fund[]>([]);
  const [endowmentSpendable, setEndowmentSpendable] = useState(0);
  const [fpBacked, setFpBacked] = useState(0);
  const [ledger, setLedger] = useState<TreasuryLedgerEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pettyLimits, setPettyLimits] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<FundBudget[]>([]);

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseFund, setExpenseFund] = useState<FundType>('administrative');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseAttachment, setExpenseAttachment] = useState('');
  const [expenseEligiblePreview, setExpenseEligiblePreview] = useState<boolean | null>(null);

  // Transfer form
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferFrom, setTransferFrom] = useState<FundType>('administrative');
  const [transferTo, setTransferTo] = useState<FundType>('project');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');

  // Petty cash limit form
  const [showPettyForm, setShowPettyForm] = useState<FundType | null>(null);
  const [pettyTx, setPettyTx] = useState('');
  const [pettyMonth, setPettyMonth] = useState('');
  const [pettyYear, setPettyYear] = useState('');

  // Opening balance form
  const [showOpeningForm, setShowOpeningForm] = useState<FundType | null>(null);
  const [openingAmount, setOpeningAmount] = useState('');

  useEffect(() => { loadAll(); }, [tenant.id]);

  const loadAll = async () => {
    const [f, es, spendable, backed, l, ex, budgetList] = await Promise.all([
      fetchFunds(), fetchPettyCashLimits(rotaryYear),
      fetchEndowmentSpendable(), fetchFpBackedValue(),
      fetchTreasuryLedger({ rotaryYear }),
      fetchExpenses(),
      fetchBudgets(rotaryYear),
    ]);
    setFunds(f); setPettyLimits(es); setEndowmentSpendable(spendable); setFpBacked(backed);
    setLedger(l); setExpenses(ex); setBudgets(budgetList);
  };

  const fundBalance = (ft: FundType) => funds.find((f) => f.fund_type === ft)?.balance || 0;

  useEffect(() => {
    if (!showExpenseForm || !expenseAmount) { setExpenseEligiblePreview(null); return; }
    checkPettyCashEligible(expenseFund, Number(expenseAmount)).then(setExpenseEligiblePreview);
  }, [expenseFund, expenseAmount, showExpenseForm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Treasury</h1>
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase">{tenant.id}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTransferForm(true)}>Transfer Funds</Button>
          <Button onClick={() => setShowExpenseForm(true)}>Record Expense</Button>
        </div>
      </div>

      {/* Fund summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['administrative', 'project', 'endowment'] as FundType[]).map((ft) => (
          <div key={ft} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{FUND_LABELS[ft]}</span>
              <button onClick={() => { setShowOpeningForm(ft); setOpeningAmount(''); }} className="text-[10px] text-gray-400 hover:text-primary underline">
                Set opening balance
              </button>
            </div>
            <p className="text-2xl font-bold text-gray-900">{fmtAmount(fundBalance(ft))}</p>
            {ft === 'endowment' && (
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between text-gray-500"><span>FP-backed (locked)</span><span className="font-semibold">{fmtAmount(fpBacked)}</span></div>
                <div className="flex justify-between text-emerald-600"><span>Spendable</span><span className="font-semibold">{fmtAmount(endowmentSpendable)}</span></div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">In: {fmtAmount(funds.find(f=>f.fund_type===ft)?.total_in||0)} / Out: {fmtAmount(funds.find(f=>f.fund_type===ft)?.total_out||0)}</span>
              <button onClick={() => setShowPettyForm(ft)} className="text-[10px] text-gray-400 hover:text-primary underline">Petty cash limits</button>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Ledger</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Fund</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ledger.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-gray-500">{new Date(e.entry_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{FUND_LABELS[e.fund_type]}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.direction === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {e.direction === 'in' ? '+ ' : '- '}{e.entry_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{e.category || '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${e.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                      {e.direction === 'in' ? '+' : '-'}{fmtAmount(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[240px] truncate" title={e.note || ''}>{e.note || '—'}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Fund</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3">{FUND_LABELS[e.fund_type]}</td>
                    <td className="px-4 py-3">{e.category}{e.is_petty_cash && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Petty cash</span>}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtAmount(e.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === 'petty_cash_auto' || e.status === 'approved' ? 'bg-green-100 text-green-800' :
                        e.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(e.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No expenses recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="budgets">
          <div className="space-y-4">
            {(['administrative', 'project', 'endowment'] as FundType[]).map((ft) => {
              const b = budgets.find((x) => x.fund_type === ft);
              return (
                <div key={ft} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{FUND_LABELS[ft]}</div>
                    <div className="text-sm text-gray-500 mt-1">Planned: {fmtAmount(b?.planned_amount || 0)} · Actual out: {fmtAmount(funds.find(f=>f.fund_type===ft)?.total_out||0)}</div>
                    {b?.approved && <span className="text-xs text-green-600 font-bold">Approved by member vote</span>}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" min="0" placeholder="Planned amount" defaultValue={b?.planned_amount || ''}
                      onBlur={(e) => { if (e.target.value) saveBudget(ft, rotaryYear, Number(e.target.value)).then(loadAll); }}
                      className="w-40 px-3 py-2 border rounded text-sm" />
                    {b && !b.approved && (
                      <Button size="sm" variant="outline" onClick={() => approveBudget(b.id).then(loadAll)}>Mark Approved</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Expense modal */}
      {showExpenseForm && (
        <Modal isOpen={true} onClose={() => setShowExpenseForm(false)} title="Record Expense">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fund</label>
              <div className="grid grid-cols-3 gap-2">
                {(['administrative', 'project', 'endowment'] as FundType[]).map((ft) => (
                  <button key={ft} type="button" onClick={() => setExpenseFund(ft)}
                    className={`p-2.5 rounded-xl text-center text-xs font-bold border ${expenseFund === ft ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}>
                    {FUND_LABELS[ft]}
                  </button>
                ))}
              </div>
              {expenseFund === 'endowment' && (
                <p className="text-xs text-amber-600 mt-2">Endowment expenses always require 3-of-3 signatory approval. Spendable: {fmtAmount(endowmentSpendable)}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount</label>
              <input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-3 py-2 border rounded" />
              {expenseEligiblePreview !== null && expenseFund !== 'endowment' && (
                <p className={`text-xs mt-1 ${expenseEligiblePreview ? 'text-green-600' : 'text-amber-600'}`}>
                  {expenseEligiblePreview ? 'Within petty cash limit — Treasurer can approve alone.' : 'Exceeds petty cash limit — will require 2-of-3 approval.'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
              <input value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="e.g. Venue rental" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Attachment URL (receipt/invoice) *</label>
              <input value={expenseAttachment} onChange={(e) => setExpenseAttachment(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Note</label>
              <textarea value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowExpenseForm(false)}>Cancel</Button>
              <Button disabled={!expenseAmount || !expenseCategory || !expenseAttachment} onClick={async () => {
                await recordExpense({
                  fundType: expenseFund, amount: Number(expenseAmount), category: expenseCategory,
                  note: expenseNote, attachmentUrl: expenseAttachment,
                });
                setShowExpenseForm(false);
                setExpenseAmount(''); setExpenseCategory(''); setExpenseNote(''); setExpenseAttachment('');
                loadAll();
              }}>Submit</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Fund Transfer modal */}
      {showTransferForm && (
        <Modal isOpen={true} onClose={() => setShowTransferForm(false)} title="Transfer Between Funds">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">All fund transfers require 2-of-3 signatory approval (3-of-3 if Endowment is involved).</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">From</label>
                <select value={transferFrom} onChange={(e) => setTransferFrom(e.target.value as FundType)} className="w-full px-3 py-2 border rounded">
                  {(['administrative', 'project', 'endowment'] as FundType[]).map((ft) => <option key={ft} value={ft}>{FUND_LABELS[ft]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">To</label>
                <select value={transferTo} onChange={(e) => setTransferTo(e.target.value as FundType)} className="w-full px-3 py-2 border rounded">
                  {(['administrative', 'project', 'endowment'] as FundType[]).map((ft) => <option key={ft} value={ft}>{FUND_LABELS[ft]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount</label>
              <input type="number" min="0.01" step="0.01" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Note</label>
              <textarea value={transferNote} onChange={(e) => setTransferNote(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowTransferForm(false)}>Cancel</Button>
              <Button disabled={!transferAmount || transferFrom === transferTo} onClick={async () => {
                await requestFundTransfer(transferFrom, transferTo, Number(transferAmount), transferNote);
                setShowTransferForm(false);
                setTransferAmount(''); setTransferNote('');
                addToast('Transfer submitted — check Approvals page', 'info');
              }}>Submit for Approval</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Petty cash limits modal */}
      {showPettyForm && (
        <Modal isOpen={true} onClose={() => setShowPettyForm(null)} title={`Petty Cash Limits — ${FUND_LABELS[showPettyForm]}`}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Changes to petty cash limits require 2-of-3 approval. Current: {
              (() => {
                const l = pettyLimits.find((x) => x.fund_type === showPettyForm);
                return l ? `${fmtAmount(l.per_transaction_limit)} / txn, ${fmtAmount(l.monthly_limit)} / month, ${fmtAmount(l.yearly_limit)} / year` : 'not set';
              })()
            }</p>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Per-transaction limit</label>
              <input type="number" min="0" value={pettyTx} onChange={(e) => setPettyTx(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monthly total limit</label>
              <input type="number" min="0" value={pettyMonth} onChange={(e) => setPettyMonth(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Yearly total limit</label>
              <input type="number" min="0" value={pettyYear} onChange={(e) => setPettyYear(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowPettyForm(null)}>Cancel</Button>
              <Button disabled={!pettyTx || !pettyMonth || !pettyYear} onClick={async () => {
                await requestPettyCashLimitChange(showPettyForm, rotaryYear, {
                  per_transaction_limit: Number(pettyTx), monthly_limit: Number(pettyMonth), yearly_limit: Number(pettyYear),
                });
                setShowPettyForm(null);
                setPettyTx(''); setPettyMonth(''); setPettyYear('');
                addToast('Submitted — check Approvals page', 'info');
              }}>Submit for Approval</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Opening balance modal */}
      {showOpeningForm && (
        <Modal isOpen={true} onClose={() => setShowOpeningForm(null)} title={`Opening Balance — ${FUND_LABELS[showOpeningForm]}`}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">One-time entry to record existing cash when the system goes live. Does not require approval.</p>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount</label>
              <input type="number" min="0.01" step="0.01" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowOpeningForm(null)}>Cancel</Button>
              <Button disabled={!openingAmount} onClick={async () => {
                await recordOpeningBalance(showOpeningForm, Number(openingAmount));
                setShowOpeningForm(null);
                setOpeningAmount('');
                loadAll();
              }}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
