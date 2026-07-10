import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../hooks/useToast';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Plus, Pencil, Trash, Lock } from 'lucide-react';
import { usePageRegistry } from '../../hooks/usePageRegistry';

interface RoleRow { id: string; name: string; label: string; color: string; is_system: boolean; is_protected: boolean; }
type PermMap = Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean; is_locked: boolean }>;

export default function AdminRoles() {
  const { adminTenant: tenant } = useAdminTenant();
  const { isMasterAdmin } = useAuth();
  const { addToast } = useToast();

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState('#696cff');
  const [perms, setPerms] = useState<PermMap>({});
  const [activeTab, setActiveTab] = useState<'admin' | 'member'>('admin');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { pages: registryPages } = usePageRegistry(tenant.id);
  const ADMIN_KEYS = registryPages.filter(p => p.mode === 'admin').map(p => ({ key: p.pageKey, label: p.label }));
  const MEMBER_KEYS = registryPages.filter(p => p.mode === 'member').map(p => ({ key: p.pageKey, label: p.label }));

  const blankPerms = (): PermMap => {
    const blank: PermMap = {};
    [...ADMIN_KEYS, ...MEMBER_KEYS].forEach(p => { blank[p.key] = { can_view: false, can_edit: false, can_delete: false, is_locked: false }; });
    if (blank['member_home']) blank['member_home'] = { can_view: true, can_edit: false, can_delete: false, is_locked: false };
    return blank;
  };

  const fetchRoles = async () => {
    setLoading(true);
    const { data } = await supabase.from('roles').select('*').eq('tenant_id', tenant.id).order('is_protected', { ascending: false });
    setRoles((data || []) as RoleRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, [tenant.id]);

  const openNew = () => {
    setEditingRole(null);
    setNameInput('');
    setColorInput('#696cff');
    setPerms(blankPerms());
    setActiveTab('admin');
    setIsFormOpen(true);
  };

  const openEdit = async (r: RoleRow) => {
    setEditingRole(r);
    setNameInput(r.label);
    setColorInput(r.color);
    const { data } = await supabase.from('role_permissions').select('*').eq('role_id', r.id);
    const map = blankPerms();
    (data || []).forEach((row: any) => {
      map[row.page_key] = { can_view: row.can_view, can_edit: row.can_edit, can_delete: row.can_delete, is_locked: row.is_locked || false };
    });
    if (map['member_home']) map['member_home'] = { can_view: true, can_edit: false, can_delete: false, is_locked: false };
    setPerms(map);
    setActiveTab('admin');
    setIsFormOpen(true);
  };

  const togglePerm = (pageKey: string, action: 'can_view' | 'can_edit' | 'can_delete' | 'is_locked') => {
    if (pageKey === 'member_home') return; // mandatory, always view + unlocked
    setPerms(prev => {
      const cur = prev[pageKey] || { can_view: false, can_edit: false, can_delete: false, is_locked: false };
      const next = { ...cur, [action]: !cur[action] };
      if (action === 'is_locked') return { ...prev, [pageKey]: next };
      if ((action === 'can_edit' || action === 'can_delete') && next[action]) next.can_view = true;
      if (action === 'can_view' && !next.can_view) { next.can_edit = false; next.can_delete = false; }
      return { ...prev, [pageKey]: next };
    });
  };

  const handleSave = async () => {
    if (!nameInput.trim()) { addToast('Role name required', 'error'); return; }
    try {
      let roleId = editingRole?.id;
      const slug = nameInput.trim().toLowerCase().replace(/\s+/g, '_');

      if (editingRole) {
        await supabase.from('roles').update({ label: nameInput.trim(), color: colorInput }).eq('id', editingRole.id);
      } else {
        const { data, error } = await supabase.from('roles')
          .insert({ tenant_id: tenant.id, name: slug, label: nameInput.trim(), color: colorInput, is_system: false, is_protected: false })
          .select().single();
        if (error) throw error;
        roleId = data.id;
      }

      const allKeys = [...ADMIN_KEYS, ...MEMBER_KEYS];
      const rows = allKeys.map(p => {
        const isHome = p.key === 'member_home';
        return {
          role_id: roleId,
          page_key: p.key,
          can_view: isHome ? true : (perms[p.key]?.can_view || false),
          can_edit: isHome ? false : (perms[p.key]?.can_edit || false),
          can_delete: isHome ? false : (perms[p.key]?.can_delete || false),
          is_locked: isHome ? false : (perms[p.key]?.is_locked || false),
        };
      });
      await supabase.from('role_permissions').upsert(rows, { onConflict: 'role_id,page_key' });

      addToast('Role saved', 'success');
      setIsFormOpen(false);
      fetchRoles();
    } catch (err: any) {
      addToast(err.message || 'Failed to save role', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('roles').delete().eq('id', deleteId);
      addToast('Role deleted', 'success');
      setDeleteId(null);
      fetchRoles();
    } catch {
      addToast('Failed to delete role', 'error');
    }
  };

  if (!isMasterAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Lock size={40} className="mb-3" />
        <p>Only Master Admin can manage roles.</p>
      </div>
    );
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const activeKeys = activeTab === 'admin' ? ADMIN_KEYS : MEMBER_KEYS;

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 text-sm mt-1">Define club roles and page-level access</p>
        </div>
        <Button onClick={openNew}><Plus size={16} className="mr-2" /> New Role</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : roles.map(r => (
          <div key={r.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
              <div>
                <p className="font-semibold text-gray-900">{r.label}</p>
                {r.is_system && <p className="text-[10px] uppercase text-gray-400 font-bold">Full Access · Locked</p>}
                {r.is_protected && !r.is_system && <p className="text-[10px] uppercase text-gray-400 font-bold">Default Role · Editable</p>}
              </div>
            </div>
            <div className="flex gap-2">
              {!r.is_system && (
                <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-primary"><Pencil size={16} /></button>
              )}
              {!r.is_protected && (
                <button onClick={() => setDeleteId(r.id)} className="text-gray-500 hover:text-red-500"><Trash size={16} /></button>
              )}
              {r.is_system && <Shield size={16} className="text-amber-700" />}
              {r.is_protected && !r.is_system && <Lock size={14} className="text-gray-400" />}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingRole ? 'Edit Role' : 'New Role'} size="lg">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Role Name</label>
              <input value={nameInput} onChange={e => setNameInput(e.target.value)} className={inputClass} placeholder="e.g. President" disabled={!!editingRole?.is_protected} />
            </div>
            <div>
              <label className={labelClass}>Color</label>
              <input type="color" value={colorInput} onChange={e => setColorInput(e.target.value)} className={inputClass + ' h-10'} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase text-gray-400">Page Permissions</h4>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                <button type="button" onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 ${activeTab === 'admin' ? 'bg-primary text-white' : 'bg-white text-gray-500'}`}>
                  Admin Pages
                </button>
                <button type="button" onClick={() => setActiveTab('member')}
                  className={`px-3 py-1.5 ${activeTab === 'member' ? 'bg-primary text-white' : 'bg-white text-gray-500'}`}>
                  Member Dashboard
                </button>
              </div>
            </div>
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Page</th>
                    <th className="px-3 py-2 font-medium text-gray-500">View</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Edit</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Delete</th>
                    <th className="px-3 py-2 font-medium text-gray-500">Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {activeKeys.map(p => {
                    const isHome = p.key === 'member_home';
                    return (
                      <tr key={p.key} className={`border-t border-gray-100 ${isHome ? 'bg-gray-50' : ''}`}>
                        <td className="px-3 py-2 text-gray-700">
                          {p.label}
                          {isHome && <span className="ml-2 text-[10px] uppercase text-gray-400 font-bold">Mandatory</span>}
                        </td>
                        {(['can_view', 'can_edit', 'can_delete'] as const).map(a => (
                          <td key={a} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isHome ? a === 'can_view' : (perms[p.key]?.[a] || false)}
                              onChange={() => togglePerm(p.key, a)}
                              disabled={isHome}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isHome ? false : (perms[p.key]?.is_locked || false)}
                            onChange={() => togglePerm(p.key, 'is_locked')}
                            disabled={isHome}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Role</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Role" message="Members with this role will lose access. This cannot be undone." />
    </div>
  );
}
