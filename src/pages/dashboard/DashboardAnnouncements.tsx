import { supabase } from '../../supabase';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import { Megaphone, Pin, Paperclip, Download, Circle, CheckCheck } from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * DashboardAnnouncements — member-facing, full rebuild.
 *
 * Visual identity is pixel-matched to DashboardHome.tsx: same Inter
 * font loader, same scoped !important font opt-out, same
 * getClubPalette(tenant.id, mode) palette, same page-top "label +
 * live clock" row, same p.dark/p.lightCard card language, same
 * role="status"/aria-busy loading skeleton pattern. Only p.* keys
 * DashboardHome itself uses are reused here — no new palette keys
 * invented.
 *
 * --------------------------- SCHEMA ---------------------------
 * Reads the same `announcements` table AdminCommunications.tsx
 * writes (status / is_permanent / is_pinned / target_all /
 * target_roles / target_members / body_html / attachments / expires_at
 * — see that file's header comment for the full column list).
 *
 * Adds one new table for read-tracking:
 *   announcement_reads
 *     announcement_id  uuid, references announcements(id)
 *     user_id          uuid, references users(id)
 *     tenant_id        text — carried denormalized for RLS simplicity,
 *                      matching how every other tenant-scoped table in
 *                      this codebase filters (see AdminMembers.tsx,
 *                      DashboardHome.tsx's attendance/events queries).
 *     read_at          timestamptz
 *     primary key (announcement_id, user_id)
 *
 * --------------------------- VISIBILITY ---------------------------
 * A published announcement is visible to a member when:
 *   1. status === 'published' AND NOT effectively expired
 *      (effectively expired = has expires_at in the past AND is not
 *      permanent — same isEffectivelyExpired rule as the admin page,
 *      intentionally kept in lockstep with it so the two pages can
 *      never disagree about what "expired" means. Enforced here
 *      entirely client-side, per product decision: once a member's
 *      page renders, an expired announcement simply isn't included in
 *      what's shown — no DB write-back required for correctness on
 *      this page).
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

/** Rough guess at a file's kind from its URL, purely to pick an icon —
 * not used for anything functional. */
function isImageAttachment(att: Attachment): boolean {
  const s = (att.name || att.url || '').toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(s);
}

/** Plain-text preview for the collapsed card. Strips whole <style> and
 * <script> elements (contents included, not just the tags) before
 * stripping the remaining tags — full HTML email templates like the
 * club's formal announcement template embed a <style> block, and a
 * naive tag-only strip leaves its raw CSS sitting in the visible
 * preview text. */
function htmlToPreviewText(html: string): string {
  const withoutStyleScript = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ');
  return withoutStyleScript.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Renders an announcement's body_html inside a sandboxed, auto-height
 * iframe rather than injecting it into the page DOM directly.
 *
 * This matters specifically because full HTML email templates (like
 * the club's formal announcement template) are table-based layouts
 * with fixed pixel widths (e.g. max-width:600px) — that's correct and
 * necessary for email client compatibility, but dropped straight into
 * a normal responsive page via dangerouslySetInnerHTML it just sits
 * at its fixed width, forcing the whole page into horizontal scroll
 * on a phone and leaving no defined height, which is why the footer
 * below it visually detached from the card (the containing element
 * had nothing to size itself against).
 *
 * The iframe gets its own layout context, so:
 *  - a small injected <style> reset makes width:100%/max-width-only
 *    tables shrink to fit an actual phone screen instead of forcing
 *    horizontal scroll, while still respecting each table's own
 *    max-width on wider screens.
 *  - height is measured from the rendered content's real
 *    scrollHeight after each load and pushed back onto the iframe
 *    element, so the box always fits its content exactly — no fixed
 *    height guess, no internal scrollbar, no leftover blank space
 *    pushing the footer down.
 */
function AnnouncementBodyFrame({ html }: { html: string }) {
  const [height, setHeight] = useState(120);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const doc = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    html, body { margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', Times, serif; }
    /* Outermost full-bleed table (the EFEDF2 page-background wrapper
       every email template starts with) should fill the iframe width.
       Nested tables keep whatever width/max-width the template itself
       set (e.g. max-width:600px on the actual card) — forcing every
       table to 100% breaks the intentional narrower content column and
       is what caused the previous cut-off/collapse. */
    body > table { width: 100% !important; }
    img { max-width: 100%; height: auto; }
  </style></head><body>${html}</body></html>`;

  const measure = () => {
    const cdoc = frameRef.current?.contentDocument;
    if (!cdoc || !cdoc.body) return;
    const h = Math.max(cdoc.documentElement.scrollHeight, cdoc.body.scrollHeight);
    if (h > 0) setHeight(h);
  };

  const handleLoad = () => {
    measure();
    const cdoc = frameRef.current?.contentDocument;
    if (!cdoc || !cdoc.body) return;

    // Re-measure whenever the iframe's own content actually changes
    // size — covers images (including the header/footer logos and
    // social icons in the template) loading asynchronously after the
    // initial load event, web fonts swapping in, etc. This replaces a
    // fixed set of setTimeout guesses, which either fired too early
    // (before slow images finished) or left a gap if nothing changed
    // between the two checks.
    roRef.current?.disconnect();
    const ro = new ResizeObserver(() => measure());
    ro.observe(cdoc.body);
    roRef.current = ro;

    // Belt-and-suspenders: also catch every image's load/error event
    // directly, since a ResizeObserver on <body> won't necessarily
    // fire if an image loads into a fixed-size cell that doesn't
    // change the body's own box.
    cdoc.querySelectorAll('img').forEach((img) => {
      if (!(img as HTMLImageElement).complete) {
        img.addEventListener('load', measure, { once: true });
        img.addEventListener('error', measure, { once: true });
      }
    });
  };

  useEffect(() => {
    return () => roRef.current?.disconnect();
  }, []);

  return (
    <iframe
      ref={frameRef}
      title="Announcement content"
      srcDoc={doc}
      onLoad={handleLoad}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      style={{ width: '100%', height, border: 'none', display: 'block' }}
      scrolling="no"
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

  const markAsRead = useCallback(
    async (announcementId: string) => {
      if (!user || readIds.has(announcementId)) return;
      // Optimistic — the member has already seen the content the
      // instant they expand the card, so the UI shouldn't wait on a
      // round trip to reflect that.
      setReadIds(prev => new Set(prev).add(announcementId));
      try {
        const { error } = await supabase
          .from('announcement_reads')
          .upsert(
            { announcement_id: announcementId, user_id: user.id, tenant_id: tenant.id, read_at: new Date().toISOString() },
            { onConflict: 'announcement_id,user_id' }
          );
        if (error) throw error;
      } catch (err) {
        console.error('[announcements] Failed to record read state:', err);
        // Left as read in the UI even if the write failed — retrying
        // silently on every expand would be more disruptive than a
        // read receipt that doesn't durably persist this one time.
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
    setReadIds(prev => {
      const next = new Set(prev);
      unread.forEach(a => next.add(a.id));
      return next;
    });
    try {
      const rows = unread.map(a => ({ announcement_id: a.id, user_id: user.id, tenant_id: tenant.id, read_at: new Date().toISOString() }));
      const { error } = await supabase.from('announcement_reads').upsert(rows, { onConflict: 'announcement_id,user_id' });
      if (error) throw error;
    } catch (err) {
      console.error('[announcements] Failed to mark all as read:', err);
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
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div
            style={{ height: 44, borderRadius: 14, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{ height: 128, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
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
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 780, margin: '0 auto', paddingBottom: 40 }}>

          {/* ---------------- page-top: title + live clock ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Announcements
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 10.5, fontWeight: 700, color: '#0d1a12', background: p.green,
                    borderRadius: 20, padding: '2px 8px', letterSpacing: 0,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </span>
            <span style={{ fontSize: 24, color: p.ptxt, fontWeight: 600 }}>{clockLabel}</span>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                padding: 14, borderRadius: 12, marginBottom: 12, background: '#3a1a14', color: '#e08a72',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>
              <button
                onClick={fetchAnnouncements}
                style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}

          {sorted.length > 0 && unreadCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button
                type="button"
                onClick={markAllAsRead}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'none', color: p.tmid, border: `1px solid ${p.pillBorder}`, borderRadius: 20,
                  padding: '6px 12px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <CheckCheck size={13} /> Mark all as read
              </button>
            </div>
          )}

          {/* ---------------- feed ---------------- */}
          {sorted.length === 0 ? (
            <div style={{ borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, padding: '56px 16px', textAlign: 'center' }}>
              <Megaphone size={32} style={{ margin: '0 auto 10px', opacity: 0.5, color: p.tsub }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: p.tl, marginBottom: 4 }}>No announcements right now</div>
              <div style={{ fontSize: 12, color: p.tsub }}>Check back later for club news and updates.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sorted.map(a => {
                const unread = !readIds.has(a.id);
                const expanded = expandedId === a.id;
                const plainPreview = htmlToPreviewText(a.body_html);
                return (
                  <div
                    key={a.id}
                    style={{
                      borderRadius: 20,
                      background: p.dark,
                      color: p.tl,
                      border: `1px solid ${a.is_pinned ? p.green : p.border}`,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {a.is_pinned && (
                      <div
                        style={{
                          position: 'absolute', top: 0, right: 0,
                          background: p.green, color: '#0d1a12',
                          padding: '5px 12px', borderBottomLeftRadius: 14,
                          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Pin size={10} /> Pinned
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpanded(a)}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                        {unread && (
                          <Circle
                            size={7}
                            fill={p.green}
                            style={{ color: p.green, marginTop: 7, flexShrink: 0 }}
                          />
                        )}
                        <div style={{ minWidth: 0, flex: 1, paddingRight: a.is_pinned ? 70 : 0 }}>
                          <h3 style={{ fontSize: 15.5, fontWeight: 700, color: p.tl, margin: 0, letterSpacing: '-.1px' }}>{a.title}</h3>
                          <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 3 }}>
                            {timeAgo(a.published_at || a.created_at)}
                          </div>
                        </div>
                      </div>
                      {!expanded && (
                        <p style={{ fontSize: 12.5, color: p.tsub, margin: '2px 0 0 16px', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {plainPreview || 'No content'}
                        </p>
                      )}
                    </button>

                    {expanded && (
                      <div style={{ padding: '0 20px 20px 45px' }}>
                        <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${p.border}` }}>
                          <AnnouncementBodyFrame html={a.body_html} />
                        </div>
                        {(a.attachments || []).length > 0 && (
                          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {a.attachments!.map((att, i) => (
                              <a
                                key={att.url + i}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                download
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: p.tl,
                                  textDecoration: 'none', padding: '8px 11px', borderRadius: 10,
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

/**
 * ------------------------------------------------------------------
 * Migration notes — read-tracking table (run once, alongside the
 * announcements table migration in AdminCommunications.tsx):
 *
 * create table if not exists announcement_reads (
 *   announcement_id uuid not null references announcements(id) on delete cascade,
 *   user_id uuid not null,
 *   tenant_id text not null,
 *   read_at timestamptz not null default now(),
 *   primary key (announcement_id, user_id)
 * );
 * create index if not exists announcement_reads_user_idx
 *   on announcement_reads (tenant_id, user_id);
 *
 * RLS: members should only be able to upsert/select their own rows
 * (user_id = auth.uid()), scoped to their own tenant_id — matching
 * the RLS pattern already used on `attendance` and other per-member
 * tables in this schema.
 * ------------------------------------------------------------------
 */
