import React, { useState, useEffect } from 'react';
import { LedgerEntry } from '../../hooks/useDues';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface BulkMarkPaidModalProps {
  entries: LedgerEntry[];
  onConfirm: (paidAmount: number, notes: string, paidDate: string) => Promise<void>;
  onClose: () => void;
}

export function BulkMarkPaidModal({ entries, onConfirm, onClose }: BulkMarkPaidModalProps) {
  const [loading, setLoading] = useState(false);
  const totalAmount = entries.reduce((sum, e) => sum + (e.amount - (e.paid_amount || 0)), 0);
  
  const [paidAmount, setPaidAmount] = useState<number>(totalAmount);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setPaidAmount(entries.reduce((sum, e) => sum + (e.amount - (e.paid_amount || 0)), 0));
  }, [entries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paidAmount <= 0) return;
    setLoading(true);
    await onConfirm(paidAmount, notes, paidDate);
    setLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={loading ? () => {} : onClose} title={`Mark ${entries.length} fee(s) as Paid`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <ul className="text-sm font-medium text-gray-700 divide-y divide-gray-200 mb-2 max-h-32 overflow-y-auto">
            {entries.slice(0, 5).map(entry => (
              <li key={entry.id} className="py-1 flex justify-between">
                <span>{entry.label}</span>
                <span>{entry.amount - (entry.paid_amount || 0)} {entry.currency}</span>
              </li>
            ))}
            {entries.length > 5 && (
              <li className="py-1 text-gray-500 italic">...and {entries.length - 5} more</li>
            )}
          </ul>
          <div className="pt-2 border-t border-gray-300 flex justify-between font-bold text-gray-900">
            <span>Total Outstanding:</span>
            <span>{totalAmount.toLocaleString()} BDT</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paid Amount
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            disabled={entries.length > 1} // Bulk edits lock amount to sum. Single edit unlocks.
            value={paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary disabled:bg-gray-100"
          />
          {entries.length > 1 && <span className="text-xs text-gray-500 mt-1 block">Bulk payments require exact total payment.</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Date
          </label>
          <input
            type="date"
            required
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            rows={2}
            placeholder="Payment reference, transaction ID, etc."
          ></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || paidAmount <= 0}>
            {loading ? 'Saving...' : 'Confirm Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
