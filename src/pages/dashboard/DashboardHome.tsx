import { supabase } from '../../supabase';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { Link } from 'react-router-dom';

/**
 * ------------------------------------------------------------------
 * Visual identity — DELIBERATELY FIXED, does not read theme.accent /
 * theme.fontHeading / theme.fontBody. This page has its own hardcoded
 * dark/green identity regardless of what a tenant admin configures in
 * AdminTheme. This is an explicit decision, not an oversight — every
 * other page in the app respects per-tenant theming; this one doesn't.
 * ------------------------------------------------------------------
 */
const GOLD_ACCENT = '#8fd67a'; // kept the mockup's name for the token but this IS the accent
const PALETTE = {
  light: {
    bg: '#d5dbd4',
    navLink: '#4a4f4a',
    navActive: '#101210',
    ptxt: '#161616',
    pmut: '#8a8f89',
    dark: '#171717',
    tl: '#eee',
    lightCard: '#dfe8db', // measured from reference screenshot, not guessed
    td: '#161616',
    mut: '#727b6d',
    border: '#292929',
    pillBorder: '#3a3a3a',
    bar: 'rgba(255,255,255,.92)',
    dots: '#7a7a7a',
    tmid: '#9a9a9a',
    tsub: '#8f8f8f',
    tblBg: '#292929',
    tblText: '#c9c9c9',
    green: GOLD_ACCENT,
    greenDeep: '#152016',
  },
  dark: {
    bg: '#0a0a0a',
    navLink: '#9aa09a',
    navActive: '#f2f2ef',
    ptxt: '#f2f2ef',
    pmut: '#83887f',
    dark: '#161616',
    tl: '#eee',
    lightCard: '#1c2119', // dark-mode override, contrast-checked (13.2:1 / 5.28:1)
    td: '#e4e8e0',
    mut: '#8f9489',
    border: '#262626',
    pillBorder: '#333',
    bar: 'rgba(255,255,255,.92)',
    dots: '#7a7a7a',
    tmid: '#9a9a9a',
    tsub: '#8f8f8f',
    tblBg: '#292929',
    tblText: '#c9c9c9',
    green: GOLD_ACCENT,
    greenDeep: '#152016',
  },
};

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
 * Projects card below is rendered as a literal placeholder ("—" plus an
 * inline "(placeholder — no field yet)" label) rather than a real value —
 * see that card's JSX directly for the honest, visible marker. */
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

/* ------------------------------- data layer ------------------------------- */

