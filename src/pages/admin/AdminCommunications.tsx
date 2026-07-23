import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabase';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import {
  Megaphone, Pencil, Trash, Eye, Plus, Search, Pin, PinOff, Clock,
  Paperclip, X, Bold, Italic, List, ListOrdered, Link2, Heading2,
  Code2, PenSquare, Users, ShieldCheck, Calendar, AlertTriangle,
  FileText, Radio, RadioTower, Infinity as InfinityIcon,
} from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * AdminCommunications — full rebuild, v2.
 *
 * Visual identity mirrors AdminMembers.tsx exactly: same Inter font
 * loader, same font-scoping !important opt-out, same
 * getClubPalette(tenant.id, mode) palette, same 20px-radius card
 * language, same page-top "label + live clock" header row, same
 * loading-skeleton pattern. Only p.* keys already used elsewhere in
 * the shell are reused — no new palette keys invented.
 *
 * --------------------------- LIFECYCLE ---------------------------
 * status is one of: 'draft' | 'published' | 'unpublished' | 'expired'
 *
 *   draft        — being written, never shown to members, doesn't
 *                  count toward any published list.
 *   published    — admin explicitly published it. Visible to its
 *                  audience UNLESS expiry has passed (see below).
 *   unpublished  — admin explicitly took it down. A manual action,
 *                  distinct from expiry. Can be republished any time.
 *   expired      — a *computed*, not manually-chosen, state: a
 *                  published announcement whose expires_at has
 *                  passed. This is intentionally kept separate from
 *                  'unpublished' (per product decision) so admins can
 *                  see at a glance which announcements went dark
 *                  because of time vs. because someone pulled them.
 *                  is_permanent = true announcements can NEVER enter
 *                  this state, regardless of expires_at.
 *
 * Effective visibility to members = status is 'published' AND
 * (is_permanent OR !expires_at OR expires_at is in the future).
 *
 * There's no scheduled job in this codebase to flip DB rows the
 * instant expiry passes, so this component computes "effectively
 * expired" client-side on every read (isEffectivelyExpired below) and
 * *also* opportunistically writes status='expired' back to any row
 * it notices has silently expired, the moment the admin page loads.
 * This keeps the stored status eventually-consistent with reality
 * without requiring a cron/edge function right now. If/when a
 * scheduled job exists, this reconciliation call is safe to leave in
 * place (it's idempotent) or remove.
 *
 * --------------------------- SCHEMA ---------------------------
 *   id             uuid primary key
 *   tenant_id      text/uuid, required
 *   title          text, required
 *   body_html      text, required — single source of truth for body.
 *   attachments    jsonb — array of { url, public_id }
 *   target_roles   text[] — role ids this announcement is visible to.
 *   target_members text[] — specific member ids, additive with roles.
 *   target_all     boolean — true = visible to every member.
 *   is_pinned      boolean
 *   is_permanent   boolean — when true, expires_at is ignored for
 *                  visibility purposes; the announcement is always
 *                  visible to its audience as long as status is
 *                  'published'.
 *   status         text — 'draft' | 'published' | 'unpublished' | 'expired'
 *   expires_at     timestamptz, nullable — null means never expires
 *                  (independent of is_permanent; both can express "no
 *                  expiry" but is_permanent additionally survives a
 *                  *set* expiry being edited back in later).
 *   created_at     timestamptz
 *   updated_at     timestamptz
 *   published_at   timestamptz, nullable — set the first time status
 *                  transitions to 'published'.
 *   author_id      uuid
 *   author_name    text
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

/** 12-hour clock label, e.g. "3:21 PM" — identical to
 * AdminMembers/DashboardHome/DashboardProfile's formatClock(). */
function formatClock(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm} ${ampm}`;
}

type AnnouncementStatus = 'draft' | 'published' | 'unpublished' | 'expired';

interface RoleRow { id: string; name: string; label: string; color: string; is_system: boolean; }
interface MemberRow { id: string; name: string; email: string; role_id: string | null; }
interface Attachment { url: string; public_id: string; name?: string; }

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

/** True if a *published* row's expiry has passed and it isn't
 * permanent — i.e. it should be treated as expired regardless of
 * what's currently persisted in `status`. Used both to render the
 * badge and to decide which rows need reconciling back to the DB. */
function isEffectivelyExpired(a: Pick<AnnouncementRow, 'status' | 'expires_at' | 'is_permanent'>): boolean {
  if (a.is_permanent) return false;
  if (!a.expires_at) return false;
  if (a.status !== 'published' && a.status !== 'expired') return false;
  return new Date(a.expires_at).getTime() < Date.now();
}

/** The status to actually display/act on, folding in the client-side
 * expiry check even if the DB row hasn't been reconciled yet. */
function effectiveStatus(a: AnnouncementRow): AnnouncementStatus {
  if (isEffectivelyExpired(a)) return 'expired';
  return a.status;
}

const STATUS_META: Record<AnnouncementStatus, { label: string; icon: any }> = {
  draft: { label: 'Draft', icon: FileText },
  published: { label: 'Published', icon: RadioTower },
  unpublished: { label: 'Unpublished', icon: Radio },
  expired: { label: 'Expired', icon: AlertTriangle },
};

function statusBadgeColors(status: AnnouncementStatus, p: any, dark: boolean) {
  switch (status) {
    case 'published': return { color: p.av2, background: p.greenDeep };
    case 'draft': return { color: p.tmid, background: dark ? 'rgba(255,255,255,.06)' : '#f1efe9' };
    case 'unpublished': return { color: p.tmid, background: dark ? 'rgba(255,255,255,.06)' : '#f1efe9' };
    case 'expired': return { color: '#e08a72', background: 'rgba(224,138,114,.12)' };
  }
}

/** Renders a compact, human summary of who an announcement targets. */
function audienceSummary(a: AnnouncementRow, roleById: (id: string) => RoleRow | null, memberById: (id: string) => MemberRow | null): string {
  if (a.target_all) return 'All members';
  const parts: string[] = [];
  (a.target_roles || []).forEach(rid => {
    const r = roleById(rid);
    if (r) parts.push(r.label);
  });
  (a.target_members || []).forEach(mid => {
    const m = memberById(mid);
    if (m) parts.push(m.name);
  });
  if (parts.length === 0) return 'No audience set';
  if (parts.length <= 2) return parts.join(', ');
  return `${parts.slice(0, 2).join(', ')} +${parts.length - 2} more`;
}

/* ------------------------------- Rich text (WYSIWYG) editor ------------------------------- */

function RichTextEditor({
  html,
  onChange,
  inputStyle,
  p,
  dark,
}: {
  html: string;
  onChange: (html: string) => void;
  inputStyle: React.CSSProperties;
  p: any;
  dark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  // Only push external `html` into the DOM on first mount / when it
  // changes from *outside* (e.g. switching from HTML tab, or loading
  // an existing announcement into the form). Typing itself never
  // triggers this, avoiding cursor-jump issues with contentEditable.
  useEffect(() => {
    if (ref.current && (isFirstMount.current || ref.current.innerHTML !== html)) {
      ref.current.innerHTML = html || '';
      isFirstMount.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  const exec = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const toolbarBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 7, border: `1px solid ${p.border}`,
    background: dark ? 'rgba(255,255,255,.04)' : '#fff', color: p.tl, cursor: 'pointer',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, padding: '8px 2px', flexWrap: 'wrap' }}>
        <button type="button" title="Bold" style={toolbarBtn} onClick={() => exec('bold')}><Bold size={13} /></button>
        <button type="button" title="Italic" style={toolbarBtn} onClick={() => exec('italic')}><Italic size={13} /></button>
        <button type="button" title="Heading" style={toolbarBtn} onClick={() => exec('formatBlock', '<h2>')}><Heading2 size={13} /></button>
        <button type="button" title="Bullet list" style={toolbarBtn} onClick={() => exec('insertUnorderedList')}><List size={13} /></button>
        <button type="button" title="Numbered list" style={toolbarBtn} onClick={() => exec('insertOrderedList')}><ListOrdered size={13} /></button>
        <button
          type="button"
          title="Insert link"
          style={toolbarBtn}
          onClick={() => {
            const url = window.prompt('Link URL (include https://)');
            if (url) exec('createLink', url);
          }}
        >
          <Link2 size={13} />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        style={{
          ...inputStyle,
          minHeight: 220,
          maxHeight: 420,
          overflowY: 'auto',
          lineHeight: 1.55,
        }}
        data-placeholder="Write the announcement..."
        suppressContentEditableWarning
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: ${p.tmid};
          pointer-events: none;
        }
        [contenteditable] h2 { font-size: 1.25em; font-weight: 700; margin: .5em 0; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 1.4em; margin: .4em 0; }
        [contenteditable] a { color: ${p.green}; text-decoration: underline; }
      `}</style>
    </div>
  );
}

