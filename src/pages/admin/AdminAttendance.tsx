import { supabase } from '../../supabase';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useSearchParams } from 'react-router-dom';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { usePoints, AttendanceStatus } from '../../hooks/usePoints';
import { getClubPalette } from '../../theme/racPalette';
import {
  Download, CalendarPlus, CalendarDays, X, Pencil, Copy, BarChart3,
  Users, TrendingUp, Trash2, AlertTriangle, Ban,
} from 'lucide-react';

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

/* ---- status: 4 XP-bearing statuses + 1 non-XP "not required" status.
   'not_required' is NEVER sent to awardAttendancePoints (always 0 XP) and
   is excluded from every rate/denominator calculation in both this file
   and the member-facing dashboard — a member marked not_required for an
   event simply doesn't have that event counted against them at all. */
type Status = 'present' | 'late' | 'excused' | 'absent';
type MarkValue = Status | 'not_required';
const STATUS_ORDER: Status[] = ['present', 'late', 'excused', 'absent'];
const MARK_ORDER: MarkValue[] = [...STATUS_ORDER, 'not_required'];
const STATUS_META: Record<Status, { letter: string; label: string }> = {
  present: { letter: 'P', label: 'Present' },
  late: { letter: 'L', label: 'Late' },
  excused: { letter: 'E', label: 'Excused' },
  absent: { letter: 'A', label: 'Absent' },
};

