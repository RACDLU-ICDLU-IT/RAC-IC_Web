import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  KeyRound,
  Copy,
  Check,
  Plus,
  Download,
  Trash2,
  Wallet,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useDues, DuesSettings } from '../../hooks/useDues';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import * as XLSX from 'xlsx';

/**
 * ------------------------------------------------------------------
 * Visual identity — matches DashboardHome.tsx's card language exactly:
 * the same `p` palette object (getClubPalette, theme-aware light/dark),
 * the same rounded-20px dark cards with p.border hairlines, the same
 * inline-style-first approach rather than Tailwind utility classes for
 * anything palette-driven. Structural pieces that don't benefit from a
 * rebuild (Table, Modal, ConfirmDialog) keep using the existing shared
 * components — only their surrounding chrome/cards are restyled.
 * ------------------------------------------------------------------
 */

type PaymentStatus = 'unpaid' | 'pending_verification' | 'verified' | 'rejected';

function paymentStatusMeta(status: PaymentStatus | undefined, p: ReturnType<typeof getClubPalette>) {
  switch (status) {
    case 'verified':
      return { label: 'Verified', color: p.green, bg: p.greenDeep };
    case 'pending_verification':
      return { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.14)' };
    case 'rejected':
      return { label: 'Rejected', color: '#e08a72', bg: 'rgba(224,138,114,0.14)' };
    default:
      return { label: 'Unpaid', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' };
  }
}

export default function AdminApplications() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const { fetchDuesSettings, updateDuesSettings } = useDues();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

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

  // Payment verification
  const [confirmVerifyPayment, setConfirmVerifyPayment] = useState<any | null>(null);
  const [confirmRejectPayment, setConfirmRejectPayment] = useState<any | null>(null);
  const [paymentRejectNote, setPaymentRejectNote] = useState('');
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);

  // Fee settings
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeAmount, setFeeAmount] = useState('');
  const [feeBkash, setFeeBkash] = useState('');
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeInitialized, setFeeInitialized] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const q = supabase.from('applications').select('*').eq('tenant_id', tenant.id);
      const { data: snap } = await q;
      const apps = snap || [];
      apps.sort(
        (a: any, b: any) =>
          (b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime()) -
          (a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime())
      );
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

  const loadFeeSettings = async () => {
    try {
      const s: DuesSettings = await fetchDuesSettings();
      setFeeAmount(s.application_fee != null ? String(s.application_fee) : '0');
      setFeeBkash(s.default_bkash_number || '');
    } catch (err) {
      console.error('loadFeeSettings error:', err);
    } finally {
      setFeeInitialized(true);
    }
  };

  const generateRandomCode = (): string => {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const newCodes: string[] = [];
      const rows = Array.from({ length: qty }, () => {
        const code = generateRandomCode();
        newCodes.push(code);
        return {
          code,
          tenant_id: tenant.id,
          created_by: session?.user?.id || null,
          // Label doubles as the applicant-facing reference number
          // (pulled onto the Join form via check_application_code) —
          // see conversation notes. Not just an internal note anymore.
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
    loadFeeSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setActionLoading(true);
    try {
      await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', confirmApprove.id)
        .eq('tenant_id', tenant.id);
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
      await supabase
        .from('applications')
        .update({
          status: 'rejected',
          rejection_note: rejectionNote,
          reconsideration_requested: false,
        })
        .eq('id', confirmReject.id)
        .eq('tenant_id', tenant.id);
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
      await supabase
        .from('applications')
        .update({
          status: 'pending',
          rejection_note: null,
          reconsideration_requested: false,
        })
        .eq('id', app.id)
        .eq('tenant_id', tenant.id);
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
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', confirmDelete.id)
        .eq('tenant_id', tenant.id);
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

  const handleVerifyPayment = async () => {
    if (!confirmVerifyPayment) return;
    setPaymentActionLoading(true);
    try {
      await supabase
        .from('applications')
        .update({
          payment_status: 'verified',
          payment_verified_at: new Date().toISOString(),
          payment_note: null,
        })
        .eq('id', confirmVerifyPayment.id)
        .eq('tenant_id', tenant.id);
      addToast('Payment verified.', 'success');
      setConfirmVerifyPayment(null);
      fetchApplications();
    } catch (err) {
      console.error(err);
      addToast('Failed to verify payment', 'error');
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!confirmRejectPayment) return;
    setPaymentActionLoading(true);
    try {
      await supabase
        .from('applications')
        .update({
          payment_status: 'rejected',
          payment_note: paymentRejectNote || null,
        })
        .eq('id', confirmRejectPayment.id)
        .eq('tenant_id', tenant.id);
      addToast('Payment marked as rejected.', 'success');
      setConfirmRejectPayment(null);
      setPaymentRejectNote('');
      fetchApplications();
    } catch (err) {
      console.error(err);
      addToast('Failed to reject payment', 'error');
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleSaveFeeSettings = async () => {
    const amountNum = parseFloat(feeAmount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      addToast('Enter a valid application fee amount', 'error');
      return;
    }
    setFeeSaving(true);
    try {
      const ok = await updateDuesSettings({
        application_fee: amountNum,
        default_bkash_number: feeBkash.trim() || null,
      });
      if (ok) {
        addToast('Application fee settings saved.', 'success');
        setIsFeeModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to save fee settings', 'error');
    } finally {
      setFeeSaving(false);
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
    setSelectedAppIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
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
      Name: app.name || '',
      Email: app.email || '',
      'Date of Birth': app.dob || '',
      Gender: app.gender || '',
      'Blood Group': app.bloodGroup || '',
      Phone: app.phone || '',
      'Emergency Contact': app.emergencyContact || '',
      'Residential Address': app.address || '',
      'Referred By': app.referredBy || '',
      'Reference Number': app.reference_number || '',
      Status: app.status || 'pending',
      'Applied On': app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '',
      'Code Used': app.codeUsed || '',
      'Application Fee': app.application_fee ?? '',
      'Payment Status': app.payment_status || 'unpaid',
      'Payment Sender Number': app.payment_sender_number || '',
      'Payment Transaction ID': app.payment_transaction_id || '',
      'Photo URL': app.photo || '',
      'Rejection Note': app.rejection_note || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    const fileName = `applications_${tenant.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const filteredApps = applications.filter((a) => activeTab === 'all' || (a.status || '').toLowerCase() === activeTab);
  const pendingCount = applications.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
  const paymentPendingCount = applications.filter((a) => a.payment_status === 'pending_verification').length;
  const reconsiderationCount = applications.filter(
    (a) => (a.status || '').toLowerCase() === 'rejected' && a.reconsideration_requested
  ).length;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '—';
    return `৳${Number(amount).toLocaleString('en-BD')}`;
  };

  /* ------------------------------- loading skeleton, matches DashboardHome ------------------------------- */
  if (loading && applications.length === 0) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading applications"
        style={{ background: p.bg, padding: 18 }}
        className="p-4 md:p-8 -m-4 md:-m-8"
      >
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div
            style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}
            className="!grid-cols-1 sm:!grid-cols-3"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{ height: 110, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
                className="animate-pulse"
              />
            ))}
          </div>
          <div
            style={{ height: 320, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rac-admin-applications">
      <style>{`
        .rac-admin-applications, .rac-admin-applications * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .rac-admin-applications ::-webkit-scrollbar { display: none; }
        .rac-admin-tabs { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .rac-admin-card-btn {
          transition: background .15s ease, opacity .15s ease, transform .1s ease;
        }
        .rac-admin-card-btn:hover { opacity: .85; }
        .rac-admin-card-btn:active { transform: scale(.98); }
        .rac-admin-row-action {
          transition: background .15s ease, color .15s ease;
        }
      `}</style>

      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          {/* ---------------- page-top: title row ---------------- */}
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 2px', gap: 12, flexWrap: 'wrap' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>Applications</span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: p.dark,
                  border: `1px solid ${p.border}`,
                  color: p.tsub,
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                }}
              >
                {tenant.id}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() =>
                  exportApplicationsExcel(
                    selectedAppIds.length > 0 ? applications.filter((a: any) => selectedAppIds.includes(a.id)) : filteredApps
                  )
                }
                className="rac-admin-card-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '9px 14px',
                  borderRadius: 12,
                  background: p.dark,
                  color: p.tl,
                  border: `1px solid ${p.border}`,
                  cursor: 'pointer',
                }}
              >
                <Download size={14} />
                {selectedAppIds.length > 0 ? `Export ${selectedAppIds.length} Selected` : 'Export All'}
              </button>
              <button
                type="button"
                onClick={() => setIsFeeModalOpen(true)}
                className="rac-admin-card-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '9px 14px',
                  borderRadius: 12,
                  background: p.dark,
                  color: p.tl,
                  border: `1px solid ${p.border}`,
                  cursor: 'pointer',
                }}
              >
                <Wallet size={14} />
                Application Fee
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCodeModalOpen(true);
                  setGeneratedCodes([]);
                }}
                className="rac-admin-card-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '9px 16px',
                  borderRadius: 12,
                  background: p.green,
                  color: '#0e1a12',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <KeyRound size={14} />
                Manage Codes
              </button>
            </div>
          </div>

          {/* ---------------- summary cards ---------------- */}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}
            className="!grid-cols-1 sm:!grid-cols-3"
          >
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.tsub }}>Pending Review</span>
                <UserCheck size={15} style={{ color: p.tsub }} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.3px' }}>{pendingCount}</div>
              <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 3 }}>
                {pendingCount === 1 ? 'application waiting' : 'applications waiting'}
              </div>
            </div>

            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.tsub }}>Payment Verification</span>
                <Wallet size={15} style={{ color: p.tsub }} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.3px', color: paymentPendingCount > 0 ? '#f59e0b' : p.tl }}>
                {paymentPendingCount}
              </div>
              <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 3 }}>
                {paymentPendingCount === 1 ? 'payment to verify' : 'payments to verify'}
              </div>
            </div>

            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.tsub }}>Reconsideration Requests</span>
                <RefreshCcw size={15} style={{ color: p.tsub }} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.3px', color: reconsiderationCount > 0 ? '#e08a72' : p.tl }}>
                {reconsiderationCount}
              </div>
              <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 3 }}>
                {reconsiderationCount === 1 ? 'applicant asked to be reconsidered' : 'applicants asked to be reconsidered'}
              </div>
            </div>
          </div>

          {/* ---------------- tabs ---------------- */}
          <div
            className="rac-admin-tabs"
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 12,
              borderRadius: 16,
              background: p.dark,
              border: `1px solid ${p.border}`,
              padding: 5,
              overflowX: 'auto',
            }}
          >
            {['all', 'pending', 'approved', 'rejected'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 11,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: activeTab === tab ? p.green : 'transparent',
                  color: activeTab === tab ? '#0e1a12' : p.tsub,
                  transition: 'background .15s ease, color .15s ease',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* ---------------- applications table card ---------------- */}
          <div style={{ borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, overflow: 'hidden', marginBottom: 12 }}>
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
                      ref={(el) => {
                        if (el) el.indeterminate = selectedAppIds.length > 0 && selectedAppIds.length < filteredApps.length;
                      }}
                    />
                  ),
                },
                { key: 'name', label: 'Name' },
                { key: 'age', label: 'Age' },
                { key: 'date', label: 'Applied On' },
                { key: 'status', label: 'Application' },
                { key: 'payment', label: 'Payment' },
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
                const payMeta = paymentStatusMeta(app.payment_status, p);
                const status = (app.status || 'pending').toLowerCase();
                return (
                  <tr key={app.id} style={{ background: selectedAppIds.includes(app.id) ? p.greenDeep : 'transparent' }}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded cursor-pointer"
                        onChange={() => handleSelectApp(app.id)}
                        checked={selectedAppIds.includes(app.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div style={{ fontWeight: 600, color: p.tl, fontSize: 13 }}>{app.name}</div>
                      <div style={{ fontSize: 11, color: p.tsub }}>{app.email}</div>
                      {app.reference_number && (
                        <div style={{ fontSize: 10, color: p.tsub, fontFamily: 'monospace', marginTop: 1 }}>
                          Ref: {app.reference_number}
                        </div>
                      )}
                      {status === 'rejected' && app.reconsideration_requested && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: '#e08a72',
                            marginTop: 3,
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: 'rgba(224,138,114,0.14)',
                          }}
                        >
                          <RefreshCcw size={9} /> Reconsideration Requested
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: p.tl }}>
                        <span>{age}</span>
                        {validAge ? (
                          <CheckCircle2 size={13} style={{ color: p.green }} />
                        ) : (
                          <span title={`Outside ${rangeLabel} range`}>
                            <XCircle size={13} style={{ color: '#e08a72' }} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ fontSize: 12, color: p.tsub }}>
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: status === 'approved' ? p.greenDeep : status === 'rejected' ? 'rgba(224,138,114,0.14)' : 'rgba(245,158,11,0.14)',
                          color: status === 'approved' ? p.green : status === 'rejected' ? '#e08a72' : '#f59e0b',
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: payMeta.bg,
                          color: payMeta.color,
                        }}
                      >
                        {payMeta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 items-center flex-wrap">
                        {app.payment_status === 'pending_verification' && (
                          <>
                            <button
                              onClick={() => setConfirmVerifyPayment(app)}
                              title="Verify Payment"
                              className="rac-admin-row-action p-1.5 rounded"
                              style={{ color: p.green }}
                            >
                              <Wallet size={16} />
                            </button>
                            <button
                              onClick={() => setConfirmRejectPayment(app)}
                              title="Reject Payment"
                              className="rac-admin-row-action p-1.5 rounded"
                              style={{ color: '#e08a72' }}
                            >
                              <AlertTriangle size={16} />
                            </button>
                          </>
                        )}
                        {status !== 'approved' && (
                          <button
                            onClick={() => setConfirmApprove(app)}
                            title="Approve"
                            className="rac-admin-row-action p-1.5 rounded"
                            style={{ color: p.green }}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {status !== 'pending' && (
                          <button
                            onClick={() => handleSetPending(app)}
                            title="Set to Pending"
                            className="rac-admin-row-action p-1.5 rounded"
                            style={{ color: '#f59e0b', fontSize: 12 }}
                          >
                            ⏳
                          </button>
                        )}
                        {status !== 'rejected' && (
                          <button
                            onClick={() => setConfirmReject(app)}
                            title="Reject"
                            className="rac-admin-row-action p-1.5 rounded"
                            style={{ color: '#e08a72' }}
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedApp(app)}
                          title="View Details"
                          className="rac-admin-row-action p-1.5 rounded"
                          style={{ color: p.tsub }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(app)}
                          title="Delete"
                          className="rac-admin-row-action p-1.5 rounded"
                          style={{ color: '#e08a72', opacity: 0.7 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          </div>
        </div>
      </div>

      {/* ---------------- confirm dialogs ---------------- */}
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
            onChange={(e) => setRejectionNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-accent"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={() => setConfirmReject(null)}>
            Cancel
          </Button>
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

      {/* ---------------- payment verification dialogs ---------------- */}
      <ConfirmDialog
        isOpen={!!confirmVerifyPayment}
        onClose={() => setConfirmVerifyPayment(null)}
        onConfirm={handleVerifyPayment}
        title="Verify Payment"
        message={`Mark ${confirmVerifyPayment?.name}'s payment (Txn: ${confirmVerifyPayment?.payment_transaction_id || '—'}) as verified?`}
        confirmLabel="Verify Payment"
        isLoading={paymentActionLoading}
      />

      <Modal isOpen={!!confirmRejectPayment} onClose={() => setConfirmRejectPayment(null)} title="Reject Payment" size="sm">
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Reject the payment submitted by {confirmRejectPayment?.name}?
          </p>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-4 space-y-1">
            <div>
              <span className="font-semibold">Sender:</span> {confirmRejectPayment?.payment_sender_number || '—'}
            </div>
            <div>
              <span className="font-semibold">Transaction ID:</span> {confirmRejectPayment?.payment_transaction_id || '—'}
            </div>
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note to Applicant (Optional)</label>
          <textarea
            value={paymentRejectNote}
            onChange={(e) => setPaymentRejectNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-accent"
            rows={3}
            placeholder="e.g. Transaction ID doesn't match our records."
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Button variant="secondary" onClick={() => setConfirmRejectPayment(null)}>
            Cancel
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleRejectPayment} disabled={paymentActionLoading}>
            {paymentActionLoading ? <Loader2 size={16} className="animate-spin" /> : 'Reject Payment'}
          </Button>
        </div>
      </Modal>

      {/* ---------------- application details modal ---------------- */}
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
              <div>
                <span className="text-xs text-gray-500 uppercase font-bold">Reference Number</span>
                <p className="font-mono font-medium text-sm">{selectedApp.reference_number || '-'}</p>
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

            {/* Payment details block */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-bold">Payment</span>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <span className="text-xs text-gray-400">Fee</span>
                  <p className="font-medium text-sm">{formatCurrency(selectedApp.application_fee)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Status</span>
                  <p className="font-medium text-sm capitalize">{(selectedApp.payment_status || 'unpaid').replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Sender Number</span>
                  <p className="font-medium text-sm font-mono">{selectedApp.payment_sender_number || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Transaction ID</span>
                  <p className="font-medium text-sm font-mono">{selectedApp.payment_transaction_id || '-'}</p>
                </div>
              </div>
              {selectedApp.payment_note && (
                <div className="mt-3">
                  <span className="text-xs text-gray-400">Payment Note</span>
                  <p className="text-sm text-red-700 bg-red-50 p-3 rounded mt-1">{selectedApp.payment_note}</p>
                </div>
              )}
            </div>

            {selectedApp.rejection_note && (
              <div>
                <span className="text-xs text-red-500 uppercase font-bold">Rejection Note</span>
                <p className="mt-1 text-sm text-red-700 bg-red-50 p-3 rounded">{selectedApp.rejection_note}</p>
              </div>
            )}

            {selectedApp.reconsideration_requested && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2">
                <RefreshCcw size={14} className="text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700">This applicant has requested another chance.</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ---------------- invitation code manager modal ---------------- */}
      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => {
          setIsCodeModalOpen(false);
          setGeneratedCodes([]);
          setNewCodeLabel('');
          setCodeQuantity(1);
        }}
        title="Invitation Code Manager"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <KeyRound size={15} className="text-primary" /> Generate Invitation Codes
            </h3>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Reference Number{' '}
                  <span className="text-gray-400">(shown to the applicant on their form)</span>
                </label>
                <input
                  value={newCodeLabel}
                  onChange={(e) => setNewCodeLabel(e.target.value)}
                  placeholder="e.g. RAC-2026-0001"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={codeQuantity}
                  onChange={(e) => setCodeQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
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
                  <>
                    <Plus size={14} className="mr-1" /> Generate
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              If generating more than one code, each will share this same reference number — use quantity 1 per applicant if you need unique references.
            </p>

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
                    {codeCopied === '__all__' ? (
                      <>
                        <Check size={13} /> Copied all!
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copy all
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {generatedCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-200">
                      <span className="font-mono text-lg font-bold tracking-[0.3em] text-emerald-800 select-all">{code}</span>
                      <button
                        onClick={() => handleCopyCode(code)}
                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium text-xs transition-colors"
                      >
                        {codeCopied === code ? (
                          <>
                            <Check size={13} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-emerald-600 mt-3">Each code is single-use. Share one per applicant.</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">All Generated Codes</h3>
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
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                        isDimmed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`font-mono font-bold tracking-widest text-sm ${isDimmed ? 'text-gray-400' : 'text-gray-800'}`}>
                          {c.code}
                        </span>
                        {c.label && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded truncate max-w-[140px]">{c.label}</span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            isInactive ? 'bg-gray-200 text-gray-500' : isExhausted ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isInactive ? 'Deactivated' : isExhausted ? 'Used' : 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs text-gray-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</span>
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

      {/* ---------------- application fee settings modal ---------------- */}
      <Modal
        isOpen={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        title="Application Fee Settings"
        size="sm"
      >
        {!feeInitialized ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Application Fee (৳)</label>
              <input
                type="number"
                min={0}
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Shown to applicants on the payment step of the Join form.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">bKash Number</label>
              <input
                value={feeBkash}
                onChange={(e) => setFeeBkash(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                This is the same number configured in Dues Settings — updating it here updates it there too.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsFeeModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFeeSettings} disabled={feeSaving}>
                {feeSaving ? 'Saving…' : 'Save Settings'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
