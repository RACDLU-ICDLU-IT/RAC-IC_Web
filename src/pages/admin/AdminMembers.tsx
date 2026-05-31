import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Users, Pencil, Trash, Eye, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';

export default function AdminMembers() {
  const { profile, user } = useAuth();
  const { adminTenant: tenant } = useAdminTenant();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewMember, setViewMember] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { addToast } = useToast();

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data: snap } = await supabase.from('users').select('*').eq('tenant_id', tenant.id);
      const users = snap || [];
      setMembers(users);
    } catch (err) {
      console.error(err);
      addToast('Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [tenant.id]);

  const schools = Array.from(new Set(members.map(m => m.school).filter(Boolean)));

  const filteredMembers = members.filter(m => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (schoolFilter !== 'all' && m.school !== schoolFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (m.name?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s) || m.school?.toLowerCase().includes(s));
    }
    return true;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredMembers.map(m => m.id));
    else setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  // Prevent UI promotion if just officer
  const isMasterAdmin = profile?.role === 'master_admin';
  const canSetRole = isMasterAdmin || profile?.role === 'admin';
  
  // Rule: only master_admin can change the username of other admins
  const isAdminOrMaster = formData.role === 'admin' || formData.role === 'master_admin';
  const canChangeName = !isAdminOrMaster || isMasterAdmin || user?.id === formData.id;

  const handleSave = async () => {
    const isNew = !formData.id;
    let docId = formData.id;
    
    try {
      if (isNew) {
        if (!formData.email || !formData.password) {
          addToast('Email and password required for new members', 'error');
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session?.access_token
          },
          body: JSON.stringify({...formData, tenant_id: tenant.id}) // explicit tenant_id pass
        });
        
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Failed to create member via Edge Function');
        }
        
        docId = resData.uid;
      }
      
      const { password, ...dataToSave } = formData;
      await supabase.from('users').upsert({ id: docId, tenant_id: tenant.id, ...dataToSave }, { onConflict: 'id' });
      addToast('Member saved', 'success');
      setIsFormOpen(false);
      fetchMembers();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to save member', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('users').delete().eq('id', deleteId).eq('tenant_id', tenant.id);
      addToast('Member removed', 'success');
      setDeleteId(null);
      fetchMembers();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete member', 'error');
    }
  };

  const handleBulkStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .in('id', selectedIds)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      addToast(`Status updated for ${selectedIds.length} members`, 'success');
      setSelectedIds([]);
      fetchMembers();
    } catch (err) {
      addToast('Bulk update failed', 'error');
    }
  };

  const sanitizeCsvField = (value: string): string => {
    // Prevent CSV formula injection — Excel/LibreOffice executes cells starting with = + - @ tab CR
    const str = String(value || '');
    return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  };

  const exportCSV = (dataToExport: any[]) => {
    const csvRows = [];
    const headers = ['Name', 'Email', 'Role', 'Status', 'School', 'Grade', 'Phone', 'Dues Paid', 'Member ID'];
    csvRows.push(headers.join(','));
    for (const m of dataToExport) {
      csvRows.push([
        `"${sanitizeCsvField(m.name)}"`,
        `"${sanitizeCsvField(m.email)}"`,
        `"${sanitizeCsvField(m.role)}"`,
        `"${sanitizeCsvField(m.status)}"`,
        `"${sanitizeCsvField(m.school)}"`,
        `"${sanitizeCsvField(m.grade)}"`,
        `"${sanitizeCsvField(m.phone)}"`,
        m.duesPaid ? 'Yes' : 'No',
        `"${sanitizeCsvField(m.memberId)}"`,
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members_export.csv';
    a.click();
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Members</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Manage club roster</p>
        </div>
        <Button onClick={() => { 
          setFormData({ role: 'member', status: 'active', tenant_id: tenant.id, memberId: `${tenant.shortName.substring(0,2).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}` }); 
          setIsFormOpen(true); 
        }}>
           Add Member
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <input 
          placeholder="Search members..." 
          value={search} onChange={e => setSearch(e.target.value)}
          className={inputClass + ' md:w-64'} 
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={inputClass + ' md:w-auto'}>
          <option value="all">All Roles</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="master_admin">Master Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputClass + ' md:w-auto'}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)} className={inputClass + ' md:w-auto'}>
          <option value="all">All Schools</option>
          {schools.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
        </select>
        <div className="md:ml-auto">
          <Button variant="outline" onClick={() => exportCSV(filteredMembers)}><Download size={16} className="mr-2" /> Export CSV</Button>
        </div>
      </div>

      <Table
        columns={[
          { key: 'select', label: <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filteredMembers.length} /> },
          { key: 'photo', label: '' },
          { key: 'name', label: 'Name' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'school', label: 'School' },
          { key: 'dues', label: 'Dues' },
          { key: 'actions', label: 'Actions' }
        ]}
        data={filteredMembers}
        isLoading={loading}
        emptyIcon={<Users size={48} />}
        emptyMessage="No members found"
        renderRow={(m) => (
          <tr key={m.id} className={selectedIds.includes(m.id) ? 'bg-primary/5' : ''}>
            <td className="px-6 py-4">
              <input type="checkbox" onChange={() => handleSelect(m.id)} checked={selectedIds.includes(m.id)} />
            </td>
            <td className="px-6 py-4">
              {m.photo ? <img src={m.photo} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{m.name?.substring(0,2)}</div>}
            </td>
            <td className="px-6 py-4">
              <div className="font-medium text-gray-900">{m.name}</div>
              <div className="text-xs text-gray-500">{m.email}</div>
              {m.memberId && <div className="text-[10px] text-gray-400 mt-1">{m.memberId}</div>}
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                m.role === 'master_admin' ? 'bg-amber-800 text-white' :
                m.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
              }`}>{m.role || 'member'}</span>
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                m.status === 'active' ? 'bg-green-100 text-green-800' :
                m.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
              }`}>{m.status || 'pending'}</span>
            </td>
            <td className="px-6 py-4 text-sm text-gray-500">{m.school} {m.grade && `(Gr ${m.grade})`}</td>
            <td className="px-6 py-4">
              <button 
                onClick={async () => {
                  await supabase.from('users')
                    .update({ duesPaid: !m.duesPaid })
                    .eq('id', m.id)
                    .eq('tenant_id', tenant.id);
                  fetchMembers();
                }}
                className={`w-4 h-4 rounded-full border ${m.duesPaid ? 'bg-green-500 border-green-500' : 'bg-transparent border-gray-300'}`}
                title={m.duesPaid ? 'Dues Paid' : 'Dues Unpaid'}
              />
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button onClick={() => { setFormData(m); setIsFormOpen(true); }} className="text-gray-500 hover:text-primary"><Pencil size={18} /></button>
                <button onClick={() => { setViewMember(m); setIsViewOpen(true); }} className="text-gray-500 hover:text-primary"><Eye size={18} /></button>
                <button onClick={() => { setDeleteId(m.id); }} className="text-gray-500 hover:text-red-500"><Trash size={18} /></button>
              </div>
            </td>
          </tr>
        )}
      />

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 md:left-[260px] right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between z-40 transform animate-in slide-in-from-bottom">
          <span className="font-medium text-gray-700">{selectedIds.length} selected</span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleBulkStatus('active')}>Set Active</Button>
            <Button variant="outline" onClick={() => handleBulkStatus('inactive')}>Set Inactive</Button>
            <Button variant="outline" onClick={() => exportCSV(members.filter(m => selectedIds.includes(m.id)))}>Export Selected</Button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit Member' : 'Add Member'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 flex items-center gap-6">
            <div className="w-24">
              <CloudinaryUpload onUpload={(u) => setFormData({...formData, photo: u})} currentUrl={formData.photo} label="Photo" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Full Name</label>
                <input 
                   disabled={!canChangeName} 
                   value={formData.name || ''} 
                   onChange={e => setFormData({...formData, name: e.target.value})} 
                   className={inputClass + (!canChangeName ? " bg-gray-50 opacity-70" : "")} 
                />
                {!canChangeName && <p className="text-[10px] text-gray-500 mt-1">Only master admins can update the name of other admins.</p>}
              </div>
              <div className={!formData.id ? '' : 'col-span-2'}>
                <label className={labelClass}>Email</label>
                <input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass + (formData.id ? " bg-gray-50 opacity-70" : "")} disabled={!!formData.id} />
              </div>
              {!formData.id && (
                <div>
                  <label className={labelClass}>Password (Required for new)</label>
                  <input type="password" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} className={inputClass} placeholder="Minimum 8 characters" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Role</label>
            <select value={formData.role || 'member'} onChange={e => setFormData({...formData, role: e.target.value})} className={inputClass} disabled={!canSetRole}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {isMasterAdmin && <option value="master_admin">Master Admin</option>}
            </select>
            {!canSetRole && <p className="text-xs text-gray-400 mt-1">Only admins can promote roles.</p>}
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={formData.status || 'active'} onChange={e => setFormData({...formData, status: e.target.value})} className={inputClass}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div><label className={labelClass}>Phone</label><input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Date of Birth</label><input type="date" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} className={inputClass} /></div>
          
          <div>
            <label className={labelClass}>Gender</label>
            <select value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value})} className={inputClass}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Blood Group</label>
            <select value={formData.bloodGroup || ''} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className={inputClass}>
              <option value="">Select</option>
              {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="md:col-span-2 pt-4 border-t border-gray-100"><h4 className="text-xs font-bold uppercase text-gray-400 mb-3">Academics</h4></div>
          <div><label className={labelClass}>School</label><input value={formData.school || ''} onChange={e => setFormData({...formData, school: e.target.value})} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Grade / Year</label><input value={formData.grade || ''} onChange={e => setFormData({...formData, grade: e.target.value})} className={inputClass} /></div>
            <div><label className={labelClass}>Class / Sec</label><input value={formData.class || ''} onChange={e => setFormData({...formData, class: e.target.value})} className={inputClass} /></div>
          </div>

          <div className="md:col-span-2 pt-4 border-t border-gray-100"><h4 className="text-xs font-bold uppercase text-gray-400 mb-3">Guardian Info</h4></div>
          <div><label className={labelClass}>Parent/Guardian Name</label><input value={formData.parentName || ''} onChange={e => setFormData({...formData, parentName: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Parent/Guardian Phone</label><input value={formData.parentPhone || ''} onChange={e => setFormData({...formData, parentPhone: e.target.value})} className={inputClass} /></div>

          <div className="md:col-span-2 pt-4 border-t border-gray-100"><h4 className="text-xs font-bold uppercase text-gray-400 mb-3">Other</h4></div>
          <div className="md:col-span-2"><label className={labelClass}>Bio</label><textarea value={formData.bio || ''} maxLength={200} onChange={e => setFormData({...formData, bio: e.target.value})} className={inputClass} rows={2} /></div>
          <div><label className={labelClass}>Rotary Year</label><input value={formData.rotaryYear || ''} onChange={e => setFormData({...formData, rotaryYear: e.target.value})} className={inputClass} placeholder="e.g. 2025-2026" /></div>
          <div className="flex items-center gap-2 mt-4"><input type="checkbox" checked={formData.duesPaid || false} onChange={e => setFormData({...formData, duesPaid: e.target.checked})} /> <label className="text-sm font-medium">Dues Paid</label></div>
        </div>
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Member</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Member Profile">
        {viewMember && (
          <div className="space-y-4 text-sm">
            <div className="flex gap-4 items-center">
              {viewMember.photo && <img src={viewMember.photo} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-16 h-16 rounded-full" />}
              <div>
                <h3 className="font-bold text-lg">{viewMember.name}</h3>
                <p className="text-gray-500">{viewMember.email}</p>
                <div className="mt-1 flex gap-2">
                  <span className="uppercase text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded">{viewMember.role}</span>
                  <span className="uppercase text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded">{viewMember.status}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
              <div><strong className="block text-xs uppercase text-gray-400">Phone</strong>{viewMember.phone || '-'}</div>
              <div><strong className="block text-xs uppercase text-gray-400">DOB</strong>{viewMember.dob || '-'}</div>
              <div><strong className="block text-xs uppercase text-gray-400">School</strong>{viewMember.school || '-'}</div>
              <div><strong className="block text-xs uppercase text-gray-400">Grade</strong>{viewMember.grade || '-'}</div>
              <div><strong className="block text-xs uppercase text-gray-400">Member ID</strong>{viewMember.memberId || '-'}</div>
              <div><strong className="block text-xs uppercase text-gray-400">Dues</strong>{viewMember.duesPaid ? 'Paid' : 'Unpaid'}</div>
            </div>
            {viewMember.bio && (
              <div className="mt-4"><strong className="block text-xs uppercase text-gray-400">Bio</strong><p>{viewMember.bio}</p></div>
            )}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
               <a href={`/admin/attendance?memberId=${viewMember.id}`} className="text-primary font-medium hover:underline text-sm">View Attendance History</a>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Member" message="Are you sure? This cannot be undone." />
    </div>
  );
}