/* ------------------------------- HTML paste + preview editor ------------------------------- */

function HtmlSourceEditor({
  html,
  onChange,
  inputStyle,
  p,
  dark,
}: {
  html: string;
  onChange: (html: string) => void;
  inputStyle: React.CSSProperties;
  p: any;
  dark: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: p.tmid, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Code2 size={12} /> HTML source
        </div>
        <textarea
          value={html}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, minHeight: 220, maxHeight: 420, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, resize: 'vertical' }}
          placeholder="<p>Paste or write raw HTML here...</p>"
          spellCheck={false}
        />
      </div>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: p.tmid, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Eye size={12} /> Live preview
        </div>
        <div style={{ borderRadius: 10, border: `1px solid ${p.border}`, overflow: 'hidden', height: 220 }}>
          <iframe
            title="Announcement preview"
            srcDoc={`<!doctype html><html><head><style>
              body { font-family: Inter, system-ui, sans-serif; padding: 12px; color: ${dark ? '#e8e8e8' : '#1a1a1a'}; background: ${dark ? '#1a1a1a' : '#fff'}; font-size: 13px; line-height: 1.55; }
              img { max-width: 100%; }
              a { color: ${p.green}; }
            </style></head><body>${html || '<p style="opacity:.5">Preview will appear here...</p>'}</body></html>`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox=""
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Attachments (uses CloudinaryUpload's real multiple mode) ------------------------------- */

function AttachmentsUploader({
  attachments,
  onChange,
  p,
  dark,
}: {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  p: any;
  dark: boolean;
}) {
  return (
    <div>
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {attachments.map((att, i) => (
            <div
              key={att.url + i}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                borderRadius: 9, border: `1px solid ${p.border}`,
                background: dark ? 'rgba(255,255,255,.03)' : '#fff',
              }}
            >
              <Paperclip size={13} style={{ color: p.tmid, flexShrink: 0 }} />
              <a href={att.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: p.tl, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {att.name || att.url.split('/').pop()}
              </a>
              <button
                type="button"
                onClick={() => onChange(attachments.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid, flexShrink: 0 }}
                title="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {/* CloudinaryUpload's real `multiple` mode collects every file
          the admin adds in one widget session and flushes them all at
          once via onMultiUpload when the widget closes — so we append
          the whole batch to existing attachments in one call. */}
      <CloudinaryUpload
        onUpload={() => {}}
        multiple
        onMultiUpload={(urls: string[]) => {
          const additions: Attachment[] = urls.map(url => ({ url, public_id: '', name: url.split('/').pop() || 'file' }));
          onChange([...attachments, ...additions]);
        }}
        buttonText="Add attachment(s)"
      />
      <p style={{ fontSize: 10, color: p.tmid, marginTop: 4 }}>Any file type accepted. Add as many as needed in one go.</p>
    </div>
  );
}

export default function AdminCommunications() {
  const { profile, user, isMasterAdmin } = useAuth();
  const { adminTenant: tenant } = useAdminTenant();
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
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AnnouncementStatus>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewAnnouncement, setViewAnnouncement] = useState<AnnouncementRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  const [bodyTab, setBodyTab] = useState<'rich' | 'html'>('rich');

  const emptyForm = {
    id: null as string | null,
    title: '',
    body_html: '',
    attachments: [] as Attachment[],
    target_all: true,
    target_roles: [] as string[],
    target_members: [] as string[],
    is_pinned: false,
    is_permanent: false,
    expires_at: '' as string, // datetime-local value
    status: 'draft' as AnnouncementStatus,
  };
  const [formData, setFormData] = useState<typeof emptyForm>(emptyForm);
  const [memberSearch, setMemberSearch] = useState('');

  const { addToast } = useToast();

  const roleById = (id: string | null) => roles.find(r => r.id === id) || null;
  const memberById = (id: string | null) => members.find(m => m.id === id) || null;

  /** Reconciles any published-but-past-expiry rows to status='expired'
   * in the DB, so the persisted status doesn't silently drift from
   * reality. Best-effort — failures here don't block the page, since
   * isEffectivelyExpired() already covers display/logic correctness
   * even if this write fails or hasn't run yet. */
  const reconcileExpired = async (rows: AnnouncementRow[]) => {
    const staleIds = rows.filter(a => a.status === 'published' && isEffectivelyExpired(a)).map(a => a.id);
    if (staleIds.length === 0) return;
    try {
      await supabase.from('announcements').update({ status: 'expired' }).in('id', staleIds).eq('tenant_id', tenant.id);
    } catch (err) {
      console.error('Failed to reconcile expired announcements', err);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: annData, error: annErr }, { data: roleData, error: roleErr }, { data: memberData, error: memberErr }] = await Promise.all([
        supabase.from('announcements').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }),
        supabase.from('roles').select('*').eq('tenant_id', tenant.id),
        supabase.from('users').select('id, name, email, role_id').eq('tenant_id', tenant.id),
      ]);
      if (annErr) throw annErr;
      if (roleErr) throw roleErr;
      if (memberErr) throw memberErr;
      const rows = (annData || []) as AnnouncementRow[];
      setAnnouncements(rows);
      setRoles((roleData || []) as RoleRow[]);
      setMembers((memberData || []) as MemberRow[]);
      reconcileExpired(rows);
    } catch (err) {
      console.error(err);
      setError("Couldn't load announcements.");
      addToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id]);

  const filtered = announcements.filter(a => {
    const eff = effectiveStatus(a);
    if (statusFilter !== 'all' && eff !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!a.title?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setBodyTab('rich');
    setMemberSearch('');
  };

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (a: AnnouncementRow) => {
    setFormData({
      id: a.id,
      title: a.title || '',
      body_html: a.body_html || '',
      attachments: a.attachments || [],
      target_all: a.target_all,
      target_roles: a.target_roles || [],
      target_members: a.target_members || [],
      is_pinned: a.is_pinned || false,
      is_permanent: a.is_permanent || false,
      expires_at: a.expires_at ? toLocalInputValue(a.expires_at) : '',
      status: effectiveStatus(a),
    });
    setBodyTab('rich');
    setIsFormOpen(true);
  };

  const toggleRole = (roleId: string) => {
    setFormData(f => ({
      ...f,
      target_roles: f.target_roles.includes(roleId) ? f.target_roles.filter(r => r !== roleId) : [...f.target_roles, roleId],
    }));
  };

  const toggleMember = (memberId: string) => {
    setFormData(f => ({
      ...f,
      target_members: f.target_members.includes(memberId) ? f.target_members.filter(m => m !== memberId) : [...f.target_members, memberId],
    }));
  };

  const validate = (): boolean => {
    if (!formData.title.trim()) {
      addToast('Title is required', 'error');
      return false;
    }
    const plainText = formData.body_html.replace(/<[^>]*>/g, '').trim();
    if (!plainText) {
      addToast('Announcement body cannot be empty', 'error');
      return false;
    }
    if (!formData.target_all && formData.target_roles.length === 0 && formData.target_members.length === 0) {
      addToast('Choose an audience — All members, at least one role, or at least one member', 'error');
      return false;
    }
    if (!formData.is_permanent && formData.expires_at && new Date(formData.expires_at).getTime() <= Date.now()) {
      addToast('Expiry must be in the future', 'error');
      return false;
    }
    return true;
  };

  /** Shared save path for both "Save draft" and "Publish". `nextStatus`
   * is the status to persist; validation is skipped for drafts so
   * admins can save incomplete work-in-progress, but still enforced
   * for publish. */
  const handleSave = async (nextStatus: 'draft' | 'published') => {
    if (nextStatus === 'published' && !validate()) return;
    if (nextStatus === 'draft' && !formData.title.trim()) {
      addToast('Give the draft a title so you can find it later', 'error');
      return;
    }

    setSaving(nextStatus === 'draft' ? 'draft' : 'publish');
    try {
      const isNew = !formData.id;
      const wasPublishedBefore = !isNew && announcements.find(a => a.id === formData.id)?.published_at;
      const payload = {
        tenant_id: tenant.id,
        title: formData.title.trim(),
        body_html: formData.body_html,
        attachments: formData.attachments,
        target_all: formData.target_all,
        target_roles: formData.target_all ? [] : formData.target_roles,
        target_members: formData.target_all ? [] : formData.target_members,
        is_pinned: formData.is_pinned,
        is_permanent: formData.is_permanent,
        expires_at: formData.is_permanent || !formData.expires_at ? null : new Date(formData.expires_at).toISOString(),
        status: nextStatus,
        updated_at: new Date().toISOString(),
        ...(nextStatus === 'published' && !wasPublishedBefore ? { published_at: new Date().toISOString() } : {}),
        ...(isNew
          ? { id: crypto.randomUUID(), created_at: new Date().toISOString(), author_id: user?.id, author_name: profile?.name }
          : { id: formData.id }),
      };
      const { error: upsertErr } = await supabase.from('announcements').upsert(payload, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
      addToast(nextStatus === 'draft' ? 'Draft saved' : (isNew ? 'Announcement published' : 'Announcement updated'), 'success');
      setIsFormOpen(false);
      resetForm();
      fetchAll();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to save announcement', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', deleteId).eq('tenant_id', tenant.id);
      if (error) throw error;
      addToast('Announcement deleted', 'success');
      setDeleteId(null);
      fetchAll();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete announcement', 'error');
    }
  };

  const togglePin = async (a: AnnouncementRow) => {
    try {
      const { error } = await supabase.from('announcements').update({ is_pinned: !a.is_pinned }).eq('id', a.id).eq('tenant_id', tenant.id);
      if (error) throw error;
      fetchAll();
    } catch (err) {
      console.error(err);
      addToast('Failed to update pin', 'error');
    }
  };

  /** Publish / unpublish toggle from the list view, without opening
   * the composer. Only meaningful from published <-> unpublished;
   * drafts use "Publish" (via the composer) to go live the first
   * time, and expired rows should be edited (e.g. extend the date or
   * mark permanent) rather than blindly re-published. */
  const toggleLivePublish = async (a: AnnouncementRow) => {
    const eff = effectiveStatus(a);
    const nextStatus: AnnouncementStatus = eff === 'published' ? 'unpublished' : 'published';
    try {
      const patch: any = { status: nextStatus, updated_at: new Date().toISOString() };
      if (nextStatus === 'published' && !a.published_at) patch.published_at = new Date().toISOString();
      const { error } = await supabase.from('announcements').update(patch).eq('id', a.id).eq('tenant_id', tenant.id);
      if (error) throw error;
      addToast(nextStatus === 'published' ? 'Announcement published' : 'Announcement unpublished', 'success');
      fetchAll();
    } catch (err) {
      console.error(err);
      addToast('Failed to update status', 'error');
    }
  };

  const filteredMemberOptions = members.filter(m => {
    if (!memberSearch) return true;
    const s = memberSearch.toLowerCase();
    return m.name?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s);
  });

  /* ------------------------------- styling tokens (mirrors AdminMembers) ------------------------------- */

  const cardDark: React.CSSProperties = { borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}` };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 13,
    borderRadius: 10,
    border: `1px solid ${p.border}`,
    background: dark ? 'rgba(255,255,255,.04)' : '#fff',
    color: p.tl,
    outline: 'none',
  };
  const disabledInputStyle: React.CSSProperties = { ...inputStyle, opacity: 0.55, cursor: 'not-allowed' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: p.tmid, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' };

  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: p.green, color: '#0d1a12', border: 'none', borderRadius: 12,
    padding: '9px 16px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  };
  const outlineBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'none', color: p.tl, border: `1px solid ${p.pillBorder}`, borderRadius: 12,
    padding: '9px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
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
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div
            style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          <div
            style={{ height: 64, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          <div style={{ height: 420, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rac-comms-page">
      <style>{`
        .rac-comms-page, .rac-comms-page * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-comms-page ::-webkit-scrollbar { display: none; }
        .rac-comms-page input::placeholder, .rac-comms-page textarea::placeholder { color: ${p.tmid}; opacity: .8; }
        .rac-comms-page select { appearance: none; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 1080, margin: '0 auto', paddingBottom: 40 }}>

          {/* ---------------- page-top: title + live clock ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0 }}>Announcements</span>
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
                onClick={fetchAll}
                style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ---------------- filter bar ---------------- */}
          <div style={{ ...cardDark, padding: 14, marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tmid, background: p.lightCard, border: `1px solid ${p.border}`, borderRadius: 20, padding: '4px 10px', flexShrink: 0 }}>
              {tenant.id}
            </span>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: p.tmid }} />
              <input
                placeholder="Search announcements..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
              <option value="expired">Expired</option>
            </select>
            <button type="button" style={{ ...primaryBtn, marginLeft: 'auto' }} onClick={openNewForm}>
              <Plus size={15} /> New announcement
            </button>
          </div>

          {/* ---------------- list ---------------- */}
          {sorted.length === 0 ? (
            <div style={{ ...cardDark, padding: '56px 16px', textAlign: 'center' }}>
              <Megaphone size={32} style={{ margin: '0 auto 10px', opacity: 0.5, color: p.tsub }} />
              <div style={{ fontSize: 13, color: p.tsub }}>No announcements found</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sorted.map(a => {
                const eff = effectiveStatus(a);
                const meta = STATUS_META[eff];
                const StatusIcon = meta.icon;
                const badgeColors = statusBadgeColors(eff, p, dark);
                return (
                  <div
                    key={a.id}
                    style={{
                      ...cardDark,
                      padding: 16,
                      opacity: eff === 'expired' || eff === 'unpublished' ? 0.7 : 1,
                      borderColor: a.is_pinned ? p.green : p.border,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', borderRadius: 7, padding: '2px 7px', ...badgeColors }}>
                            <StatusIcon size={9} /> {meta.label}
                          </span>
                          {a.is_pinned && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: p.av2, background: p.greenDeep, borderRadius: 7, padding: '2px 7px' }}>
                              <Pin size={9} /> Pinned
                            </span>
                          )}
                          {a.is_permanent && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: p.tmid, background: dark ? 'rgba(255,255,255,.06)' : '#f1efe9', borderRadius: 7, padding: '2px 7px' }}>
                              <InfinityIcon size={9} /> Always visible
                            </span>
                          )}
                          <h3 style={{ fontSize: 15, fontWeight: 700, color: p.tl, margin: 0 }}>{a.title}</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: p.tsub }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {a.target_all ? <Users size={11} /> : <ShieldCheck size={11} />} {audienceSummary(a, roleById, memberById)}
                          </span>
                          {a.expires_at && !a.is_permanent && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={11} /> {eff === 'expired' ? 'Expired' : 'Expires'} {new Date(a.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {(a.attachments || []).length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Paperclip size={11} /> {a.attachments!.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                        {(eff === 'published' || eff === 'unpublished') && (
                          <button
                            onClick={() => toggleLivePublish(a)}
                            style={{ ...outlineBtn, padding: '6px 10px', fontSize: 11 }}
                            title={eff === 'published' ? 'Unpublish' : 'Publish'}
                          >
                            {eff === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                        )}
                        <button onClick={() => togglePin(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid }} title={a.is_pinned ? 'Unpin' : 'Pin'}>
                          {a.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
                        </button>
                        <button onClick={() => { setViewAnnouncement(a); setIsViewOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid }} title="Preview"><Eye size={16} /></button>
                        <button onClick={() => openEditForm(a)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid }} title="Edit"><Pencil size={16} /></button>
                        <button onClick={() => setDeleteId(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.tmid }} title="Delete"><Trash size={16} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- composer modal ---------------- */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit announcement' : 'New announcement'} size="lg">
        <div style={{ background: p.bg }} className="-m-4 md:-m-6 p-4 md:p-6">
          <div className="space-y-5">
            <div>
              <label style={labelStyle}>Title / Subject</label>
              <input
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                style={inputStyle}
                placeholder="Keep it brief and clear..."
              />
            </div>

            {/* Body — two tabs */}
            <div>
              <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${p.border}`, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setBodyTab('rich')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    background: 'none', border: 'none',
                    color: bodyTab === 'rich' ? p.tl : p.tmid,
                    borderBottom: bodyTab === 'rich' ? `2px solid ${p.green}` : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  <PenSquare size={13} /> Rich text
                </button>
                <button
                  type="button"
                  onClick={() => setBodyTab('html')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    background: 'none', border: 'none',
                    color: bodyTab === 'html' ? p.tl : p.tmid,
                    borderBottom: bodyTab === 'html' ? `2px solid ${p.green}` : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  <Code2 size={13} /> HTML
                </button>
              </div>

              {bodyTab === 'rich' ? (
                <RichTextEditor
                  html={formData.body_html}
                  onChange={html => setFormData(f => ({ ...f, body_html: html }))}
                  inputStyle={inputStyle}
                  p={p}
                  dark={dark}
                />
              ) : (
                <HtmlSourceEditor
                  html={formData.body_html}
                  onChange={html => setFormData(f => ({ ...f, body_html: html }))}
                  inputStyle={inputStyle}
                  p={p}
                  dark={dark}
                />
              )}
            </div>

            {/* Attachments */}
            <div>
              <label style={labelStyle}>Attachments</label>
              <AttachmentsUploader
                attachments={formData.attachments}
                onChange={att => setFormData(f => ({ ...f, attachments: att }))}
                p={p}
                dark={dark}
              />
            </div>

            {/* Visibility duration */}
            <div style={{ paddingTop: 8, borderTop: `1px solid ${p.border}` }}>
              <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tmid, margin: '14px 0 10px' }}>Visibility duration</h4>
              <label className="flex items-center gap-2 cursor-pointer select-none mb-3">
                <input
                  type="checkbox"
                  checked={formData.is_permanent}
                  onChange={e => setFormData(f => ({ ...f, is_permanent: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: p.tl }}>Always visible — ignore expiry, keep visible to the selected audience indefinitely</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Expires</label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={e => setFormData(f => ({ ...f, expires_at: e.target.value }))}
                    style={formData.is_permanent ? disabledInputStyle : inputStyle}
                    disabled={formData.is_permanent}
                  />
                  <p style={{ fontSize: 10, color: p.tmid, marginTop: 4 }}>
                    {formData.is_permanent ? 'Ignored while "Always visible" is checked.' : 'Leave blank for no automatic expiry.'}
                  </p>
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={e => setFormData(f => ({ ...f, is_pinned: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: p.tl }}>Pin to top of member dashboard</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Audience */}
            <div style={{ paddingTop: 8, borderTop: `1px solid ${p.border}` }}>
              <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tmid, margin: '14px 0 10px' }}>Visible to</h4>

              <label className="flex items-center gap-2 cursor-pointer select-none mb-3">
                <input
                  type="checkbox"
                  checked={formData.target_all}
                  onChange={e => setFormData(f => ({ ...f, target_all: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: p.tl }}>All members</span>
              </label>

              {!formData.target_all && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>By role</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', border: `1px solid ${p.border}`, borderRadius: 10, padding: 8 }}>
                      {roles.length === 0 && <span style={{ fontSize: 12, color: p.tmid }}>No roles found</span>}
                      {roles.map(r => (
                        <label key={r.id} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={formData.target_roles.includes(r.id)} onChange={() => toggleRole(r.id)} className="w-3.5 h-3.5" />
                          <span style={{ display: 'inline-flex', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: '#fff', borderRadius: 7, padding: '2px 7px', background: r.color || '#9ca3af' }}>
                            {r.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>By specific member</label>
                    <div style={{ position: 'relative', marginBottom: 6 }}>
                      <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: p.tmid }} />
                      <input
                        placeholder="Search members..."
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: 28, padding: '6px 10px 6px 28px', fontSize: 12.5 }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto', border: `1px solid ${p.border}`, borderRadius: 10, padding: 8 }}>
                      {filteredMemberOptions.length === 0 && <span style={{ fontSize: 12, color: p.tmid }}>No members found</span>}
                      {filteredMemberOptions.map(m => (
                        <label key={m.id} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" checked={formData.target_members.includes(m.id)} onChange={() => toggleMember(m.id)} className="w-3.5 h-3.5" />
                          <span style={{ fontSize: 12.5, color: p.tl }}>{m.name}</span>
                          <span style={{ fontSize: 10.5, color: p.tmid }}>{m.email}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 20, marginTop: 20, borderTop: `1px solid ${p.border}` }}>
            <button style={outlineBtn} onClick={() => setIsFormOpen(false)}>Cancel</button>
            <button style={{ ...outlineBtn, opacity: saving ? 0.7 : 1 }} onClick={() => handleSave('draft')} disabled={!!saving}>
              {saving === 'draft' ? 'Saving...' : 'Save draft'}
            </button>
            <button style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }} onClick={() => handleSave('published')} disabled={!!saving}>
              {saving === 'publish' ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ---------------- preview modal ---------------- */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Announcement preview">
        <div style={{ background: p.bg }} className="-m-4 md:-m-6 p-4 md:p-6">
          {viewAnnouncement && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {viewAnnouncement.is_pinned && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: p.av2, background: p.greenDeep, borderRadius: 7, padding: '2px 7px' }}>
                    <Pin size={9} /> Pinned
                  </span>
                )}
                <h3 style={{ fontSize: 18, fontWeight: 700, color: p.tl, margin: 0 }}>{viewAnnouncement.title}</h3>
              </div>
              <div style={{ fontSize: 11.5, color: p.tsub, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>{new Date(viewAnnouncement.created_at).toLocaleString()}</span>
                <span>{audienceSummary(viewAnnouncement, roleById, memberById)}</span>
                {viewAnnouncement.author_name && <span>By {viewAnnouncement.author_name}</span>}
              </div>
              <div style={{ borderRadius: 12, border: `1px solid ${p.border}`, overflow: 'hidden' }}>
                <iframe
                  title="Announcement content"
                  srcDoc={`<!doctype html><html><head><style>
                    body { font-family: Inter, system-ui, sans-serif; padding: 16px; color: ${dark ? '#e8e8e8' : '#1a1a1a'}; background: ${dark ? '#1a1a1a' : '#fff'}; font-size: 14px; line-height: 1.6; }
                    img { max-width: 100%; }
                    a { color: ${p.green}; }
                  </style></head><body>${viewAnnouncement.body_html}</body></html>`}
                  style={{ width: '100%', height: 260, border: 'none' }}
                  sandbox=""
                />
              </div>
              {(viewAnnouncement.attachments || []).length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: p.tmid, marginBottom: 8 }}>Attachments</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {viewAnnouncement.attachments!.map((att, i) => (
                      <a key={att.url + i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: p.tl, textDecoration: 'none', padding: '7px 10px', borderRadius: 9, border: `1px solid ${p.border}` }}>
                        <Paperclip size={13} style={{ color: p.tmid }} /> {att.name || att.url.split('/').pop()}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete announcement" message="Are you sure? This cannot be undone." />
    </div>
  );
}

/** Converts an ISO timestamp to the local value a <input type="datetime-local">
 * expects (YYYY-MM-DDTHH:mm), in the browser's local timezone. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

