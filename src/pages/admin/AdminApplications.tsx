import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { UserCheck, CheckCircle2, XCircle, Eye, Loader2 } from 'lucide-react';

export default function AdminApplications() {
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
      const q = query(collection(db, 'applications'));
      const snap = await getDocs(q);
      const apps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // sort latest first
      apps.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
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
  }, []);

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setActionLoading(true);
    try {
      // 1. Create member profile
      // We know ID is confirmApprove.id
      const memberId = `IC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      await setDoc(doc(db, 'users', confirmApprove.id), {
        name: confirmApprove.name,
        email: confirmApprove.email,
        phone: confirmApprove.phone || '',
        dob: confirmApprove.dob || '',
        school: confirmApprove.school || '',
        grade: confirmApprove.grade || '',
        role: 'member',
        status: 'active',
        memberId,
        createdAt: serverTimestamp()
      });
      // 2. Update application status
      await updateDoc(doc(db, 'applications', confirmApprove.id), { status: 'approved' });
      addToast('Application approved. Member profile created.', 'success');
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
      await updateDoc(doc(db, 'applications', confirmReject.id), { 
        status: 'rejected',
        rejectionNote
      });
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
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const age = new Date(difference).getFullYear() - 1970;
    return age;
  };

  const filteredApps = applications.filter(a => activeTab === 'all' || a.status === activeTab);

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-heading font-bold text-gray-900">Applications</h1>
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
          const validAge = age >= 12 && age <= 18;
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
                    <span title="Outside 12-18 range"><XCircle size={14} className="text-red-500" /></span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 text-gray-500">{app.school}</td>
              <td className="px-6 py-4 text-gray-500">{app.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
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
