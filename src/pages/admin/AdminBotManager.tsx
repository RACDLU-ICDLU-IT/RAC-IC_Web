import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import {
  Bot, Send, Pause, Play, Trash2, Plus, BookOpen,
  MessageSquare, Settings, RefreshCw, User, Tag
} from 'lucide-react';

const PAGE_ID_MAP: Record<string, string> = {
  icdlu: import.meta.env.VITE_PAGE_ID_1 || '102656195442065',
  racdlu: import.meta.env.VITE_PAGE_ID_2 || '1051034934769596',
};

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) { console.warn('[Embed] API error', res.status); return null; }
    const data = await res.json();
    return data.embedding || null;
  } catch (e) { console.error('[Embed]', e); return null; }
}

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white";
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

// ── Types ─────────────────────────────────────────────────────────────
interface Conversation { psid: string; page_id: string; last_msg: string; last_at: string; paused: boolean; msg_count: number; }
interface Message { id: string; psid: string; page_id: string; role: string; content: string; created_at: string; }
interface KnowledgeItem { id: string; page_id: string; topic: string; keywords: string[]; content: string; created_at: string; }

export default function AdminBotManager() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const pageId = PAGE_ID_MAP[tenant.id] || PAGE_ID_MAP['icdlu'];

  const [activeTab, setActiveTab] = useState('conversations');

  // ── Conversations ──
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [selectedPsid, setSelectedPsid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  // ── System Prompt ──
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);

  // ── Knowledge Base ──
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loadingKb, setLoadingKb] = useState(false);
  const [kbModal, setKbModal] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeItem | null>(null);
  const [kbForm, setKbForm] = useState({ topic: '', keywords: '', content: '' });
  const [savingKb, setSavingKb] = useState(false);

  // ── Load conversations ──
  const fetchConvos = async () => {
    setLoadingConvos(true);
    try {
      const { data: msgs } = await supabase
        .from('bot_conversations')
        .select('psid, page_id, content, role, created_at')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });

      const { data: paused } = await supabase
        .from('bot_paused')
        .select('psid')
        .eq('page_id', pageId);

      const pausedSet = new Set((paused || []).map((p: any) => p.psid));
      const map = new Map<string, Conversation>();

      (msgs || []).forEach((m: any) => {
        if (!map.has(m.psid)) {
          map.set(m.psid, {
            psid: m.psid, page_id: m.page_id,
            last_msg: m.content, last_at: m.created_at,
            paused: pausedSet.has(m.psid), msg_count: 1
          });
        } else {
          map.get(m.psid)!.msg_count++;
        }
      });

      setConvos(Array.from(map.values()));
    } catch { addToast('Failed to load conversations', 'error'); }
    finally { setLoadingConvos(false); }
  };

  // ── Load messages for psid ──
  const fetchMessages = async (psid: string) => {
    setLoadingMsgs(true);
    try {
      const { data } = await supabase
        .from('bot_conversations')
        .select('*')
        .eq('page_id', pageId)
        .eq('psid', psid)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    } catch { addToast('Failed to load messages', 'error'); }
    finally { setLoadingMsgs(false); }
  };

  // ── Load system prompt ──
  const fetchSystemPrompt = async () => {
    const { data } = await supabase
      .from('bot_config')
      .select('value')
      .eq('page_id', pageId)
      .eq('key', 'system_prompt')
      .single();
    if (data?.value) setSystemPrompt(data.value);
  };

  // ── Load knowledge base ──
  const fetchKnowledge = async () => {
    setLoadingKb(true);
    const { data } = await supabase
      .from('bot_knowledge')
      .select('*')
      .eq('page_id', pageId)
      .order('created_at', { ascending: false });
    setKnowledge(data || []);
    setLoadingKb(false);
  };

  useEffect(() => {
    fetchConvos();
    fetchSystemPrompt();
    fetchKnowledge();
  }, [pageId]);

  useEffect(() => {
    if (selectedPsid) fetchMessages(selectedPsid);
  }, [selectedPsid]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Pause / Resume ──
  const togglePause = async (psid: string, currentlyPaused: boolean) => {
    try {
      if (currentlyPaused) {
        await supabase.from('bot_paused').delete().eq('psid', psid).eq('page_id', pageId);
        addToast('Bot resumed', 'success');
      } else {
        await supabase.from('bot_paused').upsert({ psid, page_id: pageId, paused_at: new Date().toISOString(), auto_resume_at: null });
        addToast('Bot paused — you have control', 'success');
      }
      fetchConvos();
      if (selectedPsid === psid) {
        setConvos(prev => prev.map(c => c.psid === psid ? { ...c, paused: !currentlyPaused } : c));
      }
    } catch { addToast('Failed to toggle pause', 'error'); }
  };

  // ── Send admin reply ──
  const sendReply = async () => {
    if (!replyText.trim() || !selectedPsid) return;
    setSending(true);
    try {
      // Call Meta Graph API via Vercel serverless
      const res = await fetch('/api/admin-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psid: selectedPsid, pageId, text: replyText.trim() })
      });
      if (!res.ok) throw new Error('Send failed');

      // Save to DB
      await supabase.from('bot_conversations').insert({
        psid: selectedPsid, page_id: pageId, role: 'admin', content: replyText.trim()
      });

      setReplyText('');
      fetchMessages(selectedPsid);
      addToast('Message sent', 'success');
    } catch { addToast('Failed to send message', 'error'); }
    finally { setSending(false); }
  };

  // ── Clear conversation ──
  const clearConvo = async (psid: string) => {
    if (!window.confirm('Delete all messages for this user?')) return;
    await supabase.from('bot_conversations').delete().eq('psid', psid).eq('page_id', pageId);
    if (selectedPsid === psid) { setSelectedPsid(null); setMessages([]); }
    fetchConvos();
    addToast('Conversation cleared', 'success');
  };

  // ── Save system prompt ──
  const saveSystemPrompt = async () => {
    setSavingPrompt(true);
    try {
      await supabase.from('bot_config').upsert(
        { page_id: pageId, key: 'system_prompt', value: systemPrompt, updated_at: new Date().toISOString() },
        { onConflict: 'page_id,key' }
      );
      addToast('System prompt saved', 'success');
    } catch { addToast('Failed to save prompt', 'error'); }
    finally { setSavingPrompt(false); }
  };

  // ── Save knowledge item ──
  const saveKnowledge = async () => {
    if (!kbForm.topic || !kbForm.content) { addToast('Topic and content required', 'error'); return; }
    setSavingKb(true);
    try {
      const keywords = kbForm.keywords.split(',').map(k => k.trim()).filter(Boolean);

      const embText = `${kbForm.topic} ${kbForm.keywords} ${kbForm.content}`;
      const embedding = await generateEmbedding(embText);
      if (!embedding) addToast('Saved without embedding (check VITE_GEMINI_API_KEY)', 'warning');

      if (editingKb) {
        await supabase.from('bot_knowledge').update({
          topic: kbForm.topic, keywords, content: kbForm.content,
          embedding, updated_at: new Date().toISOString()
        }).eq('id', editingKb.id);
      } else {
        await supabase.from('bot_knowledge').insert({
          page_id: pageId, topic: kbForm.topic, keywords, content: kbForm.content, embedding
        });
      }

      addToast('Knowledge saved', 'success');
      setKbModal(false);
      setEditingKb(null);
      setKbForm({ topic: '', keywords: '', content: '' });
      fetchKnowledge();
    } catch { addToast('Failed to save knowledge', 'error'); }
    finally { setSavingKb(false); }
  };

  const deleteKnowledge = async (id: string) => {
    if (!window.confirm('Delete this knowledge entry?')) return;
    await supabase.from('bot_knowledge').delete().eq('id', id);
    fetchKnowledge();
    addToast('Deleted', 'success');
  };

  const selectedConvo = convos.find(c => c.psid === selectedPsid);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-gray-900">Bot Manager</h1>
          <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
            {tenant.id}
          </span>
        </div>
        <Button variant="outline" onClick={() => { fetchConvos(); fetchKnowledge(); }}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="conversations"><MessageSquare size={14} className="mr-1.5" />Conversations</TabsTrigger>
          <TabsTrigger value="knowledge"><BookOpen size={14} className="mr-1.5" />Knowledge Base</TabsTrigger>
          <TabsTrigger value="settings"><Settings size={14} className="mr-1.5" />AI Settings</TabsTrigger>
        </TabsList>

        {/* ── CONVERSATIONS TAB ── */}
        <TabsContent value="conversations">
          <div className="flex gap-4 h-[600px]">

            {/* Left: convo list */}
            <div className="w-80 shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-bold uppercase text-gray-500">
                  {convos.length} Conversations
                </span>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                {loadingConvos ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
                ) : convos.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No conversations yet</div>
                ) : convos.map(c => (
                  <button
                    key={c.psid}
                    onClick={() => setSelectedPsid(c.psid)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedPsid === c.psid ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                          <User size={12} className="text-gray-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[100px]">{c.psid.slice(-8)}</span>
                      </div>
                      {c.paused && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">PAUSED</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate pl-9">{c.last_msg}</p>
                    <p className="text-[10px] text-gray-400 pl-9 mt-0.5">
                      {new Date(c.last_at).toLocaleDateString()} · {c.msg_count} msgs
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: chat view */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
              {!selectedPsid ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                  <Bot size={40} className="opacity-30" />
                  <span className="text-sm">Select a conversation</span>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-gray-800">PSID: {selectedPsid}</span>
                      {selectedConvo?.paused && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">BOT PAUSED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => togglePause(selectedPsid, selectedConvo?.paused || false)}
                      >
                        {selectedConvo?.paused
                          ? <><Play size={12} className="mr-1" />Resume Bot</>
                          : <><Pause size={12} className="mr-1" />Pause Bot</>
                        }
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => clearConvo(selectedPsid)}>
                        <Trash2 size={12} className="mr-1" />Clear
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loadingMsgs ? (
                      <div className="text-center text-gray-400 text-sm py-8">Loading messages...</div>
                    ) : messages.map(m => (
                      <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                          m.role === 'user'
                            ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                            : m.role === 'admin'
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-primary text-white rounded-tr-sm'
                        }`}>
                          {m.role === 'admin' && <div className="text-[10px] opacity-70 mb-0.5">Admin</div>}
                          {m.role === 'assistant' && <div className="text-[10px] opacity-70 mb-0.5">Bot</div>}
                          <p className="leading-relaxed">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-gray-400' : 'opacity-60'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={msgsEndRef} />
                  </div>

                  {/* Reply box */}
                  <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      placeholder="Type a reply..."
                      className={inputClass}
                    />
                    <Button onClick={sendReply} disabled={sending || !replyText.trim()}>
                      <Send size={14} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── KNOWLEDGE BASE TAB ── */}
        <TabsContent value="knowledge">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">RAG Knowledge Base</h2>
              <p className="text-xs text-gray-500 mt-0.5">AI searches this before replying. Reduces hallucinations + token usage.</p>
            </div>
            <Button onClick={() => { setEditingKb(null); setKbForm({ topic: '', keywords: '', content: '' }); setKbModal(true); }}>
              <Plus size={14} className="mr-1.5" />Add Entry
            </Button>
          </div>

          {loadingKb ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : knowledge.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No knowledge entries yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledge.map(k => (
                <div key={k.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-sm">{k.topic}</h3>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingKb(k); setKbForm({ topic: k.topic, keywords: k.keywords.join(', '), content: k.content }); setKbModal(true); }}
                        className="text-gray-400 hover:text-primary p-1 rounded"
                      >
                        <Settings size={13} />
                      </button>
                      <button onClick={() => deleteKnowledge(k.id)} className="text-gray-400 hover:text-red-500 p-1 rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {k.keywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                        <Tag size={8} />{kw}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{k.content}</p>
                  <p className="text-[10px] text-gray-400 mt-2">{new Date(k.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── SETTINGS TAB ── */}
        <TabsContent value="settings">
          <div className="max-w-2xl bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">System Prompt</h2>
              <p className="text-xs text-gray-500">Defines bot personality, rules, and instructions for this page.</p>
            </div>
            <div>
              <label className={labelClass}>Prompt</label>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={14}
                className={inputClass}
                placeholder="You are an AI assistant for..."
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveSystemPrompt} disabled={savingPrompt}>
                {savingPrompt ? 'Saving...' : 'Save Prompt'}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Knowledge Modal */}
      <Modal
        isOpen={kbModal}
        onClose={() => setKbModal(false)}
        title={editingKb ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Topic</label>
            <input value={kbForm.topic} onChange={e => setKbForm({ ...kbForm, topic: e.target.value })} className={inputClass} placeholder="e.g. Membership Process" />
          </div>
          <div>
            <label className={labelClass}>Keywords <span className="text-gray-400 font-normal">(comma separated)</span></label>
            <input value={kbForm.keywords} onChange={e => setKbForm({ ...kbForm, keywords: e.target.value })} className={inputClass} placeholder="join, membership, how to join, application" />
            <p className="text-xs text-gray-400 mt-1">AI matches user messages against these keywords.</p>
          </div>
          <div>
            <label className={labelClass}>Content</label>
            <textarea value={kbForm.content} onChange={e => setKbForm({ ...kbForm, content: e.target.value })} rows={6} className={inputClass} placeholder="Full details the AI should use when this topic is detected..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setKbModal(false)}>Cancel</Button>
            <Button onClick={saveKnowledge} disabled={savingKb}>{savingKb ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
