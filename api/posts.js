// api/posts.js
// Unified endpoint for all Facebook Page management actions: posting,
// scheduling, draft/approval workflow, and comment moderation.
// Dispatches on `action` in the POST body — one file, many operations.
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Uses a dedicated token for posting/comment actions, separate from the
// Messenger webhook's token — scoped narrowly to pages_manage_posts,
// pages_read_engagement, and pages_manage_engagement, with no overlap with
// the Messenger token's permissions.
const PAGE_TOKEN_MAP = {
  [process.env.PAGE_ID_1]: process.env.POSTS_PAGE_ACCESS_TOKEN,
  [process.env.PAGE_ID_2]: process.env.POSTS_PAGE_ACCESS_TOKEN_2,
};

function getPageToken(pageId) {
  return PAGE_TOKEN_MAP[pageId] || process.env.POSTS_PAGE_ACCESS_TOKEN;
}

const GRAPH_VERSION = 'v23.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// ── Graph API request helper ─────────────────────────────────────────
async function graphRequest(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Graph API error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── Post actions ──────────────────────────────────────────────────────
async function fbCreatePost(pageId, { message, link }) {
  const token = getPageToken(pageId);
  const body = new URLSearchParams({ message, access_token: token });
  if (link) body.set('link', link);
  return graphRequest(`${GRAPH_BASE}/${pageId}/feed`, { method: 'POST', body });
}

async function fbSchedulePost(pageId, { message, link, scheduledTime }) {
  const token = getPageToken(pageId);
  const unixTime = Math.floor(new Date(scheduledTime).getTime() / 1000);
  const body = new URLSearchParams({
    message,
    published: 'false',
    scheduled_publish_time: String(unixTime),
    access_token: token,
  });
  if (link) body.set('link', link);
  return graphRequest(`${GRAPH_BASE}/${pageId}/feed`, { method: 'POST', body });
}

async function fbUpdatePost(postId, pageId, message) {
  const token = getPageToken(pageId);
  const body = new URLSearchParams({ message, access_token: token });
  return graphRequest(`${GRAPH_BASE}/${postId}`, { method: 'POST', body });
}

async function fbDeletePost(postId, pageId) {
  const token = getPageToken(pageId);
  return graphRequest(`${GRAPH_BASE}/${postId}?access_token=${token}`, { method: 'DELETE' });
}

async function fbListScheduled(pageId) {
  const token = getPageToken(pageId);
  const data = await graphRequest(
    `${GRAPH_BASE}/${pageId}/scheduled_posts?fields=id,message,scheduled_publish_time&access_token=${token}`
  );
  return data.data || [];
}

async function fbListPublished(pageId, limit = 20) {
  const token = getPageToken(pageId);
  const data = await graphRequest(
    `${GRAPH_BASE}/${pageId}/posts?fields=id,message,created_time,permalink_url&limit=${limit}&access_token=${token}`
  );
  return data.data || [];
}

// ── Comment actions ───────────────────────────────────────────────────
async function fbListComments(postId, pageId) {
  const token = getPageToken(pageId);
  const data = await graphRequest(
    `${GRAPH_BASE}/${postId}/comments?fields=id,message,from,created_time,is_hidden&access_token=${token}`
  );
  return data.data || [];
}

async function fbReplyComment(commentId, pageId, message) {
  const token = getPageToken(pageId);
  const body = new URLSearchParams({ message, access_token: token });
  return graphRequest(`${GRAPH_BASE}/${commentId}/comments`, { method: 'POST', body });
}

async function fbHideComment(commentId, pageId, hide = true) {
  const token = getPageToken(pageId);
  const body = new URLSearchParams({ is_hidden: String(hide), access_token: token });
  return graphRequest(`${GRAPH_BASE}/${commentId}`, { method: 'POST', body });
}

async function fbDeleteComment(commentId, pageId) {
  const token = getPageToken(pageId);
  return graphRequest(`${GRAPH_BASE}/${commentId}?access_token=${token}`, { method: 'DELETE' });
}

// ── Draft / approval workflow ─────────────────────────────────────────
// Facebook has no concept of "pending admin approval" — that state lives
// entirely in Supabase. Only once approved does it ever touch Graph API.
async function saveDraft(pageId, { message, link, scheduledTime, createdBy }) {
  const { data, error } = await getSupabase().from('page_posts').insert({
    page_id: pageId,
    message,
    link: link || null,
    scheduled_time: scheduledTime || null,
    status: 'pending_approval',
    created_by: createdBy || null,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function listDrafts(pageId, status) {
  let query = getSupabase().from('page_posts').select('*').eq('page_id', pageId);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

async function approveDraft(id, approvedBy) {
  const sb = getSupabase();
  const { data: draft, error: fetchErr } = await sb.from('page_posts').select('*').eq('id', id).single();
  if (fetchErr || !draft) throw new Error('Draft not found');

  const isFuture = draft.scheduled_time && new Date(draft.scheduled_time) > new Date();
  const fbResult = isFuture
    ? await fbSchedulePost(draft.page_id, { message: draft.message, link: draft.link, scheduledTime: draft.scheduled_time })
    : await fbCreatePost(draft.page_id, { message: draft.message, link: draft.link });

  const { data: updated, error: updateErr } = await sb.from('page_posts').update({
    status: isFuture ? 'scheduled' : 'published',
    fb_post_id: fbResult.id,
    approved_by: approvedBy || null,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (updateErr) throw new Error(updateErr.message);
  return updated;
}

async function rejectDraft(id, reason) {
  const { data, error } = await getSupabase().from('page_posts').update({
    status: 'rejected',
    rejection_reason: reason || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Comment flagging (mirrors the chatbot's needs_human pattern) ──────
async function flagCommentHuman(pageId, fbCommentId, needsHuman = true) {
  const { data, error } = await getSupabase().from('page_comments').upsert({
    page_id: pageId,
    fb_comment_id: fbCommentId,
    needs_human: needsHuman,
  }, { onConflict: 'fb_comment_id' }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Main Handler ─────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, pageId } = req.body || {};
  if (!action) return res.status(400).json({ error: 'Missing "action"' });
  if (!pageId) return res.status(400).json({ error: 'Missing "pageId"' });

  console.log(`[Posts] action=${action} page=${pageId}`);

  try {
    switch (action) {
      // ── Direct posting ──
      case 'create': {
        const { message, link } = req.body;
        if (!message) return res.status(400).json({ error: 'message required' });
        const result = await fbCreatePost(pageId, { message, link });
        return res.status(200).json({ success: true, fb_post_id: result.id });
      }

      case 'schedule': {
        const { message, link, scheduledTime } = req.body;
        if (!message || !scheduledTime) return res.status(400).json({ error: 'message and scheduledTime required' });
        const result = await fbSchedulePost(pageId, { message, link, scheduledTime });
        return res.status(200).json({ success: true, fb_post_id: result.id });
      }

      case 'update': {
        const { postId, message } = req.body;
        if (!postId || !message) return res.status(400).json({ error: 'postId and message required' });
        await fbUpdatePost(postId, pageId, message);
        return res.status(200).json({ success: true });
      }

      case 'delete': {
        const { postId } = req.body;
        if (!postId) return res.status(400).json({ error: 'postId required' });
        await fbDeletePost(postId, pageId);
        return res.status(200).json({ success: true });
      }

      case 'list_scheduled': {
        const posts = await fbListScheduled(pageId);
        return res.status(200).json({ success: true, posts });
      }

      case 'list_published': {
        const { limit } = req.body;
        const posts = await fbListPublished(pageId, limit);
        return res.status(200).json({ success: true, posts });
      }

      // ── Draft / approval workflow ──
      case 'save_draft': {
        const { message, link, scheduledTime, createdBy } = req.body;
        if (!message) return res.status(400).json({ error: 'message required' });
        const draft = await saveDraft(pageId, { message, link, scheduledTime, createdBy });
        return res.status(200).json({ success: true, draft });
      }

      case 'list_drafts': {
        const { status } = req.body; // e.g. 'pending_approval', 'rejected'
        const drafts = await listDrafts(pageId, status);
        return res.status(200).json({ success: true, drafts });
      }

      case 'approve_draft': {
        const { id, approvedBy } = req.body;
        if (!id) return res.status(400).json({ error: 'id required' });
        const updated = await approveDraft(id, approvedBy);
        return res.status(200).json({ success: true, post: updated });
      }

      case 'reject_draft': {
        const { id, reason } = req.body;
        if (!id) return res.status(400).json({ error: 'id required' });
        const updated = await rejectDraft(id, reason);
        return res.status(200).json({ success: true, post: updated });
      }

      // ── Comments ──
      case 'list_comments': {
        const { postId } = req.body;
        if (!postId) return res.status(400).json({ error: 'postId required' });
        const comments = await fbListComments(postId, pageId);
        return res.status(200).json({ success: true, comments });
      }

      case 'reply_comment': {
        const { commentId, message } = req.body;
        if (!commentId || !message) return res.status(400).json({ error: 'commentId and message required' });
        const result = await fbReplyComment(commentId, pageId, message);
        return res.status(200).json({ success: true, reply_id: result.id });
      }

      case 'hide_comment': {
        const { commentId, hide } = req.body;
        if (!commentId) return res.status(400).json({ error: 'commentId required' });
        await fbHideComment(commentId, pageId, hide !== false);
        return res.status(200).json({ success: true });
      }

      case 'delete_comment': {
        const { commentId } = req.body;
        if (!commentId) return res.status(400).json({ error: 'commentId required' });
        await fbDeleteComment(commentId, pageId);
        return res.status(200).json({ success: true });
      }

      case 'flag_comment': {
        const { commentId, needsHuman } = req.body;
        if (!commentId) return res.status(400).json({ error: 'commentId required' });
        const flagged = await flagCommentHuman(pageId, commentId, needsHuman !== false);
        return res.status(200).json({ success: true, flagged });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[Posts] ${action} failed:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
