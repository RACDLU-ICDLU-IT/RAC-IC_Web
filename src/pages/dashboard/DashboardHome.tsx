import { supabase } from '../../supabase';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useTenant } from '../../hooks/useTenant';
import {
  CalendarDays,
  Megaphone,
  Presentation,
  ChevronRight,
  ArrowUpRight,
  User,
  Clock,
  MapPin,
  Pin,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  XCircle,
  FolderKanban,
} from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * Theme contract
 * ------------------------------------------------------------------
 * This mirrors the exact pattern DashboardLayout.tsx already uses:
 * a plain JS token object `c`, resolved per-render from
 * `useTheme().resolvedTheme`, NOT Tailwind `dark:` classes and NOT
 * CSS `color-mix()` custom properties. Two theming systems living
 * side by side was the root problem with the previous version of
 * this file — this makes DashboardHome render through the same
 * pipeline as the shell it lives inside.
 *
 * Palette is the Sneat-derived neutral system already established
 * in DashboardLayout (`#f5f5f9` / `#25293c` page tones, `#eceef1`
 * hairlines, `#697a8d` muted text) — NOT the tenant's brand color.
 * The tenant accent (`theme.accent`) is reserved for small, specific
 * moments only: active-state chips, one primary CTA, icon strokes —
 * matching how DashboardLayout uses it (nav active indicator, one
 * CTA box, avatar ring) rather than painting every surface with it.
 */
function useDashboardTokens(accent: string, dark: boolean) {
  return useMemo(
    () => ({
      pageBg: dark ? '#1a1d2b' : '#f5f5f9',
      surface: dark ? '#282c3f' : '#ffffff',
      surfaceMuted: dark ? 'rgba(255,255,255,0.04)' : '#f8f8fb',
      surfaceHover: dark ? 'rgba(255,255,255,0.06)' : '#f5f5f9',
      border: dark ? 'rgba(255,255,255,0.08)' : '#eceef1',
      borderStrong: dark ? 'rgba(255,255,255,0.14)' : '#dfe1e7',
      text1: dark ? 'rgba(255,255,255,0.92)' : '#2b2c40',
      text2: dark ? 'rgba(255,255,255,0.6)' : '#566a7f',
      text3: dark ? 'rgba(255,255,255,0.38)' : '#a1acb8',
      accent,
      accentSoft: dark ? `${accent}26` : `${accent}14`,
      success: '#71dd37',
      successSoft: dark ? 'rgba(113,221,55,0.16)' : 'rgba(113,221,55,0.12)',
      danger: '#ff3e1d',
      dangerSoft: dark ? 'rgba(255,62,29,0.16)' : 'rgba(255,62,29,0.12)',
      warning: '#ffab00',
      warningSoft: dark ? 'rgba(255,171,0,0.16)' : 'rgba(255,171,0,0.12)',
      shadowCard: dark ? '0 2px 6px rgba(0,0,0,0.24)' : '0 2px 6px rgba(31,45,61,0.06)',
      shadowCardHover: dark ? '0 8px 20px rgba(0,0,0,0.32)' : '0 8px 20px rgba(31,45,61,0.09)',
    }),
    [accent, dark]
  );
}

type Tokens = ReturnType<typeof useDashboardTokens>;

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

/**
 * Matches the real `attendance` table as used in DashboardAttendance.tsx:
 * id, userId, eventId, status ('present' | 'absent' | 'excused' | 'late'),
 * tenant_id. This is admin-marked after the fact, not a member-facing RSVP.
 */
type AttendanceRecord = {
  id: string;
  userId: string;
  eventId: string;
  status: 'present' | 'absent' | 'excused' | 'late' | string;
};

/**
 * Matches the real `projects` table as used in DashboardProjects.tsx:
 * id, name, type, status ('upcoming' | 'ongoing' | 'completed'), startDate,
 * executionDate, coverImage, tenant_id. Field is `name`, not `title`.
 */
type ProjectRecord = {
  id: string;
  name: string;
  type?: string;
  status?: string;
  startDate?: string;
  executionDate?: string;
  coverImage?: string;
};

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

