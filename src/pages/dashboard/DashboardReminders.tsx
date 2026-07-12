import { supabase } from '../../supabase';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import { AlertCircle, Bell, CheckCircle2, Clock, Users, X } from 'lucide-react';

/**
 * Inter font loader — identical constant/URL to DashboardHome.tsx's
 * useInterFont(). Same INTER_LINK_ID means this effect no-ops if
 * DashboardHome already injected the <link>, and injects it fresh if
 * this page is opened directly. Kept as a local copy (not shared
 * import) to match the established per-page pattern rather than
 * introduce a new shared hook file.
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

/* ------------------------------- data types ------------------------------- */

type ReminderRecord = {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  dueDate?: string;
  target_role?: string;
};

type Urgency = 'overdue' | 'today' | 'week' | 'later' | 'none';

/* ------------------------------- helpers ------------------------------- */

/** Same diffDays math as the previous DashboardReminders.tsx
 * (due = end-of-day on due_date, now = current instant), extended
 * into four buckets instead of a single inline badge. */
function getDueInfo(rawDate?: string): { urgency: Urgency; label: string; diffDays: number | null } {
  if (!rawDate) return { urgency: 'none', label: 'No due date', diffDays: null };
  const now = new Date();
  const due = new Date(`${rawDate}T23:59:59`);
  if (Number.isNaN(due.getTime())) return { urgency: 'none', label: 'No due date', diffDays: null };
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const dateLabel = new Date(`${rawDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (diffDays < 0) return { urgency: 'overdue', label: `Overdue · ${dateLabel}`, diffDays };
  if (diffDays === 0) return { urgency: 'today', label: 'Due today', diffDays };
  if (diffDays <= 7) return { urgency: 'week', label: diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays}d`, diffDays };
  return { urgency: 'later', label: `Due ${dateLabel}`, diffDays };
}

function targetRoleLabel(target?: string) {
  if (!target) return null;
  if (target === 'all' || target === 'all members') return 'All members';
  return target.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------- page ------------------------------- */

const SECTION_ORDER: { key: Urgency; title: string }[] = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Due today' },
  { key: 'week', title: 'This week' },
  { key: 'later', title: 'Later' },
  { key: 'none', title: 'No due date' },
];

type FilterKey = 'all' | 'overdue' | 'today' | 'week';