const isXpStatus = (s: MarkValue): s is Status => s !== 'not_required';
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
  const { awardAttendancePoints, reverseAttendancePoints, adjustAttendanceXpForEdit } = usePoints();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const targetMemberId = searchParams.get('memberId');

  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  const [mode, setMode] = useState<'mark' | 'history' | 'member' | 'analytics'>('mark');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);

  /* mark mode */
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sheet, setSheet] = useState<Record<string, MarkValue | ''>>({});
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
  const [isSavingEvent, setIsSavingEvent] = useState(false);
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
      const s: Record<string, MarkValue | ''> = {};
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

  /* ---- mark: save + award XP.
     FIX: this now diffs against what was actually stored for this event
     (fetched fresh, not derived from `sheet`'s initial load) before
     deciding how to touch XP for each member:
       - no existing record, new mark is an XP status      -> award fresh
       - existing record same status                       -> untouched, no XP call at all
       - existing record different status, both XP statuses -> reverse old + award new (adjustAttendanceXpForEdit)
       - existing record was XP status, new mark is not_required -> reverse only, no re-award
       - existing record was not_required, new mark is XP status -> award fresh (no prior XP to reverse)
     This is what actually fixes present->late double-awarding: previously
     every marked row unconditionally called awardAttendancePoints on every
     save, regardless of whether that member's status had actually changed
     since the last save. */
  const handleSaveAttendance = async () => {
    if (!selectedEventId) return;
    setIsSaving(true);
    try {
      const ev = events.find((e) => e.id === selectedEventId);
      const existingRecords = await loadEventAttendance(selectedEventId, false);
      const existingByUser: Record<string, MarkValue> = {};
      existingRecords.forEach((r: any) => { existingByUser[r.userId] = r.status; });

      const batch: any[] = [];
      const xpOps: Promise<any>[] = [];

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

        const prevStatus = existingByUser[userId];

        if (prevStatus === status) {
          // Unchanged — no XP call needed at all.
          return;
        }

        if (isXpStatus(status)) {
          const amount = xpForStatus(ev, status);
          if (prevStatus && isXpStatus(prevStatus)) {
            // Status changed between two XP-bearing statuses: net-adjust.
            xpOps.push(adjustAttendanceXpForEdit(userId, selectedEventId, status, amount).catch(console.error));
          } else {
            // Brand-new mark, or was previously not_required: nothing to reverse.
            xpOps.push(awardAttendancePoints(userId, selectedEventId, status, amount).catch(console.error));
          }
        } else if (prevStatus && isXpStatus(prevStatus)) {
          // Changed to not_required: reverse only, no re-award.
          xpOps.push(reverseAttendancePoints(userId, selectedEventId, 'Marked not required').catch(console.error));
        }
      });

      await Promise.all(batch);
      await Promise.all(xpOps);
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

  const setAll = (status: MarkValue | null) => {
    const s: Record<string, MarkValue | ''> = {};
    if (status) activeMembers.forEach((m) => { s[m.id] = status; });
    setSheet(s);
  };
  const applyToSelected = (status: MarkValue) => {
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
    activeMembers.forEach((m) => {
      const s = sheet[m.id];
      const label = s ? (s === 'not_required' ? 'Not Required' : STATUS_META[s].label) : 'Not Marked';
      rows.push([m.name || '', m.school || '', label]);
    });
    downloadCSV(`Attendance_${(ev?.title || 'event').replace(/\s+/g, '_')}.csv`, rows);
  };

  const exportSummary = () => {
    /* not_required rows are excluded from BOTH the numerator and the
       denominator here — markedEvents still counts the event as "marked"
       overall (someone was marked), but a member's own not_required rows
       don't inflate or deflate anything for them individually. */
    const totals: Record<string, Record<Status, number>> = {};
    const notRequiredByMember: Record<string, number> = {};
    const markedEvents = new Set(allAttendance.map((r) => r.eventId));
    allAttendance.forEach((r) => {
      if (r.status === 'not_required') {
        notRequiredByMember[r.userId] = (notRequiredByMember[r.userId] || 0) + 1;
        return;
      }
      if (!totals[r.userId]) totals[r.userId] = { present: 0, late: 0, excused: 0, absent: 0 };
      if (STATUS_ORDER.includes(r.status)) totals[r.userId][r.status as Status]++;
    });
    const rows = [['Member Name', 'Role', 'School', 'Present', 'Late', 'Absent', 'Excused', 'Not Required', 'Applicable Events', 'Attendance Rate %']];
    activeMembers.forEach((m) => {
      const t = totals[m.id] || { present: 0, late: 0, excused: 0, absent: 0 };
      const notReq = notRequiredByMember[m.id] || 0;
      const applicableEvents = markedEvents.size - notReq;
      const attended = t.present + t.late;
      const rate = applicableEvents > 0 ? Math.round((attended / applicableEvents) * 100) : 0;
      rows.push([m.name || '', m.role || '', m.school || '', String(t.present), String(t.late), String(t.absent), String(t.excused), String(notReq), String(applicableEvents), `${rate}%`]);
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

  /* ---- save event: if editing AND any xp_* value changed, auto-adjust
     XP for every member currently marked with that status on this event.
     Reads the pre-edit event row first (not the form state) so the "old"
     values being diffed against are guaranteed to be what was actually
     saved, not stale form state from a re-open. ---- */
  const saveEvent = async () => {
    if (!form.title || !form.date) { addToast('Title and date are required', 'error'); return; }
    setIsSavingEvent(true);
    try {
      const id = editingEventId || uid();
      let previousEvent: any = null;
      if (editingEventId) {
        const { data } = await supabase.from('events').select('xp_present, xp_late, xp_excused, xp_absent').eq('id', editingEventId).eq('tenant_id', tenant.id).single();
        previousEvent = data;
      }

      await supabase.from('events').upsert(
        {
          id, tenant_id: tenant.id, title: form.title, date: form.date, type: form.type, sub_type: form.sub_type,
          xp_present: form.xp_present, xp_late: form.xp_late, xp_excused: form.xp_excused, xp_absent: form.xp_absent,
          isPublic: false, createdAt: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (editingEventId && previousEvent) {
        const changedStatuses = STATUS_ORDER.filter((s) => Number(previousEvent[`xp_${s}`] || 0) !== Number(form[`xp_${s}` as keyof typeof form]));
        if (changedStatuses.length > 0) {
          const { data: markedRows } = await supabase.from('attendance').select('userId, status').eq('tenant_id', tenant.id).eq('eventId', editingEventId);
          const affected = (markedRows || []).filter((r: any) => changedStatuses.includes(r.status));
          if (affected.length > 0) {
            await Promise.all(
              affected.map((r: any) => {
                const newAmount = xpForStatus(form, r.status as Status);
                return adjustAttendanceXpForEdit(r.userId, editingEventId, r.status as Status, newAmount).catch(console.error);
              })
            );
            addToast(`Event updated. XP adjusted for ${affected.length} member${affected.length === 1 ? '' : 's'}.`, 'success');
          } else {
            addToast('Event updated', 'success');
          }
        } else {
          addToast('Event updated', 'success');
        }
      } else {
        addToast('Event created', 'success');
      }

      await loadBaseData();
      if (!editingEventId) setSelectedEventId(id);
      setIsEventModalOpen(false);
    } catch (err) {
      console.error(err);
      addToast('Failed to save event', 'error');
    } finally {
      setIsSavingEvent(false);
    }
  };

  /* ---- delete event ---- */
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

      const { data: markedRows } = await supabase.from('attendance').select('userId').eq('tenant_id', tenant.id).eq('eventId', eventId);
      const memberIds = [...new Set((markedRows || []).map((r: any) => r.userId))];

      if (memberIds.length > 0) {
        await Promise.all(
          memberIds.map((memberId) =>
            reverseAttendancePoints(memberId, eventId, `Event "${deleteTarget.title}" deleted — attendance XP reversed`).catch(console.error)
          )
        );
      }

      await supabase.from('attendance').delete().eq('tenant_id', tenant.id).eq('eventId', eventId);
      await supabase.from('events').delete().eq('tenant_id', tenant.id).eq('id', eventId);

      addToast(
        memberIds.length > 0
          ? `Event deleted. XP reversed for ${memberIds.length} member${memberIds.length === 1 ? '' : 's'}.`
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

  /* ---- analytics: not_required excluded from both numerator and
     denominator throughout, same principle as exportSummary. ---- */
  const analytics = useMemo(() => {
    const byType: Record<string, { present: number; total: number }> = {};
    events.forEach((ev) => {
      const t = ev.type || 'Other';
      if (!byType[t]) byType[t] = { present: 0, total: 0 };
    });
    allAttendance.forEach((r) => {
      if (r.status === 'not_required') return;
      const ev = events.find((e) => e.id === r.eventId);
      const t = ev?.type || 'Other';
      if (!byType[t]) byType[t] = { present: 0, total: 0 };
      byType[t].total++;
      if (r.status === 'present' || r.status === 'late') byType[t].present++;
    });

    const applicableAttendance = allAttendance.filter((r) => r.status !== 'not_required');
    const memberRates = activeMembers.map((m) => {
      const recs = applicableAttendance.filter((r) => r.userId === m.id);
      const present = recs.filter((r) => r.status === 'present' || r.status === 'late').length;
      const rate = recs.length > 0 ? Math.round((present / recs.length) * 100) : null;
      return { member: m, rate, total: recs.length };
    }).filter((m) => m.total > 0).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

    const overallPresent = applicableAttendance.filter((r) => r.status === 'present' || r.status === 'late').length;
    const overallRate = applicableAttendance.length > 0 ? Math.round((overallPresent / applicableAttendance.length) * 100) : 0;
    const totalXP = applicableAttendance.reduce((sum, r) => {
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
            <span style={{ fontSize: 11, color: p.pmut, fontWeight: 500 }}>{tenant.id}</span>
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
                      <div style={{ fontSize: 10, color: p.tsub, background: p.lightCard, borderRadius: 20, padding: '4px 10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Ban size={10} /> Not Required
                      </div>
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
                      <button onClick={() => setAll('not_required')} style={{ ...pillBtn, borderColor: p.pillBorder, color: p.tmid, background: 'transparent', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Ban size={11} /> Mark All N/A
                      </button>
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
                        <button onClick={() => applyToSelected('not_required')} style={{ ...pillBtn, borderColor: p.recBd, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Ban size={11} /> N/A
                        </button>
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
                              <button
                                onClick={() => setSheet({ ...sheet, [m.id]: 'not_required' })}
                                title="Not required to attend"
                                style={{
                                  width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: s === 'not_required' ? p.tmid : 'transparent', color: s === 'not_required' ? p.dark : p.tmid,
                                }}
                              >
                                <Ban size={13} />
                              </button>
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
                  const notRequiredCount = historyRecords.filter((r) => r.status === 'not_required').length;
                  return (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                        {STATUS_ORDER.map((s) => (
                          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, background: p.lightCard, borderRadius: 20, padding: '5px 10px' }}>
                            <span style={{ fontWeight: 700, fontSize: 11, color: p.td }}>{historyRecords.filter((r) => r.status === s).length}</span>
                            <span style={{ fontSize: 9.5, color: p.mut }}>{STATUS_META[s].label}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: p.lightCard, borderRadius: 20, padding: '5px 10px' }}>
                          <span style={{ fontWeight: 700, fontSize: 11, color: p.td }}>{notRequiredCount}</span>
                          <Ban size={9} color={p.mut} />
                        </div>
                        <span style={{ fontSize: 10.5, color: p.tsub, marginLeft: 'auto' }}>Unmarked: {activeMembers.length - historyRecords.length}</span>
                        <button onClick={() => openEditEvent(ev)} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4 }}><Pencil size={11} /> Edit</button>
                        <button onClick={() => requestDeleteEvent(ev)} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4, borderColor: '#5c2a20', color: '#e08a72' }}><Trash2 size={11} /> Delete</button>
                      </div>
                      <div style={{ maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {historyRecords.map((r, i) => {
                          const m = activeMembers.find((x) => x.id === r.userId);
                          const isNA = r.status === 'not_required';
                          const st = r.status as Status;
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 4px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>{m?.name || 'Unknown'}</div>
                                <div style={{ fontSize: 10, color: p.tsub }}>{m?.school || '…'}</div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, background: p.lightCard, color: p.td, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {isNA ? <><Ban size={10} /> Not Required</> : (STATUS_META[st]?.label || r.status)}
                              </span>
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
          {mode === 'member' && (() => {
            const applicableRecords = memberHistoryRecords.filter((r) => r.status !== 'not_required');
            const notRequiredCount = memberHistoryRecords.length - applicableRecords.length;
            return (
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
                        { label: 'Applicable Events', value: applicableRecords.length },
                        { label: 'Present', value: applicableRecords.filter((r) => r.status === 'present' || r.status === 'late').length },
                        { label: 'Absent', value: applicableRecords.filter((r) => r.status === 'absent').length },
                        { label: 'Rate', value: applicableRecords.length ? `${Math.round((applicableRecords.filter((r) => r.status === 'present' || r.status === 'late').length / applicableRecords.length) * 100)}%` : 'N/A' },
                      ].map((s) => (
                        <div key={s.label} style={{ ...lightCard, textAlign: 'center', padding: 12 }}>
                          <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                          <div style={{ fontSize: 9, color: p.mut, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {notRequiredCount > 0 && (
                      <div style={{ fontSize: 10, color: p.tsub, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Ban size={11} /> {notRequiredCount} event{notRequiredCount === 1 ? '' : 's'} marked not required — excluded from rate
                      </div>
                    )}
                    {memberHistoryRecords.length === 0 ? (
                      <p style={{ textAlign: 'center', color: p.tsub, padding: '30px 0', fontSize: 12 }}>No attendance records for this member.</p>
                    ) : (
                      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                        {memberHistoryRecords.map((r, i) => {
                          const isNA = r.status === 'not_required';
                          return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 2px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>{r.eventTitle}</div>
                                <div style={{ fontSize: 10, color: p.tsub }}>{r.eventDate} {r.eventType ? `· ${r.eventType}` : ''}</div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, background: p.lightCard, color: p.td, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {isNA ? <><Ban size={10} /> Not Required</> : (STATUS_META[r.status as Status]?.label || r.status)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}

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
                <div style={{ fontSize: 9.5, color: p.tsub, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Ban size={10} /> Not-required marks excluded from these rates
                </div>
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
          onClick={() => !isSavingEvent && setIsEventModalOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{editingEventId ? 'Edit Event' : 'Add Event'}</span>
              <button onClick={() => setIsEventModalOpen(false)} disabled={isSavingEvent} style={{ background: 'none', border: 'none', color: p.tsub, cursor: 'pointer' }}><X size={18} /></button>
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
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 4 }}>Rewarded XP for Attendance</label>
                {editingEventId && (
                  <div style={{ fontSize: 9.5, color: p.tsub, marginBottom: 8, lineHeight: 1.4 }}>
                    Changing a value here retroactively adjusts XP for every member already marked with that status on this event.
                  </div>
                )}
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
                <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Ban size={10} /> Not Required members never earn XP for this event, by design.
                </div>
              </div>

              <button onClick={saveEvent} disabled={isSavingEvent} style={{ ...solidBtn, width: '100%', marginTop: 6, padding: '11px 0', opacity: isSavingEvent ? 0.6 : 1 }}>
                {isSavingEvent ? 'Saving…' : editingEventId ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- DELETE CONFIRM MODAL ---------------- */}
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
