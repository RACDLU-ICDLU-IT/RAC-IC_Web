import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Users, Pencil, Trash, Eye, Download, KeyRound, Plus, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { getClubPalette } from '../../theme/racPalette';
import * as XLSX from 'xlsx';

/**
 * ------------------------------------------------------------------
 * Visual identity — intentionally matches DashboardHome.tsx exactly:
 * same Inter font loader, same `!important` font-scoping opt-out of
 * the tenant theme system, same getClubPalette(tenant.id, mode)
 * hardcoded palette, same 20px-radius card language, same
 * p.dark/p.lightCard surface alternation, same loading-skeleton
 * pattern. This is a deliberate decision to keep the admin Members
 * page visually identical to the member-facing dashboard, not an
 * oversight — see DashboardHome.tsx's header comment for the same
 * reasoning applied there.
 *
 * Only the p.* keys DashboardHome.tsx itself actually uses are
 * reused here (p.bg, p.dark, p.lightCard, p.border, p.tl, p.tsub,
 * p.tmid, p.td, p.mut, p.ptxt, p.green, p.greenDeep, p.av2, p.dots,
 * p.pillBorder, p.tblText) — no new palette keys are invented.
 * ------------------------------------------------------------------
 */

const INTER_FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
const INTER_LINK_ID = 'rac-dashboard-inter-font';

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

interface RoleRow { id: string; name: string; label: string; color: string; is_system: boolean; }

/* ------------------------------- member ID generation ------------------------------- */

/**
 * Member ID format: {PREFIX}-{YEAR}-{NNN}
 *
 *  - PREFIX: first 2 chars of tenant.shortName, uppercased.
 *  - YEAR: the year of the member's joiningDate (NOT current year).
 *  - NNN: a 3-digit sequential number, zero-padded, drawn from one of
 *    two fixed, permanent ranges based on WHEN they joined — not which
 *    calendar year's batch they belong to:
 *      - joiningDate < 2026-07-01  →  reserved range 001-100
 *      - joiningDate >= 2026-07-01 →  range 101-999
 *    This cutoff is fixed forever (per user instruction), so a member
 *    who joined in e.g. March 2024 still draws from 001-100, using
 *    2024 as their ID year.
 *
 * Sequencing is "highest existing + 1" scoped to
 * (tenant, prefix, ID-year, range) — NOT a global counter. Two
 * members joining in different years each start their own count
 * within their year's ID, so RA-2025-101 and RA-2026-101 can coexist.
 */
const RANGE_CUTOFF = new Date('2026-07-01T00:00:00');
const PRE_CUTOFF_RANGE = { min: 1, max: 100 };
const POST_CUTOFF_RANGE = { min: 101, max: 999 };

function getIdRangeForJoiningDate(joiningDate: string): { min: number; max: number } {
  const d = new Date(`${joiningDate}T00:00:00`);
  return d < RANGE_CUTOFF ? PRE_CUTOFF_RANGE : POST_CUTOFF_RANGE;
}

/**
 * Computes the next member ID for a given tenant + joining date, by
 * looking at existing members' memberId strings and finding the
 * highest number already used within the same prefix+year+range.
 *
 * existingMembers should be the full member list for this tenant
 * (already in memory from fetchMembers — no extra query needed).
 */
function generateMemberId(existingMembers: any[], tenant: { shortName: string }, joiningDate: string): string {
  const prefix = tenant.shortName.substring(0, 2).toUpperCase();
  const year = new Date(`${joiningDate}T00:00:00`).getFullYear();
  const range = getIdRangeForJoiningDate(joiningDate);

  const idPattern = new RegExp(`^${prefix}-${year}-(\\d{3})$`);

  let highest = range.min - 1;
  for (const m of existingMembers) {
    const match = typeof m.memberId === 'string' ? m.memberId.match(idPattern) : null;
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (num >= range.min && num <= range.max && num > highest) highest = num;
  }

  let next = highest + 1;
  if (next > range.max) {
    // Range exhausted — extremely unlikely (100 or 899 slots), but
    // surface it as a real value rather than silently overflowing
    // into the other range, which would corrupt the reserved-list
    // guarantee for pre-cutoff members.
    throw new Error(`Member ID range ${range.min}-${range.max} for ${prefix}-${year} is exhausted.`);
  }

  const padded = String(next).padStart(3, '0');
  return `${prefix}-${year}-${padded}`;
}

