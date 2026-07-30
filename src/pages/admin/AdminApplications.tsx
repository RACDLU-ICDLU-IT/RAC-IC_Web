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
  History,
  PenSquare,
  ShieldCheck,
} from 'lucide-react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useAuth } from '../../contexts/AuthContext';
import { useDues, DuesSettings } from '../../hooks/useDues';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import { logAudit } from '../../hooks/useAuditLog';
import * as XLSX from 'xlsx';

/**
 * ------------------------------------------------------------------
 * Visual identity — matches DashboardHome.tsx's card language exactly,
 * INCLUDING its fixed-font behavior. DashboardHome.tsx deliberately
 * opts out of the tenant theme system's font vars and force-loads Inter
 * via a <link> (useInterFont, mirroring TenantContext's own font-loading
 * pattern) plus a `!important` font-family rule scoped to its own wrapper
 * class. That's not just a style default — it's a stronger override than
 * plain inline fontFamily can achieve if the global theme system uses
 * !important or higher specificity itself. This page now does the exact
 * same thing (own INTER_LINK_ID guard so the two pages don't fight over
 * the same <link> tag, own scoped wrapper class) rather than approximating
 * it with an unscoped, non-important font-family.
 * ------------------------------------------------------------------
 */

const INTER_FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
const INTER_LINK_ID = 'rac-admin-applications-inter-font';

