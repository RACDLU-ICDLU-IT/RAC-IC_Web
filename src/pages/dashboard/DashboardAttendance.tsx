import { supabase } from '../../supabase';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import {
  CheckCircle2, XCircle, Clock, MinusCircle, FileQuestion,
  CalendarDays, List, ChevronLeft, ChevronRight, Search, X,
} from 'lucide-react';

/* ---- font loader: identical pattern/id to DashboardHome.tsx, idempotent ---- */
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

/* ---- event taxonomy — duplicated from AdminAttendance.tsx (no shared
   constants file exists yet in this codebase). Worth extracting to e.g.
   src/constants/events.ts if these two files keep needing to stay in sync. */
const EVENT_TYPES = ['Meeting', 'Event', 'Project', 'Workshop'] as const;
type EventType = typeof EVENT_TYPES[number];

/* ---- status vocabulary: canonical full-word values, matching the unified
   attendance.status column (see admin-side migration). ---- */
type Status = 'present' | 'late' | 'excused' | 'absent';
const STATUS_ORDER: Status[] = ['present', 'late', 'excused', 'absent'];
const STATUS_ICON: Record<Status, React.ElementType> = {
  present: CheckCircle2, late: MinusCircle, excused: Clock, absent: XCircle,
};
const STATUS_LABEL: Record<Status, string> = {
  present: 'Present', late: 'Late', excused: 'Excused', absent: 'Absent',
};

/* Colors: present/late reuse real palette tokens (brand accent + its
   lighter variant). excused/absent are NOT in racPalette.ts — these are new
   fixed tokens. Absent reuses the exact red already established by
   DashboardHome.tsx's own error banner for consistency; excused is a new
   low-saturation amber with no existing precedent in this codebase. */
const FIXED_ABSENT = '#e08a72';
const FIXED_ABSENT_BG = '#3a1a14';
const FIXED_EXCUSED = '#c9a45c';
const FIXED_EXCUSED_BG = '#2a2013';

function statusColor(p: any, s: Status) {
  if (s === 'present') return { fg: p.green, bg: p.greenDeep };
  if (s === 'late') return { fg: p.av2, bg: p.gcA };
  if (s === 'excused') return { fg: FIXED_EXCUSED, bg: FIXED_EXCUSED_BG };
  return { fg: FIXED_ABSENT, bg: FIXED_ABSENT_BG };
}

type AttendanceRecord = {
  id: string;
  userId: string;
  eventId: string;
  status: Status | string;
  eventTitle: string;
  eventDate: string;
  eventType: string;
  eventSubType?: string;
};

/* ------------------------------- data layer ------------------------------- */

async function loadMemberAttendance(tenantId: string, userId: string): Promise<AttendanceRecord[]> {
  const [{ data: attSnap, error: attErr }, { data: eventsSnap, error: evErr }] = await Promise.all([
    supabase.from('attendance').select('*').eq('userId', userId).eq('tenant_id', tenantId),
    supabase.from('events').select('*').eq('tenant_id', tenantId),
  ]);
  if (attErr) throw attErr;
  if (evErr) throw evErr;

  const eventsMap: Record<string, any> = {};
  (eventsSnap || []).forEach((e: any) => { eventsMap[e.id] = e; });

  const enriched = (attSnap || []).map((r: any) => ({
    ...r,
    eventTitle: eventsMap[r.eventId]?.title || r.eventTitle || 'Club Meeting',
    eventDate: eventsMap[r.eventId]?.date || r.eventDate || '',
    eventType: eventsMap[r.eventId]?.type || r.eventType || '',
    eventSubType: eventsMap[r.eventId]?.sub_type || '',
  }));

  enriched.sort((a, b) => (b.eventDate > a.eventDate ? 1 : b.eventDate < a.eventDate ? -1 : 0));
  return enriched;
}

