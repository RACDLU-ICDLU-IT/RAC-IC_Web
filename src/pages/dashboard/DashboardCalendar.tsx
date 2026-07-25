import { supabase } from '../../supabase';
import React, { useEffect, useMemo, useState } from 'react';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import {
  CalendarDays, ChevronLeft, ChevronRight, Search, X, ChevronDown,
  MapPin, Clock, ExternalLink, Download, List, Grid3x3, Eye, EyeOff,
} from 'lucide-react';

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

const EVENT_TYPES = ['Meeting', 'Event', 'Project', 'Workshop'] as const;
type EventType = typeof EVENT_TYPES[number];

type EventRecord = {
  id: string;
  title: string;
  date: string;
  time?: string;
  type?: EventType | string;
  sub_type?: string;
  venue?: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
};

const TYPE_COLOR: Record<string, { fg: string; bg: string }> = {
  Meeting: { fg: '#7aa8e0', bg: '#16233a' },
  Event: { fg: '#c98ede', bg: '#2a1a36' },
  Project: { fg: '#8fd67a', bg: '#1a2e14' },
  Workshop: { fg: '#e0b25c', bg: '#332510' },
};
function typeColor(type?: string) {
  return TYPE_COLOR[type || ''] || { fg: '#9a9296', bg: '#232023' };
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: { day: number; inMonth: boolean; iso: string }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, inMonth: false, iso: isoDate(y, m, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, inMonth: true, iso: isoDate(year, month, d) });
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const nextNeeded = 7 - remainder;
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    for (let d = 1; d <= nextNeeded; d++) cells.push({ day: d, inMonth: false, iso: isoDate(y, m, d) });
  }
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

function formatLongDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}
function formatShortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}
function formatTime12h(time?: string) {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  let h = Number(hStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

/* Google Calendar "render" link and RFC 5545 ICS export — both derived
   client-side from event fields, no OAuth/API needed. Google's render
   link only ever describes one event, so bulk export goes through ICS. */

function toICSTimestamp(dateStr: string, timeStr?: string): { stamp: string; allDay: boolean } {
  if (!timeStr) {
    return { stamp: dateStr.replace(/-/g, ''), allDay: true };
  }
  const local = new Date(`${dateStr}T${timeStr}:00`);
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}T${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}${pad(local.getUTCSeconds())}Z`;
  return { stamp, allDay: false };
}

function addOneHourISO(dateStr: string, timeStr: string) {
  const local = new Date(`${dateStr}T${timeStr}:00`);
  local.setHours(local.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local.getUTCFullYear()}${pad(local.getUTCMonth() + 1)}${pad(local.getUTCDate())}T${pad(local.getUTCHours())}${pad(local.getUTCMinutes())}${pad(local.getUTCSeconds())}Z`;
}

function googleCalendarUrl(ev: EventRecord) {
  const { stamp: start, allDay } = toICSTimestamp(ev.date, ev.time);
  const dates = allDay
    ? `${start}/${start}`
    : `${start}/${addOneHourISO(ev.date, ev.time!)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    // Without ctz, Google renders the UTC `dates` value in whatever
    // timezone the viewer's Google account/browser happens to be set
    // to — which is why a Dhaka 8:18 PM event was showing as 2:18 PM.
    // The stored date/time is always club-local (Asia/Dhaka), so this
    // pins the render to that, regardless of the viewer's own settings.
    ctz: 'Asia/Dhaka',
  });
  const detailsParts = [ev.description, ev.sub_type ? `Type: ${ev.type} — ${ev.sub_type}` : ev.type ? `Type: ${ev.type}` : ''].filter(Boolean);
  if (detailsParts.length) params.set('details', detailsParts.join('\n\n'));
  if (ev.venue) params.set('location', ev.venue);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(str: string) {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function eventToICSBlock(ev: EventRecord) {
  const { stamp: dtstart, allDay } = toICSTimestamp(ev.date, ev.time);
  const lines = [
    'BEGIN:VEVENT',
    `UID:${ev.id}@rac-ic-web`,
    `DTSTAMP:${toICSTimestamp(todayISO()).stamp}`,
  ];
  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
  } else {
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${addOneHourISO(ev.date, ev.time!)}`);
  }
  lines.push(`SUMMARY:${icsEscape(ev.title)}`);
  const detailsParts = [ev.description, ev.sub_type ? `Type: ${ev.type} — ${ev.sub_type}` : ev.type ? `Type: ${ev.type}` : ''].filter(Boolean);
  if (detailsParts.length) lines.push(`DESCRIPTION:${icsEscape(detailsParts.join('\\n\\n'))}`);
  if (ev.venue) lines.push(`LOCATION:${icsEscape(ev.venue)}`);
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function downloadICS(filename: string, events: EventRecord[]) {
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RAC-IC_Web//Club Calendar//EN',
    'CALSCALE:GREGORIAN',
    ...events.map(eventToICSBlock),
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DashboardCalendar() {
  const { tenant } = useTenant();
  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [typeFilter, setTypeFilter] = useState<'All' | EventType>('All');
  const [search, setSearch] = useState('');

  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('events').select('*').eq('tenant_id', tenant.id).order('date', { ascending: true });
      if (err) throw err;
      setEvents((data as EventRecord[]) || []);
    } catch (err) {
      console.error(err);
      setError("Couldn't load the calendar.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchEvents(); }, [tenant.id]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== 'All' && e.type !== typeFilter) return false;
      if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !(e.venue || '').toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [events, typeFilter, search]);

  const hasActiveFilters = typeFilter !== 'All' || search;
  const clearFilters = () => { setTypeFilter('All'); setSearch(''); };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    filtered.forEach((e) => {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [filtered]);

  const today = todayISO();
  const cells = buildMonthGrid(calMonth.y, calMonth.m);
  const monthLabel = new Date(calMonth.y, calMonth.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const upcoming = useMemo(() => filtered.filter((e) => e.date >= today).sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0)), [filtered, today]);
  const past = useMemo(() => filtered.filter((e) => e.date < today).sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0)), [filtered, today]);

  const goToday = () => { const d = new Date(); setCalMonth({ y: d.getFullYear(), m: d.getMonth() }); };
  const prevMonth = () => setCalMonth((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 });
  const nextMonth = () => setCalMonth((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 });

  const darkCard: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` };
  const lightCard: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.lightCard, color: p.td };
  const pillBtn: React.CSSProperties = { border: `1px solid ${p.pillBorder}`, borderRadius: 20, fontSize: 10, padding: '6px 12px', color: p.tmid, background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 };
  const solidBtn: React.CSSProperties = { background: p.green, color: '#1b0c12', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '8px 16px', border: 'none', cursor: 'pointer' };
  // filterField/filterLabel are always drawn on top of darkCard, so
  // their background must be p.dark (never p.bg). tl/tsub are constant
  // across light/dark mode in racPalette.ts, but bg is not — using
  // p.bg here meant the input background followed the *page*
  // background (pale in light mode) while the text stayed white,
  // making Search/type-filter text unreadable in light mode.
  const filterField: React.CSSProperties = { background: p.dark, color: p.tl, border: `1px solid ${p.border}`, borderRadius: 12, padding: '10px 12px', fontSize: 12, fontWeight: 500, outline: 'none', height: 38, boxSizing: 'border-box' };
  const filterLabel: React.CSSProperties = { fontSize: 9.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, display: 'block' };

  if (loading) {
    return (
      <div style={{ background: p.bg, padding: 18 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ height: 480, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rac-dashboard-calendar">
      <style>{`
        .rac-dashboard-calendar, .rac-dashboard-calendar * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-dashboard-calendar ::-webkit-scrollbar { display: none; }
        .rac-dashboard-calendar select { color-scheme: ${dark ? 'dark' : 'light'}; }
        .rac-cal-day:hover .rac-cal-day-num { color: ${p.tl}; }
        .rac-cal-select {
          appearance: none; -webkit-appearance: none; -moz-appearance: none;
          padding-right: 30px !important; width: 100%;
        }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>Calendar</span>
            <button
              onClick={() => downloadICS(`${tenant.id}-calendar.ics`, filtered.length > 0 ? filtered : events)}
              style={{ ...solidBtn, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={13} /> Export all (.ics)
            </button>
          </div>

          {error && (
            <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 12, background: '#3a1a14', color: '#e08a72' }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>
              <button onClick={fetchEvents} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Retry</button>
            </div>
          )}

          <div style={{ ...darkCard, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Filter</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setView('month')} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 5, background: view === 'month' ? p.green : 'none', color: view === 'month' ? '#1b0c12' : p.tmid, border: view === 'month' ? 'none' : `1px solid ${p.pillBorder}` }}>
                  <Grid3x3 size={12} /> Month
                </button>
                <button onClick={() => setView('agenda')} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 5, background: view === 'agenda' ? p.green : 'none', color: view === 'agenda' ? '#1b0c12' : p.tmid, border: view === 'agenda' ? 'none' : `1px solid ${p.pillBorder}` }}>
                  <List size={12} /> Agenda
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={filterLabel}>Search</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...filterField, padding: '0 12px' }}>
                <Search size={13} color={p.tsub} style={{ flexShrink: 0 }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events or venues…" style={{ border: 'none', background: 'none', outline: 'none', color: p.tl, fontSize: 12, width: '100%', height: '100%' }} />
              </div>
            </div>

            <div>
              <label style={filterLabel}>Event type</label>
              <div style={{ position: 'relative', maxWidth: 260 }}>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} style={filterField} className="rac-cal-select">
                  <option value="All">All types</option>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={14} color={p.tsub} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {hasActiveFilters && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${p.border}` }}>
                <span style={{ fontSize: 10, color: p.tsub }}>{filtered.length} of {events.length} shown</span>
                <button onClick={clearFilters} style={{ ...pillBtn, display: 'flex', alignItems: 'center', gap: 4 }}><X size={11} /> Clear filters</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${p.border}`, flexWrap: 'wrap' }}>
              {EVENT_TYPES.map((t) => {
                const c = typeColor(t);
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.fg }} />
                    <span style={{ fontSize: 9.5, color: p.tsub }}>{t}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {events.length === 0 ? (
            <div style={{ ...darkCard, textAlign: 'center', padding: '48px 16px' }}>
              <CalendarDays size={40} color={p.tmid} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>No events yet</div>
              <div style={{ fontSize: 11, color: p.tsub, marginTop: 4 }}>Events created by an admin will appear here.</div>
            </div>
          ) : view === 'month' ? (
            <div style={darkCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <button onClick={prevMonth} style={{ ...pillBtn, padding: '6px 9px' }}><ChevronLeft size={13} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: p.tl }}>{monthLabel}</span>
                  <button onClick={goToday} style={pillBtn}>Today</button>
                </div>
                <button onClick={nextMonth} style={{ ...pillBtn, padding: '6px 9px' }}><ChevronRight size={13} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 9, color: p.tmid, fontWeight: 600, padding: '4px 0' }}>{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                {cells.map((cell) => {
                  const dayEvents = eventsByDate.get(cell.iso) || [];
                  const isToday = cell.iso === today;
                  const visible = dayEvents.slice(0, 3);
                  const overflow = dayEvents.length - visible.length;
                  return (
                    <div
                      key={cell.iso}
                      className="rac-cal-day"
                      style={{
                        minHeight: 78,
                        borderRadius: 10,
                        border: `1px solid ${isToday ? p.green : 'transparent'}`,
                        background: cell.inMonth ? (isToday ? p.greenDeep : 'transparent') : 'transparent',
                        padding: 5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        opacity: cell.inMonth ? 1 : 0.35,
                      }}
                    >
                      <span className="rac-cal-day-num" style={{ fontSize: 10.5, color: isToday ? p.green : p.tsub, fontWeight: isToday ? 700 : 500 }}>{cell.day}</span>
                      {visible.map((ev) => {
                        const c = typeColor(ev.type);
                        return (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            title={ev.title}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                              background: c.bg, color: c.fg, borderRadius: 6, padding: '2px 5px',
                              fontSize: 8.5, fontWeight: 600, lineHeight: 1.3,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}
                          >
                            {ev.title}
                          </button>
                        );
                      })}
                      {overflow > 0 && (
                        <span style={{ fontSize: 8, color: p.tsub, paddingLeft: 5 }}>+{overflow} more</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={darkCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Upcoming</span>
                  <span style={{ fontSize: 10, color: p.tsub, background: p.lightCard, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>{upcoming.length}</span>
                </div>
                {upcoming.length === 0 ? (
                  <div style={{ fontSize: 11, color: p.tsub, textAlign: 'center', padding: '20px 0' }}>No upcoming events match these filters.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {upcoming.map((ev, i) => (
                      <AgendaRow key={ev.id} ev={ev} p={p} isFirst={i === 0} onClick={() => setSelectedEvent(ev)} />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ ...lightCard }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Past</span>
                  <span style={{ fontSize: 10, color: p.tl, background: p.dark, borderRadius: 20, padding: '2px 8px', fontWeight: 600, opacity: 0.85 }}>{past.length}</span>
                </div>
                {past.length === 0 ? (
                  <div style={{ fontSize: 11, color: p.mut, textAlign: 'center', padding: '20px 0' }}>No past events yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {past.map((ev, i) => (
                      <AgendaRow key={ev.id} ev={ev} p={p} isFirst={i === 0} onClick={() => setSelectedEvent(ev)} light />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedEvent && (
        <EventDetailModal ev={selectedEvent} p={p} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

function AgendaRow({ ev, p, isFirst, onClick, light }: { ev: EventRecord; p: any; isFirst: boolean; onClick: () => void; light?: boolean }) {
  const c = typeColor(ev.type);
  const border = light ? p.border : p.border;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        background: 'none', border: 'none', cursor: 'pointer', padding: '11px 4px',
        borderTop: isFirst ? 'none' : `1px solid ${border}`,
      }}
    >
      <div style={{ width: 44, flexShrink: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 9, color: light ? p.mut : p.tsub, fontWeight: 700, textTransform: 'uppercase' }}>{new Date(`${ev.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: light ? p.td : p.tl, lineHeight: 1.2 }}>{new Date(`${ev.date}T00:00:00`).getDate()}</div>
      </div>
      <div style={{ width: 1, alignSelf: 'stretch', background: border }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 12.5, color: light ? p.td : p.tl }}>{ev.title}</span>
          <span style={{ fontSize: 9, color: c.fg, background: c.bg, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>{ev.type}</span>
        </div>
        <div style={{ fontSize: 10, color: light ? p.mut : p.tsub, marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {ev.time && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {formatTime12h(ev.time)}</span>}
          {ev.venue && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} /> {ev.venue}</span>}
        </div>
      </div>
    </button>
  );
}

function EventDetailModal({ ev, p, onClose }: { ev: EventRecord; p: any; onClose: () => void }) {
  const c = typeColor(ev.type);
  const card: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` };
  const solidBtn: React.CSSProperties = { background: p.green, color: '#1b0c12', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '10px 16px', border: 'none', cursor: 'pointer' };
  const outlineBtn: React.CSSProperties = { border: `1px solid ${p.pillBorder}`, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '10px 16px', color: p.tl, background: 'none', cursor: 'pointer' };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
        {ev.coverImage ? (
          <div style={{ position: 'relative' }}>
            <img src={ev.coverImage} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', borderRadius: '20px 20px 0 0' }} />
            <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><X size={16} /></button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0' }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: p.tsub, cursor: 'pointer' }}><X size={18} /></button>
          </div>
        )}

        <div style={{ padding: '16px 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 9.5, color: c.fg, background: c.bg, borderRadius: 20, padding: '3px 9px', fontWeight: 700 }}>
              {ev.type}{ev.sub_type ? ` · ${ev.sub_type}` : ''}
            </span>
            {ev.isPublic === false && (
              <span style={{ fontSize: 9.5, color: p.tsub, background: p.lightCard, borderRadius: 20, padding: '3px 9px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <EyeOff size={10} /> Members only
              </span>
            )}
          </div>

          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.2px', marginBottom: 14, lineHeight: 1.25 }}>{ev.title}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: p.lightCard, borderRadius: 14, padding: 14, marginBottom: ev.description ? 16 : 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CalendarDays size={16} color={p.green} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: p.td, fontWeight: 500 }}>{formatLongDate(ev.date)}</span>
            </div>
            {ev.time && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Clock size={16} color={p.green} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: p.td, fontWeight: 500 }}>{formatTime12h(ev.time)}</span>
              </div>
            )}
            {ev.venue && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <MapPin size={16} color={p.green} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12.5, color: p.td, fontWeight: 500 }}>{ev.venue}</span>
              </div>
            )}
          </div>

          {ev.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Details</div>
              <p style={{ fontSize: 12.5, color: p.tl, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{ev.description}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={googleCalendarUrl(ev)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...solidBtn, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', flex: '1 1 auto', justifyContent: 'center' }}
            >
              <ExternalLink size={13} /> Add to Google Calendar
            </a>
            <button
              onClick={() => downloadICS(`${ev.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`, [ev])}
              style={{ ...outlineBtn, display: 'inline-flex', alignItems: 'center', gap: 6, flex: '1 1 auto', justifyContent: 'center' }}
            >
              <Download size={13} /> Download .ics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
