import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import {
  Pencil, Clock, FileText, CheckCircle2, MessageCircle, Send, Plus,
  Trash2, RefreshCw, ExternalLink, Eye, EyeOff, AlertTriangle, XCircle
} from 'lucide-react';

const PAGE_ID_MAP: Record<string, string> = {
  icdlu: import.meta.env.VITE_PAGE_ID_1 || '102656195442065',
  racdlu: import.meta.env.VITE_PAGE_ID_2 || '1051034934769596',
};

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] transition-colors bg-white text-gray-900 placeholder:text-gray-400";
const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

type TabId = 'compose' | 'scheduled' | 'drafts' | 'published' | 'comments';

interface FBPost { id: string; message?: string; created_time?: string; permalink_url?: string; scheduled_publish_time?: number; }
interface Draft {
  id: string; page_id: string; message: string; link?: string; status: string;
  scheduled_time?: string; created_by?: string; approved_by?: string;
  rejection_reason?: string; created_at: string; fb_post_id?: string;
}
interface FBComment { id: string; message: string; from?: { name: string; id: string }; created_time: string; is_hidden?: boolean; }

function truncate(s: string | undefined, n: number) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function formatDate(iso?: string | number) {
  if (!iso) return '';
  const d = typeof iso === 'number' ? new Date(iso * 1000) : new Date(iso);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

const STATUS_STYLES: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  published: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

export default function PostManager() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const pageId = PAGE_ID_MAP[tenant.id] || PAGE_ID_MAP['icdlu'];

  const [activeTab, setActiveTab] = useState<TabId>('compose');
  const [adminName, setAdminName] = useState('');

  // Compose
  const [composeMessage, setComposeMessage] = useState('');
  const [composeLink, setComposeLink] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [posting, setPosting] = useState<'now' | 'schedule' | 'draft' | null>(null);

  // Scheduled
  const [scheduledPosts, setScheduledPosts] = useState<FBPost[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // Drafts
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [draftFilter, setDraftFilter] = useState<'pending_approval' | 'rejected' | 'all'>('pending_approval');

  // Published
  const [publishedPosts, setPublishedPosts] = useState<FBPost[]>([]);
  const [loadingPublished, setLoadingPublished] = useState(false);

  // Comments
  const [commentsPostId, setCommentsPostId] = useState('');
  const [comments, setComments] = useState<FBComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  // Edit post modal
  const [editModal, setEditModal] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reject draft modal
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectingDraftId, setRejectingDraftId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function postsAPI(action: string, payload: Record<string, any> = {}) {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, pageId, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
    return data;
  }

  const fetchScheduled = async () => {
    setLoadingScheduled(true);
    try { const data = await postsAPI('list_scheduled'); setScheduledPosts(data.posts || []); }
    catch { addToast('Failed to load scheduled posts', 'error'); }
    finally { setLoadingScheduled(false); }
  };

  const fetchDrafts = async (status: string) => {
    setLoadingDrafts(true);
    try {
      const data = await postsAPI('list_drafts', status !== 'all' ? { status } : {});
      setDrafts(data.drafts || []);
    } catch { addToast('Failed to load drafts', 'error'); }
    finally { setLoadingDrafts(false); }
  };

  const fetchPublished = async () => {
    setLoadingPublished(true);
    try { const data = await postsAPI('list_published', { limit: 20 }); setPublishedPosts(data.posts || []); }
    catch { addToast('Failed to load published posts', 'error'); }
    finally { setLoadingPublished(false); }
  };

  const fetchComments = async (postId: string) => {
    if (!postId) return;
    setLoadingComments(true);
    try { const data = await postsAPI('list_comments', { postId }); setComments(data.comments || []); }
    catch { addToast('Failed to load comments', 'error'); }
    finally { setLoadingComments(false); }
  };

  useEffect(() => {
    if (activeTab === 'scheduled') fetchScheduled();
    if (activeTab === 'drafts') fetchDrafts(draftFilter);
    if (activeTab === 'published') fetchPublished();
    if (activeTab === 'comments' && publishedPosts.length === 0) fetchPublished();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pageId]);

  useEffect(() => { if (activeTab === 'drafts') fetchDrafts(draftFilter); }, [draftFilter]);

  const resetCompose = () => { setComposeMessage(''); setComposeLink(''); setScheduleEnabled(false); setScheduleTime(''); };

  const handlePostNow = async () => {
    if (!composeMessage.trim()) { addToast('Message required', 'error'); return; }
    setPosting('now');
    try {
      await postsAPI('create', { message: composeMessage.trim(), link: composeLink.trim() || undefined });
      addToast('Posted to Facebook!', 'success');
      resetCompose();
    } catch (e: any) { addToast(e.message || 'Failed to post', 'error'); }
    finally { setPosting(null); }
  };

  const handleSchedulePost = async () => {
    if (!composeMessage.trim() || !scheduleTime) { addToast('Message and schedule time required', 'error'); return; }
    setPosting('schedule');
    try {
      await postsAPI('schedule', {
        message: composeMessage.trim(),
        link: composeLink.trim() || undefined,
        scheduledTime: new Date(scheduleTime).toISOString(),
      });
      addToast('Post scheduled!', 'success');
      resetCompose();
      setActiveTab('scheduled');
    } catch (e: any) { addToast(e.message || 'Failed to schedule', 'error'); }
    finally { setPosting(null); }
  };

  const handleSaveDraft = async () => {
    if (!composeMessage.trim()) { addToast('Message required', 'error'); return; }
    setPosting('draft');
    try {
      await postsAPI('save_draft', {
        message: composeMessage.trim(),
        link: composeLink.trim() || undefined,
        scheduledTime: scheduleEnabled && scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
        createdBy: adminName.trim() || undefined,
      });
      addToast('Saved for approval', 'success');
      resetCompose();
      setActiveTab('drafts');
    } catch (e: any) { addToast(e.message || 'Failed to save draft', 'error'); }
    finally { setPosting(null); }
  };

  const handleApprove = async (draft: Draft) => {
    if (!window.confirm(`Publish this post${draft.scheduled_time ? ' on its scheduled time' : ' now'}?`)) return;
    try {
      await postsAPI('approve_draft', { id: draft.id, approvedBy: adminName.trim() || undefined });
      addToast('Approved and sent to Facebook', 'success');
      fetchDrafts(draftFilter);
    } catch (e: any) { addToast(e.message || 'Failed to approve', 'error'); }
  };

  const openReject = (draftId: string) => { setRejectingDraftId(draftId); setRejectReason(''); setRejectModal(true); };

  const submitReject = async () => {
    if (!rejectingDraftId) return;
    try {
      await postsAPI('reject_draft', { id: rejectingDraftId, reason: rejectReason.trim() || undefined });
      addToast('Draft rejected', 'success');
      setRejectModal(false);
      fetchDrafts(draftFilter);
    } catch (e: any) { addToast(e.message || 'Failed to reject', 'error'); }
  };

  const openEdit = (post: { id: string; message?: string }) => {
    setEditingPostId(post.id);
    setEditText(post.message || '');
    setEditModal(true);
  };

  const submitEdit = async () => {
    if (!editingPostId) return;
    setSavingEdit(true);
    try {
      await postsAPI('update', { postId: editingPostId, message: editText.trim() });
      addToast('Post updated', 'success');
      setEditModal(false);
      if (activeTab === 'scheduled') fetchScheduled();
      if (activeTab === 'published') fetchPublished();
    } catch (e: any) { addToast(e.message || 'Failed to update', 'error'); }
    finally { setSavingEdit(false); }
  };

  const handleDeletePost = async (postId: string, which: 'scheduled' | 'published') => {
    if (!window.confirm('Delete this post from Facebook? This cannot be undone.')) return;
    try {
      await postsAPI('delete', { postId });
      addToast('Post deleted', 'success');
      if (which === 'scheduled') fetchScheduled(); else fetchPublished();
    } catch (e: any) { addToast(e.message || 'Failed to delete', 'error'); }
  };

  const handleSelectPostForComments = (postId: string) => {
    setCommentsPostId(postId);
    if (postId) fetchComments(postId);
    else setComments([]);
  };

  const handleReply = async (commentId: string) => {
    const text = (replyDrafts[commentId] || '').trim();
    if (!text) return;
    setReplyingId(commentId);
    try {
      await postsAPI('reply_comment', { commentId, message: text });
      addToast('Reply sent', 'success');
      setReplyDrafts(prev => ({ ...prev, [commentId]: '' }));
      fetchComments(commentsPostId);
    } catch (e: any) { addToast(e.message || 'Failed to reply', 'error'); }
    finally { setReplyingId(null); }
  };

  const handleToggleHide = async (comment: FBComment) => {
    try {
      await postsAPI('hide_comment', { commentId: comment.id, hide: !comment.is_hidden });
      addToast(comment.is_hidden ? 'Comment unhidden' : 'Comment hidden', 'success');
      fetchComments(commentsPostId);
    } catch (e: any) { addToast(e.message || 'Failed', 'error'); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await postsAPI('delete_comment', { commentId });
      addToast('Comment deleted', 'success');
      fetchComments(commentsPostId);
    } catch (e: any) { addToast(e.message || 'Failed to delete', 'error'); }
  };

  const handleFlagComment = async (commentId: string) => {
    try {
      await postsAPI('flag_comment', { commentId, needsHuman: true });
      addToast('Flagged for human follow-up', 'success');
    } catch (e: any) { addToast(e.message || 'Failed to flag', 'error'); }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'compose', label: 'Compose', icon: <Pencil size={14} /> },
    { id: 'scheduled', label: 'Scheduled', icon: <Clock size={14} /> },
    { id: 'drafts', label: 'Drafts', icon: <FileText size={14} /> },
    { id: 'published', label: 'Published', icon: <CheckCircle2 size={14} /> },
    { id: 'comments', label: 'Comments', icon: <MessageCircle size={14} /> },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-gray-900">Post Manager</h1>
          <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">{tenant.id}</span>
        </div>
        <input
          value={adminName}
          onChange={e => setAdminName(e.target.value)}
          placeholder="Your name (for drafts/approvals)"
          className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 w-56"
        />
      </div>

      {/* Custom Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">

          {/* ── COMPOSE ── */}
          {activeTab === 'compose' && (
            <div className="max-w-2xl space-y-4">
              <div>
                <label className={labelClass}>Message</label>
                <textarea value={composeMessage} onChange={e => setComposeMessage(e.target.value)}
                  rows={6} className={inputClass} placeholder="What's happening with the club?" />
              </div>
              <div>
                <label className={labelClass}>Link <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                <input value={composeLink} onChange={e => setComposeLink(e.target.value)} className={inputClass} placeholder="https://..." />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="scheduleToggle" checked={scheduleEnabled}
                  onChange={e => setScheduleEnabled(e.target.checked)} className="w-4 h-4 accent-[var(--color-accent)]" />
                <label htmlFor="scheduleToggle" className="text-sm font-medium text-gray-700">Schedule for later</label>
              </div>
              {scheduleEnabled && (
                <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className={inputClass} />
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {!scheduleEnabled ? (
                  <button onClick={handlePostNow} disabled={posting !== null}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-opacity">
                    <Send size={13} />{posting === 'now' ? 'Posting...' : 'Post Now'}
                  </button>
                ) : (
                  <button onClick={handleSchedulePost} disabled={posting !== null}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-opacity">
                    <Clock size={13} />{posting === 'schedule' ? 'Scheduling...' : 'Schedule'}
                  </button>
                )}
                <button onClick={handleSaveDraft} disabled={posting !== null}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold disabled:opacity-50 hover:bg-gray-50 transition-colors">
                  <FileText size={13} />{posting === 'draft' ? 'Saving...' : 'Save for Approval'}
                </button>
              </div>
              <p className="text-xs text-gray-400">"Save for Approval" doesn't touch Facebook until someone approves it under the Drafts tab.</p>
            </div>
          )}

          {/* ── SCHEDULED ── */}
          {activeTab === 'scheduled' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-gray-900">Scheduled Posts</h2>
                <button onClick={fetchScheduled} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  <RefreshCw size={12} />Refresh
                </button>
              </div>
              {loadingScheduled ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
              ) : scheduledPosts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <Clock size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400 font-medium">No scheduled posts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduledPosts.map(p => (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-800 flex-1">{p.message}</p>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><Pencil size={12} /></button>
                          <button onClick={() => handleDeletePost(p.id, 'scheduled')} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100 flex items-center gap-1">
                        <Clock size={10} />Publishes {formatDate(p.scheduled_publish_time)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DRAFTS ── */}
          {activeTab === 'drafts' && (
            <div>
              <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-gray-900">Drafts &amp; Approvals</h2>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  {(['pending_approval', 'rejected', 'all'] as const).map(f => (
                    <button key={f} onClick={() => setDraftFilter(f)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                        draftFilter === f ? 'bg-[var(--color-accent)] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}>
                      {f === 'pending_approval' ? 'Pending' : f === 'rejected' ? 'Rejected' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
              {loadingDrafts ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400 font-medium">No drafts here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {drafts.map(d => (
                    <div key={d.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                        {d.status === 'pending_approval' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleApprove(d)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                              <CheckCircle2 size={11} />Approve
                            </button>
                            <button onClick={() => openReject(d.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors">
                              <XCircle size={11} />Reject
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-800">{d.message}</p>
                      {d.link && <p className="text-xs text-blue-500 mt-1 truncate">{d.link}</p>}
                      {d.rejection_reason && <p className="text-xs text-red-500 mt-1.5">Reason: {d.rejection_reason}</p>}
                      <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">
                        {d.created_by ? `By ${d.created_by} · ` : ''}{formatDate(d.created_at)}
                        {d.scheduled_time ? ` · scheduled for ${formatDate(d.scheduled_time)}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PUBLISHED ── */}
          {activeTab === 'published' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-gray-900">Published Posts</h2>
                <button onClick={fetchPublished} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  <RefreshCw size={12} />Refresh
                </button>
              </div>
              {loadingPublished ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
              ) : publishedPosts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400 font-medium">No posts yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {publishedPosts.map(p => (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-800 flex-1">{truncate(p.message, 280)}</p>
                        <div className="flex gap-1 shrink-0">
                          {p.permalink_url && (
                            <a href={p.permalink_url} target="_blank" rel="noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><ExternalLink size={12} /></a>
                          )}
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><Pencil size={12} /></button>
                          <button onClick={() => handleDeletePost(p.id, 'published')} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">{formatDate(p.created_time)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMMENTS ── */}
          {activeTab === 'comments' && (
            <div>
              <div className="mb-3">
                <label className={labelClass}>Select a post</label>
                <select value={commentsPostId} onChange={e => handleSelectPostForComments(e.target.value)} className={inputClass}>
                  <option value="">— choose a published post —</option>
                  {publishedPosts.map(p => (
                    <option key={p.id} value={p.id}>{truncate(p.message, 60) || p.id}</option>
                  ))}
                </select>
              </div>

              {!commentsPostId ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400 font-medium">Pick a post to see its comments</p>
                </div>
              ) : loadingComments ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-400 font-medium">No comments on this post</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {comments.map(c => (
                    <div key={c.id} className={`border rounded-xl p-3 bg-white ${c.is_hidden ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-800">{c.from?.name || 'Unknown'}</span>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleFlagComment(c.id)} title="Flag for human follow-up"
                            className="p-1 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><AlertTriangle size={12} /></button>
                          <button onClick={() => handleToggleHide(c)} title={c.is_hidden ? 'Unhide' : 'Hide'}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                            {c.is_hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button onClick={() => handleDeleteComment(c.id)} title="Delete"
                            className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{c.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(c.created_time)}</p>
                      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                        <input
                          value={replyDrafts[c.id] || ''}
                          onChange={e => setReplyDrafts(prev => ({ ...prev, [c.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleReply(c.id); }}
                          placeholder="Reply..."
                          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
                        />
                        <button onClick={() => handleReply(c.id)} disabled={replyingId === c.id || !(replyDrafts[c.id] || '').trim()}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs disabled:opacity-40 hover:opacity-90 transition-opacity">
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Post Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Post">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Message</label>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={6} className={inputClass} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </div>
      </Modal>

      {/* Reject Draft Modal */}
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Draft">
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Reason <span className="text-gray-400 font-normal text-xs">(optional, shown to the author)</span></label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className={inputClass} placeholder="Why is this being rejected?" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button onClick={submitReject}>Reject</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
