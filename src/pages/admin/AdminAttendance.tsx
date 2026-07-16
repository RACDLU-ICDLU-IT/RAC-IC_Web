import { supabase } from '../../supabase';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useSearchParams } from 'react-router-dom';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { usePoints } from '../../hooks/usePoints';
import { getClubPalette } from '../../theme/racPalette';
import {
  Download, CalendarPlus, CalendarDays, X, Pencil, Copy, BarChart3,
  Users, TrendingUp, Trash2, AlertTriangle,
} from 'lucide-react';

const ATTENDANCE_PAGE_VERSION = 'v3-2026-07-17-1';

/* ---- font loader: same pattern/id as DashboardHome.tsx, idempotent ---- */
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

/* ---- event taxonomy ---- */
const EVENT_TYPES = ['Meeting', 'Event', 'Project', 'Workshop'] as const;
type EventType = typeof EVENT_TYPES[number];
const SUB_TYPES: Record<EventType, string[]> = {
  Meeting: ['General', 'Special', 'Board Meeting'],
  Event: ['Ceremony', 'Installation', 'Assembly', 'Other'],
  Project: ['Community Service', 'Fund Raising', 'Skill Based'],
  Workshop: ['Personal skills', 'TRF', 'Other'],
};

/* ---- status: canonical value is the full word (matches DB + member views).
   Letter is a display-only badge, never stored. ---- */
type Status = 'present' | 'late' | 'excused' | 'absent';
const STATUS_ORDER: Status[] = ['present', 'late', 'excused', 'absent'];
const STATUS_META: Record<Status, { letter: string; label: string }> = {
  present: { letter: 'P', label: 'Present' },
  late: { letter: 'L', label: 'Late' },
  excused: { letter: 'E', label: 'Excused' },
  absent: { letter: 'A', label: 'Absent' },
};

const xpForStatus = (ev: any, status: Status) => Number(ev?.[`xp_${status}`] ?? 0);