function memberTenure(joinDate?: string) {
  if (!joinDate) return null;
  const start = new Date(`${joinDate}T00:00:00`).getTime();
  if (Number.isNaN(start)) return null;
  const days = Math.floor((Date.now() - start) / 86400000);
  if (days < 0) return null;
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

/**
 * Isolated data layer — fetched in parallel. Events + announcements query
 * the same tables/fields/filters as the original. Attendance and projects
 * are additive, and both verified against DashboardAttendance.tsx and
 * DashboardProjects.tsx respectively.
 */
async function loadDashboardData(tenantId: string, memberId?: string) {
  const today = new Date().toISOString().split('T')[0];

  const [eventsRes, annRes, attendanceRes, projectsRes] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(3),
    supabase
      .from('announcements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('createdAt', { ascending: false })
      .limit(3),
    memberId
      ? supabase.from('attendance').select('*').eq('userId', memberId).eq('tenant_id', tenantId)
      : Promise.resolve({ data: [], error: null } as any),
    supabase
      .from('projects')
      .select('id, name, type, status, startDate, executionDate, coverImage')
      .eq('tenant_id', tenantId)
      .order('startDate', { ascending: false })
      .limit(3),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (annRes.error) throw annRes.error;
  if (attendanceRes.error) console.warn('[dashboard] Attendance fetch failed:', attendanceRes.error);
  if (projectsRes.error) console.warn('[dashboard] Projects fetch failed:', projectsRes.error);

  return {
    events: (eventsRes.data as EventRecord[]) || [],
    announcements: (annRes.data as AnnouncementRecord[]) || [],
    attendance: (attendanceRes.data as AttendanceRecord[]) || [],
    projects: (projectsRes.data as ProjectRecord[]) || [],
  };
}

/* ------------------------------- building blocks ------------------------------- */

function Card({
  t,
  children,
  className = '',
  hover = false,
  style = {},
}: {
  t: Tokens;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
      className={`rounded-xl transition-all duration-200 ${className}`}
      style={{
        background: t.surface,
        border: `1px solid ${hovered ? t.borderStrong : t.border}`,
        boxShadow: hovered ? t.shadowCardHover : t.shadowCard,
        transform: hovered ? 'translateY(-2px)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ t, icon, title, to }: { t: Tokens; icon: React.ReactNode; title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2.5" style={{ color: t.text1 }}>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: t.accentSoft, color: t.accent }}
        >
          {icon}
        </span>
        {title}
      </h2>
      {to && (
        <Link
          to={to}
          className="text-xs font-semibold flex items-center gap-0.5 shrink-0 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ color: t.text3 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.color = t.text3)}
        >
          View all <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  t,
  icon,
  label,
  actionLabel,
  actionTo,
}: {
  t: Tokens;
  icon: React.ReactNode;
  label: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-2.5 text-center py-9 px-4 rounded-lg"
      style={{ background: t.surfaceMuted, border: `1px dashed ${t.border}` }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: t.accentSoft, color: t.accent }}
      >
        {icon}
      </div>
      <p className="text-sm font-medium" style={{ color: t.text3 }}>
        {label}
      </p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="text-xs font-semibold hover:underline underline-offset-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 px-1"
          style={{ color: t.accent }}
        >
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}

function StatCard({
  t,
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  t: Tokens;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const iconBg = tone === 'success' ? t.successSoft : tone === 'danger' ? t.dangerSoft : t.accentSoft;
  const iconColor = tone === 'success' ? t.success : tone === 'danger' ? t.danger : t.accent;

  return (
    <Card t={t} hover className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider truncate" style={{ color: t.text3 }}>
          {label}
        </p>
        <p className="text-lg font-bold tabular-nums leading-tight truncate" style={{ color: t.text1 }}>
          {value}
        </p>
        {hint && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: t.text3 }}>
            {hint}
          </p>
        )}
      </div>
    </Card>
  );
}

function ErrorBanner({ t, message, onRetry }: { t: Tokens; message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 p-3.5 rounded-lg"
      style={{ background: t.dangerSoft, color: t.danger }}
    >
      <p className="text-sm font-semibold">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs font-semibold uppercase tracking-wider shrink-0 underline underline-offset-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      >
        Retry
      </button>
    </div>
  );
}

function DashboardSkeleton({ t }: { t: Tokens }) {
  const pulse = { background: t.surfaceMuted };
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-16 rounded-xl" style={pulse} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[76px] rounded-xl" style={pulse} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="h-60 rounded-xl" style={pulse} />
          <div className="h-60 rounded-xl" style={pulse} />
        </div>
        <div className="space-y-5">
          <div className="h-52 rounded-xl" style={pulse} />
          <div className="h-40 rounded-xl" style={pulse} />
          <div className="h-28 rounded-xl" style={pulse} />
        </div>
      </div>
    </div>
  );
}

function AttendanceStatusChip({ t, status }: { t: Tokens; status: string }) {
  const normalized = status.toLowerCase();
  const map: Record<string, { icon: React.ReactNode; label: string; bg: string; color: string }> = {
    present: { icon: <CheckCircle2 size={11} />, label: 'Present', bg: t.successSoft, color: t.success },
    absent: { icon: <XCircle size={11} />, label: 'Absent', bg: t.dangerSoft, color: t.danger },
    late: { icon: <Clock size={11} />, label: 'Late', bg: t.accentSoft, color: t.accent },
    excused: { icon: <HelpCircle size={11} />, label: 'Excused', bg: t.warningSoft, color: t.warning },
  };
  const s = map[normalized] || map.excused;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
      style={{ background: s.bg, color: s.color }}
    >
      {s.icon} {s.label}
    </span>
  );
}

/* ----------------------------------- page ----------------------------------- */

export default function DashboardHome() {
  const { profile } = useAuth();
  const { settings, theme, tenant } = useTenant();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const accent = theme?.accent || '#696cff';
  const t = useDashboardTokens(accent, dark);

  const [upcomingEvents, setUpcomingEvents] = useState<EventRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [eventLookup, setEventLookup] = useState<Record<string, EventRecord>>({});
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadDashboardData(tenant.id, profile.id as string | undefined);
      setUpcomingEvents(data.events);
      setAnnouncements(data.announcements);
      setProjects(data.projects);

      if (data.attendance.length > 0) {
        const { data: eventsSnap } = await supabase
          .from('events')
          .select('*')
          .eq('tenant_id', tenant.id);
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
  }, [profile, tenant.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading dashboard">
        <DashboardSkeleton t={t} />
      </div>
    );
  }

  const firstName = profile?.name?.split(' ')[0];
  const isActive = profile?.status === 'active';
  const eventsThisWeek = upcomingEvents.filter((e) => formatEventDate(e.date).label).length;
  const pinnedCount = announcements.filter((a) => a.isPinned).length;
  const tenure = memberTenure(profile?.joinDate);
  const presentCount = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  return (
    <div className="space-y-5 antialiased">
      {error && <ErrorBanner t={t} message={error} onRetry={fetchDashboard} />}

      {/* Greeting row — quiet, text-only, no big color banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: t.text3 }}>
            {getGreeting()}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: t.text1 }}>
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.text2 }}>
            {settings.clubName} <span style={{ color: t.text3 }}>·</span> {settings.rotaryYear || 'Current Year'}
          </p>
        </div>
        {profile?.photo ? (
          <img
            src={profile.photo}
            alt={profile.name}
            className="w-12 h-12 rounded-full object-cover shrink-0"
            style={{ border: `2px solid ${t.accent}` }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0"
            style={{ background: t.accent }}
          >
            {profile?.name?.[0]}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          t={t}
          icon={<CalendarDays size={16} />}
          label="Upcoming"
          value={upcomingEvents.length}
          hint={eventsThisWeek > 0 ? `${eventsThisWeek} this week` : undefined}
        />
        <StatCard
          t={t}
          icon={<Megaphone size={16} />}
          label="Updates"
          value={announcements.length}
          hint={pinnedCount > 0 ? `${pinnedCount} pinned` : undefined}
        />
        <StatCard
          t={t}
          icon={<ShieldCheck size={16} />}
          label="Status"
          value={isActive ? 'Active' : 'Inactive'}
          tone={isActive ? 'success' : 'danger'}
        />
        <StatCard
          t={t}
          icon={<User size={16} />}
          label="Role"
          value={<span className="capitalize">{profile?.role || 'Member'}</span>}
          hint={tenure ? `Member for ${tenure}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Events & Announcements */}
        <div className="lg:col-span-2 space-y-5">
          {/* Upcoming Events */}
          <Card t={t} className="p-5 sm:p-6">
            <SectionHeader t={t} icon={<CalendarDays size={16} />} title="Upcoming Events" to="/dashboard/calendar" />

            {upcomingEvents.length === 0 ? (
              <EmptyState
                t={t}
                icon={<CalendarDays size={18} />}
                label="No upcoming events scheduled."
                actionLabel="Open calendar"
                actionTo="/dashboard/calendar"
              />
            ) : (
              <div className="space-y-1">
                {upcomingEvents.map((event) => {
                  const { month, day, label } = formatEventDate(event.date);
                  return (
                    <div
                      key={event.id}
                      className="flex gap-4 p-3 rounded-lg transition-colors cursor-pointer group"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-14 flex flex-col items-center justify-center shrink-0 pr-3"
                        style={{ borderRight: `1px solid ${t.border}` }}
                      >
                        <span className="font-bold text-[10px] uppercase tracking-widest" style={{ color: t.accent }}>
                          {month}
                        </span>
                        <span className="text-xl font-bold tabular-nums leading-none" style={{ color: t.text1 }}>
                          {day}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm leading-tight" style={{ color: t.text1 }}>
                            {event.title}
                          </h3>
                          {label && (
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ color: t.accent, background: t.accentSoft }}
                            >
                              {label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1 mb-1.5 flex items-center gap-3 flex-wrap" style={{ color: t.text3 }}>
                          {event.time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} /> {event.time}
                            </span>
                          )}
                          {event.venue && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} /> {event.venue}
                            </span>
                          )}
                        </p>
                        {event.type && (
                          <span
                            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                            style={{ background: t.surfaceMuted, color: t.text2 }}
                          >
                            {event.type}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent Announcements */}
          <Card t={t} className="p-5 sm:p-6">
            <SectionHeader t={t} icon={<Megaphone size={16} />} title="Announcements" to="/dashboard/announcements" />

            {announcements.length === 0 ? (
              <EmptyState
                t={t}
                icon={<Megaphone size={18} />}
                label="No announcements at this time."
                actionLabel="Open announcements"
                actionTo="/dashboard/announcements"
              />
            ) : (
              <div className="space-y-2.5">
                {announcements.map((ann) => {
                  const isNew = ann.createdAt ? Date.now() - new Date(ann.createdAt).getTime() < 86400000 : false;
                  return (
                    <div
                      key={ann.id}
                      className="p-4 rounded-lg relative"
                      style={{ background: t.surfaceMuted, border: `1px solid ${t.border}` }}
                    >
                      {ann.isPinned && (
                        <span
                          className="absolute top-0 right-4 -translate-y-1/2 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
                          style={{ background: t.accent }}
                        >
                          <Pin size={9} /> Pinned
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-sm leading-tight flex items-center gap-2" style={{ color: t.text1 }}>
                          {ann.title}
                          {isNew && (
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ color: t.success, background: t.successSoft }}
                            >
                              New
                            </span>
                          )}
                        </h3>
                        <span className="text-[11px] shrink-0 whitespace-nowrap" style={{ color: t.text3 }}>
                          {timeAgo(ann.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1.5 line-clamp-2" style={{ color: t.text2 }}>
                        {ann.body || ann.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Profile, Attendance, Projects */}
        <div className="space-y-5">
          <Card t={t} className="p-5">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: t.text1 }}>
              <User size={15} style={{ color: t.accent }} /> Profile Summary
            </h3>
            <div className="text-sm">
              <div className="flex justify-between items-center py-2.5" style={{ borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.text3 }}>Status</span>
                <span
                  className="font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider"
                  style={{
                    background: isActive ? t.successSoft : t.dangerSoft,
                    color: isActive ? t.success : t.danger,
                  }}
                >
                  {profile?.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5" style={{ borderBottom: `1px solid ${t.border}` }}>
                <span style={{ color: t.text3 }}>Role</span>
                <span className="font-semibold capitalize" style={{ color: t.text1 }}>
                  {profile?.role}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5" style={{ borderBottom: tenure ? `1px solid ${t.border}` : 'none' }}>
                <span style={{ color: t.text3 }}>Join Date</span>
                <span className="font-semibold" style={{ color: t.text1 }}>
                  {profile?.joinDate ? new Date(`${profile.joinDate}T00:00:00`).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {tenure && (
                <div className="flex justify-between items-center py-2.5">
                  <span style={{ color: t.text3 }}>Tenure</span>
                  <span className="font-semibold" style={{ color: t.text1 }}>
                    {tenure}
                  </span>
                </div>
              )}
            </div>
            <Link
              to="/dashboard/profile"
              className="block w-full text-center mt-4 py-2 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ background: t.surfaceMuted, color: t.text2 }}
            >
              Edit Profile
            </Link>
          </Card>

          {/* My Attendance */}
          <Card t={t} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: t.text1 }}>
                <CheckCircle2 size={15} style={{ color: t.accent }} /> My Attendance
              </h3>
              {attendanceRate !== null && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: attendanceRate >= 75 ? t.successSoft : attendanceRate >= 50 ? t.warningSoft : t.dangerSoft,
                    color: attendanceRate >= 75 ? t.success : attendanceRate >= 50 ? t.warning : t.danger,
                  }}
                >
                  {attendanceRate}% rate
                </span>
              )}
            </div>

            {attendance.length === 0 ? (
              <EmptyState
                t={t}
                icon={<CheckCircle2 size={18} />}
                label="No attendance records yet."
                actionLabel="View full history"
                actionTo="/dashboard/attendance"
              />
            ) : (
              <>
                <div className="space-y-2">
                  {attendance.slice(0, 4).map((record) => {
                    const event = eventLookup[record.eventId];
                    return (
                      <div
                        key={record.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg"
                        style={{ background: t.surfaceMuted, border: `1px solid ${t.border}` }}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: t.text1 }}>
                            {event?.title || 'Club Meeting'}
                          </p>
                          {event?.date && (
                            <p className="text-[11px] mt-0.5" style={{ color: t.text3 }}>
                              {new Date(`${event.date}T00:00:00`).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                        <AttendanceStatusChip t={t} status={record.status} />
                      </div>
                    );
                  })}
                </div>
                <Link
                  to="/dashboard/attendance"
                  className="block w-full text-center mt-3 py-2 text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ background: t.surfaceMuted, color: t.text2 }}
                >
                  View full history
                </Link>
              </>
            )}
          </Card>

          {/* Club Projects preview */}
          {projects.length > 0 && (
            <Card t={t} className="p-5">
              <SectionHeader t={t} icon={<FolderKanban size={15} />} title="Club Projects" to="/dashboard/projects" />
              <div className="space-y-2">
                {projects.map((project) => {
                  const statusColor =
                    project.status?.toLowerCase() === 'ongoing'
                      ? { bg: t.successSoft, color: t.success }
                      : project.status?.toLowerCase() === 'completed'
                      ? { bg: t.surfaceMuted, color: t.text3 }
                      : { bg: t.accentSoft, color: t.accent };
                  return (
                    <Link
                      key={project.id}
                      to="/dashboard/projects"
                      className="flex items-center gap-3 p-2.5 rounded-lg transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-9 h-9 rounded-lg overflow-hidden shrink-0"
                        style={{ background: t.accentSoft }}
                      >
                        {project.coverImage && (
                          <img src={project.coverImage} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate" style={{ color: t.text1 }}>
                          {project.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: t.text3 }}>
                          {project.executionDate || project.startDate || 'Date TBD'}
                        </p>
                      </div>
                      {project.status && (
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: statusColor.bg, color: statusColor.color }}
                        >
                          {project.status}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Single primary CTA — this is the one place accent gets to be bold */}
          <Link
            to="/dashboard/projects"
            className="block group overflow-hidden relative text-white p-5 rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ background: t.accent }}
          >
            <div className="relative z-10 flex items-start justify-between">
              <Presentation size={24} />
              <ArrowUpRight
                size={16}
                className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
              />
            </div>
            <h3 className="relative z-10 font-bold text-base mt-3 mb-0.5">Explore Projects</h3>
            <p className="relative z-10 text-sm text-white/75">
              View ongoing club projects and volunteer opportunities.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