/* ------------------------------- calendar helpers ------------------------------- */

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function isoDate(year: number, month: number, day: number) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function todayISO() {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

/* ------------------------------- page ------------------------------- */

export default function DashboardAttendance() {
  const { user, profile } = useAuth();
  const { tenant } = useTenant();

  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [typeFilter, setTypeFilter] = useState<'All' | EventType>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadMemberAttendance(tenant.id, user.id);
      setRecords(data);
    } catch (err) {
      console.error(err);
      setError("Couldn't load your attendance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.id, tenant.id]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (typeFilter !== 'All' && r.eventType !== typeFilter) return false;
      if (dateFrom && r.eventDate < dateFrom) return false;
      if (dateTo && r.eventDate > dateTo) return false;
      if (search && !r.eventTitle.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [records, typeFilter, dateFrom, dateTo, search]);

  const hasActiveFilters = typeFilter !== 'All' || dateFrom || dateTo || search;
  const clearFilters = () => { setTypeFilter('All'); setDateFrom(''); setDateTo(''); setSearch(''); };

  /* stats always computed over the FULL record set, not the filtered view —
     filters narrow what you're browsing, they shouldn't silently change what
     your attendance rate says. */
  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === 'present').length;
    const late = records.filter((r) => r.status === 'late').length;
    const excused = records.filter((r) => r.status === 'excused').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const total = records.length;
    const attended = present + late;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { present, late, excused, absent, total, attended, rate };
  }, [records]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    filtered.forEach((r) => {
      if (!r.eventDate) return;
      const list = map.get(r.eventDate) || [];
      list.push(r);
      map.set(r.eventDate, list);
    });
    return map;
  }, [filtered]);

  const cells = buildMonthGrid(calMonth.y, calMonth.m);
  const monthLabel = new Date(calMonth.y, calMonth.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = todayISO();
  const selectedDayRecords = selectedDay ? recordsByDate.get(selectedDay) || [] : [];

  /* ---- shared style tokens, mirroring DashboardHome/AdminAttendance ---- */
  const darkCard: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` };
  const lightCard: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.lightCard, color: p.td };
  const pillBtn: React.CSSProperties = { border: `1px solid ${p.pillBorder}`, borderRadius: 20, fontSize: 10, padding: '6px 12px', color: p.tmid, background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 };
  const input: React.CSSProperties = { background: p.bg, color: p.tl, border: `1px solid ${p.border}`, borderRadius: 10, padding: '7px 10px', fontSize: 11.5, fontWeight: 500, outline: 'none' };

  if (loading) {
    return (
      <div style={{ background: p.bg, padding: 18 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }} className="!grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ height: 90, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
            ))}
          </div>
          <div style={{ height: 320, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rac-member-attendance">
      <style>{`
        .rac-member-attendance, .rac-member-attendance * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-member-attendance ::-webkit-scrollbar { display: none; }
        .rac-member-attendance input::placeholder { color: ${p.tsub}; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* page-top */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>Attendance</span>
            <span style={{ fontSize: 11, color: p.pmut, fontWeight: 500 }}>{stats.total} record{stats.total === 1 ? '' : 's'}</span>
          </div>

          {error && (
            <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 12, background: FIXED_ABSENT_BG, color: FIXED_ABSENT }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>
              <button onClick={fetchData} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          {/* stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }} className="!grid-cols-2 sm:!grid-cols-3 lg:!grid-cols-5">
            <div style={{ ...darkCard, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.3px', color: p.green }}>{stats.rate}%</div>
              <div style={{ fontSize: 9, color: p.tsub, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>Rate</div>
            </div>
            {STATUS_ORDER.map((s) => {
              const c = statusColor(p, s);
              return (
                <div key={s} style={{ ...lightCard, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.3px', color: c.fg }}>{stats[s]}</div>
                  <div style={{ fontSize: 9, color: p.mut, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>{STATUS_LABEL[s]}</div>
                </div>
              );
            })}
          </div>

          {/* progress bar */}
          {stats.total > 0 && (
            <div style={{ ...darkCard, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: p.tsub, marginBottom: 8 }}>
                <span>Attendance progress</span>
                <span>{stats.attended}/{stats.total} events</span>
              </div>
              <div style={{ height: 6, background: p.border, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.rate}%`, background: p.green, borderRadius: 6, transition: 'width .7s ease' }} />
              </div>
            </div>
          )}

          {stats.total === 0 ? (
            <div style={{ ...darkCard, textAlign: 'center', padding: '48px 16px' }}>
              <CalendarDays size={40} color={p.tmid} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>No attendance records yet</div>
              <div style={{ fontSize: 11, color: p.tsub, marginTop: 4 }}>Records appear here after an admin marks attendance.</div>
            </div>
          ) : (
            <>
              {/* filter/search bar */}
              <div style={{ ...darkCard, marginBottom: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 160, background: p.bg, border: `1px solid ${p.border}`, borderRadius: 10, padding: '7px 10px' }}>
                    <Search size={13} color={p.tsub} />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events…" style={{ border: 'none', background: 'none', outline: 'none', color: p.tl, fontSize: 11.5, width: '100%' }} />
                  </div>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} style={input}>
                    <option value="All">All types</option>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={input} />
                  <span style={{ color: p.tsub, fontSize: 11 }}>–</span>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={input} />
                  {hasActiveFilters && (
                    <button onClick={clearFilters} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4 }}><X size={11} /> Clear</button>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button onClick={() => setView('list')} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 5, background: view === 'list' ? p.green : 'none', color: view === 'list' ? '#1b0c12' : p.tmid, border: view === 'list' ? 'none' : `1px solid ${p.pillBorder}` }}>
                      <List size={12} /> List
                    </button>
                    <button onClick={() => setView('calendar')} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 5, background: view === 'calendar' ? p.green : 'none', color: view === 'calendar' ? '#1b0c12' : p.tmid, border: view === 'calendar' ? 'none' : `1px solid ${p.pillBorder}` }}>
                      <CalendarDays size={12} /> Calendar
                    </button>
                  </div>
                </div>
                {hasActiveFilters && (
                  <div style={{ fontSize: 10, color: p.tsub, marginTop: 8 }}>{filtered.length} of {records.length} shown</div>
                )}
              </div>

              {/* ---------------- LIST VIEW ---------------- */}
              {view === 'list' && (
                <div style={{ ...darkCard, padding: 0, overflow: 'hidden' }}>
                  {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: p.tsub }}>
                      <FileQuestion size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                      <div style={{ fontSize: 12 }}>No records match these filters.</div>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                      {filtered.map((r, i) => {
                        const s = (r.status as Status) in STATUS_LABEL ? (r.status as Status) : 'present';
                        const c = statusColor(p, s);
                        const Icon = STATUS_ICON[s];
                        return (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon size={16} color={c.fg} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.eventTitle}</div>
                                <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 1 }}>
                                  {r.eventDate ? new Date(`${r.eventDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not recorded'}
                                  {r.eventType && ` · ${r.eventType}${r.eventSubType ? ` — ${r.eventSubType}` : ''}`}
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: c.fg, background: c.bg, padding: '5px 11px', borderRadius: 20, flexShrink: 0 }}>
                              {STATUS_LABEL[s]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- CALENDAR VIEW ---------------- */}
              {view === 'calendar' && (
                <div style={darkCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <button onClick={() => { setCalMonth((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }); setSelectedDay(null); }} style={{ ...pillBtn, padding: '6px 9px' }}><ChevronLeft size={13} /></button>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{monthLabel}</span>
                    <button onClick={() => { setCalMonth((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }); setSelectedDay(null); }} style={{ ...pillBtn, padding: '6px 9px' }}><ChevronRight size={13} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                      <div key={d} style={{ textAlign: 'center', fontSize: 9, color: p.tmid, fontWeight: 600, padding: '4px 0' }}>{d}</div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                    {cells.map((day, i) => {
                      if (day === null) return <div key={`b${i}`} />;
                      const dateStr = isoDate(calMonth.y, calMonth.m, day);
                      const dayRecords = recordsByDate.get(dateStr) || [];
                      const isToday = dateStr === today;
                      const isSelected = dateStr === selectedDay;
                      const primaryStatus = dayRecords[0]?.status as Status | undefined;
                      const c = primaryStatus && primaryStatus in STATUS_LABEL ? statusColor(p, primaryStatus) : null;
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDay(dayRecords.length ? dateStr : null)}
                          style={{
                            aspectRatio: '1', borderRadius: 10, border: `1px solid ${isSelected ? p.green : isToday ? p.tdH : 'transparent'}`,
                            background: isSelected ? p.greenDeep : 'transparent', cursor: dayRecords.length ? 'pointer' : 'default',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 2,
                          }}
                        >
                          <span style={{ fontSize: 10.5, color: dayRecords.length ? p.tl : p.tsub, fontWeight: isToday ? 700 : 500 }}>{day}</span>
                          {c && <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.fg }} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* legend — mirrors DashboardHome's attendance-rate timeline legend */}
                  <div style={{ display: 'flex', gap: 14, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${p.border}`, flexWrap: 'wrap' }}>
                    {STATUS_ORDER.map((s) => {
                      const c = statusColor(p, s);
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.fg }} />
                          <span style={{ fontSize: 9.5, color: p.tsub }}>{STATUS_LABEL[s]}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* selected-day detail */}
                  {selectedDay && selectedDayRecords.length > 0 && (
                    <div style={{ marginTop: 14, background: p.lightCard, borderRadius: 14, padding: 12 }}>
                      <div style={{ fontSize: 10.5, color: p.mut, fontWeight: 600, marginBottom: 8 }}>
                        {new Date(`${selectedDay}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      {selectedDayRecords.map((r) => {
                        const s = (r.status as Status) in STATUS_LABEL ? (r.status as Status) : 'present';
                        const c = statusColor(p, s);
                        return (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: p.td }}>{r.eventTitle}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: c.fg }}>{STATUS_LABEL[s]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!selectedDay && filtered.length > 0 && (
                    <div style={{ fontSize: 10, color: p.tsub, marginTop: 12, textAlign: 'center' }}>Tap a marked day to see details.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
