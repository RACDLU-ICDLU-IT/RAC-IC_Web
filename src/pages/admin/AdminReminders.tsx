import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Bell, Pencil, Trash, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminReminders() {
  const { adminTenant: tenant } = useAdminTenant();
  const { user, profile } = useAuth();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const { data: snap } = await supabase.from('reminders').select('*').eq('tenant_id', tenant.id).order('due_date', { ascending: true });
      setReminders(snap || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load reminders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReminders(); }, [tenant.id]);

  const handleSave = async () => {
    if (!formData.title || !formData.dueDate) {
      addToast('Title and due date are required', 'error');
      return;
    }
    const isNew = !formData.id;
    const docId = isNew ? crypto.randomUUID() : formData.id;
    try {
      await supabase.from('reminders').upsert({
        id: docId,
        tenant_id: tenant.id,
        title: formData.title,
        description: formData.description || '',
        due_date: formData.dueDate,
        target_role: formData.targetRole || 'all members',
        created_by: user?.id,
        created_by_name: profile?.name,
        ...(isNew ? { created_at: new Date().toISOString() } : {}),
      }, { onConflict: 'id' });
      addToast('Reminder saved', 'success');
      setIsFormOpen(false);
      setFormData({});
      fetchReminders();
    } catch (err) {
      addToast('Failed to save reminder', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('reminders').delete().eq('id', deleteId).eq('tenant_id', tenant.id);
      addToast('Reminder deleted', 'success');
      setDeleteId(null);
      fetchReminders();
    } catch { addToast('Failed to delete', 'error'); }
  };

  const getDueBadge = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate + 'T23:59:59');
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Overdue', cls: 'bg-red-100 text-red-700', icon: <AlertCircle size={12} /> };
    if (diffDays === 0) return { label: 'Due Today', cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> };
    if (diffDays <= 3) return { label: `${diffDays}d left`, cls: 'bg-amber-50 text-amber-600', icon: <Clock size={12} /> };
    return { label: `${diffDays}d left`, cls: 'bg-gray-100 text-gray-500', icon: <Clock size={12} /> };
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const activeReminders = reminders.filter(r => new Date(r.dueDate || r.due_date) >= new Date(new Date().toDateString()));
  const expiredReminders = reminders.filter(r => new Date(r.dueDate || r.due_date) < new Date(new Date().toDateString()));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Reminders</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Create and manage club-wide reminders for members.</p>
        </div>
        <Button onClick={() => { setFormData({ targetRole: 'all members' }); setIsFormOpen(true); }}>
          Add Reminder
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active / Upcoming */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Bell size={14} /> Active Reminders
              <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">{activeReminders.length}</span>
            </h2>
            {activeReminders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                <CheckCircle size={40} className="mx-auto mb-3 text-green-300" />
                <p className="font-medium">No active reminders.</p>
                <p className="text-sm mt-1">Create one above to notify all members.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeReminders.map(r => {
                  const badge = getDueBadge(r.due_date || r.dueDate);
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 group hover:border-gray-200 transition-colors shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                        <Bell size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{r.title}</h3>
                          <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badge.cls}`}>
                            {badge.icon} {badge.label}
                          </span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">
                            {r.targetRole}
                          </span>
                        </div>
                        {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                        <p className="text-xs text-gray-400 mt-2">
                          Due: {new Date(r.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                          {r.createdByName && ` • Added by ${r.createdByName}`}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setFormData(r); setIsFormOpen(true); }} className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => setDeleteId(r.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expired */}
          {expiredReminders.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Expired</h2>
              <div className="space-y-2 opacity-60">
                {expiredReminders.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between group">
                    <div>
                      <p className="font-medium text-gray-600 text-sm line-through">{r.title}</p>
                      <p className="text-xs text-gray-400">Was due: {new Date(r.dueDate + 'T00:00:00').toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => setDeleteId(r.id)} className="p-2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg">
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setFormData({}); }} title={formData.id ? 'Edit Reminder' : 'Add Reminder'} size="sm">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title <span className="text-red-500">*</span></label>
            <input
              value={formData.title || ''}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className={inputClass}
              placeholder="e.g. Submit Attendance Form"
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className={inputClass}
              rows={3}
              placeholder="Additional details..."
            />
          </div>
          <div>
            <label className={labelClass}>Due Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={formData.dueDate || ''}
              onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Target Audience</label>
            <select
              value={formData.targetRole || 'all members'}
              onChange={e => setFormData({ ...formData, targetRole: e.target.value })}
              className={inputClass}
            >
              <option value="all members">All Members</option>
              <option value="admins only">Admins Only</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => { setIsFormOpen(false); setFormData({}); }}>Cancel</Button>
            <Button onClick={handleSave}>Save Reminder</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Reminder" message="This reminder will be removed for all members. Continue?" />
    </div>
  );
}
