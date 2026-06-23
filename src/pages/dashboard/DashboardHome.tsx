import { supabase } from '../../supabase';
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';

/**
 * ------------------------------------------------------------------
 * Theme contract
 * ------------------------------------------------------------------
 * Nothing below is a hardcoded color. Every visual token derives
 * from the tenant's own brand variables (--color-accent / --color-
 * primary / --color-page-bg, already provided by the theme layer)
 * via `color-mix()`, with safe neutral fallbacks so this still
 * renders correctly even before a tenant defines the optional
 * --color-surface / --color-success / --color-danger overrides.
 *
 * To art-direct a specific tenant further, set any of these at the
 * tenant theme root — nothing in this file needs to change:
 *   --color-surface, --color-success, --color-danger
 */
function useThemeTokens(): React.CSSProperties {
  return useMemo(
    () => ({
      ['--surface' as any]: 'var(--color-surface, #ffffff)',
      ['--surface-2' as any]: 'color-mix(in srgb, var(--color-accent) 4%, var(--surface))',
      ['--surface-hover' as any]: 'color-mix(in srgb, var(--color-accent) 7%, var(--surface))',
      ['--border-subtle' as any]: 'color-mix(in srgb, var(--color-accent) 10%, #e8e8eb)',
      ['--border-strong' as any]: 'color-mix(in srgb, var(--color-accent) 24%, #d7d7db)',
      ['--text-1' as any]: 'color-mix(in srgb, var(--color-accent) 4%, #0c0c0e)',
      ['--text-2' as any]: 'color-mix(in srgb, var(--color-accent) 3%, #5e5e67)',
      ['--text-3' as any]: 'color-mix(in srgb, var(--color-accent) 2%, #a1a1a9)',
      ['--accent-soft' as any]: 'color-mix(in srgb, var(--color-accent) 10%, var(--surface))',
      ['--success' as any]: 'var(--color-success, #15803d)',
      ['--success-soft' as any]: 'color-mix(in srgb, var(--success) 14%, var(--surface))',
      ['--danger' as any]: 'var(--color-danger, #b91c1c)',
      ['--danger-soft' as any]: 'color-mix(in srgb, var(--danger) 14%, var(--surface))',
    }),
    []
  );
}

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

