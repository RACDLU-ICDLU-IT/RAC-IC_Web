import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { UserCheck, CheckCircle2, XCircle, Eye, Loader2 } from 'lucide-react';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminApplications() {
  const { adminTenant: tenant } = useAdminTenant();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  
  const [confirmApprove, setConfirmApprove] = useState<any | null>(null);
  const [confirmReject, setConfirmReject] = useState<any | null>(null);
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

  useEffect(() => {
    fetchApplications();
  }, [tenant.id]);

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setActionLoading(true);
    try {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('*')
        .eq('email', confirmApprove.email)
        .eq('tenant_id', tenant.id);
        
      const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

      if (existingUser) {
        await supabase.from('users').update({ status: 'active', role: 'member' }).eq('id', existingUser.id).eq('tenant_id', tenant.id);
        addToast('Application approved. Member profile updated.', 'success');
      } else {
        addToast('Application approved. Ask the member to sign up at /login — their account will be activated automatically.', 'success');
      }

      await supabase.from('applications').update({ status: 'approved' }).eq('id', confirmApprove.id).eq('tenant_id', tenant.id);
      
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
        rejectionNote
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

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const filteredApps = applications.filter(a => activeTab === 'all' || a.status === activeTab);

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
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
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {['pending', 'approved', 'rejected', 'all'].map(tab => (
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
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'age', label: 'Age' },
          { key: 'school', label: 'School' },
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
            <tr key={app.id}>
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
              <td className="px-6 py-4 text-gray-500">{app.school}</td>
              <td className="px-6 py-4 text-gray-500">
                {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  app.status === 'approved' ? 'bg-green-100 text-green-800' :
                  app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {app.status || 'pending'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  {app.status === 'pending' && (
                    <>
                      <button onClick={() => setConfirmApprove(app)} className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors"><CheckCircle2 size={18} /></button>
                      <button onClick={() => setConfirmReject(app)} className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"><XCircle size={18} /></button>
                    </>
                  )}
                  <button onClick={() => setSelectedApp(app)} className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 p-1 rounded transition-colors"><Eye size={18} /></button>
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

      <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="Application Details" size="md">
        {selectedApp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Name</span>
                <p className="font-medium">{selectedApp.name}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Email</span>
                <p className="font-medium">{selectedApp.email}</p>
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
                <span className="text-xs text-gray-500 uppercase font-bold">School</span>
                <p className="font-medium">{selectedApp.school || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Grade</span>
                <p className="font-medium">{selectedApp.grade || '-'}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase font-bold">Why do you want to join?</span>
              <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedApp.reason || 'No reason provided.'}</p>
            </div>
            {selectedApp.rejectionNote && (
              <div>
                <span className="text-xs text-red-500 uppercase font-bold">Rejection Note</span>
                <p className="mt-1 text-sm text-red-700 bg-red-50 p-3 rounded">{selectedApp.rejectionNote}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}
