import React, { useState, useEffect } from 'react';
import { CreateTemplateInput, FeeTemplate } from '../../hooks/useDues';
import { supabase } from '../../supabase';
import { Button } from '../ui/Button';

interface FeeTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTemplateInput) => Promise<FeeTemplate | null>;
  editingTemplate?: FeeTemplate | null;
}

export function FeeTemplateForm({ isOpen, onClose, onSubmit, editingTemplate }: FeeTemplateFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'monthly' | 'event' | 'custom'>('monthly');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState('BDT');
  const [appliesTo, setAppliesTo] = useState('all');
  const [dueDate, setDueDate] = useState('');
  const [eventId, setEventId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // For specific members
  const [specificMembers, setSpecificMembers] = useState<string[]>([]);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchEvents();
      if (editingTemplate) {
        setName(editingTemplate.name);
        setDescription(editingTemplate.description || '');
        setType(editingTemplate.type);
        setAmount(editingTemplate.amount);
        setCurrency(editingTemplate.currency);
        setAppliesTo(editingTemplate.applies_to || 'all');
        setDueDate(editingTemplate.due_date || '');
        setEventId(editingTemplate.event_id || '');
        setIsActive(editingTemplate.is_active);
      } else {
        setName('');
        setDescription('');
        setType('monthly');
        setAmount(0);
        setCurrency('BDT');
        setAppliesTo('all');
        setDueDate('');
        setEventId('');
        setIsActive(true);
        setSpecificMembers([]);
      }
    }
  }, [isOpen, editingTemplate]);

  const fetchMembers = async () => {
    const { data } = await supabase.from('users').select('id, name, photo, role, status').eq('status', 'Active');
    setAvailableMembers(data || []);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('id, title, date').order('date', { ascending: false });
    setEvents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setLoading(true);
    await onSubmit({
      name,
      description,
      type,
      amount,
      currency,
      applies_to: appliesTo,
      due_date: type === 'custom' ? dueDate : undefined,
      event_id: type === 'event' ? eventId : undefined,
      is_active: isActive,
      recur_day: 1
    });
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={loading ? undefined : onClose}></div>
      <div className="absolute inset-y-0 right-0 w-full max-w-md flex flex-col bg-white shadow-xl animate-in slide-in-from-right">
        
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {editingTemplate ? 'Edit Fee Template' : 'Add Fee Template'}
          </h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form id="feeTemplateForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="e.g., Monthly Membership Dues"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                rows={2}
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                >
                  <option value="monthly">Monthly Recurring</option>
                  <option value="event">Event Fee</option>
                  <option value="custom">Custom One-Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                >
                  <option value="BDT">BDT</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>

            {type === 'monthly' && (
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-200">
                Auto-generates on the 1st of every month for all active members matching the criteria.
              </div>
            )}

            {type === 'event' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Event <span className="text-red-500">*</span></label>
                <select
                  required
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                >
                  <option value="">Select an event...</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.title} ({new Date(e.date).toLocaleDateString()})</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                />
              </div>
            )}

            <div>
               <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                 <input
                   type="checkbox"
                   checked={isActive}
                   onChange={(e) => setIsActive(e.target.checked)}
                   className="rounded border-gray-300 text-primary focus:ring-primary"
                 />
                 Is Active
               </label>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
           <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
             Cancel
           </Button>
           <Button type="submit" form="feeTemplateForm" disabled={loading || amount <= 0}>
             {loading ? 'Saving...' : 'Save Template'}
           </Button>
        </div>

      </div>
    </div>
  );
}
