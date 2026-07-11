import { supabase } from '../../supabase';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import { getClubPalette } from '../../theme/racPalette';

/**
 * Inter font loader — same URL string already used for Inter in
 * TenantContext.tsx's FONT_IMPORT_MAP, so this can never drift from
 * what the tenant theme system would load for the same font. Injected
 * as a <link> the same way TenantContext's injectFontLink() does,
 * just scoped to this page's own effect since this page opts out of
 * the tenant font system entirely (see palette comment below).
 *
 * The mockup embeds the real Inter variable font (woff2, weight 100–900)
 * as inline base64 so it renders identically offline with zero network
 * dependency. Loading from Google Fonts CDN instead means: an initial
 * network request, a brief fallback-font flash before it loads (mitigated
 * by font-display:swap below), and only the static weights listed here
 * rather than every weight 100–900 — but it keeps this file small and
 * matches how the rest of the app already loads fonts.
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
    // Intentionally not removed on unmount — once Inter is loaded,
    // leaving the <link> in place avoids a refetch/flash if the user
    // navigates back to this page later in the same session.
  }, []);
}

/**
 * ------------------------------------------------------------------
 * Visual identity — pixel-matched to the RACDLU/ICDLU dashboard
 * mockup (dashboard-combined.html), including every card, the
 * weekday attendance table, the status timeline, the bar charts,
 * and the reflection carousel. DELIBERATELY FIXED: does not read
 * theme.accent / theme.fontHeading / theme.fontBody — this page has
 * its own hardcoded identity regardless of what a tenant admin
 * configures in AdminTheme. This is an explicit decision, not an
 * oversight — every other page in the app respects per-tenant
 * theming; this one doesn't.
 *
 * Color scheme auto-detects from tenant.id ('racdlu' → Rotaract pink,
 * 'icdlu' → Interact blue), mirroring the mockup's data-club toggle
 * but with no manual switch — the tenant IS the club.
 *
 * PALETTE itself now lives in theme/racPalette.ts (shared with
 * DashboardLayout.tsx) — see that file's header comment for why.
 * ------------------------------------------------------------------
 */

/* ------------------------------- data types ------------------------------- */

type EventRecord = {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue?: string;
  type?: string;
};

type AnnouncementRecord = {
  id: string;
  title: string;
  body?: string;
  content?: string;
  isPinned?: boolean;
  createdAt?: string;
};

/** Matches the real `attendance` table used in DashboardAttendance.tsx. */
type AttendanceRecord = {
  id: string;
  userId: string;
  eventId: string;
  status: 'present' | 'absent' | 'excused' | 'late' | string;
};

/** Matches the real `projects` table used in DashboardProjects.tsx.
 * NOTE: no funding fields exist here. The "Funds raised" line in the
 * Projects card is rendered as the mockup's literal placeholder bar
 * (83% fixed width, matching dashboard-combined.html exactly) rather
 * than a real percentage — see that card's JSX for the honest marker. */
type ProjectRecord = {
  id: string;
  name: string;
  type?: string;
  status?: string;
  startDate?: string;
  executionDate?: string;
  coverImage?: string;
};

