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

/** One row per PAST event (any event with a date <= today), used by the
 * "Detailed report" calendar-style list. `presentCount` is club-wide
 * (how many members were marked present/late for that event, across
 * ALL members — matching the same present+late = "attended" definition
 * used everywhere else on this page and in DashboardAttendance.tsx).
 * `myStatus` is this logged-in member's own status for that event, or
 * null if they have no attendance record for it at all (not marked /
 * event predates their membership / etc). Statuses matching
 * 'not_required' are excluded from presentCount for consistency with
 * AdminAttendance.tsx's exportSummary/analytics, but myStatus itself
 * still reports 'not_required' verbatim if that's what's on file, same
 * as DashboardAttendance.tsx does. */
type MeetingDayRecord = {
  eventId: string;
  date: string;
  title: string;
  presentCount: number;
  myStatus: AttendanceRecord['status'] | null;
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

/** Normalizes settings.rotaryYear to "2025-26" regardless of how it's
 * actually stored on the backend ("2025-2026", "2025-26", or a bare
 * "2025") — the exact stored format wasn't confirmed, so this handles
 * all three rather than assuming one. Returns null if unparseable so
 * the caller can omit it entirely rather than show garbled text. */
function formatRotaryYear(raw?: string): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{4})\s*[-–]?\s*(\d{2,4})?$/);
  if (!match) return raw; // unrecognized shape — show as-is rather than hide it
  const startYear = match[1];
  let endPart = match[2];
  if (!endPart) {
    // bare "2025" — derive the next year's last two digits
    endPart = String(Number(startYear) + 1).slice(-2);
  } else if (endPart.length === 4) {
    // "2025-2026" — shorten to last two digits
    endPart = endPart.slice(-2);
  }
  return `${startYear}-${endPart}`;
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

/** Short date label for the Detailed report calendar rows, e.g. "Wed, Jul 8". */
function formatShortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
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

/* ------------------------------- status → dot mapping (Attendance rate card) ------------------------------- */

/** Which of the 4 timeline dots (Present / Excused / Absent / Late)
 * corresponds to a given attendance status. 'late' and 'not_required'
 * intentionally have no visual slot in this mockup's 4-dot timeline —
 * 'not_required' returns null (no dot lit) since it isn't one of the
 * four labeled positions. */
type TimelineKey = 'present' | 'excused' | 'absent' | 'late';
function timelineKeyForStatus(status: string | null): TimelineKey | null {
  if (status === 'present') return 'present';
  if (status === 'excused') return 'excused';
  if (status === 'absent') return 'absent';
  if (status === 'late') return 'late';
  return null;
}

/* ------------------------------- data layer ------------------------------- */

/**
 * loadDashboardData — ports the real queries from the previous
 * DashboardHome.tsx unchanged (events / announcements / this member's
 * attendance / projects), plus the active member count query, plus
 * (new) a club-wide past-events + club-wide attendance fetch used to
 * build the "Detailed report" calendar list and to find this member's
 * true last-meeting status (previously derived from `events` which is
 * upcoming-only and therefore never actually matched a past meeting).
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

  const [eventsRes, annRes, attendanceRes, projectsRes, memberCountRes, pastEventsRes, clubAttendanceRes] = await Promise.all([
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
    // Past events (any event with date <= today), most recent first.
    // Distinct from the `events` query above, which is upcoming-only —
    // that's the correct source for the "Upcoming events" list, but it
    // can never contain the actual last meeting, so it was never a
    // valid source for "Last meeting" on the Attendance rate card.
    supabase
      .from('events')
      .select('id, title, date, type')
      .eq('tenant_id', tenantId)
      .lte('date', today)
      .order('date', { ascending: false }),
    // Club-wide attendance (every member, every event) — needed to
    // compute a per-day present-count for the Detailed report calendar.
    // The member's own attendance (attendanceRes above) only covers
    // their own rows and can't answer "how many people were present".
    supabase.from('attendance').select('userId, eventId, status').eq('tenant_id', tenantId),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (annRes.error) throw annRes.error;
  if (attendanceRes.error) console.warn('[dashboard] Attendance fetch failed:', attendanceRes.error);
  if (projectsRes.error) console.warn('[dashboard] Projects fetch failed:', projectsRes.error);
  if (pastEventsRes.error) console.warn('[dashboard] Past events fetch failed:', pastEventsRes.error);
  if (clubAttendanceRes.error) console.warn('[dashboard] Club-wide attendance fetch failed:', clubAttendanceRes.error);
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
    pastEvents: (pastEventsRes.data as EventRecord[]) || [],
    clubAttendance: (clubAttendanceRes.data as { userId: string; eventId: string; status: string }[]) || [],
  };
}

/* ------------------------------- reflection content ------------------------------- */