/**
 * loadDashboardData — ports the real queries from the previous
 * DashboardHome.tsx unchanged (events / announcements / this member's
 * attendance / projects), plus ONE new query: active member count.
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
    // NEW — not present in the old file. Guarded: failure here must not
    // break the rest of the dashboard, since this table/column shape is
    // unverified (flagged to the user, follow-up work planned).
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

  // Local light/dark toggle SCOPED TO THIS PAGE. DashboardLayout already
  // has ThemeToggle wired to the app-wide ThemeContext; this page's visual
  // system is intentionally separate (see PALETTE comment above), so it
  // gets its own small toggle rather than reading resolvedTheme, to avoid
  // implying it's part of the app-wide theme it's explicitly opting out of.
  const [dark, setDark] = useState(false);
  const p = dark ? PALETTE.dark : PALETTE.light;

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
            style={{
              height: 96,
              borderRadius: 20,
              marginBottom: 12,
              background: p.dark,
              border: `1px solid ${p.border}`,
              opacity: 0.5,
            }}
            className="animate-pulse"
          />
          <div
            style={{
              height: 110,
              borderRadius: 20,
              marginBottom: 12,
              background: p.dark,
              border: `1px solid ${p.border}`,
              opacity: 0.5,
            }}
            className="animate-pulse"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr 1fr', gap: 12, marginBottom: 12 }} className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-[1.65fr_1fr_1fr]">
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
  const eventsThisWeek = events.filter((e) => formatEventDate(e.date).label).length;

  const ringSize = 88;
  const ringStroke = 7;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    attendanceRate === null ? ringCircumference : ringCircumference * (1 - attendanceRate / 100);

  return (
    <div
      style={{
        background: p.bg,
        padding: 18,
        transition: 'background .25s',
        fontFamily:
          "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        borderRadius: 20,
      }}
      className="p-4 md:p-8 -m-4 md:-m-8"
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* ---------------- page-top: title + local theme toggle ---------------- */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
            padding: '0 2px',
          }}
        >
          <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>
            Overview
          </span>
          <button
            type="button"
            onClick={() => setDark((v) => !v)}
            aria-label="Toggle dark or light mode"
            style={{
              width: 40,
              height: 22,
              borderRadius: 14,
              border: '1px solid #3a3a3a',
              background: '#1b1b1b',
              position: 'relative',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: dark ? 20 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: p.green,
                transition: 'left .25s ease',
              }}
            />
          </button>
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
                  background: `linear-gradient(135deg, #a8e090, ${p.green})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#0e1a0d',
                  flexShrink: 0,
                }}
              >
                {(profile?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: p.tsub, fontWeight: 500, marginBottom: 2 }}>
                {getGreeting()}
              </div>
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
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            marginBottom: 12,
            background: p.dark,
            color: p.tl,
            border: `1px solid ${p.border}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Reflection</span>
            <span style={{ color: p.dots, fontSize: 15, letterSpacing: 1 }}>···</span>
          </div>
          <div style={{ minHeight: 76, opacity: reflection.fading ? 0 : 1, transition: 'opacity .35s ease' }}>
            <div
              style={{
                fontSize: 9.5,
                color: p.green,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {reflection.current.tag}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 500, letterSpacing: '-.1px' }}>
              {reflection.current.text}
            </div>
            <div style={{ fontSize: 11, color: p.tsub, marginTop: 9 }}>{reflection.current.attr}</div>
          </div>
        </div>

        {/* ---------------- primary grid ---------------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.65fr 1fr 1fr',
            gap: 12,
            marginBottom: 12,
          }}
          className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-[1.65fr_1fr_1fr]"
        >
          {/* Member engagement hero */}
          <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Member engagement</span>
            </div>
            <div style={{ display: 'flex', borderTop: `1px solid ${p.border}`, paddingTop: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 90, padding: '0 9px 0 0', borderRight: `1px solid ${p.border}` }}>
                <div style={{ fontSize: 10, color: p.tmid, marginBottom: 8 }}>Active members</div>
                <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px' }}>
                  {memberCount !== null ? memberCount : '—'}
                </div>
                <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 2 }}>
                  {memberCount !== null ? 'active roster' : 'needs users.status query'}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 90, padding: '0 9px' }}>
                <div style={{ fontSize: 10, color: p.tmid, marginBottom: 8 }}>My attendance</div>
                <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px' }}>
                  {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                </div>
                <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 2 }}>
                  {attendance.length > 0 ? `${presentCount} of ${attendance.length} events` : 'no records yet'}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 90, padding: '0 0 0 9px' }}>
                <div style={{ fontSize: 10, color: p.tmid, marginBottom: 8 }}>Upcoming</div>
                <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px' }}>{events.length}</div>
                <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 2 }}>
                  {eventsThisWeek > 0 ? `${eventsThisWeek} this week` : 'events scheduled'}
                </div>
              </div>
            </div>
          </div>

          {/* Projects */}
          <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Club projects</span>
              <Link to="/dashboard/projects" style={{ color: p.dots, fontSize: 15, letterSpacing: 1, textDecoration: 'none' }}>
                ···
              </Link>
            </div>
            {projects.length === 0 ? (
              <div
                style={{
                  padding: '28px 12px',
                  textAlign: 'center',
                  fontSize: 12,
                  color: p.tsub,
                  border: `1px dashed ${p.border}`,
                  borderRadius: 12,
                }}
              >
                No projects yet.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: p.tmid, marginBottom: 10 }}>{projects[0].name}</div>
                <div
                  style={{
                    height: 90,
                    borderRadius: 12,
                    background: `radial-gradient(120% 100% at 70% 20%, ${p.greenDeep}, #0a120a 70%)`,
                    border: '1px solid #263b26',
                    marginBottom: 10,
                    overflow: 'hidden',
                    backgroundImage: projects[0].coverImage ? `url(${projects[0].coverImage})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: p.tmid, gap: 8 }}>
                  <span>
                    Funds raised{' '}
                    <span style={{ fontSize: 8.5, opacity: 0.7, fontStyle: 'italic' }}>(placeholder — no field yet)</span>
                  </span>
                  <b style={{ color: p.tl, fontSize: 12, fontWeight: 600 }}>—</b>
                </div>
              </>
            )}
          </div>

          {/* Announcements */}
          <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Announcements</span>
              <Link to="/dashboard/announcements" style={{ color: p.dots, fontSize: 15, letterSpacing: 1, textDecoration: 'none' }}>
                ···
              </Link>
            </div>
            {announcements.length === 0 ? (
              <div style={{ fontSize: 12, color: p.tsub, padding: '10px 0' }}>Nothing new right now.</div>
            ) : (
              announcements.slice(0, 2).map((ann, i) => (
                <div
                  key={ann.id}
                  style={{
                    background: i === 0 ? p.greenDeep : 'transparent',
                    border: i === 0 ? '1px solid #26392a' : 'none',
                    borderRadius: 12,
                    padding: i === 0 ? 10 : '10px 0 0',
                    marginBottom: i === 0 ? 10 : 0,
                    fontSize: 10.5,
                    lineHeight: 1.45,
                    color: i === 0 ? '#9fae9c' : p.tsub,
                  }}
                >
                  <b
                    style={{
                      color: i === 0 ? '#a8e090' : p.tl,
                      display: 'block',
                      fontWeight: 600,
                      marginBottom: 2,
                      fontSize: 11,
                    }}
                  >
                    {ann.title}
                  </b>
                  {(ann.body || ann.content || '').slice(0, 90)}
                  {ann.createdAt ? ` · ${timeAgo(ann.createdAt)}` : ''}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ---------------- secondary grid ---------------- */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '.72fr 1.06fr 1.22fr', gap: 12 }}
          className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-[.72fr_1.06fr_1.22fr]"
        >
          {/* Upcoming events count (real, replaces mockup's fake "applications" card) */}
          <div style={{ borderRadius: 20, padding: 16, background: p.lightCard, color: p.td }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Next up</span>
            </div>
            {events.length === 0 ? (
              <div style={{ fontSize: 10.5, color: p.mut }}>No upcoming events</div>
            ) : (
              <>
                <div style={{ fontSize: 10.5, color: p.mut }}>{events[0].title}</div>
                <div style={{ fontSize: 24, fontWeight: 600, marginTop: 14, letterSpacing: '-.3px' }}>
                  {formatEventDate(events[0].date).day}
                </div>
                <div style={{ fontSize: 9.5, color: p.mut, marginTop: 2 }}>
                  {formatEventDate(events[0].date).month}
                  {events[0].time ? ` · ${events[0].time}` : ''}
                </div>
              </>
            )}
          </div>

          {/* This member's recent attendance (replaces mockup's invented club-wide weekday table) */}
          <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>My recent meetings</span>
              <Link to="/dashboard/attendance" style={{ background: '#262626', color: '#cfcfcf', borderRadius: 16, fontSize: 10, padding: '5px 11px', textDecoration: 'none' }}>
                View all
              </Link>
            </div>
            <div style={{ fontSize: 10.5, color: p.tsub, marginBottom: 4 }}>Latest first</div>
            {attendance.length === 0 ? (
              <div style={{ fontSize: 11.5, color: p.tsub, padding: '16px 0' }}>No attendance records yet.</div>
            ) : (
              <div style={{ marginTop: 8 }}>
                {attendance.slice(0, 4).map((record) => {
                  const event = eventLookup[record.eventId];
                  const statusColor =
                    record.status === 'present'
                      ? p.green
                      : record.status === 'late'
                      ? '#e0b34a'
                      : record.status === 'excused'
                      ? '#9a9a9a'
                      : '#c96f5c';
                  return (
                    <div
                      key={record.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '7px 0',
                        borderTop: `1px solid ${p.border}`,
                        fontSize: 11.5,
                      }}
                    >
                      <span style={{ color: p.tblText, fontWeight: 500 }}>
                        {event?.title || 'Club meeting'}
                        {event?.date && (
                          <span style={{ color: p.tsub, fontWeight: 400 }}>
                            {' '}
                            · {new Date(`${event.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </span>
                      <span style={{ color: statusColor, fontWeight: 600, fontSize: 10, textTransform: 'capitalize' }}>
                        {record.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance rate ring — ported directly, this logic already existed and worked */}
          <div style={{ borderRadius: 20, padding: 16, background: p.lightCard, color: p.td }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Attendance rate</span>
            </div>
            <div style={{ fontSize: 10.5, color: p.mut, marginBottom: 8 }}>
              {attendance.length > 0 ? 'All recorded meetings' : 'No data yet'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.4px' }}>
                  {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                </div>
                <div style={{ fontSize: 11, color: p.mut, marginTop: 4 }}>
                  {attendance.length > 0 ? `${presentCount} of ${attendance.length} present` : 'attend a meeting to start tracking'}
                </div>
              </div>
              <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
                <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke={p.border} strokeWidth={ringStroke} />
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    fill="none"
                    stroke={p.green}
                    strokeWidth={ringStroke}
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