export default function AdminMembers() {
  const { profile, user, isMasterAdmin } = useAuth();
  const { adminTenant: tenant } = useAdminTenant();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  useInterFont();

  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewMember, setViewMember] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [resetPasswordMember, setResetPasswordMember] = useState<any>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const { addToast } = useToast();

  const roleById = (id: string | null) => roles.find(r => r.id === id) || null;

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const [{ data: snap }, { data: roleData }] = await Promise.all([
        supabase.from('users').select('*').eq('tenant_id', tenant.id),
        supabase.from('roles').select('*').eq('tenant_id', tenant.id),
      ]);
      setMembers(snap || []);
      setRoles((roleData || []) as RoleRow[]);
    } catch (err) {
      console.error(err);
      addToast('Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const schools = Array.from(new Set(members.map(m => m.school).filter(Boolean)));

  const filteredMembers = members.filter(m => {
    if (roleFilter !== 'all' && m.role_id !== roleFilter) return false;
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

  const canSetRole = isMasterAdmin;

  const targetRole = roleById(formData.role_id);
  const isTargetElevated = !!targetRole && targetRole.is_system;
  const canChangeName = !isTargetElevated || isMasterAdmin || user?.id === formData.id;

  const canResetPasswordFor = (m: any) => {
    const targetIsElevated = roleById(m.role_id)?.is_system;
    return !targetIsElevated || isMasterAdmin;
  };

  /**
   * Handles both new-member and edit-member saves.
   *
   * For NEW members, the member ID depends on joiningDate (to pick the
   * correct year + reserved 001-100 / 101-999 range), so it's computed
   * right here rather than at "Add member" click time. It's generated
   * from `members` (already-loaded state) plus the in-progress
   * `formData` — no extra query needed.
   *
   * Takes the data to save as an explicit argument (defaulting to the
   * current formData) rather than always reading formData directly, so
   * the Save button can pass a freshly-merged object without hitting a
   * stale-closure problem from setFormData being asynchronous.
   */
  const handleSave = async (dataOverride?: any) => {
    const data = dataOverride || formData;
    const isNew = !data.id;
    let docId = data.id;
    let dataToPersist = data;

    try {
      if (isNew) {
        if (!data.email || !data.password) {
          addToast('Email and password required for new members', 'error');
          return;
        }
        if (!data.joiningDate) {
          addToast('Joining date is required for new members', 'error');
          return;
        }

        let memberId: string;
        try {
          memberId = generateMemberId(members, tenant, data.joiningDate);
        } catch (err: any) {
          addToast(err.message || 'Failed to generate member ID', 'error');
          return;
        }
        dataToPersist = { ...data, memberId };

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session?.access_token
          },
          body: JSON.stringify({...dataToPersist, tenant_id: tenant.id})
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Failed to create member via Edge Function');
        }

        docId = resData.uid;
      }

      const { password, ...dataToSave } = dataToPersist;
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

  const handleResetPassword = async () => {
    if (!resetPasswordMember || !resetPasswordValue) return;
    if (resetPasswordValue.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }
    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session?.access_token
        },
        body: JSON.stringify({ uid: resetPasswordMember.id, newPassword: resetPasswordValue })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to reset password');
      }
      addToast(`Password reset for ${resetPasswordMember.name}`, 'success');
      setResetPasswordMember(null);
      setResetPasswordValue('');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const exportExcel = (dataToExport: any[]) => {
    if (dataToExport.length === 0) {
      addToast('No members to export', 'error');
      return;
    }
    const wb = XLSX.utils.book_new();
    const rows = dataToExport.map((m: any) => ({
      'Member ID': m.memberId || '',
      'Full Name': m.name || '',
      'Email': m.email || '',
      'Role': roleById(m.role_id)?.label || 'Member',
      'Status': m.status || 'pending',
      'Phone': m.phone || '',
      'Joining Date': m.joiningDate || '',
      'Date of Birth': m.dob || '',
      'Gender': m.gender || '',
      'Blood Group': m.bloodGroup || '',
      'School': m.school || '',
      'Grade': m.grade || '',
      'Emergency Contact': m.emergencyContact || m.parentPhone || '',
      'Residential Address': m.address || '',
      'Referred By': m.referredBy || '',
      'Dues Paid': m.duesPaid ? 'Yes' : 'No',
      'Rotary Year': m.rotaryYear || '',
      'Bio': m.bio || '',
      'Photo URL': m.photo || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const fileName = `members_${tenant.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  /* ------------------------------- styling tokens (mirrors DashboardHome.tsx) ------------------------------- */

  const cardDark: React.CSSProperties = { borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}` };
  const cardLight: React.CSSProperties = { borderRadius: 20, background: p.lightCard, color: p.td };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 13,
    borderRadius: 10,
    border: `1px solid ${p.border}`,
    background: dark ? 'rgba(255,255,255,.04)' : '#fff',
    color: p.tl,
    outline: 'none',
  };
  const disabledInputStyle: React.CSSProperties = { ...inputStyle, opacity: 0.55, cursor: 'not-allowed' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: p.tmid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' };

  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: p.green, color: '#0d1a12', border: 'none', borderRadius: 12,
    padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  };
  const outlineBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'none', color: p.tl, border: `1px solid ${p.pillBorder}`, borderRadius: 12,
    padding: '9px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  };

  if (loading) {
    return (
      <div style={{ background: p.bg, padding: 18 }} className="p-4 md:p-8 -m-4 md:-m-8" role="status" aria-busy="true" aria-label="Loading members">
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ height: 64, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ height: 84, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ height: 420, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rac-members-page">
      <style>{`
        .rac-members-page, .rac-members-page * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-members-page ::-webkit-scrollbar { display: none; }
        .rac-members-page table { border-collapse: collapse; width: 100%; }
        .rac-members-page th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; color: ${p.tmid}; padding: 12px 16px; border-bottom: 1px solid ${p.border}; white-space: nowrap; }
        .rac-members-page td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid ${p.border}; vertical-align: middle; }
        .rac-members-page tbody tr:hover { background: rgba(255,255,255,.03); }
        .rac-members-page tbody tr:last-child td { border-bottom: none; }
        .rac-members-page input::placeholder { color: ${p.tmid}; opacity: .8; }
        .rac-members-page select { appearance: none; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 1080, margin: '0 auto', paddingBottom: 90 }}>

          {/* ---------------- page-top ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 2px', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>Members</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tmid, background: p.lightCard, border: `1px solid ${p.border}`, borderRadius: 20, padding: '4px 10px' }}>
                {tenant.id}
              </span>
            </div>
            <button
              type="button"
              style={primaryBtn}
              onClick={() => {
                setFormData({ role_id: null, status: 'active', tenant_id: tenant.id });
                setIsFormOpen(true);
              }}
            >
              <Plus size={15} /> Add member
            </button>
          </div>

          {/* ---------------- filter bar ---------------- */}
          <div style={{ ...cardDark, padding: 14, marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: p.tmid }} />
              <input
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All roles</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All schools</option>
              {schools.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
            </select>
            <button type="button" style={{ ...outlineBtn, marginLeft: 'auto' }} onClick={() => exportExcel(filteredMembers)}>
              <Download size={14} /> Export .xlsx
            </button>
          </div>

          {/* ---------------- table card ---------------- */}
          <div style={{ ...cardDark, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filteredMembers.length} />
                    </th>
                    <th style={{ width: 44 }}></th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>School</th>
                    <th>Joined</th>
                    <th>Dues</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '48px 16px', color: p.tsub }}>
                        <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                        <div style={{ fontSize: 13 }}>No members found</div>
                      </td>
                    </tr>
                  )}
                  {filteredMembers.map(m => {
                    const mRole = roleById(m.role_id);
                    return (
                      <tr key={m.id} style={selectedIds.includes(m.id) ? { background: p.greenDeep } : undefined}>
                        <td>
                          <input type="checkbox" onChange={() => handleSelect(m.id)} checked={selectedIds.includes(m.id)} />
                        </td>
                        <td>
                          {m.photo ? (
                            <img
                              src={m.photo}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${p.border}` }}
                            />
                          ) : (
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${p.av2}, ${p.green})`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 11, color: '#1b0c12',
                            }}>
                              {m.name?.substring(0, 2)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: p.tl }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: p.tsub }}>{m.email}</div>
                          {m.memberId && <div style={{ fontSize: 10, color: p.tmid, marginTop: 2 }}>{m.memberId}</div>}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '.03em', color: '#fff', borderRadius: 8, padding: '3px 9px',
                            background: mRole?.color || '#9ca3af',
                          }}>
                            {mRole?.label || 'Member'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '.03em', borderRadius: 8, padding: '3px 9px',
                            background: m.status === 'active' ? p.greenDeep : dark ? 'rgba(255,255,255,.06)' : '#f1efe9',
                            color: m.status === 'active' ? p.av2 : p.tmid,
                          }}>
                            {m.status || 'pending'}
                          </span>
                        </td>
                        <td style={{ color: p.tsub }}>{m.school} {m.grade && `(Gr ${m.grade})`}</td>
                        <td style={{ color: p.tsub, fontSize: 12 }}>{m.joiningDate || '—'}</td>
                        <td>
                          <button
                            onClick={async () => {
                              await supabase.from('users').update({ duesPaid: !m.duesPaid }).eq('id', m.id).eq('tenant_id', tenant.id);
                              fetchMembers();
                            }}
                            title={m.duesPaid ? 'Dues paid' : 'Dues unpaid'}
                            style={{
                              width: 14, height: 14, borderRadius: '50%', cursor: 'pointer',
                              background: m.duesPaid ? p.green : 'transparent',
                              border: `1.5px solid ${m.duesPaid ? p.green : p.pillBorder}`,
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setFormData(m); setIsFormOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid }} title="Edit"><Pencil size={16} /></button>
                            <button onClick={() => { setViewMember(m); setIsViewOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid }} title="View"><Eye size={16} /></button>
                            {canResetPasswordFor(m) && (
                              <button onClick={() => setResetPasswordMember(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid }} title="Reset password"><KeyRound size={16} /></button>
                            )}
                            <button onClick={() => setDeleteId(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid }} title="Remove"><Trash size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- bulk action bar ---------------- */}
      {selectedIds.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          background: p.dark, borderTop: `1px solid ${p.border}`, padding: '14px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }} className="md:!left-[260px]">
          <span style={{ fontSize: 13, fontWeight: 600, color: p.tl }}>{selectedIds.length} selected</span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={outlineBtn} onClick={() => handleBulkStatus('active')}>Set active</button>
            <button style={outlineBtn} onClick={() => handleBulkStatus('inactive')}>Set inactive</button>
            <button style={outlineBtn} onClick={() => exportExcel(members.filter(m => selectedIds.includes(m.id)))}>Export selected</button>
          </div>
        </div>
      )}

      {/* ---------------- add/edit modal ---------------- */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit member' : 'Add member'} size="lg">
        <div style={{ background: p.bg }} className="-m-4 md:-m-6 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 flex items-center gap-6">
              <div className="w-24">
                <CloudinaryUpload onUpload={(u: string) => setFormData({ ...formData, photo: u })} currentUrl={formData.photo} label="Photo" />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label style={labelStyle}>Full name</label>
                  <input
                    disabled={!canChangeName}
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    style={!canChangeName ? disabledInputStyle : inputStyle}
                  />
                  {!canChangeName && <p style={{ fontSize: 10, color: p.tmid, marginTop: 4 }}>Only master admins can update the name of other admins.</p>}
                </div>
                <div className={!formData.id ? '' : 'col-span-2'}>
                  <label style={labelStyle}>Email</label>
                  <input
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={formData.id ? disabledInputStyle : inputStyle}
                    disabled={!!formData.id}
                  />
                </div>
                {!formData.id && (
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} style={inputStyle} placeholder="Minimum 8 characters" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Role</label>
              <select value={formData.role_id || ''} onChange={e => setFormData({ ...formData, role_id: e.target.value || null })} style={inputStyle} disabled={!canSetRole}>
                <option value="" disabled>Select a role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              {!canSetRole && <p style={{ fontSize: 10, color: p.tmid, marginTop: 4 }}>Only master admin can assign roles.</p>}
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={formData.status || 'active'} onChange={e => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Joining date</label>
              <input
                type="date"
                value={formData.joiningDate || ''}
                onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                style={inputStyle}
              />
              {!formData.id && (
                <p style={{ fontSize: 10, color: p.tmid, marginTop: 4 }}>
                  {formData.joiningDate
                    ? (new Date(`${formData.joiningDate}T00:00:00`) < RANGE_CUTOFF
                        ? 'Reserved ID range: 001–100 (joined before Jul 2026)'
                        : 'ID range: 101–999')
                    : 'Determines the member ID year and reserved number range.'}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Date of birth</label>
              <input type="date" value={formData.dob || ''} onChange={e => setFormData({ ...formData, dob: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select value={formData.gender || ''} onChange={e => setFormData({ ...formData, gender: e.target.value })} style={inputStyle}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Blood group</label>
              <select value={formData.bloodGroup || ''} onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })} style={inputStyle}>
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 pt-2" style={{ borderTop: `1px solid ${p.border}`, marginTop: 4 }}>
              <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tmid, margin: '14px 0 2px' }}>Academics</h4>
            </div>
            <div>
              <label style={labelStyle}>School</label>
              <input value={formData.school || ''} onChange={e => setFormData({ ...formData, school: e.target.value })} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Grade / year</label>
                <input value={formData.grade || ''} onChange={e => setFormData({ ...formData, grade: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Class / sec</label>
                <input value={formData.class || ''} onChange={e => setFormData({ ...formData, class: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div className="md:col-span-2 pt-2" style={{ borderTop: `1px solid ${p.border}`, marginTop: 4 }}>
              <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tmid, margin: '14px 0 2px' }}>Guardian info</h4>
            </div>
            <div>
              <label style={labelStyle}>Parent/guardian name</label>
              <input value={formData.parentName || ''} onChange={e => setFormData({ ...formData, parentName: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Parent/guardian phone</label>
              <input value={formData.parentPhone || ''} onChange={e => setFormData({ ...formData, parentPhone: e.target.value })} style={inputStyle} />
            </div>

            <div className="md:col-span-2 pt-2" style={{ borderTop: `1px solid ${p.border}`, marginTop: 4 }}>
              <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tmid, margin: '14px 0 2px' }}>Other</h4>
            </div>
            <div className="md:col-span-2">
              <label style={labelStyle}>Bio</label>
              <textarea value={formData.bio || ''} maxLength={200} onChange={e => setFormData({ ...formData, bio: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={2} />
            </div>
            <div>
              <label style={labelStyle}>Rotary year</label>
              <input value={formData.rotaryYear || ''} onChange={e => setFormData({ ...formData, rotaryYear: e.target.value })} style={inputStyle} placeholder="e.g. 2025-2026" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" checked={formData.duesPaid || false} onChange={e => setFormData({ ...formData, duesPaid: e.target.checked })} />
              <label style={{ fontSize: 12.5, fontWeight: 600, color: p.tl }}>Dues paid</label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, marginTop: 20, borderTop: `1px solid ${p.border}` }}>
            <button style={primaryBtn} onClick={() => handleSave(formData)}>
              Save member
            </button>
          </div>
        </div>
      </Modal>

      {/* ---------------- view modal ---------------- */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Member profile">
        <div style={{ background: p.bg }} className="-m-4 md:-m-6 p-4 md:p-6">
          {viewMember && (
            <div className="space-y-4" style={{ fontSize: 13 }}>
              <div className="flex gap-4 items-center">
                {viewMember.photo && (
                  <img
                    src={viewMember.photo}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${p.border}` }}
                  />
                )}
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 17, color: p.tl }}>{viewMember.name}</h3>
                  <p style={{ color: p.tsub, fontSize: 12 }}>{viewMember.email}</p>
                  <div className="mt-1 flex gap-2">
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: p.lightCard, color: p.td, padding: '3px 8px', borderRadius: 8 }}>
                      {roleById(viewMember.role_id)?.label || 'Member'}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: p.greenDeep, color: p.av2, padding: '3px 8px', borderRadius: 8 }}>
                      {viewMember.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6 pt-4" style={{ borderTop: `1px solid ${p.border}` }}>
                <div><strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: p.tmid }}>Member ID</strong>{viewMember.memberId || '-'}</div>
                <div><strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: p.tmid }}>Joined</strong>{viewMember.joiningDate || '-'}</div>
                <div><strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: p.tmid }}>Phone</strong>{viewMember.phone || '-'}</div>
                <div><strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: p.tmid }}>DOB</strong>{viewMember.dob || '-'}</div>
                <div><strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: p.tmid }}>School</strong>{viewMember.school || '-'}</div>
                <div><strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: p.tmid }}>Grade</strong>{viewMember.grade || '-'}</div>
                <div><strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: p.tmid }}>Dues</strong>{viewMember.duesPaid ? 'Paid' : 'Unpaid'}</div>
              </div>
              {viewMember.bio && (
                <div className="mt-4"><strong style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: p.tmid }}>Bio</strong><p style={{ color: p.tl }}>{viewMember.bio}</p></div>
              )}
              <div className="mt-6 pt-4 flex justify-center" style={{ borderTop: `1px solid ${p.border}` }}>
                <a href={`/admin/attendance?memberId=${viewMember.id}`} style={{ color: p.green, fontWeight: 600, fontSize: 12.5, textDecoration: 'none' }}>View attendance history</a>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ---------------- reset password modal ---------------- */}
      <Modal isOpen={!!resetPasswordMember} onClose={() => { setResetPasswordMember(null); setResetPasswordValue(''); }} title="Reset member password">
        <div style={{ background: p.bg }} className="-m-4 md:-m-6 p-4 md:p-6">
          {resetPasswordMember && (
            <div className="space-y-4">
              <p style={{ fontSize: 13, color: p.tsub }}>
                Set a new password for <strong style={{ color: p.tl }}>{resetPasswordMember.name}</strong> ({resetPasswordMember.email}). They will need to use this new password to log in.
              </p>
              <div>
                <label style={labelStyle}>New password</label>
                <input
                  type="password"
                  value={resetPasswordValue}
                  onChange={e => setResetPasswordValue(e.target.value)}
                  style={inputStyle}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: `1px solid ${p.border}` }}>
                <button style={outlineBtn} onClick={() => { setResetPasswordMember(null); setResetPasswordValue(''); }}>Cancel</button>
                <button style={primaryBtn} onClick={handleResetPassword} disabled={resettingPassword}>
                  {resettingPassword ? 'Resetting...' : 'Reset password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove member" message="Are you sure? This cannot be undone." />
    </div>
  );
}