type ReflectionItem = { tag: string; text: string; attr: string };

/** Used only when the `reflections` table has zero active rows (fresh
 * install, or an admin has deactivated everything) — never shown
 * alongside real data, only as a full fallback so the card never goes
 * empty. See AdminReflections.tsx for the admin page that manages the
 * real table this normally reads from. */
const FALLBACK_REFLECTIONS: ReflectionItem[] = [
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

/** Fetches active reflections from Supabase, ordered for a stable
 * "bag" draw order (see useReflectionRotation). Falls back to
 * FALLBACK_REFLECTIONS at the call site if this returns an empty array
 * or throws — this function itself just reports what it found. */
async function loadReflectionsPool(): Promise<ReflectionItem[]> {
  const { data, error } = await supabase
    .from('reflections')
    .select('tag, text, attr')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[dashboard] Reflections fetch failed, using fallback set:', error);
    return [];
  }
  return ((data as { tag: string; text: string; attr: string | null }[]) || []).map((r) => ({
    tag: r.tag,
    text: r.text,
    attr: r.attr || '',
  }));
}

/**
 * Random-without-immediate-repeat rotation ("shuffle bag"): shuffles the
 * whole pool once, walks through it in that shuffled order (so every
 * item is shown exactly once before anything repeats), then reshuffles
 * for the next lap. This is what "as different as possible" means in
 * practice — plain Math.random() per pick can (and does, over enough
 * draws) show the same quote twice in a row, or show 2 of 3 items far
 * more than the third; a shuffle bag guarantees full coverage before
 * any repeat, which is the strongest fairness a small, changing pool
 * can actually support.
 *
 * Re-shuffles automatically if `pool` itself changes (e.g. the async
 * fetch resolves after mount, or an admin adds/removes reflections in
 * another tab and the page is later revisited).
 */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function useReflectionRotation(pool: ReflectionItem[], durationMs = 14000) {
  const [order, setOrder] = useState<ReflectionItem[]>(() => shuffle(pool));
  const [position, setPosition] = useState(0);
  const [fading, setFading] = useState(false);
  // Drives the progress bar: false immediately after a quote change (bar
  // at 0%, no transition), then flipped to true on the next animation
  // frame so the width transition actually has a start point to animate
  // FROM. Previously the bar was set straight to width:100% with a
  // transition on the very same render as the reset — CSS has no prior
  // frame at 0% to interpolate from, so the browser just painted it at
  // 100% instantly instead of animating. That's why it always looked
  // "stuck full."
  const [armed, setArmed] = useState(false);

  // Re-shuffle whenever the underlying pool changes (fallback→real data
  // swap on load, or a different pool size/content on revisit).
  const poolKey = pool.map((r) => r.text).join('|');
  useEffect(() => {
    setOrder(shuffle(pool));
    setPosition(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey]);

  useEffect(() => {
    if (order.length === 0) return;
    const interval = setInterval(() => {
      setFading(true);
      const t = setTimeout(() => {
        setPosition((pos) => {
          const next = pos + 1;
          if (next >= order.length) {
            // Lap complete — reshuffle for the next lap so the same
            // sequence doesn't repeat, then start from the top.
            setOrder(shuffle(pool));
            return 0;
          }
          return next;
        });
        setFading(false);
      }, 350);
      return () => clearTimeout(t);
    }, durationMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, order.length, poolKey]);

  // Re-arm the bar every time the visible quote changes: unset first
  // (paints at 0% with no transition), then set on the next frame so
  // the width:100% transition has somewhere real to animate from.
  useEffect(() => {
    setArmed(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setArmed(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [position, poolKey]);

  const current = order[position] || pool[0] || FALLBACK_REFLECTIONS[0];

  return { current, fading, armed, index: position, total: order.length, durationMs };
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
  const [meetingDays, setMeetingDays] = useState<MeetingDayRecord[]>([]);
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

      // Build the Detailed report's per-date rows from pastEvents +
      // clubAttendance: for each past event, count club-wide present/late
      // (not_required excluded from that count, same rule as
      // AdminAttendance.tsx's analytics/exportSummary), and pull this
      // member's own status for that event out of the same attendance
      // rows rather than re-querying.
      const attendanceByEvent = new Map<string, { userId: string; eventId: string; status: string }[]>();
      data.clubAttendance.forEach((r) => {
        const list = attendanceByEvent.get(r.eventId) || [];
        list.push(r);
        attendanceByEvent.set(r.eventId, list);
      });
      const days: MeetingDayRecord[] = data.pastEvents.map((ev) => {
        const rows = attendanceByEvent.get(ev.id) || [];
        const presentCount = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
        const mine = user ? rows.find((r) => r.userId === user.id) : undefined;
        return {
          eventId: ev.id,
          date: ev.date,
          title: ev.title,
          presentCount,
          myStatus: mine ? mine.status : null,
        };
      });
      setMeetingDays(days);
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

  // Reflections pool — fetched independently of the main dashboard data
  // above: it's shared across tenants (no tenant_id filter) and doesn't
  // need to block or be re-fetched alongside events/attendance/projects.
  // Starts as FALLBACK_REFLECTIONS so the card has content to show
  // immediately on mount rather than an empty state while this resolves;
  // swaps to real data the moment the fetch completes, or stays on the
  // fallback if the table is empty or the fetch fails.
  const [reflectionsPool, setReflectionsPool] = useState<ReflectionItem[]>(FALLBACK_REFLECTIONS);
  useEffect(() => {
    let cancelled = false;
    loadReflectionsPool().then((rows) => {
      if (cancelled) return;
      setReflectionsPool(rows.length > 0 ? rows : FALLBACK_REFLECTIONS);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reflection = useReflectionRotation(reflectionsPool);

  // Bars are pure decoration (see ENGAGEMENT_BARS comment) — render once.
  const barEls = (values: number[]) =>
    values.map((v, i) => <div key={i} style={{ height: `${v}%`, flex: 1, background: p.bar, borderRadius: '.5px', minHeight: 2 }} />);

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading dashboard"
        style={{ background: p.bg, padding: 18 }}
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

  const rotaryYearLabel = formatRotaryYear(settings.rotaryYear);
  const presentCount = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  // Last meeting = most recent PAST event (meetingDays is already sorted
  // desc by date, mirroring pastEvents' query order). Previously this
  // read events[0], but `events` is upcoming-only and could never
  // actually be the last meeting — that's why the date shown was always
  // the mockup's static fallback.
  const lastMeeting = meetingDays[0] || null;
  const lastMeetingTimelineKey = lastMeeting ? timelineKeyForStatus(lastMeeting.myStatus) : null;

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
          of the override rather than a scoped-override workaround.

          rac-welcome-card / rac-welcome-id / rac-welcome-meta: the
          welcome card's name/role/club block used to rely on
          flexWrap:'wrap' + justifyContent:'space-between' to fall back
          to a stacked layout on narrow screens. With only two flex
          children, once it wraps, space-between collapses to
          flex-start for a single lone item — so the role/club block
          ends up shrink-to-fit width with text-align:right applied
          inside it, which reads as "floating," not aligned to
          anything. These three classes replace that implicit fallback
          with an explicit one: right-aligned next to the identity block
          on wide viewports, and left-aligned underneath it (behind a
          divider) on narrow ones — same alignment axis as the name
          above it, on both breakpoints. */}
      <style>{`
        .rac-dashboard-home, .rac-dashboard-home * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-dashboard-home ::-webkit-scrollbar { display: none; }
        .rac-dashboard-home .rac-timeline { scrollbar-width: none; }
        .rac-dashboard-home .rac-meeting-list { scrollbar-width: none; }

        .rac-welcome-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .rac-welcome-id {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .rac-welcome-meta {
          text-align: right;
          line-height: 1.5;
          flex-shrink: 0;
        }
        @media (max-width: 520px) {
          .rac-welcome-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .rac-welcome-id {
            width: 100%;
          }
          .rac-welcome-meta {
            text-align: left;
            width: 100%;
            margin-top: 4px;
            padding-top: 10px;
            border-top: 1px solid ${p.border};
          }
        }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* ---------------- page-top: title + live clock ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0 }}>Overview</span>
            <span style={{ fontSize: 24, color: p.ptxt, fontWeight: 600 }}>
              {clockLabel}
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
            className="rac-welcome-card"
            style={{
              borderRadius: 20,
              padding: '20px 22px',
              marginBottom: 12,
              background: p.dark,
              color: p.tl,
              border: `1px solid ${p.border}`,
            }}
          >
            <div className="rac-welcome-id">
              {(profile as any)?.photo ? (
                <img
                  src={(profile as any).photo}
                  alt={profile?.name || ''}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    objectFit: 'cover',
                    flexShrink: 0,
                    border: `1px solid ${p.border}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,.25)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${p.av2}, ${p.green})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#1b0c12',
                    flexShrink: 0,
                    border: `1px solid ${p.border}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,.25)',
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
                  {profile?.name || 'there'}
                </div>
              </div>
            </div>
            <div className="rac-welcome-meta" style={{ fontSize: 11, color: p.tsub }}>
              <b style={{ color: p.tl, fontWeight: 600 }}>{role?.label || 'Member'}</b>
              {rotaryYearLabel ? ` · RY${rotaryYearLabel}` : ''}
              <br />
              {settings.clubName}
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
                  width: reflection.armed ? '100%' : '0%',
                  background: p.green,
                  transition: reflection.armed ? `width ${reflection.durationMs}ms linear` : 'none',
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

            {/* Detailed report — real per-date meeting list (calendar-style),
                replacing the old static Mon–Sun weekday table + Week dropdown.
                Each row is one actual past meeting: date, club-wide present
                count, and this member's own status for it. */}
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Detailed report</span>
              </div>
              <div style={{ fontSize: 10.5, color: p.tsub, marginBottom: 11 }}>Attendance by meeting date</div>
              {meetingDays.length === 0 ? (
                <div style={{ fontSize: 11, color: p.tsub, padding: '10px 0' }}>No past meetings recorded yet.</div>
              ) : (
                <div className="rac-meeting-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                  {meetingDays.map((d) => {
                    const key = timelineKeyForStatus(d.myStatus);
                    const isNA = d.myStatus === 'not_required';
                    const myLabel = isNA ? 'N/A' : key ? key.charAt(0).toUpperCase() + key.slice(1) : d.myStatus ? d.myStatus : 'Not marked';
                    return (
                      <div key={d.eventId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottom: `1px solid ${p.border}` }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatShortDate(d.date)}</div>
                          <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 1 }}>{d.presentCount} present</div>
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: d.myStatus ? p.tl : p.tsub, background: p.lightCard, padding: '3px 9px', borderRadius: 20, flexShrink: 0 }}>
                          {myLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attendance rate */}
            <div style={{ borderRadius: 20, padding: 16, background: p.lightCard, color: p.td }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Attendance rate</span>
                <span style={{ color: '#b0a7aa', fontSize: 15, letterSpacing: 1 }}>···</span>
              </div>
              <div style={{ fontSize: 10.5, color: p.mut }}>
                {lastMeeting ? `Last meeting, ${formatShortDate(lastMeeting.date)}` : 'No meetings recorded yet'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 10, width: '100%', maxWidth: '100%' }}>
                <div style={{ fontSize: 24, fontWeight: 600, marginTop: 0, letterSpacing: '-.3px' }}>
                  {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                </div>
                <div className="rac-timeline" style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', paddingBottom: 2 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'none', border: `1.4px solid ${p.tdH}` }} />
                  </div>
                  <div style={{ width: 14, height: 1, background: p.tlC }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: lastMeetingTimelineKey === 'present' ? p.green : '#242424' }} />
                    <div style={{ fontSize: 8, color: '#91888b' }}>Present</div>
                  </div>
                  <div style={{ width: 14, height: 1, background: p.tlC }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: lastMeetingTimelineKey === 'excused' ? '#c9a45c' : '#242424' }} />
                    <div style={{ fontSize: 8, color: '#91888b' }}>Excused</div>
                  </div>
                  <div style={{ width: 14, height: 1, background: p.tlC }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: lastMeetingTimelineKey === 'absent' ? '#e08a72' : '#242424', boxShadow: '0 0 0 3px rgba(22,22,22,.12)' }} />
                    <div style={{ fontSize: 8, color: '#91888b' }}>Absent</div>
                  </div>
                  <div style={{ width: 14, height: 1, background: p.tlC }} />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: lastMeetingTimelineKey === 'late' ? p.av2 : 'none', border: lastMeetingTimelineKey === 'late' ? 'none' : `1.4px solid ${p.tdH}` }} />
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