export default function DashboardReminders() {
  const { user, profile } = useAuth();
  const { tenant } = useTenant();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  useInterFont();

  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');

  // Dismiss is client-side / session-only — the `reminders` table has no
  // read/dismissed column yet, so this does NOT persist across reloads
  // or devices. Follows the same honesty convention as DashboardHome's
  // placeholder markers: real UI behavior, clearly not backed by a
  // durable field until one is added.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());

  const isAdminOrMaster = ['admin', 'master_admin'].includes(profile?.role || '');

  const fetchReminders = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from('reminders').select('*').eq('tenant_id', tenant.id).order('due_date', { ascending: true });
      if (!isAdminOrMaster) {
        q = q.in('target_role', ['all members', 'all', profile.role || 'member']);
      }
      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      setReminders((data as ReminderRecord[]) || []);
    } catch (err) {
      console.error(err);
      setError("Couldn't load your reminders.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, tenant.id, isAdminOrMaster]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const dismiss = (id: string) => {
    setFadingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setDismissedIds((prev) => new Set(prev).add(id));
      setFadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 350);
  };

  const enriched = useMemo(() => {
    return reminders
      .filter((r) => !dismissedIds.has(r.id))
      .map((r) => ({ ...r, due: getDueInfo(r.due_date || r.dueDate) }));
  }, [reminders, dismissedIds]);

  const counts = useMemo(
    () => ({
      overdue: enriched.filter((r) => r.due.urgency === 'overdue').length,
      today: enriched.filter((r) => r.due.urgency === 'today').length,
      week: enriched.filter((r) => r.due.urgency === 'week').length,
      total: enriched.length,
    }),
    [enriched]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return enriched;
    return enriched.filter((r) => r.due.urgency === filter);
  }, [enriched, filter]);

  const grouped = useMemo(() => {
    const map: Record<Urgency, typeof filtered> = { overdue: [], today: [], week: [], later: [], none: [] };
    filtered.forEach((r) => map[r.due.urgency].push(r));
    return map;
  }, [filtered]);

  if (loading) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading reminders" style={{ background: p.bg, padding: 18 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ height: 40, borderRadius: 12, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ height: 108, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 76, borderRadius: 16, marginBottom: 10, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rac-reminders-page">
      <style>{`
        .rac-reminders-page, .rac-reminders-page * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-reminder-filter-pill { cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        .rac-reminder-row { transition: opacity .35s ease, transform .35s ease; }
        .rac-reminder-dismiss { opacity: 0; transition: opacity .15s ease; }
        .rac-reminder-row:hover .rac-reminder-dismiss { opacity: 1; }
        @media (hover: none) {
          .rac-reminder-dismiss { opacity: 1; }
        }
      `}</style>

      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          {/* ---------------- page-top ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <div>
              <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>Reminders</span>
              <div style={{ fontSize: 11, color: p.tsub, marginTop: 2 }}>
                {isAdminOrMaster ? 'Admin view · all club reminders' : 'Showing reminders for your role'}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: p.tl,
                background: p.dark,
                border: `1px solid ${p.border}`,
                borderRadius: 20,
                padding: '5px 11px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Bell size={12} />
              {counts.total}
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
                onClick={fetchReminders}
                style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ---------------- overview stat card ---------------- */}
          <div style={{ borderRadius: 20, padding: 16, marginBottom: 12, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Overview</span>
              <span style={{ color: p.dots, fontSize: 15, letterSpacing: 1 }}>···</span>
            </div>
            <div style={{ display: 'flex', borderTop: `1px solid ${p.border}`, paddingTop: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Overdue', value: counts.overdue },
                { label: 'Due today', value: counts.today },
                { label: 'This week', value: counts.week },
                { label: 'Total active', value: counts.total },
              ].map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    minWidth: 90,
                    padding: i === 0 ? '0 9px 0 0' : i === 3 ? '0 0 0 9px' : '0 9px',
                    borderRight: i < 3 ? `1px solid ${p.border}` : undefined,
                  }}
                >
                  <div style={{ fontSize: 10, color: p.tmid, marginBottom: 10 }}>{s.label}</div>
                  <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------------- filter pills ---------------- */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'overdue', label: `Overdue${counts.overdue ? ` (${counts.overdue})` : ''}` },
                { key: 'today', label: `Today${counts.today ? ` (${counts.today})` : ''}` },
                { key: 'week', label: `This week${counts.week ? ` (${counts.week})` : ''}` },
              ] as { key: FilterKey; label: string }[]
            ).map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className="rac-reminder-filter-pill"
                  style={{
                    border: `1px solid ${active ? p.weekBg : p.pillBorder}`,
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: active ? 700 : 500,
                    padding: '6px 13px',
                    color: active ? p.weekText : p.tmid,
                    background: active ? p.weekBg : 'none',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* ---------------- grouped list ---------------- */}
          {filtered.length === 0 ? (
            <div
              style={{
                borderRadius: 20,
                padding: '40px 16px',
                background: p.dark,
                border: `1px solid ${p.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={32} style={{ color: p.green, marginBottom: 12, opacity: 0.85 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: p.tl, marginBottom: 4 }}>
                {reminders.length === 0 ? 'No reminders' : 'Nothing here'}
              </div>
              <div style={{ fontSize: 11, color: p.tsub }}>
                {reminders.length === 0 ? "You're all caught up." : 'Try a different filter above.'}
              </div>
            </div>
          ) : (
            SECTION_ORDER.filter((s) => grouped[s.key].length > 0).map((section) => (
              <div key={section.key} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, padding: '0 2px' }}>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: section.key === 'overdue' ? '#e08a72' : section.key === 'today' ? p.av2 : p.tmid,
                    }}
                  >
                    {section.title}
                  </span>
                  <span style={{ fontSize: 10, color: p.tsub }}>{grouped[section.key].length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grouped[section.key].map((r) => {
                    const isUrgent = r.due.urgency === 'overdue' || r.due.urgency === 'today';
                    const chipBg = r.due.urgency === 'overdue' ? '#3a1a14' : r.due.urgency === 'today' ? p.greenDeep : p.dark;
                    const chipColor = r.due.urgency === 'overdue' ? '#e08a72' : r.due.urgency === 'today' ? p.av2 : p.tmid;
                    const cardBg = r.due.urgency === 'today' ? p.greenDeep : p.dark;
                    const cardBorder = r.due.urgency === 'overdue' ? '#5a2a20' : r.due.urgency === 'today' ? p.recBd : p.border;
                    const titleColor = r.due.urgency === 'today' ? p.av2 : p.tl;
                    const bodyColor = r.due.urgency === 'today' ? p.recTx : p.tsub;
                    const roleLabel = targetRoleLabel(r.target_role);
                    const fading = fadingIds.has(r.id);

                    return (
                      <div
                        key={r.id}
                        className="rac-reminder-row"
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          borderRadius: 16,
                          padding: 14,
                          background: cardBg,
                          border: `1px solid ${cardBorder}`,
                          opacity: fading ? 0 : 1,
                          transform: fading ? 'translateX(6px)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            background: chipBg,
                            color: chipColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {r.due.urgency === 'overdue' ? (
                            <AlertCircle size={15} />
                          ) : r.due.urgency === 'today' ? (
                            <Bell size={15} />
                          ) : (
                            <Clock size={15} />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: titleColor }}>{r.title}</span>
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: '.03em',
                                color: isUrgent ? chipColor : p.tmid,
                                background: isUrgent ? 'rgba(0,0,0,.18)' : p.border,
                                borderRadius: 8,
                                padding: '2.5px 7px',
                                flexShrink: 0,
                              }}
                            >
                              {r.due.label}
                            </span>
                          </div>
                          {r.description && (
                            <div style={{ fontSize: 11.5, color: bodyColor, lineHeight: 1.45, marginBottom: roleLabel ? 6 : 0 }}>
                              {r.description}
                            </div>
                          )}
                          {roleLabel && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: p.tsub }}>
                              <Users size={10} />
                              {roleLabel}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => dismiss(r.id)}
                          className="rac-reminder-dismiss"
                          aria-label="Dismiss reminder"
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 8,
                            border: 'none',
                            background: 'none',
                            color: p.tmid,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
