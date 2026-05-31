import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useDues, LedgerEntry } from '../../hooks/useDues';
import { LedgerTable } from '../../components/dues/LedgerTable';
import { Card } from '../../components/ui/Card';

export default function MemberDues() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { fetchMemberLedger, loading } = useDues();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const entries = await fetchMemberLedger(user.id);
    setLedger(entries);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(amount);
  };

  let totalCharged = 0;
  let totalPaid = 0;
  let totalWaived = 0;
  let overdueCount = 0;

  ledger.forEach(e => {
    if (e.status === 'waived') {
      totalWaived += e.amount;
    } else {
      totalCharged += e.amount;
      totalPaid += (e.paid_amount || 0);
      if (e.status === 'overdue') overdueCount++;
    }
  });

  const outstanding = totalCharged - totalPaid;
  const paymentRate = (totalCharged - totalWaived) > 0 
    ? ((totalPaid / (totalCharged - totalWaived)) * 100).toFixed(1) + '%' 
    : 'N/A';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Dues & Fees</h1>
      </div>

      {overdueCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium">
                You have {overdueCount} overdue fee(s) totalling {formatAmount(outstanding)} — please contact an administrator to make a payment.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Charged</div>
          <div className="text-2xl font-bold text-gray-900">{formatAmount(totalCharged)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">I Have Paid</div>
          <div className="text-2xl font-bold text-emerald-600">{formatAmount(totalPaid)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">I Owe</div>
          <div className="text-2xl font-bold text-red-600">{formatAmount(outstanding)}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">My Payment Rate %</div>
          <div className="text-2xl font-bold text-blue-600">{paymentRate}</div>
        </Card>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Fee History</h3>
        </div>
        <div className="p-0">
          <LedgerTable 
            entries={ledger} 
            loading={loading} 
            selectedIds={[]} 
            onSelectChange={() => {}} 
            onMarkPaid={() => {}} 
            onMarkWaived={() => {}} 
            onSendReminder={() => {}} 
            showMemberColumn={false}
            compact={true}
          />
        </div>
      </div>

    </div>
  );
}
