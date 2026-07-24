import { supabase } from '../../supabase';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import { Megaphone, Pin, Paperclip, Download, ChevronDown, CheckCheck, AlertCircle, X } from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * DashboardAnnouncements — member-facing, full redesign.
 *
 * Visual identity is pixel-matched to DashboardHome.tsx: same Inter
 * font loader, same scoped !important font opt-out, same
 * getClubPalette(tenant.id, mode) palette, same page-top "label +
 * live clock" row, same p.dark/p.lightCard card language, same
 * role="status"/aria-busy loading skeleton pattern. Only p.* keys
 * DashboardHome itself uses are reused here — no new palette keys
 * invented.
 *
 * This redesign keeps the data/visibility/read-tracking logic from
 * the previous version entirely intact and rebuilds only the visual
 * layer: clearer type rhythm, smoother expand/collapse motion,
 * glanceable unread/pinned/attachment state, and a proper inline
 * error surface for read-state write failures (see readWriteError
 * below) instead of failing silently.
 *
 * --------------------------- SCHEMA ---------------------------
 * Reads the same `announcements` table AdminCommunications.tsx
 * writes (status / is_permanent / is_pinned / target_all /
 * target_roles / target_members / body_html / attachments / expires_at
 * — see that file's header comment for the full column list).
 *
 * Reads/writes `announcement_reads` for per-member read tracking:
 *   announcement_id  uuid, references announcements(id)
 *   user_id          uuid, references users(id)
 *   tenant_id        text — denormalized for RLS, matching the
 *                    pattern every other tenant-scoped table in this
 *                    codebase uses.
 *   read_at          timestamptz
 *   primary key (announcement_id, user_id)
 *
 * --------------------------- VISIBILITY ---------------------------
 * A published announcement is visible to a member when:
 *   1. status === 'published' AND NOT effectively expired
 *      (effectively expired = has expires_at in the past AND is not
 *      permanent — same isEffectivelyExpired rule as the admin page,
 *      intentionally kept in lockstep with it so the two pages can
 *      never disagree about what "expired" means. Enforced entirely
 *      client-side: once a member's page renders, an expired
 *      announcement simply isn't included in what's shown).
 *   2. AND audience matches: target_all, OR this member's role_id is
 *      in target_roles, OR this member's own id is in target_members.
 * ------------------------------------------------------------------
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

/** 12-hour clock label, e.g. "3:21 PM" — identical to DashboardHome's formatClock(). */
function formatClock(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${ampm}`;
}

function timeAgo(dateStr?: string | null) {
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

type AnnouncementStatus = 'draft' | 'published' | 'unpublished' | 'expired';

interface Attachment { url: string; public_id?: string; name?: string; }

interface AnnouncementRow {
  id: string;
  tenant_id: string;
  title: string;
  body_html: string;
  attachments: Attachment[] | null;
  target_roles: string[] | null;
  target_members: string[] | null;
  target_all: boolean;
  is_pinned: boolean;
  is_permanent: boolean;
  status: AnnouncementStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
  author_id: string | null;
  author_name: string | null;
}

/** Same rule as AdminCommunications.tsx's isEffectivelyExpired — kept
 * intentionally identical so the two pages can never disagree about
 * what counts as expired. */
function isEffectivelyExpired(a: Pick<AnnouncementRow, 'status' | 'expires_at' | 'is_permanent'>): boolean {
  if (a.is_permanent) return false;
  if (!a.expires_at) return false;
  if (a.status !== 'published' && a.status !== 'expired') return false;
  return new Date(a.expires_at).getTime() < Date.now();
}

/** Whether `a` is currently visible to a member with the given role
 * and id — combines the published+not-expired check with the
 * audience-targeting rules from the admin composer. */
function isVisibleToMember(a: AnnouncementRow, memberId: string | undefined, roleId: string | null | undefined): boolean {
  if (a.status !== 'published') return false;
  if (isEffectivelyExpired(a)) return false;
  if (a.target_all) return true;
  if (roleId && (a.target_roles || []).includes(roleId)) return true;
  if (memberId && (a.target_members || []).includes(memberId)) return true;
  return false;
}

/**
 * Plain-text preview for the collapsed card.
 *
 * Parses into a detached (never-rendered, never-attached-to-page) DOM
 * element rather than using regex string replacement. Two concrete
 * problems that fixes:
 *
 * 1. HTML entities (&mdash;, &nbsp;, etc.) decode correctly for free
 *    — a regex-based tag-strip has no concept of entities and leaves
 *    them as literal text, which is exactly the "&mdash;" and
 *    "&nbsp;" showing up raw in card previews.
 * 2. It can walk actual DOM structure to skip decorative chrome. A
 *    full HTML email template's very first text nodes are typically
 *    its own header/logo/label-bar text (e.g. "ROTARACT CLUB OF
 *    DHAKA LUMINOUS ... CLUB ANNOUNCEMENT — TEST RENDER"), which is
 *    not the message — but a naive "take the first N characters of
 *    visible text" approach grabs exactly that instead of the actual
 *    "Dear Member, ..." content. This skips common structural/brand
 *    wrapper patterns (elements styled as solid brand-color
 *    backgrounds, all-caps uppercase-styled bars) so the preview
 *    reflects the letter itself, not its letterhead.
 */
function htmlToPreviewText(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  // Strip elements that never carry preview-worthy content, plus
  // decorative chrome: solid brand-color header bands and all-caps
  // label bars are almost always logo/branding/section-label text,
  // not the message.
  container.querySelectorAll('style, script').forEach(el => el.remove());
  container.querySelectorAll('[style]').forEach(el => {
    const style = (el.getAttribute('style') || '').toLowerCase();
    const isSolidBrandBand = /background(-color)?\s*:\s*#/.test(style) && el.textContent && el.textContent.trim().length < 80;
    const isUppercaseLabel = /text-transform\s*:\s*uppercase/.test(style);
    if (isSolidBrandBand || isUppercaseLabel) el.remove();
  });

  const text = (container.textContent || '').replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Renders an announcement's body_html directly into the page, scoped
 * inside its own constrained container — not inside an iframe. An
 * iframe reads visually as "a box inside a box" (its own scrollbar,
 * a hard edge, a mismatched background) rather than as part of the
 * card itself; a plain announcement should look like page content,
 * because it is page content. body_html is only ever written by
 * admins through AdminCommunications.tsx's composer.
 *
 * Scoped CSS (in the page's <style> block below) forces every table
 * inside the rendered content — however deeply nested, whatever width
 * it declares inline — to respect the card's own width, so a
 * table-based HTML email template's fixed max-width:600px column
 * can't overflow a narrow phone card. table-layout: fixed stops a
 * single long/nowrap cell from stretching a row past 100% regardless
 * of what width was requested.
 */
function AnnouncementBody({ html }: { html: string }) {
  return (
    <div
      className="rac-ann-body"
      style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function DashboardAnnouncements() {
  const { user, profile, role } = useAuth();
  const { tenant } = useTenant();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  useInterFont();

  const [clockLabel, setClockLabel] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = setInterval(() => setClockLabel(formatClock(new Date())), 30000);
    return () => clearInterval(id);
  }, []);

  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readWriteError, setReadWriteError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const roleId = (profile as any)?.role_id ?? (role as any)?.id ?? null;

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [{ data: annData, error: annErr }, { data: readsData, error: readsErr }] = await Promise.all([
        supabase
          .from('announcements')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('tenant_id', tenant.id)
          .eq('user_id', user.id),
      ]);
      if (annErr) throw annErr;
      if (readsErr) console.warn('[announcements] Read-state fetch failed:', readsErr);

      setAnnouncements((annData as AnnouncementRow[]) || []);
      setReadIds(new Set(((readsData as { announcement_id: string }[]) || []).map(r => r.announcement_id)));
    } catch (err) {
      console.error(err);
      setError("Couldn't load announcements.");
    } finally {
      setLoading(false);
    }
  }, [user, tenant.id]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const visible = useMemo(
    () => announcements.filter(a => isVisibleToMember(a, user?.id, roleId)),
    [announcements, user?.id, roleId]
  );

  const sorted = useMemo(
    () =>
      [...visible].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [visible]
  );

  const unreadCount = sorted.filter(a => !readIds.has(a.id)).length;

  /**
   * Writes read state to the DB. Optimistic, but NOT silently
   * accepted as final if the write fails — an earlier version treated
   * a failed write as an acceptable outcome (UI shows read, DB
   * doesn't persist it), which meant a real persistence bug (missing
   * table, RLS rejecting the insert, a primary-key mismatch on the
   * upsert's conflict target) looked identical to success until the
   * next refresh silently reverted it. Now a failed write rolls the
   * UI back and surfaces the actual error via readWriteError, shown
   * as an inline banner below the header — so a schema/RLS problem is
   * visible and diagnosable instead of masked.
   */
  const markAsRead = useCallback(
    async (announcementId: string) => {
      if (!user || readIds.has(announcementId)) return;
      setReadIds(prev => new Set(prev).add(announcementId));
      try {
        const { error } = await supabase
          .from('announcement_reads')
          .upsert(
            { announcement_id: announcementId, user_id: user.id, tenant_id: tenant.id, read_at: new Date().toISOString() },
            { onConflict: 'announcement_id,user_id' }
          );
        if (error) throw error;
      } catch (err: any) {
        console.error('[announcements] Failed to record read state:', err);
        setReadIds(prev => {
          const next = new Set(prev);
          next.delete(announcementId);
          return next;
        });
        setReadWriteError(err?.message || 'Could not save read status. Check that announcement_reads exists and RLS allows this write.');
      }
    },
    [user, tenant.id, readIds]
  );

  const toggleExpanded = (a: AnnouncementRow) => {
    const next = expandedId === a.id ? null : a.id;
    setExpandedId(next);
    if (next) markAsRead(a.id);
  };

  const markAllAsRead = async () => {
    const unread = sorted.filter(a => !readIds.has(a.id));
    if (unread.length === 0 || !user) return;
    const previousReadIds = readIds;
    setReadIds(prev => {
      const next = new Set(prev);
      unread.forEach(a => next.add(a.id));
      return next;
    });
    try {
      const rows = unread.map(a => ({ announcement_id: a.id, user_id: user.id, tenant_id: tenant.id, read_at: new Date().toISOString() }));
      const { error } = await supabase.from('announcement_reads').upsert(rows, { onConflict: 'announcement_id,user_id' });
      if (error) throw error;
    } catch (err: any) {
      console.error('[announcements] Failed to mark all as read:', err);
      setReadIds(previousReadIds);
      setReadWriteError(err?.message || 'Could not save read status. Check that announcement_reads exists and RLS allows this write.');
    }
  };

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading announcements"
        style={{ background: p.bg, padding: 18 }}
        className="p-4 md:p-8 -m-4 md:-m-8"
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div
            style={{ height: 32, width: 180, borderRadius: 8, marginBottom: 24, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{ height: 96, borderRadius: 18, marginBottom: 10, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 - i * 0.08 }}
              className="animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rac-announcements-page">
      <style>{`
        .rac-announcements-page, .rac-announcements-page * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-announcements-page ::-webkit-scrollbar { display: none; }

        @keyframes rac-ann-expand {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rac-ann-expand-enter {
          animation: rac-ann-expand .22s cubic-bezier(.2,.8,.2,1) both;
        }
        .rac-ann-card {
          transition: border-color .18s ease, box-shadow .18s ease, transform .12s ease;
        }
        .rac-ann-card:active {
          transform: scale(.997);
        }
        .rac-ann-chevron {
          transition: transform .22s cubic-bezier(.2,.8,.2,1);
        }

        /* Announcement body — renders admin-authored HTML natively as
           page content (no iframe). Two things this has to guarantee
           regardless of what an admin pastes in:
           1. Nothing can ever be wider than the card, however it was
              authored — this is what actually matters for full HTML
              email templates (table-based, often with an inline
              max-width:600px on the main content table).
           2. Normal rich-text content (headings, lists, links, plain
              paragraphs from the WYSIWYG tab) still reads well as part
              of the page — it shouldn't only look right for full
              email templates. */
        .rac-announcements-page .rac-ann-body,
        .rac-announcements-page .rac-ann-body * {
          max-width: 100% !important;
          box-sizing: border-box;
        }
        .rac-announcements-page .rac-ann-body table {
          width: 100% !important;
          table-layout: fixed;
        }
        .rac-announcements-page .rac-ann-body img { height: auto; }
        .rac-announcements-page .rac-ann-body a { color: ${p.green}; }
        .rac-announcements-page .rac-ann-body h1,
        .rac-announcements-page .rac-ann-body h2,
        .rac-announcements-page .rac-ann-body h3 {
          font-weight: 700;
          margin: .6em 0 .3em;
          color: ${p.tl};
        }
        .rac-announcements-page .rac-ann-body ul,
        .rac-announcements-page .rac-ann-body ol {
          padding-left: 1.4em;
          margin: .4em 0;
        }
        .rac-announcements-page .rac-ann-body p { margin: .5em 0; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 40 }}>

          {/* ---------------- page-top: title + live clock ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0 }}>
              Announcements
            </span>
            <span style={{ fontSize: 24, color: p.ptxt, fontWeight: 600 }}>{clockLabel}</span>
          </div>

          {/* ---------------- unread summary + mark-all row ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', marginBottom: 18, minHeight: 22 }}>
            <span style={{ fontSize: 12.5, color: p.tsub }}>
              {unreadCount > 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.green, display: 'inline-block' }} />
                  {unreadCount} unread
                </span>
              ) : sorted.length > 0 ? (
                'All caught up'
              ) : null}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'none', color: p.tmid, border: 'none',
                  padding: '4px 2px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, marginBottom: 12, background: '#3a1a14', color: '#e08a72',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>
              <button
                onClick={fetchAnnouncements}
                style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', flexShrink: 0 }}
              >
                Retry
              </button>
            </div>
          )}

          {readWriteError && (
            <div
              role="alert"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', borderRadius: 12, marginBottom: 12,
                background: '#3a1a14', color: '#e08a72', border: '1px solid rgba(224,138,114,.25)',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, fontWeight: 500, margin: 0, lineHeight: 1.5, flex: 1 }}>
                Couldn't save read status — {readWriteError}
              </p>
              <button
                onClick={() => setReadWriteError(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', flexShrink: 0, opacity: 0.7 }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ---------------- feed ---------------- */}
          {sorted.length === 0 ? (
            <div style={{ borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, padding: '64px 16px', textAlign: 'center' }}>
              <div
                style={{
                  width: 52, height: 52, borderRadius: 16, margin: '0 auto 16px',
                  background: p.lightCard, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Megaphone size={22} style={{ color: p.tsub }} />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: p.tl, marginBottom: 4 }}>No announcements right now</div>
              <div style={{ fontSize: 12.5, color: p.tsub }}>Check back later for club news and updates.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sorted.map(a => {
                const unread = !readIds.has(a.id);
                const expanded = expandedId === a.id;
                const plainPreview = htmlToPreviewText(a.body_html);
                const attachmentCount = (a.attachments || []).length;

                return (
                  <div
                    key={a.id}
                    className="rac-ann-card"
                    style={{
                      borderRadius: 18,
                      background: p.dark,
                      color: p.tl,
                      border: `1px solid ${a.is_pinned ? p.green : (unread ? p.pillBorder : p.border)}`,
                      overflow: 'hidden',
                      boxShadow: expanded ? '0 4px 20px rgba(0,0,0,.18)' : 'none',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(a)}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 12,
                      }}
                    >
                      {/* Left accent rail — unread state reads instantly
                          without relying on a small dot alone; pinned
                          announcements get the club accent color even
                          when read, so they stay visually distinct in
                          the feed. */}
                      <div
                        style={{
                          width: 3, alignSelf: 'stretch', borderRadius: 3, flexShrink: 0, marginTop: 2, marginBottom: 2,
                          background: a.is_pinned ? p.green : unread ? p.green : 'transparent',
                          opacity: a.is_pinned ? 1 : unread ? 0.9 : 0,
                          minHeight: 20,
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                          {a.is_pinned && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#0d1a12', background: p.green, borderRadius: 6, padding: '2px 6px' }}>
                              <Pin size={9} /> Pinned
                            </span>
                          )}
                          <h3
                            style={{
                              fontSize: 15, fontWeight: unread ? 700 : 600, color: p.tl, margin: 0,
                              letterSpacing: '-.1px', lineHeight: 1.3,
                            }}
                          >
                            {a.title}
                          </h3>
                        </div>

                        {!expanded && (
                          <p
                            style={{
                              fontSize: 12.5, color: p.tsub, margin: '0 0 6px 0', lineHeight: 1.5,
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                            }}
                          >
                            {plainPreview || 'No content'}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: p.tmid }}>
                          <span>{timeAgo(a.published_at || a.created_at)}</span>
                          {attachmentCount > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Paperclip size={10.5} /> {attachmentCount}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronDown
                        size={16}
                        className="rac-ann-chevron"
                        style={{
                          color: p.tmid, flexShrink: 0, marginTop: 3,
                          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </button>

                    {expanded && (
                      <div className="rac-ann-expand-enter" style={{ padding: '0 18px 18px 18px', maxWidth: '100%', overflow: 'hidden' }}>
                        <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: 14 }}>
                          <AnnouncementBody html={a.body_html} />
                        </div>

                        {attachmentCount > 0 && (
                          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {a.attachments!.map((att, i) => (
                              <a
                                key={att.url + i}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                download
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: p.tl,
                                  textDecoration: 'none', padding: '9px 12px', borderRadius: 10,
                                  border: `1px solid ${p.border}`, background: p.lightCard,
                                }}
                              >
                                <Paperclip size={13} style={{ color: p.tmid, flexShrink: 0 }} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {att.name || att.url.split('/').pop()}
                                </span>
                                <Download size={13} style={{ color: p.tmid, flexShrink: 0 }} />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