function useInterFont() {
  useEffect(() => {
    if (document.getElementById(INTER_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = INTER_LINK_ID;
    link.rel = 'stylesheet';
    link.href = INTER_FONT_URL;
    document.head.appendChild(link);
  }, []);
}

type PaymentStatus = 'unpaid' | 'pending_verification' | 'verified' | 'rejected';
const PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'pending_verification', 'verified', 'rejected'];

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

/** Human-readable one-liner for a single audit_log row, tailored to the
 * action/changes shapes this page actually writes. Falls back to a
 * generic "<action> on <table_name>" for anything unrecognized. */
function describeLogEntry(entry: any): string {
  const action = entry.changes?.action;
  switch (action) {
    case 'application_approved':
      return 'Application approved';
    case 'application_rejected':
      return `Application rejected${entry.changes?.note ? ` — "${entry.changes.note}"` : ''}`;
    case 'application_set_pending':
      return 'Application status reset to pending';
    case 'application_deleted':
      return 'Application deleted';
    case 'payment_verified':
      return 'Payment verified';
    case 'payment_rejected':
      return `Payment rejected${entry.changes?.note ? ` — "${entry.changes.note}"` : ''}`;
    case 'payment_manual_update':
      return `Payment manually set to "${entry.changes?.new_status}"${entry.changes?.note ? ` — "${entry.changes.note}"` : ''}`;
    case 'reconsideration_resolved':
      return 'Reconsideration request marked as resolved';
    case 'reconsideration_reopened':
      return 'Reconsideration request marked as unresolved';
    default:
      return `${entry.action} on ${entry.table_name}`;
  }
}

export default function AdminApplications() {
  const { adminTenant: tenant } = useAdminTenant();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { fetchDuesSettings, updateDuesSettings } = useDues();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  useInterFont();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [detailsTab, setDetailsTab] = useState<'details' | 'log'>('details');

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

  // Payment verification (fast-path actions for the pending_verification case)
  const [confirmVerifyPayment, setConfirmVerifyPayment] = useState<any | null>(null);
  const [confirmRejectPayment, setConfirmRejectPayment] = useState<any | null>(null);
  const [paymentRejectNote, setPaymentRejectNote] = useState('');
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);

  // Manual payment override — works regardless of current payment_status,
  // including straight from 'unpaid' with nothing submitted at all.
  const [manualPaymentApp, setManualPaymentApp] = useState<any | null>(null);
  const [manualStatus, setManualStatus] = useState<PaymentStatus>('verified');
  const [manualSender, setManualSender] = useState('');
  const [manualTxnId, setManualTxnId] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  // Reconsideration resolved toggle
  const [reconsiderationActionLoading, setReconsiderationActionLoading] = useState(false);

  // Log tab
  const [logEntries, setLogEntries] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

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

  const fetchApplicationLog = async (appId: string) => {
    setLogLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('table_name', 'applications')
        .eq('record_id', appId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLogEntries(data || []);
    } catch (err) {
      console.error('fetchApplicationLog error:', err);
      addToast('Failed to load application log', 'error');
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    if (selectedApp) {
      setDetailsTab('details');
      fetchApplicationLog(selectedApp.id);
    } else {
      setLogEntries([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApp?.id]);

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setActionLoading(true);
    try {
      await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', confirmApprove.id)
        .eq('tenant_id', tenant.id);
      await logAudit(tenant.id, 'applications', confirmApprove.id, 'approve', user?.id, {
        action: 'application_approved',
      });
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
          reconsideration_resolved: false,
        })
        .eq('id', confirmReject.id)
        .eq('tenant_id', tenant.id);
      await logAudit(tenant.id, 'applications', confirmReject.id, 'reject', user?.id, {
        action: 'application_rejected',
        note: rejectionNote || null,
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

  const handleSetPending = async (app: any) => {
    setActionLoading(true);
    try {
      await supabase
        .from('applications')
        .update({
          status: 'pending',
          rejection_note: null,
          reconsideration_requested: false,
          reconsideration_resolved: false,
        })
        .eq('id', app.id)
        .eq('tenant_id', tenant.id);
      await logAudit(tenant.id, 'applications', app.id, 'update', user?.id, {
        action: 'application_set_pending',
      });
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
      await logAudit(tenant.id, 'applications', confirmDelete.id, 'delete', user?.id, {
        action: 'application_deleted',
        snapshot: { name: confirmDelete.name, email: confirmDelete.email, status: confirmDelete.status },
      });
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
      await logAudit(tenant.id, 'applications', confirmVerifyPayment.id, 'approve', user?.id, {
        action: 'payment_verified',
        transaction_id: confirmVerifyPayment.payment_transaction_id || null,
      });
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
      await logAudit(tenant.id, 'applications', confirmRejectPayment.id, 'reject', user?.id, {
        action: 'payment_rejected',
        note: paymentRejectNote || null,
      });
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

  const openManualPayment = (app: any) => {
    setManualPaymentApp(app);
    setManualStatus((app.payment_status as PaymentStatus) || 'unpaid');
    setManualSender(app.payment_sender_number || '');
    setManualTxnId(app.payment_transaction_id || '');
    setManualNote(app.payment_note || '');
  };

  const handleManualPaymentSave = async () => {
    if (!manualPaymentApp) return;
    setManualSaving(true);
    try {
      const patch: Record<string, any> = {
        payment_status: manualStatus,
        payment_sender_number: manualSender.trim() || null,
        payment_transaction_id: manualTxnId.trim() || null,
        payment_note: manualNote.trim() || null,
      };
      if (manualStatus === 'verified') {
        patch.payment_verified_at = new Date().toISOString();
      }
      if (manualStatus === 'pending_verification' && !manualPaymentApp.payment_submitted_at) {
        patch.payment_submitted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('applications')
        .update(patch)
        .eq('id', manualPaymentApp.id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;

      await logAudit(tenant.id, 'applications', manualPaymentApp.id, 'update', user?.id, {
        action: 'payment_manual_update',
        previous_status: manualPaymentApp.payment_status || 'unpaid',
        new_status: manualStatus,
        sender_number: manualSender.trim() || null,
        transaction_id: manualTxnId.trim() || null,
        note: manualNote.trim() || null,
      });

      addToast('Payment updated manually.', 'success');
      setManualPaymentApp(null);
      fetchApplications();
      if (selectedApp?.id === manualPaymentApp.id) fetchApplicationLog(manualPaymentApp.id);
    } catch (err) {
      console.error(err);
      addToast('Failed to save manual payment update', 'error');
    } finally {
      setManualSaving(false);
    }
  };

  const handleToggleReconsiderationResolved = async (app: any) => {
    setReconsiderationActionLoading(true);
    const nextResolved = !app.reconsideration_resolved;
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          reconsideration_resolved: nextResolved,
          reconsideration_resolved_at: nextResolved ? new Date().toISOString() : null,
          reconsideration_resolved_by: nextResolved ? user?.id || null : null,
        })
        .eq('id', app.id)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      await logAudit(tenant.id, 'applications', app.id, 'update', user?.id, {
        action: nextResolved ? 'reconsideration_resolved' : 'reconsideration_reopened',
      });
      addToast(nextResolved ? 'Marked as resolved.' : 'Marked as unresolved.', 'success');
      fetchApplications();
      if (selectedApp?.id === app.id) {
        setSelectedApp({ ...selectedApp, reconsideration_resolved: nextResolved });
        fetchApplicationLog(app.id);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to update reconsideration status', 'error');
    } finally {
      setReconsiderationActionLoading(false);
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
      'Reconsideration Requested': app.reconsideration_requested ? 'Yes' : 'No',
      'Reconsideration Resolved': app.reconsideration_resolved ? 'Yes' : 'No',
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
    (a) => (a.status || '').toLowerCase() === 'rejected' && a.reconsideration_requested && !a.reconsideration_resolved
  ).length;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '—';
    return `৳${Number(amount).toLocaleString('en-BD')}`;
  };

  const formatLogTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

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
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
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
                {reconsiderationCount === 1 ? 'unresolved request' : 'unresolved requests'}
              </div>
            </div>
          </div>

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
                            color: app.reconsideration_resolved ? p.tsub : '#e08a72',
                            marginTop: 3,
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: app.reconsideration_resolved ? 'rgba(156,163,175,0.14)' : 'rgba(224,138,114,0.14)',
                          }}
                        >
                          <RefreshCcw size={9} /> {app.reconsideration_resolved ? 'Reconsideration Resolved' : 'Reconsideration Requested'}
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
                        <button
                          onClick={() => openManualPayment(app)}
                          title="Manually Set Payment"
                          className="rac-admin-row-action p-1.5 rounded"
                          style={{ color: '#60a5fa' }}
                        >
                          <PenSquare size={16} />
                        </button>
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

      <Modal
        isOpen={!!manualPaymentApp}
        onClose={() => setManualPaymentApp(null)}
        title="Manually Set Payment"
        size="sm"
      >
        {manualPaymentApp && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              Set the payment record for <span className="font-semibold">{manualPaymentApp.name}</span> directly —
              useful for cash payments, phone-confirmed bKash, or correcting a mistake. This works even if no
              payment has been submitted yet.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Status</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setManualStatus(s)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors capitalize ${
                      manualStatus === s
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sender bKash Number</label>
              <input
                value={manualSender}
                onChange={(e) => setManualSender(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Transaction ID</label>
              <input
                value={manualTxnId}
                onChange={(e) => setManualTxnId(e.target.value)}
                placeholder="e.g. 8N7A6BC5D4"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (Optional)</label>
              <textarea
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                rows={2}
                placeholder="e.g. Cash received in person on July 30."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setManualPaymentApp(null)}>
                Cancel
              </Button>
              <Button onClick={handleManualPaymentSave} disabled={manualSaving}>
                {manualSaving ? 'Saving…' : 'Save Payment Update'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!selectedApp} onClose={() => setSelectedApp(null)} title="Application" size="md">
        {selectedApp && (
          <div className="space-y-4">
            <div className="flex gap-1 border-b border-gray-100 -mt-1 mb-2">
              <button
                onClick={() => setDetailsTab('details')}
                className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  detailsTab === 'details' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <UserCheck size={14} /> Details
              </button>
              <button
                onClick={() => setDetailsTab('log')}
                className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  detailsTab === 'log' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <History size={14} /> Log {logEntries.length > 0 && <span className="text-gray-400">({logEntries.length})</span>}
              </button>
            </div>

            {detailsTab === 'details' && (
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

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase font-bold">Payment</span>
                    <button
                      onClick={() => openManualPayment(selectedApp)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-700"
                    >
                      <PenSquare size={12} /> Edit
                    </button>
                  </div>
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
                  <div
                    className={`rounded-lg p-3 flex items-center justify-between gap-3 ${
                      selectedApp.reconsideration_resolved ? 'bg-gray-50 border border-gray-100' : 'bg-blue-50 border border-blue-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedApp.reconsideration_resolved ? (
                        <ShieldCheck size={14} className="text-gray-400 shrink-0" />
                      ) : (
                        <RefreshCcw size={14} className="text-blue-500 shrink-0" />
                      )}
                      <p className={`text-sm ${selectedApp.reconsideration_resolved ? 'text-gray-500' : 'text-blue-700'}`}>
                        {selectedApp.reconsideration_resolved
                          ? 'This reconsideration request has been marked resolved.'
                          : 'This applicant has requested another chance.'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleReconsiderationResolved(selectedApp)}
                      disabled={reconsiderationActionLoading}
                      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedApp.reconsideration_resolved
                          ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                          : 'border-blue-200 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {reconsiderationActionLoading ? '…' : selectedApp.reconsideration_resolved ? 'Mark Unresolved' : 'Mark Resolved'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {detailsTab === 'log' && (
              <div>
                {logLoading ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Loading log…</div>
                ) : logEntries.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                    No log entries yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {logEntries.map((entry) => (
                      <div key={entry.id} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800">{describeLogEntry(entry)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatLogTimestamp(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

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