/* ------------------------------- building blocks ------------------------------- */

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[color:var(--surface)] border border-[color:var(--border-subtle)] rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, to }: { icon: React.ReactNode; title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl sm:text-2xl font-heading font-bold flex items-center gap-2 text-[color:var(--text-1)]">
        <span className="text-accent">{icon}</span> {title}
      </h2>
      {to && (
        <Link
          to={to}
          className="text-sm font-bold text-[color:var(--text-3)] hover:text-accent transition-colors flex items-center gap-0.5 shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2"
        >
          View all <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center py-10 px-4 bg-[color:var(--surface-2)] rounded-2xl border border-dashed border-[color:var(--border-subtle)]">
      <div className="w-11 h-11 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center text-accent">
        {icon}
      </div>
      <p className="text-[color:var(--text-3)] text-sm font-medium">{label}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
}) {
  const toneClasses =
    tone === 'success'
      ? 'text-[color:var(--success)] bg-[color:var(--success-soft)]'
      : tone === 'danger'
      ? 'text-[color:var(--danger)] bg-[color:var(--danger-soft)]'
      : 'text-accent bg-[color:var(--accent-soft)]';

  return (
    <SectionCard className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-[color:var(--border-strong)] transition-colors">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 ${toneClasses}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[color:var(--text-3)] truncate">
          {label}
        </p>
        <p className="text-lg sm:text-xl font-heading font-bold text-[color:var(--text-1)] leading-tight truncate">
          {value}
        </p>
      </div>
    </SectionCard>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse">
      <div className="h-44 sm:h-52 rounded-3xl bg-[color:var(--surface-2)]" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-3xl bg-[color:var(--surface-2)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="h-64 rounded-3xl bg-[color:var(--surface-2)]" />
          <div className="h-64 rounded-3xl bg-[color:var(--surface-2)]" />
        </div>
        <div className="space-y-6">
          <div className="h-56 rounded-3xl bg-[color:var(--surface-2)]" />
          <div className="h-32 rounded-3xl bg-[color:var(--surface-2)]" />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- page ----------------------------------- */

export default function DashboardHome() {
  const { profile } = useAuth();
  const { settings, tenant } = useTenant();
  const tokens = useThemeTokens();

  const [upcomingEvents, setUpcomingEvents] = useState<EventRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let active = true;

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data: eventsSnap } = await supabase
          .from('events')
          .select('*')
          .eq('tenant_id', tenant.id)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(3);

        const { data: annSnap } = await supabase
          .from('announcements')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('createdAt', { ascending: false })
          .limit(3);

        if (!active) return;
        setUpcomingEvents(eventsSnap || []);
        setAnnouncements(annSnap || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [profile, tenant.id]);

  if (loading) {
    return (
      <div style={tokens}>
        <DashboardSkeleton />
      </div>
    );
  }

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const firstName = profile?.name?.split(' ')[0];
  const isActive = profile?.status === 'active';
  const bannerBg = isLight ? 'var(--color-accent)' : 'var(--color-primary)';

  return (
    <div style={tokens} className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Welcome Banner */}
      <div
        className="p-6 sm:p-8 md:p-12 rounded-3xl relative overflow-hidden text-white isolate"
        style={{ backgroundColor: bannerBg }}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-tr ${
            isLight ? 'from-white/10 to-transparent' : 'from-black/10 to-transparent'
          }`}
        />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-white/70 text-xs sm:text-sm font-bold uppercase tracking-widest mb-2">
              {getGreeting()}
            </p>
            <h1 className="text-[clamp(1.6rem,5vw,3rem)] font-heading font-bold mb-2 leading-tight">
              {firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'}
            </h1>
            <p className="text-white/70 text-base sm:text-lg">
              {settings.clubName} • {settings.rotaryYear || 'Current Year'}
            </p>
          </div>
          {profile?.photo ? (
            <img
              src={profile.photo}
              alt={profile.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/30 object-cover shadow-xl shrink-0"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/30 bg-white/10 flex items-center justify-center text-2xl sm:text-3xl font-heading font-bold shadow-xl shrink-0">
              {profile?.name?.[0]}
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<CalendarDays size={18} />} label="Upcoming" value={upcomingEvents.length} />
        <StatCard icon={<Megaphone size={18} />} label="Updates" value={announcements.length} />
        <StatCard
          icon={<ShieldCheck size={18} />}
          label="Status"
          value={isActive ? 'Active' : 'Inactive'}
          tone={isActive ? 'success' : 'danger'}
        />
        <StatCard icon={<User size={18} />} label="Role" value={<span className="capitalize">{profile?.role || 'Member'}</span>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column - Events & Announcements */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Upcoming Events */}
          <SectionCard className="p-5 sm:p-6 md:p-8">
            <SectionHeader icon={<CalendarDays size={22} />} title="Upcoming Events" to="/dashboard/calendar" />

            {upcomingEvents.length === 0 ? (
              <EmptyState icon={<CalendarDays size={20} />} label="No upcoming events scheduled." />
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const { month, day, label } = formatEventDate(event.date);
                  return (
                    <div
                      key={event.id}
                      className="flex gap-4 p-3 sm:p-4 rounded-2xl hover:bg-[color:var(--surface-hover)] transition-colors border border-transparent hover:border-[color:var(--border-subtle)] group cursor-pointer"
                    >
                      <div className="w-14 sm:w-16 flex flex-col items-center justify-center shrink-0 border-r border-[color:var(--border-subtle)] pr-3 sm:pr-4">
                        <span className="text-accent font-bold text-[11px] uppercase tracking-widest">{month}</span>
                        <span className="text-xl sm:text-2xl font-heading font-bold text-[color:var(--text-1)] leading-none group-hover:text-accent transition-colors">
                          {day}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-[color:var(--text-1)] leading-tight">{event.title}</h3>
                          {label && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-[color:var(--accent-soft)] px-2 py-0.5 rounded-full shrink-0">
                              {label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[color:var(--text-3)] mt-1 mb-2 flex items-center gap-3 flex-wrap">
                          {event.time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={13} /> {event.time}
                            </span>
                          )}
                          {event.venue && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={13} /> {event.venue}
                            </span>
                          )}
                        </p>
                        {event.type && (
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-[color:var(--surface-2)] text-[color:var(--text-2)] px-2 py-0.5 rounded-full">
                            {event.type}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Recent Announcements */}
          <SectionCard className="p-5 sm:p-6 md:p-8">
            <SectionHeader icon={<Megaphone size={22} />} title="Announcements" to="/dashboard/announcements" />

            {announcements.length === 0 ? (
              <EmptyState icon={<Megaphone size={20} />} label="No announcements at this time." />
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[color:var(--surface-2)] border border-[color:var(--border-subtle)] relative"
                  >
                    {ann.isPinned && (
                      <span className="absolute top-0 right-5 -translate-y-1/2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Pin size={10} /> Pinned
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-[color:var(--text-1)] leading-tight">{ann.title}</h3>
                      <span className="text-xs text-[color:var(--text-3)] shrink-0 whitespace-nowrap">
                        {timeAgo(ann.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[color:var(--text-2)] mt-2 line-clamp-2">{ann.body || ann.content}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column - Profile & Quick Links */}
        <div className="space-y-6">
          <SectionCard className="p-5 sm:p-6">
            <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2 text-[color:var(--text-1)]">
              <User size={18} className="text-accent" /> Your Profile Summary
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between items-center py-2.5 border-b border-[color:var(--border-subtle)]">
                <span className="text-[color:var(--text-3)]">Status</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest ${
                    isActive
                      ? 'bg-[color:var(--success-soft)] text-[color:var(--success)]'
                      : 'bg-[color:var(--danger-soft)] text-[color:var(--danger)]'
                  }`}
                >
                  {profile?.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-[color:var(--border-subtle)]">
                <span className="text-[color:var(--text-3)]">Role</span>
                <span className="font-bold text-[color:var(--text-1)] capitalize">{profile?.role}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[color:var(--text-3)]">Join Date</span>
                <span className="font-bold text-[color:var(--text-1)]">
                  {profile?.joinDate ? new Date(`${profile.joinDate}T00:00:00`).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
            <Link
              to="/dashboard/profile"
              className="block w-full text-center mt-5 py-2.5 bg-[color:var(--surface-2)] hover:bg-[color:var(--surface-hover)] text-sm font-bold text-[color:var(--text-2)] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2"
            >
              Edit Profile
            </Link>
          </SectionCard>

          <Link
            to="/dashboard/projects"
            className="block hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0 transition-all group overflow-hidden relative text-white p-6 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2"
            style={{ backgroundColor: bannerBg }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-start justify-between">
              <Presentation size={30} />
              <ArrowUpRight
                size={18}
                className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
              />
            </div>
            <h3 className="relative z-10 font-heading font-bold text-xl mt-4 mb-1">Active Projects</h3>
            <p className="relative z-10 text-sm text-white/70">
              View ongoing club projects and volunteer opportunities.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