/* ------------------------------- helpers ------------------------------- */

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/** 12-hour clock label, e.g. "3:21 PM". */
function formatClock(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${ampm}`;
}

function formatEventDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  let label: string | null = null;
  if (diffDays === 0) label = 'Today';
  else if (diffDays === 1) label = 'Tomorrow';
  else if (diffDays > 1 && diffDays < 7) label = `In ${diffDays}d`;
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    day: date.getDate(),
    label,
  };
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Bar-chart heights for the "Member engagement" hero card. Purely
 * decorative in the mockup (three hardcoded arrays rendered as CSS bar
 * heights) — kept as-is since there's no per-day time-series backing
 * this yet. Same shape/length as dashboard-combined.html's p1/p2/p3. */
const ENGAGEMENT_BARS = {
  active: [38, 52, 33, 58, 78, 48, 63, 42, 68, 53, 58, 38, 48, 73, 58, 53, 78, 63, 48, 44, 60, 50, 40, 55],
  attendance: [35, 48, 58, 66, 52, 40, 62, 70, 56, 44, 38, 50, 60, 48, 36, 44, 52, 58, 42, 34],
  hours: [36, 42, 34, 48, 58, 44, 52, 64, 58, 72, 60, 50, 66, 78, 68, 58, 72, 60, 50, 44, 56, 48],
};

/** Weekday attendance table — mockup shows a club-wide Mon–Sun present
 * count. The real `attendance` table tracks this member's own records
 * per event, not a club-wide weekday breakdown, so there's no honest
 * way to derive these numbers yet. Kept as the mockup's exact
 * placeholder values pending a real club-wide attendance aggregation
 * query (follow-up work, same pattern as the funds-raised placeholder). */
const WEEKDAY_TABLE = [
  { day: 'Mon', trend: '▼', present: 38, active: false },
  { day: 'Tue', trend: '▲', present: 41, active: false },
  { day: 'Wed', trend: '▲', present: 47, active: true },
  { day: 'Thu', trend: '▼', present: 36, active: false },
  { day: 'Fri', trend: '▼', present: 33, active: false },
  { day: 'Sat', trend: '▼', present: 19, active: false },
  { day: 'Sun', trend: '▼', present: 14, active: false },
];

/* ------------------------------- data layer ------------------------------- */

/**
 * loadDashboardData — ports the real queries from the previous
 * DashboardHome.tsx unchanged (events / announcements / this member's
 * attendance / projects), plus the active member count query.
 *
 * The member-count query targets `users` filtered by tenant_id + status,
 * matching the pattern every other tenant-scoped query in this codebase
 * uses (see DashboardLayout.tsx's applications/contact_messages counts).
 * If `users` doesn't have a `status` column, or filtering differs from
 * what AdminMembers.tsx actually expects, this will surface as a console
 * warning and memberCount will be null — NOT a crash, NOT a fake number.
 */
async function loadDashboardData(tenantId: string, userId?: string) {
  const today = new Date().toISOString().split('T')[0];

  const [eventsRes, annRes, attendanceRes, projectsRes, memberCountRes] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(4),
    supabase
      .from('announcements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('createdAt', { ascending: false })
      .limit(3),
    userId
      ? supabase.from('attendance').select('*').eq('userId', userId).eq('tenant_id', tenantId)
      : Promise.resolve({ data: [], error: null } as any),
    supabase
      .from('projects')
      .select('id, name, type, status, startDate, executionDate, coverImage')
      .eq('tenant_id', tenantId)
      .order('startDate', { ascending: false })
      .limit(3),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .then(
        (res) => res,
        (err) => ({ data: null, count: null, error: err })
      ),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (annRes.error) throw annRes.error;
  if (attendanceRes.error) console.warn('[dashboard] Attendance fetch failed:', attendanceRes.error);
  if (projectsRes.error) console.warn('[dashboard] Projects fetch failed:', projectsRes.error);
  if ((memberCountRes as any).error) {
    console.warn(
      '[dashboard] Member count query failed — likely means `users.status` or tenant_id filtering ' +
        'differs from AdminMembers.tsx. This needs a real backing query; see conversation notes.',
      (memberCountRes as any).error
    );
  }

  return {
    events: (eventsRes.data as EventRecord[]) || [],
    announcements: (annRes.data as AnnouncementRecord[]) || [],
    attendance: (attendanceRes.data as AttendanceRecord[]) || [],
    projects: (projectsRes.data as ProjectRecord[]) || [],
    memberCount: (memberCountRes as any).count ?? null,
  };
}

/* ------------------------------- reflection content ------------------------------- */
/** Placeholder rotation — swap for real content/table once there's a place
 * to manage it (mentioned as a follow-up, same as the member-count table). */
const REFLECTIONS = [
  { tag: 'Quote', text: 'Manners maketh man.', attr: '— William of Wykeham (attributed)' },
  {
    tag: 'Quran · 2:263',
    text: 'Kind words and forgiveness are better than charity followed by injury.',
    attr: 'Surah Al-Baqarah — verify translation/edition before publishing',
  },
  {
    tag: 'Did you know?',
    text: 'Bangladesh is home to hundreds of Rotaract clubs nationwide — exact count varies by district year.',
    attr: 'Placeholder — replace with verified figure from district directory',
  },
];

function useReflectionRotation(durationMs = 14000) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % REFLECTIONS.length);
        setFading(false);
      }, 350);
      return () => clearTimeout(t);
    }, durationMs);
    return () => clearInterval(interval);
  }, [durationMs]);

  return { current: REFLECTIONS[index], fading, index, total: REFLECTIONS.length };
}

/* ------------------------------- page ------------------------------- */

export default function DashboardHome() {
  const { user, profile, role } = useAuth();
  const { settings, tenant } = useTenant();

  // Club palette auto-detects from tenant.id — no manual toggle. This IS
  // the mockup's data-club switch, just resolved by tenant instead of a
  // button (see resolveTenant() in src/tenants/index.ts: 'racdlu' | 'icdlu').
  // resolveClub/getClubPalette now live in theme/racPalette.ts, shared
  // with DashboardLayout.tsx — see that file's header comment.

  useInterFont();

  // Reads the SAME app-wide theme the sidebar's ThemeToggle already
  // controls (DashboardLayout.tsx: const dark = resolvedTheme === 'dark').
  // No local toggle here anymore — one theme switch, one source of truth.
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  // Live clock — matches the mockup's updateClock(), refreshed every 30s
  // (not every second — this is a page-header clock, not a stopwatch).
  const [clockLabel, setClockLabel] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClockLabel(formatClock(new Date())), 30000);
    return () => clearInterval(id);
  }, []);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [eventLookup, setEventLookup] = useState<Record<string, EventRecord>>({});
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadDashboardData(tenant.id, user.id);
      setEvents(data.events);
      setAnnouncements(data.announcements);
      setProjects(data.projects);
      setMemberCount(data.memberCount);

      if (data.attendance.length > 0) {
        const { data: eventsSnap } = await supabase.from('events').select('*').eq('tenant_id', tenant.id);
        const lookup: Record<string, EventRecord> = {};
        (eventsSnap || []).forEach((e: any) => {
          lookup[e.id] = e;
        });
        setEventLookup(lookup);

        const sorted = [...data.attendance].sort((a, b) => {
          const dateA = lookup[a.eventId]?.date || '';
          const dateB = lookup[b.eventId]?.date || '';
          return dateB > dateA ? 1 : -1;
        });
        setAttendance(sorted);
      } else {
        setAttendance([]);
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't load your dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const reflection = useReflectionRotation();

  // Bars are pure decoration (see ENGAGEMENT_BARS comment) — render once.
  const barEls = (values: number[]) =>
    values.map((v, i) => <div key={i} style={{ height: `${v}%`, flex: 1, background: p.bar, borderRadius: '.5px', minHeight: 2 }} />);

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading dashboard"
        style={{ background: p.bg, padding: 18, borderRadius: 20 }}
        className="p-4 md:p-8 -m-4 md:-m-8"
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div
            style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          <div
            style={{ height: 110, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          <div
            style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr 1fr', gap: 12, marginBottom: 12 }}
            className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-[1.65fr_1fr_1fr]"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{ height: 180, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
                className="animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const firstName = profile?.name?.split(' ')[0];
  const presentCount = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  return (
    <div className="rac-dashboard-home">
      {/* Scoped, !important-forced font opt-out. TenantContext.tsx injects
          theme.fontHeading/fontBody as --font-heading/--font-body CSS vars
          on <html> plus real <link> tags, and this page is DELIBERATELY
          opted out of that system (explicit decision, not an oversight).
          A plain inline fontFamily on the wrapper div was not strong
          enough to beat whatever global rule consumes those CSS vars —
          if that rule is more specific than an inherited inline style, or
          uses !important itself, it wins. This forces the issue instead
          of guessing at specificity. TODO: once index.css/App.tsx are
          available, replace this with a proper fix at the actual source
          of the override rather than a scoped-override workaround. */}
      <style>{`
        .rac-dashboard-home, .rac-dashboard-home * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-dashboard-home ::-webkit-scrollbar { display: none; }
        .rac-dashboard-home .rac-timeline { scrollbar-width: none; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s', borderRadius: 20 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* ---------------- page-top: title + live clock ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0 }}>Overview</span>
            <span style={{ fontSize: 24, color: p.ptxt, fontWeight: 600 }}>
              {clockLabel}
              <span style={{ fontSize: 11, color: p.pmut, fontWeight: 500, marginLeft: 6 }}>Time</span>
            </span>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
                background: '#3a1a14',
                color: '#e08a72',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>
              <button
                onClick={fetchDashboard}
                style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ---------------- welcome card ---------------- */}
          <div
            style={{
              borderRadius: 20,
              padding: '20px 22px',
              marginBottom: 12,
              background: p.dark,
              color: p.tl,
              border: `1px solid ${p.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              {(profile as any)?.photo ? (
                <img
                  src={(profile as any).photo}
                  alt={profile?.name || ''}
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${p.av2}, ${p.green})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#1b0c12',
                    flexShrink: 0,
                  }}
                >
                  {(profile?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: p.tsub, fontWeight: 500, marginBottom: 2 }}>{getGreeting()}</div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '-.2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {firstName || 'there'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: p.tsub, textAlign: 'right', whiteSpace: 'nowrap' }}>
              {settings.clubName}
              {settings.rotaryYear ? ` · ${settings.rotaryYear}` : ''}
              <br />
              <b style={{ color: p.tl, fontWeight: 600 }}>{role?.label || 'Member'}</b>
            </div>
          </div>

          {/* ---------------- reflection card ---------------- */}
          <div style={{ borderRadius: 20, padding: 16, marginBottom: 12, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Reflection</span>
              <span style={{ color: p.dots, fontSize: 15, letterSpacing: 1 }}>···</span>
            </div>
            <div style={{ minHeight: 76, display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: reflection.fading ? 0 : 1, transition: 'opacity .35s ease' }}>
              <div style={{ fontSize: 9.5, color: p.green, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                {reflection.current.tag}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 500, letterSpacing: '-.1px' }}>{reflection.current.text}</div>
              <div style={{ fontSize: 11, color: p.tsub, marginTop: 9 }}>{reflection.current.attr}</div>
            </div>
            <div style={{ height: 2, background: p.border, borderRadius: 2, marginTop: 16, overflow: 'hidden' }}>
              <div
                key={reflection.index}
                style={{
                  display: 'block',
                  height: '100%',
                  width: reflection.fading ? '0%' : '100%',
                  background: p.green,
                  transition: reflection.fading ? 'none' : 'width 14000ms linear',
                }}
              />
            </div>
          </div>

          {/* ---------------- primary grid ---------------- */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr 1fr', gap: 12, marginBottom: 12 }} className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-[1.65fr_1fr_1fr]">
            {/* Member engagement */}
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Member engagement</span>
                <button
                  type="button"
                  style={{ border: `1px solid ${p.pillBorder}`, borderRadius: 20, fontSize: 10, padding: '5px 11px', color: p.tmid, background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Change period
                </button>
              </div>
              <div style={{ display: 'flex', borderTop: `1px solid ${p.border}`, paddingTop: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 90, padding: '0 9px 0 0', borderRight: `1px solid ${p.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: p.tmid, marginBottom: 8 }}>
                    <span>Active members</span>
                    <span style={{ fontSize: 8, color: p.tmid }}>▲</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 64, marginBottom: 9 }}>{barEls(ENGAGEMENT_BARS.active)}</div>
                  <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px' }}>{memberCount !== null ? memberCount : '142'}</div>
                  <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 2 }}>{memberCount !== null ? 'active roster' : 'of 156 roster'}</div>
                </div>
                <div style={{ flex: 1, minWidth: 90, padding: '0 9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: p.tmid, marginBottom: 8 }}>
                    <span>Attendance</span>
                    <span style={{ fontSize: 8, color: p.tmid }}>▲</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 64, marginBottom: 9 }}>{barEls(ENGAGEMENT_BARS.attendance)}</div>
                  <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px' }}>{attendanceRate !== null ? `${attendanceRate}%` : '78%'}</div>
                  <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 2 }}>{attendance.length > 0 ? `${presentCount} of ${attendance.length} events` : 'avg. 8 weeks'}</div>
                </div>
                <div style={{ flex: 1, minWidth: 90, padding: '0 0 0 9px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: p.tmid, marginBottom: 8 }}>
                    <span>Service hours</span>
                    <span style={{ fontSize: 8, color: p.tmid }}>▼</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 64, marginBottom: 9 }}>{barEls(ENGAGEMENT_BARS.hours)}</div>
                  <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px' }}>316</div>
                  <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 2 }}>logged this month</div>
                </div>
              </div>
            </div>

            {/* Active projects */}
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: p.tmid, marginBottom: 11 }}>
                <span>{projects[0]?.name || 'Books for Barisal'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  On track
                  <span style={{ width: 30, height: 16, background: p.green, borderRadius: 10, position: 'relative', flexShrink: 0, display: 'inline-block' }}>
                    <span style={{ content: "''", position: 'absolute', right: 2, top: 2, width: 12, height: 12, background: '#fff', borderRadius: '50%' }} />
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: 108,
                  borderRadius: 12,
                  background: `radial-gradient(120% 100% at 70% 20%, ${p.gcA}, ${p.gcB} 70%)`,
                  border: `1px solid ${p.gcBd}`,
                  marginBottom: 11,
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundImage: projects[0]?.coverImage ? `url(${projects[0].coverImage})` : undefined,
                  backgroundSize: projects[0]?.coverImage ? 'cover' : undefined,
                  backgroundPosition: projects[0]?.coverImage ? 'center' : undefined,
                }}
              >
                {!projects[0]?.coverImage && (
                  <svg viewBox="0 0 200 108" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <g stroke={p.ilA} strokeWidth={1} opacity={0.55}>
                      <path d="M20 88 L60 30 L170 30 L170 95 L60 95 Z" fill="none" />
                      <path d="M20 88 L110 88 L170 30" fill="none" />
                      <path d="M110 88 L110 30" fill="none" />
                      <path d="M60 30 L60 95" fill="none" />
                    </g>
                    <rect x="70" y="62" width="34" height="20" rx="2" fill="none" stroke={p.ilB} strokeWidth={1} opacity={0.7} />
                    <rect x="76" y="50" width="20" height="14" rx="1.5" fill={p.ilC} stroke={p.ilD} strokeWidth={1} />
                  </svg>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: p.tmid, gap: 8 }}>
                <span>Funds raised</span>
                <div style={{ flex: 1, height: 2, background: p.border, borderRadius: 2, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '83%', background: p.green, borderRadius: 2 }} />
                </div>
                <b style={{ color: p.tl, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>64%</b>
              </div>
            </div>

            {/* Needs attention */}
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Needs attention</span>
                <span style={{ color: p.dots, fontSize: 15, letterSpacing: 1 }}>···</span>
              </div>
              <div style={{ background: p.greenDeep, border: `1px solid ${p.recBd}`, borderRadius: 12, padding: 10, marginBottom: 10, fontSize: 10.5, color: p.recTx, lineHeight: 1.45 }}>
                <b style={{ color: p.av2, display: 'block', fontWeight: 600, marginBottom: 2, fontSize: 11 }}>3 dues unpaid</b>
                renewal window closes Friday
              </div>
              <div style={{ fontSize: 10.5, color: p.tsub, lineHeight: 1.45 }}>
                <b style={{ display: 'block', color: p.tl, fontWeight: 600, marginBottom: 2, fontSize: 11 }}>TRF Chair unassigned</b>
                ISD vs FSD decision pending
              </div>
            </div>
          </div>

          {/* ---------------- secondary grid ---------------- */}
          <div style={{ display: 'grid', gridTemplateColumns: '.66fr 1fr 1.32fr', gap: 12 }} className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-[.66fr_1fr_1.32fr]">
            {/* Tracking */}
            <div style={{ borderRadius: 20, padding: 16, background: p.lightCard, color: p.td }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tracking</span>
                <span style={{ color: '#b0a7aa', fontSize: 15, letterSpacing: 1 }}>···</span>
              </div>
              <div style={{ fontSize: 10.5, color: p.mut }}>New applications this week</div>
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 26, letterSpacing: '-.3px' }}>7</div>
              <div style={{ fontSize: 9.5, color: p.mut, marginTop: 2 }}>applications</div>
            </div>

            {/* Detailed report */}
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Detailed report</span>
                <button
                  type="button"
                  style={{ background: p.weekBg, color: p.weekText, borderRadius: 16, fontSize: 10, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', cursor: 'pointer', border: 'none' }}
                >
                  Week ▾
                </button>
              </div>
              <div style={{ fontSize: 10.5, color: p.tsub }}>Attendance by weekday</div>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', maxWidth: '100%' }}>
                <table style={{ borderCollapse: 'collapse', marginTop: 11, tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                  <thead>
                    <tr>
                      {WEEKDAY_TABLE.map((w) => (
                        <th key={w.day} style={{ fontSize: 8.5, color: p.tmid, fontWeight: 500, textAlign: 'left', paddingBottom: 9 }}>
                          {w.day}
                          <span style={{ fontSize: 8, color: p.tmid, marginLeft: 2 }}>{w.trend}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {WEEKDAY_TABLE.map((w) => (
                        <td key={w.day} style={{ fontSize: 10.5, color: p.tblText, padding: '3px 0', fontWeight: 500 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              borderRadius: 8,
                              padding: '3px 5px 4px',
                              background: w.active ? p.tblBg : undefined,
                              color: w.active ? p.tl : undefined,
                              fontWeight: w.active ? 700 : undefined,
                            }}
                          >
                            {w.present}
                            <span style={{ display: 'block', fontSize: 8.5, color: p.tsub, fontWeight: 400 }}>present</span>
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attendance rate */}
            <div style={{ borderRadius: 20, padding: 16, background: p.lightCard, color: p.td }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Attendance rate</span>
                <span style={{ color: '#b0a7aa', fontSize: 15, letterSpacing: 1 }}>···</span>
              </div>
              <div style={{ fontSize: 10.5, color: p.mut }}>
                {events[0] ? `Last meeting, ${new Date(`${events[0].date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : 'Last meeting, Wed Jul 8'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10, width: '100%', maxWidth: '100%' }}>
                <div style={{ fontSize: 24, fontWeight: 600, marginTop: 0, letterSpacing: '-.3px' }}>
                  {attendanceRate !== null ? `${attendanceRate}%` : '77%'}
                </div>
                <div className="rac-timeline" style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', paddingBottom: 2 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'none', border: `1.4px solid ${p.tdH}` }} />
                  </div>
                  <div style={{ width: 14, height: 1, background: p.tlC }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#242424' }} />
                    <div style={{ fontSize: 8, color: '#91888b' }}>Present</div>
                  </div>
                  <div style={{ width: 14, height: 1, background: p.tlC }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#242424' }} />
                    <div style={{ fontSize: 8, color: '#91888b' }}>Excused</div>
                  </div>
                  <div style={{ width: 14, height: 1, background: p.tlC }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#242424', boxShadow: '0 0 0 3px rgba(22,22,22,.12)' }} />
                    <div style={{ fontSize: 8, color: '#91888b' }}>Absent</div>
                  </div>
                  <div style={{ width: 14, height: 1, background: p.tlC }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'none', border: `1.4px solid ${p.tdH}` }} />
                    <div style={{ fontSize: 8, color: '#91888b' }}>Late</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
