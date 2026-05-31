import React from 'react';
import { LedgerEntry } from '../../hooks/useDues';
import { Button } from '../ui/Button';

interface LedgerTableProps {
  entries: LedgerEntry[];
  loading: boolean;
  selectedIds: string[];
  onSelectChange: (ids: string[]) => void;
  onMarkPaid: (entry: LedgerEntry) => void;
  onMarkWaived: (entry: LedgerEntry) => void;
  onSendReminder: (entry: LedgerEntry) => void;
  showMemberColumn?: boolean;
  compact?: boolean;
}

export function LedgerTable({
  entries,
  loading,
  selectedIds,
  onSelectChange,
  onMarkPaid,
  onMarkWaived,
  onSendReminder,
  showMemberColumn = true,
  compact = false
}: LedgerTableProps) {
  const formatAmount = (amount: number, currency: string = 'BDT') => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  };

  const allSelected = entries.length > 0 && selectedIds.length === entries.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectChange([]);
    } else {
      onSelectChange(entries.map(e => e.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectChange([...selectedIds, id]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <div className="text-gray-400 mb-2 font-medium">No fee entries found.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 text-gray-500 font-medium">
            <tr>
              <th className="px-4 py-3 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              {showMemberColumn && <th className="px-4 py-3">Member</th>}
              <th className="px-4 py-3">Fee Label</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Paid Date</th>
              <th className="px-4 py-3 text-right">Paid Amount</th>
              <th className="px-4 py-3 text-center">Reminders</th>
              {!compact && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map(entry => {
              const outstanding = entry.amount - (entry.paid_amount || 0);
              const isSelected = selectedIds.includes(entry.id);

              let statusColor = 'bg-gray-100 text-gray-800';
              if (entry.status === 'unpaid') statusColor = 'bg-yellow-100 text-yellow-800';
              if (entry.status === 'paid') statusColor = 'bg-green-100 text-green-800';
              if (entry.status === 'overdue') statusColor = 'bg-red-100 text-red-800';

              let typeColor = 'bg-gray-100 text-gray-800';
              if (entry.fee_templates?.type === 'monthly') typeColor = 'bg-blue-100 text-blue-800';
              if (entry.fee_templates?.type === 'event') typeColor = 'bg-purple-100 text-purple-800';
              if (entry.fee_templates?.type === 'custom') typeColor = 'bg-orange-100 text-orange-800';

              return (
                <tr 
                  key={entry.id} 
                  className={`hover:bg-gray-50 ${isSelected ? 'bg-indigo-50/50' : ''} ${entry.status === 'overdue' ? 'border-l-4 border-l-red-500' : ''}`}
                >
                  <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleOne(entry.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  {showMemberColumn && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {entry.users?.photo ? (
                            <img src={entry.users.photo} alt={entry.users.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium text-xs">
                              {entry.users?.name?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{entry.users?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{entry.users?.role || '-'}</div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{entry.label}</div>
                    {entry.notes && <div className="text-xs text-gray-500 truncate max-w-[150px]" title={entry.notes}>{entry.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                      {entry.fee_templates?.type || entry.label.split(' ')[0] || 'fee'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-medium text-gray-900">{formatAmount(entry.amount, entry.currency)}</div>
                    {outstanding > 0 && outstanding !== entry.amount && entry.status !== 'waived' && (
                      <div className="text-xs text-red-600">Owes: {formatAmount(outstanding, entry.currency)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(entry.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {entry.paid_at ? new Date(entry.paid_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                    {entry.paid_amount ? formatAmount(entry.amount, entry.currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {entry.reminder_count > 0 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full text-xs" title={`Last sent: ${entry.reminder_sent_at ? new Date(entry.reminder_sent_at).toLocaleDateString() : ''}`}>
                        {entry.reminder_count}
                      </span>
                    ) : '-'}
                  </td>
                  {!compact && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {['unpaid', 'overdue'].includes(entry.status) && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onMarkPaid(entry)}>
                              Pay
                            </Button>
                            <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-700" onClick={() => onSendReminder(entry)}>
                              Remind
                            </Button>
                          </>
                        )}
                        {entry.status !== 'waived' && entry.status !== 'paid' && (
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => onMarkWaived(entry)}>
                            Waive
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