const uid = () => (crypto as any).randomUUID();
function toCSV(rows: string[][]) {
  return rows.map((r) => r.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}
function downloadCSV(filename: string, rows: string[][]) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function AdminAttendance() {
  const { adminTenant: tenant } = useAdminTenant();
  const { user } = useAuth();
  const { awardAttendancePoints } = usePoints();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const targetMemberId = searchParams.get('memberId');

  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  useEffect(() => {
    console.log('[AdminAttendance] version:', ATTENDANCE_PAGE_VERSION);
  }, []);

  const [mode, setMode] = useState<'mark' | 'history' | 'member' | 'analytics'>('mark');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  /* mark mode */
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sheet, setSheet] = useState<Record<string, Status | ''>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [copyFromEventId, setCopyFromEventId] = useState('');

  /* history mode */
  const [historyEventId, setHistoryEventId] = useState('');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  /* member mode */
  const [memberHistoryRecords, setMemberHistoryRecords] = useState<any[]>([]);
  const [memberHistoryLoading, setMemberHistoryLoading] = useState(false);
  const [targetMember, setTargetMember] = useState<any>(null);

  /* add/edit event modal */
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', date: '', type: 'Meeting' as EventType, sub_type: SUB_TYPES.Meeting[0],
    xp_present: 0, xp_late: 0, xp_excused: 0, xp_absent: 0,
  });

  /* delete event flow */
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const [{ data: eSnap }, { data: mSnap }, { data: aSnap }] = await Promise.all([
        supabase.from('events').select('*').eq('tenant_id', tenant.id).order('date', { ascending: false }),
        supabase.from('users').select('*').eq('tenant_id', tenant.id).eq('status', 'active'),
        supabase.from('attendance').select('*').eq('tenant_id', tenant.id),
      ]);
      setEvents(eSnap || []);
      setActiveMembers(mSnap || []);
      setAllAttendance(aSnap || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadBaseData(); }, [tenant.id]);

  const loadEventAttendance = async (eventId: string, applyToSheet = true) => {
    if (!eventId) { if (applyToSheet) setSheet({}); return []; }
    const { data } = await supabase.from('attendance').select('*').eq('tenant_id', tenant.id).eq('eventId', eventId);
    const records = data || [];
    if (applyToSheet) {
      const s: Record<string, Status | ''> = {};
      records.forEach((r: any) => { s[r.userId] = r.status; });
      setSheet(s);
    }
    return records;
  };

  useEffect(() => {
    if (mode === 'mark') { loadEventAttendance(selectedEventId, true); setSelectedMemberIds(new Set()); }
  }, [selectedEventId, mode]);

  useEffect(() => {
    if (mode === 'history' && historyEventId) {
      loadEventAttendance(historyEventId, false).then(setHistoryRecords);
    }
  }, [historyEventId, mode]);

  const fetchMemberHistory = async (memberId: string) => {
    setMemberHistoryLoading(true);
    try {
      const { data } = await supabase.from('attendance').select('*').eq('userId', memberId).eq('tenant_id', tenant.id);
      const enriched = (data || []).map((r: any) => {
        const ev = events.find((e) => e.id === r.eventId);
        return { ...r, eventTitle: ev?.title || r.eventTitle || 'Unknown Event', eventDate: ev?.date || r.eventDate || '', eventType: ev?.type || '', eventSubType: ev?.sub_type || '' };
      });
      enriched.sort((a: any, b: any) => (b.eventDate > a.eventDate ? 1 : b.eventDate < a.eventDate ? -1 : 0));
      setMemberHistoryRecords(enriched);
    } catch (err) {
      console.error(err);
      addToast('Failed to load member attendance history', 'error');
    } finally {
      setMemberHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!targetMemberId || loading) return;
    const found = activeMembers.find((m) => m.id === targetMemberId);
    if (found) setTargetMember(found);
    else supabase.from('users').select('*').eq('id', targetMemberId).eq('tenant_id', tenant.id).single()
      .then(({ data }) => { if (data) setTargetMember(data); });
    setMode('member');
    fetchMemberHistory(targetMemberId);
  }, [targetMemberId, loading, activeMembers.length]);

  /* ---- mark: save + award XP ----
     onConflict: 'id' — 'id' is deterministic (`${eventId}_${userId}`) and
     already unique on its own; a compound 'id, tenant_id' target 400s unless
     a matching compound unique constraint exists in Postgres, and even
     whitespace-stripped ('id,tenant_id') it still requires that constraint
     to exist. This was the bug behind the earlier save failures. */
  const handleSaveAttendance = async () => {
    if (!selectedEventId) return;
    setIsSaving(true);
    try {
      const ev = events.find((e) => e.id === selectedEventId);
      const batch: any[] = [];
      const awards: Promise<any>[] = [];
      Object.entries(sheet).forEach(([userId, status]) => {
        if (!status) return;
        batch.push(
          supabase.from('attendance').upsert(
            {
              id: `${selectedEventId}_${userId}`, tenant_id: tenant.id, userId, eventId: selectedEventId,
              eventTitle: ev?.title || 'Unknown Event', eventDate: ev?.date || '', eventType: ev?.type || '',
              status, markedAt: new Date().toISOString(), markedBy: user?.id,
            },
            { onConflict: 'id' }
          )
        );
        awards.push(awardAttendancePoints(userId, selectedEventId, status as Status).catch(console.error));
      });
      await Promise.all(batch);
      await Promise.all(awards);
      addToast('Attendance saved', 'success');
      const updated = await loadEventAttendance(selectedEventId, true);
      setHistoryRecords(updated);
      setAllAttendance((prev) => [...prev.filter((r) => r.eventId !== selectedEventId), ...updated]);
    } catch (err) {
      console.error(err);
      addToast('Failed to save attendance', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const setAll = (status: Status | null) => {
    const s: Record<string, Status | ''> = {};
    if (status) activeMembers.forEach((m) => { s[m.id] = status; });
    setSheet(s);
  };
  const applyToSelected = (status: Status) => {
    setSheet((prev) => {
      const next = { ...prev };
      selectedMemberIds.forEach((id) => { next[id] = status; });
      return next;
    });
  };
  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const applyCopyFromEvent = async () => {
    if (!copyFromEventId) return;
    const records = await loadEventAttendance(copyFromEventId, false);
    setSheet((prev) => {
      const next = { ...prev };
      records.forEach((r: any) => { if (!next[r.userId]) next[r.userId] = r.status; });
      return next;
    });
    addToast('Copied unmarked members from selected event', 'success');
  };

  const exportCurrentEvent = () => {
    if (!selectedEventId) return;
    const ev = events.find((e) => e.id === selectedEventId);
    const rows = [['Member Name', 'School', 'Status']];
    activeMembers.forEach((m) => rows.push([m.name || '', m.school || '', sheet[m.id] ? STATUS_META[sheet[m.id] as Status].label : 'Not Marked']));
    downloadCSV(`Attendance_${(ev?.title || 'event').replace(/\s+/g, '_')}.csv`, rows);
  };

  const exportSummary = () => {
    const totals: Record<string, Record<Status, number>> = {};
    const markedEvents = new Set(allAttendance.map((r) => r.eventId));
    allAttendance.forEach((r) => {
      if (!totals[r.userId]) totals[r.userId] = { present: 0, late: 0, excused: 0, absent: 0 };
      if (STATUS_ORDER.includes(r.status)) totals[r.userId][r.status as Status]++;
    });
    const rows = [['Member Name', 'Role', 'School', 'Present', 'Late', 'Absent', 'Excused', 'Total Marked Events', 'Attendance Rate %']];
    activeMembers.forEach((m) => {
      const t = totals[m.id] || { present: 0, late: 0, excused: 0, absent: 0 };
      const attended = t.present + t.late;
      const rate = markedEvents.size > 0 ? Math.round((attended / markedEvents.size) * 100) : 0;
      rows.push([m.name || '', m.role || '', m.school || '', String(t.present), String(t.late), String(t.absent), String(t.excused), String(markedEvents.size), `${rate}%`]);
    });
    downloadCSV(`Attendance_Summary_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  /* ---- event modal ---- */
  const openAddEvent = () => {
    setEditingEventId(null);
    setForm({ title: '', date: '', type: 'Meeting', sub_type: SUB_TYPES.Meeting[0], xp_present: 0, xp_late: 0, xp_excused: 0, xp_absent: 0 });
    setIsEventModalOpen(true);
  };
  const openEditEvent = (ev: any) => {
    setEditingEventId(ev.id);
    setForm({
      title: ev.title || '', date: ev.date || '', type: (ev.type as EventType) || 'Meeting', sub_type: ev.sub_type || SUB_TYPES[(ev.type as EventType) || 'Meeting'][0],
      xp_present: ev.xp_present || 0, xp_late: ev.xp_late || 0, xp_excused: ev.xp_excused || 0, xp_absent: ev.xp_absent || 0,
    });
    setIsEventModalOpen(true);
  };
  const saveEvent = async () => {
    if (!form.title || !form.date) { addToast('Title and date are required', 'error'); return; }
    try {
      const id = editingEventId || uid();
      await supabase.from('events').upsert(
        {
          id, tenant_id: tenant.id, title: form.title, date: form.date, type: form.type, sub_type: form.sub_type,
          xp_present: form.xp_present, xp_late: form.xp_late, xp_excused: form.xp_excused, xp_absent: form.xp_absent,
          isPublic: false, createdAt: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      addToast(editingEventId ? 'Event updated' : 'Event created', 'success');
      await loadBaseData();
      if (!editingEventId) setSelectedEventId(id);
      setIsEventModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast('Failed to save event', 'error');
    }
  };

  /* ---- delete event ----
     Order matters: reverse XP BEFORE deleting attendance rows, since the
     reversal reads point_ledger by source_id (`${eventId}:${status}`) —
     it doesn't need the attendance rows themselves, but doing this first
     means a failure here still leaves attendance/event data intact to
     retry against, rather than orphaning ledger entries with no event to
     reference. awardPoints isn't exposed from usePoints for a direct XP
     debit, so this writes the reversal ledger row directly via supabase
     and updates users.xp inline — mirrors what awardPoints does internally,
     scoped to XP only since attendance never touched FP. */
  const requestDeleteEvent = (ev: any) => {
    setDeleteTarget(ev);
    setDeleteConfirmText('');
  };

  const confirmDeleteEvent = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.title) {
      addToast('Type the event title exactly to confirm', 'error');
      return;
    }
    setIsDeleting(true);
    try {
      const eventId = deleteTarget.id;

      const { data: ledgerRows } = await supabase
        .from('point_ledger')
        .select('id, member_id, xp_delta, source_id')
        .eq('tenant_id', tenant.id)
        .eq('source_type', 'attendance')
        .like('source_id', `${eventId}:%`);

      const byMember = new Map<string, number>();
      (ledgerRows || []).forEach((row: any) => {
        if (!row.xp_delta) return;
        byMember.set(row.member_id, (byMember.get(row.member_id) || 0) + row.xp_delta);
      });

      for (const [memberId, totalXp] of byMember.entries()) {
        if (totalXp === 0) continue;
        const { data: memberRow } = await supabase.from('users').select('xp').eq('id', memberId).single();
        const currentXp = memberRow?.xp || 0;
        const newXp = Math.max(0, currentXp - totalXp);

        await supabase.from('point_ledger').insert({
          id: uid(),
          member_id: memberId,
          tenant_id: tenant.id,
          xp_delta: -totalXp,
          fp_delta: 0,
          source_type: 'attendance',
          source_id: `${eventId}:deleted:${Date.now()}`,
          note: `Event "${deleteTarget.title}" deleted — attendance XP reversed`,
        });

        const { data: levelData } = await supabase
          .from('level_config')
          .select('level, xp_required')
          .eq('tenant_id', tenant.id)
          .lte('xp_required', newXp)
          .order('level', { ascending: false })
          .limit(1);
        const newLevel = levelData?.[0]?.level || 0;

        await supabase.from('users').update({ xp: newXp, level: newLevel }).eq('id', memberId);
      }

      await supabase.from('attendance').delete().eq('tenant_id', tenant.id).eq('eventId', eventId);
      await supabase.from('events').delete().eq('tenant_id', tenant.id).eq('id', eventId);

      addToast(
        byMember.size > 0
          ? `Event deleted. XP reversed for ${byMember.size} member${byMember.size === 1 ? '' : 's'}.`
          : 'Event deleted.',
        'success'
      );

      if (selectedEventId === eventId) setSelectedEventId('');
      if (historyEventId === eventId) { setHistoryEventId(''); setHistoryRecords([]); }
      setDeleteTarget(null);
      await loadBaseData();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete event — some data may be partially cleaned up, check console', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---- analytics ---- */
  const analytics = useMemo(() => {
    const byType: Record<string, { present: number; total: number }> = {};
    events.forEach((ev) => {
      const t = ev.type || 'Other';
      if (!byType[t]) byType[t] = { present: 0, total: 0 };
    });
    allAttendance.forEach((r) => {
      const ev = events.find((e) => e.id === r.eventId);
      const t = ev?.type || 'Other';
      if (!byType[t]) byType[t] = { present: 0, total: 0 };
      byType[t].total++;
      if (r.status === 'present' || r.status === 'late') byType[t].present++;
    });
    const memberRates = activeMembers.map((m) => {
      const recs = allAttendance.filter((r) => r.userId === m.id);
      const present = recs.filter((r) => r.status === 'present' || r.status === 'late').length;
      const rate = recs.length > 0 ? Math.round((present / recs.length) * 100) : null;
      return { member: m, rate, total: recs.length };
    }).filter((m) => m.total > 0).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

    const overallPresent = allAttendance.filter((r) => r.status === 'present' || r.status === 'late').length;
    const overallRate = allAttendance.length > 0 ? Math.round((overallPresent / allAttendance.length) * 100) : 0;
    const totalXP = allAttendance.reduce((sum, r) => {
      const ev = events.find((e) => e.id === r.eventId);
      return sum + (ev && STATUS_ORDER.includes(r.status) ? xpForStatus(ev, r.status as Status) : 0);
    }, 0);

    return { byType, memberRates, overallRate, totalXP, eventsMarked: new Set(allAttendance.map((r) => r.eventId)).size };
  }, [events, allAttendance, activeMembers]);

  /* ---- style tokens ---- */
  const card: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` };
  const lightCard: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.lightCard, color: p.td };
  const pillBtn: React.CSSProperties = { border: `1px solid ${p.pillBorder}`, borderRadius: 20, fontSize: 10, padding: '6px 12px', color: p.tmid, background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 };
  const solidBtn: React.CSSProperties = { background: p.green, color: '#1b0c12', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '8px 16px', border: 'none', cursor: 'pointer' };
  const dangerBtn: React.CSSProperties = { background: '#3a1a14', color: '#e08a72', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '8px 16px', border: '1px solid #5c2a20', cursor: 'pointer' };
  const input: React.CSSProperties = { width: '100%', background: p.lightCard, color: p.td, border: `1px solid ${p.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 500, outline: 'none' };

  if (loading) {
    return (
      <div style={{ background: p.bg, padding: 18 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ height: 300, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rac-admin-attendance">
      <style>{`
        .rac-admin-attendance, .rac-admin-attendance * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-admin-attendance ::-webkit-scrollbar { display: none; }
        .rac-admin-attendance select { color-scheme: ${dark ? 'dark' : 'light'}; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>Attendance</span>
            <span style={{ fontSize: 9, color: p.tmid, fontWeight: 500, fontFamily: 'monospace' }} title="Build version">{ATTENDANCE_PAGE_VERSION}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { id: 'mark', label: 'Mark Attendance' },
              { id: 'history', label: 'Event History' },
              ...(targetMemberId ? [{ id: 'member', label: targetMember?.name ? `${targetMember.name}'s History` : 'Member History' }] : []),
              { id: 'analytics', label: 'Analytics' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setMode(t.id as any); if (t.id === 'member' && targetMemberId) fetchMemberHistory(targetMemberId); }}
                style={{
                  ...pillBtn,
                  background: mode === t.id ? p.green : 'none',
                  color: mode === t.id ? '#1b0c12' : p.tmid,
                  border: mode === t.id ? 'none' : `1px solid ${p.pillBorder}`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ---------------- MARK ---------------- */}
          {mode === 'mark' && (
            <div style={card}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 10, color: p.tsub, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Select Event</div>
                  <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} style={input}>
                    <option value="">-- Choose an event --</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>{e.date} — {e.title} ({e.type}{e.sub_type ? ` · ${e.sub_type}` : ''})</option>
                    ))}
                  </select>
                </div>
                <button onClick={openAddEvent} style={{ ...solidBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarPlus size={14} /> Add Event
                </button>
              </div>

              {selectedEventId && (() => {
                const ev = events.find((e) => e.id === selectedEventId);
                return (
                  <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: 14 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                      {STATUS_ORDER.map((s) => (
                        <div key={s} style={{ fontSize: 10, color: p.tsub, background: p.lightCard, borderRadius: 20, padding: '4px 10px', fontWeight: 600 }}>
                          {STATUS_META[s].label}: <span style={{ color: p.tl }}>{xpForStatus(ev, s)} XP</span>
                        </div>
                      ))}
                      <button onClick={() => openEditEvent(ev)} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => requestDeleteEvent(ev)} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4, borderColor: '#5c2a20', color: '#e08a72' }}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: p.lightCard, borderRadius: 14, padding: 12, marginBottom: 12 }}>
                      {STATUS_ORDER.map((s) => (
                        <button key={s} onClick={() => setAll(s)} style={{ ...pillBtn, borderColor: p.pillBorder, color: p.tmid, background: 'transparent' }}>
                          Mark All {STATUS_META[s].label}
                        </button>
                      ))}
                      <button onClick={() => setAll(null)} style={pillBtn}>Clear All</button>
                      <div style={{ flex: 1 }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: p.tsub }}>
                        <span style={{ color: p.green }}>{Object.values(sheet).filter(Boolean).length}</span> / {activeMembers.length} marked
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                      <select value={copyFromEventId} onChange={(e) => setCopyFromEventId(e.target.value)} style={{ ...input, width: 'auto', flex: 1, minWidth: 200 }}>
                        <option value="">Copy unmarked from another event…</option>
                        {events.filter((e) => e.id !== selectedEventId).map((e) => (
                          <option key={e.id} value={e.id}>{e.date} — {e.title}</option>
                        ))}
                      </select>
                      <button onClick={applyCopyFromEvent} disabled={!copyFromEventId} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4, opacity: copyFromEventId ? 1 : 0.5 }}>
                        <Copy size={11} /> Apply
                      </button>
                    </div>

                    {selectedMemberIds.size > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: p.greenDeep, borderRadius: 14, padding: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: p.recTx, fontWeight: 600 }}>{selectedMemberIds.size} selected —</span>
                        {STATUS_ORDER.map((s) => (
                          <button key={s} onClick={() => applyToSelected(s)} style={{ ...pillBtn, borderColor: p.recBd }}>{STATUS_META[s].label}</button>
                        ))}
                        <button onClick={() => setSelectedMemberIds(new Set())} style={{ ...pillBtn, marginLeft: 'auto' }}>Deselect</button>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
                      {activeMembers.map((m) => {
                        const s = sheet[m.id];
                        const checked = selectedMemberIds.has(m.id);
                        return (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 10px', borderRadius: 12, background: checked ? p.greenDeep : 'transparent', border: `1px solid ${p.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleMember(m.id)} style={{ flexShrink: 0, accentColor: p.green }} />
                              {m.avatar ? (
                                <img src={m.avatar} style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.greenDeep, color: p.av2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                                  {m.name?.substring(0, 2)}
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                                <div style={{ fontSize: 9.5, color: p.tsub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.school}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4, background: p.bg === '#0a0a0a' ? '#1a1a1a' : p.lightCard, padding: 3, borderRadius: 10, flexShrink: 0 }}>
                              {STATUS_ORDER.map((st) => (
                                <button
                                  key={st}
                                  onClick={() => setSheet({ ...sheet, [m.id]: st })}
                                  title={STATUS_META[st].label}
                                  style={{
                                    width: 28, height: 28, borderRadius: 8, fontWeight: 700, fontSize: 11.5, border: 'none', cursor: 'pointer',
                                    background: s === st ? p.green : 'transparent', color: s === st ? '#1b0c12' : p.tmid,
                                  }}
                                >
                                  {STATUS_META[st].letter}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${p.border}` }}>
                      <button onClick={exportCurrentEvent} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 5 }}><Download size={12} /> Export CSV</button>
                      <button onClick={handleSaveAttendance} disabled={isSaving} style={{ ...solidBtn, opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving…' : 'Save Attendance'}</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ---------------- HISTORY ---------------- */}
          {mode === 'history' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 12 }} className="!grid-cols-1">
              <div style={{ ...card, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 600 }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${p.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Past Events</span>
                  <button onClick={exportSummary} style={{ ...pillBtn, padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 4 }}><Download size={11} /> Summary</button>
                </div>
                <div style={{ overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {events.map((e) => (
                    <div
                      key={e.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 12, border: `1px solid ${historyEventId === e.id ? p.green : 'transparent'}`, background: historyEventId === e.id ? p.greenDeep : 'transparent' }}
                    >
                      <button onClick={() => setHistoryEventId(e.id)} style={{ flex: 1, textAlign: 'left', padding: 10, background: 'none', border: 'none', cursor: 'pointer', color: p.tl, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                        <div style={{ fontSize: 10, color: p.tsub, marginTop: 3 }}>{e.date} · {e.type}{e.sub_type ? ` · ${e.sub_type}` : ''}</div>
                      </button>
                      <button onClick={() => requestDeleteEvent(e)} title="Delete event" style={{ background: 'none', border: 'none', color: p.tsub, cursor: 'pointer', padding: 8, flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card, minHeight: 400 }}>
                {!historyEventId ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: p.tsub, padding: '60px 0' }}>
                    <CalendarDays size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                    <p style={{ fontSize: 12 }}>Select an event to view attendance.</p>
                  </div>
                ) : (() => {
                  const ev = events.find((e) => e.id === historyEventId);
                  return (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                        {STATUS_ORDER.map((s) => (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, background: p.lightCard, borderRadius: 20, padding: '5px 10px' }}>
                            <span style={{ fontWeight: 700, fontSize: 11, color: p.td }}>{historyRecords.filter((r) => r.status === s).length}</span>
                            <span style={{ fontSize: 9.5, color: p.mut }}>{STATUS_META[s].label}</span>
                          </div>
                        ))}
                        <span style={{ fontSize: 10.5, color: p.tsub, marginLeft: 'auto' }}>Unmarked: {activeMembers.length - historyRecords.length}</span>
                        <button onClick={() => openEditEvent(ev)} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4 }}><Pencil size={11} /> Edit</button>
                        <button onClick={() => requestDeleteEvent(ev)} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4, borderColor: '#5c2a20', color: '#e08a72' }}><Trash2 size={11} /> Delete</button>
                      </div>
                      <div style={{ maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {historyRecords.map((r, i) => {
                          const m = activeMembers.find((x) => x.id === r.userId);
                          const st = r.status as Status;
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 4px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>{m?.name || 'Unknown'}</div>
                                <div style={{ fontSize: 10, color: p.tsub }}>{m?.school || '…'}</div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, background: p.lightCard, color: p.td, padding: '4px 10px', borderRadius: 20 }}>{STATUS_META[st]?.label || r.status}</span>
                            </div>
                          );
                        })}
                        {historyRecords.length === 0 && <p style={{ textAlign: 'center', color: p.tsub, padding: '30px 0', fontSize: 12 }}>No records for this event.</p>}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ---------------- MEMBER ---------------- */}
          {mode === 'member' && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${p.border}` }}>
                {targetMember?.photo ? (
                  <img src={targetMember.photo} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: p.greenDeep, color: p.av2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {targetMember?.name?.substring(0, 2)?.toUpperCase() || '??'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{targetMember?.name || 'Loading…'}</div>
                  <div style={{ fontSize: 11, color: p.tsub }}>{targetMember?.email}</div>
                </div>
                <a href="/admin/members" style={{ fontSize: 11, color: p.green, fontWeight: 600, textDecoration: 'none' }}>← Members</a>
              </div>

              {memberHistoryLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: p.tsub, fontSize: 12 }}>Loading…</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }} className="!grid-cols-2">
                    {[
                      { label: 'Total Events', value: memberHistoryRecords.length },
                      { label: 'Present', value: memberHistoryRecords.filter((r) => r.status === 'present' || r.status === 'late').length },
                      { label: 'Absent', value: memberHistoryRecords.filter((r) => r.status === 'absent').length },
                      { label: 'Rate', value: memberHistoryRecords.length ? `${Math.round((memberHistoryRecords.filter((r) => r.status === 'present' || r.status === 'late').length / memberHistoryRecords.length) * 100)}%` : 'N/A' },
                    ].map((s) => (
                      <div key={s.label} style={{ ...lightCard, textAlign: 'center', padding: 12 }}>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                        <div style={{ fontSize: 9, color: p.mut, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {memberHistoryRecords.length === 0 ? (
                    <p style={{ textAlign: 'center', color: p.tsub, padding: '30px 0', fontSize: 12 }}>No attendance records for this member.</p>
                  ) : (
                    <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                      {memberHistoryRecords.map((r, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 2px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{r.eventTitle}</div>
                            <div style={{ fontSize: 10, color: p.tsub }}>{r.eventDate} {r.eventType ? `· ${r.eventType}` : ''}</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, background: p.lightCard, color: p.td, padding: '4px 10px', borderRadius: 20 }}>{STATUS_META[r.status as Status]?.label || r.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ---------------- ANALYTICS ---------------- */}
          {mode === 'analytics' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }} className="!grid-cols-2">
                {[
                  { label: 'Events Marked', value: analytics.eventsMarked, icon: CalendarDays },
                  { label: 'Overall Rate', value: `${analytics.overallRate}%`, icon: TrendingUp },
                  { label: 'Active Members', value: activeMembers.length, icon: Users },
                  { label: 'XP Awarded', value: analytics.totalXP.toLocaleString(), icon: BarChart3 },
                ].map((s) => (
                  <div key={s.label} style={card}>
                    <s.icon size={16} color={p.av2} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 21, fontWeight: 700 }}>{s.value}</div>
                    <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Attendance rate by event type</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {EVENT_TYPES.map((t) => {
                    const d = analytics.byType[t] || { present: 0, total: 0 };
                    const rate = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
                    return (
                      <div key={t}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                          <span style={{ color: p.tl, fontWeight: 600 }}>{t}</span>
                          <span style={{ color: p.tsub }}>{d.total > 0 ? `${rate}% · ${d.present}/${d.total}` : 'No data'}</span>
                        </div>
                        <div style={{ height: 6, background: p.border, borderRadius: 6, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${rate}%`, background: p.green, borderRadius: 6, transition: 'width .6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="!grid-cols-1">
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Top attendance</div>
                  {analytics.memberRates.slice(0, 5).map((m) => (
                    <div key={m.member.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: `1px solid ${p.border}` }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600 }}>{m.member.name}</span>
                      <span style={{ fontSize: 11.5, color: p.green, fontWeight: 700 }}>{m.rate}%</span>
                    </div>
                  ))}
                  {analytics.memberRates.length === 0 && <p style={{ fontSize: 11, color: p.tsub }}>No data yet.</p>}
                </div>
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Needs follow-up</div>
                  {analytics.memberRates.slice(-5).reverse().map((m) => (
                    <div key={m.member.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: `1px solid ${p.border}` }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600 }}>{m.member.name}</span>
                      <span style={{ fontSize: 11.5, color: '#e0726a', fontWeight: 700 }}>{m.rate}%</span>
                    </div>
                  ))}
                  {analytics.memberRates.length === 0 && <p style={{ fontSize: 11, color: p.tsub }}>No data yet.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------------- ADD / EDIT EVENT MODAL ---------------- */}
      {isEventModalOpen && (
        <div
          onClick={() => setIsEventModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{editingEventId ? 'Edit Event' : 'Add Event'}</span>
              <button onClick={() => setIsEventModalOpen(false)} style={{ background: 'none', border: 'none', color: p.tsub, cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={input} placeholder="e.g. Weekly Meeting" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => {
                      const type = e.target.value as EventType;
                      setForm({ ...form, type, sub_type: SUB_TYPES[type][0] });
                    }}
                    style={input}
                  >
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Sub-type</label>
                  <select value={form.sub_type} onChange={(e) => setForm({ ...form, sub_type: e.target.value })} style={input}>
                    {SUB_TYPES[form.type].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: 12, marginTop: 4 }}>
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 8 }}>Rewarded XP for Attendance</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {STATUS_ORDER.map((s) => (
                    <div key={s}>
                      <label style={{ fontSize: 9.5, color: p.tsub, display: 'block', marginBottom: 4 }}>{STATUS_META[s].letter} · {STATUS_META[s].label}</label>
                      <input
                        type="number"
                        min={0}
                        value={form[`xp_${s}` as keyof typeof form] as number}
                        onChange={(e) => setForm({ ...form, [`xp_${s}`]: Number(e.target.value) })}
                        style={input}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={saveEvent} style={{ ...solidBtn, width: '100%', marginTop: 6, padding: '11px 0' }}>
                {editingEventId ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- DELETE CONFIRM MODAL ----------------
          Type-to-confirm on the exact title — this is destructive and
          irreversible (attendance rows + XP are both gone), so a plain
          Yes/No button is too easy to misclick past. */}
      {deleteTarget && (
        <div
          onClick={() => !isDeleting && setDeleteTarget(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#3a1a14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={17} color="#e08a72" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Delete "{deleteTarget.title}"?</span>
            </div>

            <p style={{ fontSize: 11.5, color: p.tsub, lineHeight: 1.5, marginBottom: 14 }}>
              This permanently deletes the event and all its attendance records.
              Any XP members earned from this event's attendance will be reversed
              from their totals. This cannot be undone.
            </p>

            <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Type <b style={{ color: p.tl }}>{deleteTarget.title}</b> to confirm
            </label>
            <input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              style={{ ...input, marginBottom: 16 }}
              placeholder={deleteTarget.title}
              autoFocus
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} style={pillBtn}>Cancel</button>
              <button
                onClick={confirmDeleteEvent}
                disabled={isDeleting || deleteConfirmText !== deleteTarget.title}
                style={{ ...dangerBtn, opacity: isDeleting || deleteConfirmText !== deleteTarget.title ? 0.5 : 1 }}
              >
                {isDeleting ? 'Deleting…' : 'Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
