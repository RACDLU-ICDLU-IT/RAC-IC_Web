import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { UserCheck, CheckCircle2, XCircle, Eye, Loader2, KeyRound, Copy, Check, Plus, Download, Trash2 } from 'lucide-react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import * as XLSX from 'xlsx';

export default function AdminApplications() {
  const { adminTenant: tenant } = useAdminTenant();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  
  // Code management
  const [codes, setCodes] = useState<any[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [codeQuantity, setCodeQuantity] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeCopied, setCopiedCode] = useState<string | null>(null);

  // Application selection for export
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  
  const [confirmApprove, setConfirmApprove] = useState<any | null>(null);
  const [confirmReject, setConfirmReject] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const q = supabase.from('applications').select('*').eq('tenant_id', tenant.id);
      const { data: snap } = await q;
      const apps = snap || [];
      // sort latest first
      apps.sort((a: any, b: any) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt||0).getTime()) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt||0).getTime()));
      setApplications(apps);
    } catch (err) {
      console.error(err);
      addToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCodes = async () => {
    setCodesLoading(true);
    try {
      const { data, error } = await supabase
        .from('application_codes')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });
      if (!error) setCodes(data || []);
    } catch (err) {
      console.error('fetchCodes error:', err);
    } finally {
      setCodesLoading(false);
    }
  };

  const generateRandomCode = (): string => {
    // Excludes confusable characters: 0, O, 1, I
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleGenerateCode = async () => {
    const qty = Math.max(1, Math.min(50, codeQuantity));
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const newCodes: string[] = [];
      const rows = Array.from({ length: qty }, () => {
        const code = generateRandomCode();
        newCodes.push(code);
        return {
          code,
          tenant_id: tenant.id,
          created_by: session?.user?.id || null,
          label: newCodeLabel.trim() || 'Invitation Code',
          is_active: true,
          used_count: 0,
          max_uses: 1,
        };
      });
      const { error } = await supabase.from('application_codes').insert(rows);
      if (error) throw error;
      setGeneratedCodes(newCodes);
      setNewCodeLabel('');
      setCodeQuantity(1);
      fetchCodes();
      addToast(`${qty} invitation code${qty > 1 ? 's' : ''} generated!`, 'success');
    } catch (err: any) {
      console.error('generateCode error:', err);
      addToast(err.message || 'Failed to generate codes', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    });
  };

  const handleDeactivateCode = async (codeId: string) => {
    try {
      const { error } = await supabase
        .from('application_codes')
        .update({ is_active: false })
        .eq('id', codeId)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      addToast('Code deactivated', 'success');
      fetchCodes();
    } catch (err) {
      addToast('Failed to deactivate code', 'error');
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchCodes();
  }, [tenant.id]);

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setActionLoading(true);
    try {
      await supabase.from('applications').update({ status: 'approved' }).eq('id', confirmApprove.id).eq('tenant_id', tenant.id);
      addToast('Application approved.', 'success');
      
      setConfirmApprove(null);
      fetchApplications();
    } catch (err) {
      console.error(err);
      addToast('Failed to approve application', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirmReject) return;
    setActionLoading(true);
    try {
      await supabase.from('applications').update({ 
        status: 'rejected',
        rejection_note: rejectionNote
      }).eq('id', confirmReject.id).eq('tenant_id', tenant.id);
      addToast('Application rejected.', 'success');
      setConfirmReject(null);
      setRejectionNote('');
      fetchApplications();
    } catch (err) {
      console.error(err);
      addToast('Failed to reject application', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPending = async (app: any) => {
    setActionLoading(true);
    try {
      await supabase.from('applications').update({ 
        status: 'pending',
        rejection_note: null
      }).eq('id', app.id).eq('tenant_id', tenant.id);
      addToast('Application set back to pending.', 'success');
      fetchApplications();
    } catch (err) {
      console.error(err);
      addToast('Failed to update application status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('applications').delete().eq('id', confirmDelete.id).eq('tenant_id', tenant.id);
      if (error) throw error;
      addToast('Application deleted.', 'success');
      setConfirmDelete(null);
      fetchApplications();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete application', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSelectApp = (id: string) => {
    setSelectedAppIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllApps = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedAppIds(filteredApps.map((a: any) => a.id));
    else setSelectedAppIds([]);
  };

  const exportApplicationsExcel = (dataToExport: any[]) => {
    if (dataToExport.length === 0) {
      addToast('No applications to export', 'error');
      return;
    }
    const wb = XLSX.utils.book_new();
    const rows = dataToExport.map((app: any) => ({
      'Name': app.name || '',
      'Email': app.email || '',
      'Date of Birth': app.dob || '',
      'Gender': app.gender || '',
      'Blood Group': app.bloodGroup || '',
      'Phone': app.phone || '',
      'Emergency Contact': app.emergencyContact || '',
      'Residential Address': app.address || '',
      'Referred By': app.referredBy || '',
      'Status': app.status || 'pending',
      'Applied On': app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '',
      'Code Used': app.codeUsed || '',
      'Photo URL': app.photo || '',
      'Rejection Note': app.rejectionNote || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    const fileName = `applications_${tenant.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const filteredApps = applications.filter(a => activeTab === 'all' || (a.status || '').toLowerCase() === activeTab);

  const pendingCount = applications.filter(a => (a.status || '').toLowerCase() === 'pending').length;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Applications</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="flex h-6 items-center px-2.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold animate-pulse">
              {pendingCount} Pending
            </span>
          )}
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <Button
            variant="outline-dark"
            size="sm"
            onClick={() =>
              exportApplicationsExcel(
                selectedAppIds.length > 0
                  ? applications.filter((a: any) => selectedAppIds.includes(a.id))
                  : filteredApps
              )
            }
          >
            <Download size={15} className="mr-1.5" />
            {selectedAppIds.length > 0
              ? `Export ${selectedAppIds.length} Selected`
              : 'Export All'} (Excel)
          </Button>
          <Button
            size="sm"
            onClick={() => { setIsCodeModalOpen(true); setGeneratedCodes([]); }}
          >
            <KeyRound size={15} className="mr-1.5" />
            Manage Codes
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'pending', 'approved', 'rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <Table
        columns={[
          {
            key: 'select',
            label: (
              <input
                type="checkbox"
                className="w-4 h-4 rounded cursor-pointer"
                onChange={handleSelectAllApps}
                checked={selectedAppIds.length > 0 && selectedAppIds.length === filteredApps.length}
                ref={el => {
                  if (el) el.indeterminate = selectedAppIds.length > 0 && selectedAppIds.length < filteredApps.length;
                }}
              />
            )
          },
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'age', label: 'Age' },
          { key: 'gender', label: 'Gender' },
          { key: 'date', label: 'Applied On' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions' },
        ]}
        data={filteredApps}
        isLoading={loading}
        emptyMessage="No applications found"
        emptyIcon={<UserCheck size={48} />}
        renderRow={(app, i) => {
          const age = calculateAge(app.dob);
          const validAge = tenant.id === 'racdlu' ? age >= 18 && age <= 30 : age >= 12 && age <= 18;
          const rangeLabel = tenant.id === 'racdlu' ? '18-30' : '12-18';
          return (
            <tr key={app.id} className={selectedAppIds.includes(app.id) ? 'bg-primary/5' : ''}>
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded cursor-pointer"
                  onChange={() => handleSelectApp(app.id)}
                  checked={selectedAppIds.includes(app.id)}
                />
              </td>
              <td className="px-6 py-4 font-medium text-gray-900">{app.name}</td>
              <td className="px-6 py-4 text-gray-500">{app.email}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span>{age}</span>
                  {validAge ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : (
                    <span title={`Outside ${rangeLabel} range`}><XCircle size={14} className="text-red-500" /></span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-gray-500 text-sm">{app.gender || '-'}</td>
              <td className="px-6 py-4 text-gray-500">
                {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  (app.status || '').toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                  (app.status || '').toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {(app.status || 'pending').toLowerCase()}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-1.5 items-center flex-wrap">
                  {(app.status || '').toLowerCase() !== 'approved' && (
                    <button
                      onClick={() => setConfirmApprove(app)}
                      title="Approve"
                      className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors"
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                  {(app.status || '').toLowerCase() !== 'pending' && (
                    <button
                      onClick={() => handleSetPending(app)}
                      title="Set to Pending"
                      className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-1 rounded transition-colors text-xs font-bold leading-none"
                    >
                      ⏳
                    </button>
                  )}
                  {(app.status || '').toLowerCase() !== 'rejected' && (
                    <button
                      onClick={() => setConfirmReject(app)}
                      title="Reject"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                  <button onClick={() => setSelectedApp(app)} className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-1 rounded transition-colors"><Eye size={18} /></button>
                  <button onClick={() => setConfirmDelete(app)} title="Delete" className="text-red-400 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={18} /></button>
                </div>
              </td>
            </tr>
          );
        }}
      />

      <ConfirmDialog
        isOpen={!!confirmApprove}
        onClose={() => setConfirmApprove(null)}
        onConfirm={handleApprove}
        title="Approve Application"
        message={`Approve ${confirmApprove?.name}'s application and create their member account?`}
        confirmLabel="Approve"
        isLoading={actionLoading}
      />

      <Modal isOpen={!!confirmReject} onClose={() => setConfirmReject(null)} title="Reject Application" size="sm">
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to reject {confirmReject?.name}?</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Note (Optional)</label>
          <textarea 
            value={rejectionNote} 
            onChange={e => setRejectionNote(e.target.value)} 
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-accent"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={() => setConfirmReject(null)}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleReject} disabled={actionLoading}>
            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Reject'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Application"
        message={`Permanently delete ${confirmDelete?.name}'s application? This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={actionLoading}
      />

      <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="Application Details" size="md">
        {selectedApp && (
          <div className="space-y-4">
            {selectedApp.photo && (
              <div className="flex justify-center mb-2">
                <img
                  src={selectedApp.photo}
                  alt={selectedApp.name}
                  className="w-28 h-36 object-cover rounded-xl border-4 border-gray-100 shadow"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Name</span>
                <p className="font-medium">{selectedApp.name}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Email</span>
                <p className="font-medium text-sm">{selectedApp.email}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Phone</span>
                <p className="font-medium">{selectedApp.phone || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Date of Birth</span>
                <p className="font-medium">{selectedApp.dob || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Gender</span>
                <p className="font-medium">{selectedApp.gender || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Blood Group</span>
                <p className="font-medium">{selectedApp.bloodGroup || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Code Used</span>
                <p className="font-mono font-medium text-sm">{selectedApp.codeUsed || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500 uppercase font-bold">Emergency Contact</span>
                <p className="font-medium">{selectedApp.emergencyContact || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500 uppercase font-bold">Residential Address</span>
                <p className="font-medium">{selectedApp.address || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500 uppercase font-bold">Referred By</span>
                <p className="font-medium">{selectedApp.referredBy || '-'}</p>
              </div>
            </div>
            {selectedApp.rejection_note && (
              <div>
                <span className="text-xs text-red-500 uppercase font-bold">Rejection Note</span>
                <p className="mt-1 text-sm text-red-700 bg-red-50 p-3 rounded">{selectedApp.rejection_note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => { setIsCodeModalOpen(false); setGeneratedCodes([]); setNewCodeLabel(''); setCodeQuantity(1); }}
        title="Invitation Code Manager"
        size="lg"
      >
        <div className="space-y-6">

          {/* --- Generate New Code Section --- */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <KeyRound size={15} className="text-primary" /> Generate Invitation Codes
            </h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Label <span className="text-gray-400">(optional, for your reference)</span>
                </label>
                <input
                  value={newCodeLabel}
                  onChange={e => setNewCodeLabel(e.target.value)}
                  placeholder="e.g. Batch June 2026"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={codeQuantity}
                  onChange={e => setCodeQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors text-center font-bold"
                />
              </div>
              <Button onClick={handleGenerateCode} disabled={isGenerating} size="sm">
                {isGenerating ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  <><Plus size={14} className="mr-1" /> Generate</>
                )}
              </Button>
            </div>

            {/* Newly generated codes display */}
            {generatedCodes.length > 0 && (
              <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    ✓ {generatedCodes.length} Code{generatedCodes.length > 1 ? 's' : ''} Ready
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCodes.join('\n'));
                      setCopiedCode('__all__');
                      setTimeout(() => setCopiedCode(null), 2500);
                    }}
                    className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-medium text-xs transition-colors"
                  >
                    {codeCopied === '__all__' ? <><Check size={13} /> Copied all!</> : <><Copy size={13} /> Copy all</>}
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {generatedCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-200">
                      <span className="font-mono text-lg font-bold tracking-[0.3em] text-emerald-800 select-all">
                        {code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(code)}
                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium text-xs transition-colors"
                      >
                        {codeCopied === code ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-emerald-600 mt-3">
                  Each code is single-use. Share one per applicant.
                </p>
              </div>
            )}
          </div>

          {/* --- Existing Codes List --- */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                All Generated Codes
              </h3>
              <span className="text-xs text-gray-400">{codes.length} total</span>
            </div>

            {codesLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Loading codes...</div>
            ) : codes.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                No codes generated yet. Generate your first one above.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {codes.map((c: any) => {
                  const isExhausted = c.used_count >= c.max_uses;
                  const isInactive = !c.is_active;
                  const isDimmed = isExhausted || isInactive;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${isDimmed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-mono font-bold tracking-widest text-sm ${isDimmed ? 'text-gray-400' : 'text-gray-800'}`}>
                          {c.code}
                        </span>
                        {c.label && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded truncate max-w-[120px]">
                            {c.label}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          isInactive ? 'bg-gray-200 text-gray-500' :
                          isExhausted ? 'bg-red-100 text-red-600' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isInactive ? 'Deactivated' : isExhausted ? 'Used' : 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-gray-400">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                        </span>
                        {!isInactive && !isExhausted && (
                          <>
                            <button
                              onClick={() => handleCopyCode(c.code)}
                              className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
                              title="Copy code"
                            >
                              {codeCopied === c.code ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                            <button
                              onClick={() => handleDeactivateCode(c.id)}
                              className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}
