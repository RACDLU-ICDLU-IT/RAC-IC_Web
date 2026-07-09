import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Pencil, Trash, Lock, LayoutGrid } from 'lucide-react';
import { ICON_MAP, ICON_NAMES, COMPONENT_NAMES, PageRegistryRow } from '../../routes/dashboardRoutes';

export default function AdminPageRegistry() {
  const { adminTenant: tenant } = useAdminTenant();
  const { isMasterAdmin } = useAuth();
  const { addToast } = useToast();

  const [rows, setRows] = useState<PageRegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<PageRegistryRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const blank = { mode: 'admin' as 'admin' | 'member', path: '', label: '', icon: 'FileText', section: '', component_key: COMPONENT_NAMES[0] };
  const [form, setForm] = useState<typeof blank>(blank);

  const fetchRows = async () => {
    setLoading(true);
    const { data } = await supabase.from('page_registry').select('*').eq('tenant_id', tenant.id).order('mode').order('sort_order');
    setRows((data || []) as PageRegistryRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, [tenant.id]);

  const openNew = () => {
    setEditing(null);
    setForm(blank);
    setIsFormOpen(true);
  };

  const openEdit = (r: PageRegistryRow) => {
    setEditing(r);
    setForm({ mode: r.mode, path: r.path, label: r.label, icon: r.icon, section: r.section || '', component_key: r.component_key });
    setIsFormOpen(true);
  };

  const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSave = async () => {
    if (!form.label.trim() || !form.path.trim() || !form.component_key) {
      addToast('Label, path, and component are required', 'error');
      return;
    }
    const path = slugify(form.path);
    const pageKey = `${form.mode}_${path.replace(/-/g, '_')}`;

    try {
      if (editing) {
        await supabase.from('page_registry').update({
          label: form.label.trim(), path, icon: form.icon,
          section: form.section.trim() || null, component_key: form.component_key,
        }).eq('id', editing.id);
      } else {
        const maxSort = Math.max(0, ...rows.filter(r => r.mode === form.mode).map(r => r.sort_order));
        const { error } = await supabase.from('page_registry').insert({
          tenant_id: tenant.id, mode: form.mode, path, page_key: pageKey,
          label: form.label.trim(), icon: form.icon, section: form.section.trim() || null,
          component_key: form.component_key, sort_order: maxSort + 1, is_builtin: false,
        });
        if (error) throw error;
      }
      addToast('Page saved. Refresh to see it in the sidebar.', 'success');
      setIsFormOpen(false);
      fetchRows();
    } catch (err: any) {
      addToast(err.message || 'Failed to save page', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('page_registry').delete().eq('id', deleteId);
      addToast('Page removed', 'success');
      setDeleteId(null);
      fetchRows();
    } catch {
      addToast('Failed to delete page', 'error');
    }
  };

  if (!isMasterAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Lock size={40} className="mb-3" />
        <p>Only Master Admin can manage pages.</p>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const SelectedIcon = ICON_MAP[form.icon] || LayoutGrid;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Pages</h1>
          <p className="text-gray-500 text-sm mt-1">Add sidebar entries for components already in the repo — no deploy needed</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-2" /> New Page</Button>
      </div>

      {(['admin', 'member'] as const).map(mode => (
        <div key={mode}>
          <h3 className="text-xs font-bold uppercase text-gray-400 mb-3">{mode === 'admin' ? 'Admin Panel Pages' : 'Member Dashboard Pages'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? <p className="text-gray-400 text-sm">Loading...</p> : rows.filter(r => r.mode === mode).map(r => {
              const Icon = ICON_MAP[r.icon] || LayoutGrid;
              return (
                <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-gray-500" />
                    <div>
                      <p className="font-semibold text-gray-900">{r.label}</p>
                      <p className="text-[10px] text-gray-400">/{mode === 'admin' ? 'admin' : 'dashboard'}/{r.path} · {r.component_key}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-primary"><Pencil size={16} /></button>
                    {!r.is_builtin && (
                      <button onClick={() => setDeleteId(r.id)} className="text-gray-500 hover:text-red-500"><Trash size={16} /></button>
                    )}
                    {r.is_builtin && <Lock size={14} className="text-gray-300" title="Built-in page" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Page' : 'New Page'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Area</label>
              <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value as 'admin' | 'member' })} className={inputClass} disabled={!!editing}>
                <option value="admin">Admin Panel</option>
                <option value="member">Member Dashboard</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Section (admin only, optional)</label>
              <input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className={inputClass} placeholder="e.g. Operations" disabled={form.mode === 'member'} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Label</label>
            <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className={inputClass} placeholder="e.g. Donation Requests" />
          </div>

          <div>
            <label className={labelClass}>Path</label>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>/{form.mode === 'admin' ? 'admin' : 'dashboard'}/</span>
              <input value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} className={inputClass} placeholder="donation-requests" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Component</label>
            <select value={form.component_key} onChange={e => setForm({ ...form, component_key: e.target.value })} className={inputClass}>
              {COMPONENT_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">Component must already exist in the repo's COMPONENT_MAP.</p>
          </div>

          <div>
            <label className={labelClass}>Icon</label>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                <SelectedIcon size={18} />
              </div>
              <select value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className={inputClass}>
                {ICON_NAMES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Page</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Page" message="This removes the sidebar entry and route. The component file itself is not deleted." />
    </div>
  );
}
