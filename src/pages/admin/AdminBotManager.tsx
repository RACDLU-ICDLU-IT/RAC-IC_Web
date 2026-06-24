import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../hooks/useToast';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import {
  Bot, Send, Pause, Play, Trash2, Plus, BookOpen,
  MessageSquare, Settings, RefreshCw, User, Tag, ArrowLeft, PauseCircle, PlayCircle, AlertTriangle
} from 'lucide-react';

const PAGE_ID_MAP: Record<string, string> = {
  icdlu: import.meta.env.VITE_PAGE_ID_1 || '102656195442065',
  racdlu: import.meta.env.VITE_PAGE_ID_2 || '1051034934769596',
};

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('/api/embed', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, taskType: 'RETRIEVAL_DOCUMENT' })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding || null;
  } catch { return null; }
}

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 focus:border-[var(--color-accent)] transition-colors bg-white text-gray-900 placeholder:text-gray-400";
const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

type TabId = 'conversations' | 'knowledge' | 'settings';

interface Conversation { psid: string; page_id: string; last_msg: string; last_at: string; paused: boolean; msg_count: number; name?: string; pic?: string; needs_human?: boolean; }
interface Message { id: string; psid: string; page_id: string; role: string; content: string; created_at: string; }
interface KnowledgeItem { id: string; page_id: string; topic: string; keywords: string[]; content: string; created_at: string; }

export default function AdminBotManager() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const pageId = PAGE_ID_MAP[tenant.id] || PAGE_ID_MAP['icdlu'];

  const [activeTab, setActiveTab] = useState<TabId>('conversations');
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [selectedPsid, setSelectedPsid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [allPaused, setAllPaused] = useState(false);
  const nameCache = useRef<Record<string, string>>({});
  const picCache = useRef<Record<string, string>>({});
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const [systemPrompt, setSystemPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loadingKb, setLoadingKb] = useState(false);
  const [kbModal, setKbModal] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeItem | null>(null);
  const [kbForm, setKbForm] = useState({ topic: '', keywords: '', content: '' });
  const [savingKb, setSavingKb] = useState(false);

  // Track in-flight requests to prevent duplicate calls
  const fetchingRef = useRef<Set<string>>(new Set());

  const fetchUserInfo = useCallback(async (psid: string): Promise<{ name: string; pic?: string }> => {
    // Return cached immediately
    if (nameCache.current[psid]) return { name: nameCache.current[psid], pic: picCache.current[psid] };
    // Prevent duplicate in-flight requests
    if (fetchingRef.current.has(psid)) return { name: `···${psid.slice(-6)}` };
    fetchingRef.current.add(psid);
    try {
      const res = await fetch(`/api/user-info?psid=${psid}&pageId=${pageId}`);
      if (!res.ok) {
        nameCache.current[psid] = `···${psid.slice(-6)}`;
        return { name: `···${psid.slice(-6)}` };
      }
      const data = await res.json();
      const name = data.name || `···${psid.slice(-6)}`;
      const pic = data.profile_pic || '';
      nameCache.current[psid] = name;
      picCache.current[psid] = pic;
      return { name, pic };
    } catch {
      nameCache.current[psid] = `···${psid.slice(-6)}`;
      return { name: `···${psid.slice(-6)}` };
    } finally {
      fetchingRef.current.delete(psid);
    }
  }, [pageId]);

  const fetchConvos = async () => {
    setLoadingConvos(true);
    try {
      const { data: msgs } = await supabase
        .from('bot_conversations').select('psid, page_id, content, role, created_at')
        .eq('page_id', pageId).order('created_at', { ascending: false });
      const { data: paused } = await supabase.from('bot_paused').select('psid, needs_human').eq('page_id', pageId);
      const pausedSet = new Set((paused || []).map((p: any) => p.psid));
      const humanNeededSet = new Set((paused || []).filter((p: any) => p.needs_human).map((p: any) => p.psid));

      // Check all-paused state
      const { data: allPausedRow } = await supabase.from('bot_config')
        .select('value').eq('page_id', pageId).eq('key', 'all_paused').single();
      setAllPaused(allPausedRow?.value === 'true');

      const map = new Map<string, Conversation>();
      (msgs || []).forEach((m: any) => {
        if (!map.has(m.psid)) {
          map.set(m.psid, { psid: m.psid, page_id: m.page_id, last_msg: m.content, last_at: m.created_at, paused: pausedSet.has(m.psid), msg_count: 1, needs_human: humanNeededSet.has(m.psid) });
        } else { map.get(m.psid)!.msg_count++; }
      });

      const convoList = Array.from(map.values());

      // Fetch names + pics in background
      convoList.forEach(async c => {
        const { name, pic } = await fetchUserInfo(c.psid);
        setConvos(prev => prev.map(p => p.psid === c.psid ? { ...p, name, pic } : p));
      });

      // Sort: needs_human first, then by latest message
      convoList.sort((a, b) => {
        if (a.needs_human && !b.needs_human) return -1;
        if (!a.needs_human && b.needs_human) return 1;
        return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
      });
      setConvos(convoList);
    } catch { addToast('Failed to load conversations', 'error'); }
    finally { setLoadingConvos(false); }
  };

  const fetchMessages = async (psid: string) => {
    setLoadingMsgs(true);
    try {
      const { data } = await supabase.from('bot_conversations').select('*')
        .eq('page_id', pageId).eq('psid', psid).order('created_at', { ascending: true });
      setMessages(data || []);
    } catch { addToast('Failed to load messages', 'error'); }
    finally { setLoadingMsgs(false); }
  };

  const fetchSystemPrompt = async () => {
    const { data } = await supabase.from('bot_config').select('value')
      .eq('page_id', pageId).eq('key', 'system_prompt').single();
    if (data?.value) setSystemPrompt(data.value);
  };

  const fetchKnowledge = async () => {
    setLoadingKb(true);
    const { data } = await supabase.from('bot_knowledge').select('*')
      .eq('page_id', pageId).order('created_at', { ascending: false });
    setKnowledge(data || []);
    setLoadingKb(false);
  };

  // Request push notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Refs to avoid stale closures in realtime
  const selectedPsidRef = useRef<string | null>(null);
  const tenantIdRef = useRef<string>(tenant.id);
  useEffect(() => { selectedPsidRef.current = selectedPsid; }, [selectedPsid]);
  useEffect(() => { tenantIdRef.current = tenant.id; }, [tenant.id]);

  useEffect(() => { fetchConvos(); fetchSystemPrompt(); fetchKnowledge(); }, [pageId]);
  useEffect(() => { if (selectedPsid) fetchMessages(selectedPsid); }, [selectedPsid]);
  useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Realtime: auto-update messages + convo list
  useEffect(() => {
    const channel = supabase.channel(`bot-rt-${pageId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'bot_conversations',
        filter: `page_id=eq.${pageId}`
      }, (payload) => {
        const msg = payload.new as Message & { needs_human_flag?: boolean };

        // Always update convo list
        setConvos(prev => {
          const exists = prev.find(c => c.psid === msg.psid);
          if (exists) {
            const updated = prev.map(c => c.psid === msg.psid
              ? { ...c, last_msg: msg.content, last_at: msg.created_at, msg_count: c.msg_count + 1 }
              : c
            );
            // Re-sort: needs_human first
            return updated.sort((a, b) => {
              if (a.needs_human && !b.needs_human) return -1;
              if (!a.needs_human && b.needs_human) return 1;
              return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
            });
          }
          const newConvo: Conversation = { psid: msg.psid, page_id: msg.page_id, last_msg: msg.content, last_at: msg.created_at, paused: false, msg_count: 1 };
          fetchUserInfo(msg.psid).then(({ name, pic }) => {
            setConvos(p => p.map(c => c.psid === msg.psid ? { ...c, name, pic } : c));
          });
          return [newConvo, ...prev];
        });

        // Update open chat if this psid is selected
        if (msg.psid === selectedPsidRef.current) {
          setMessages(prev => {
            // Avoid duplicate if admin sent and already inserted locally
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }

        // Human support notification
        if (msg.needs_human_flag) {
          // Refresh convo list to get needs_human flag
          setTimeout(() => fetchConvos(), 500);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚨 Human Support Requested', {
              body: `A user needs human support on ${tenantIdRef.current.toUpperCase()}. Tap to view.`,
              icon: '/favicon.ico',
              tag: `human-support-${msg.psid}`,
            });
          }
        }
      })
      .subscribe((status) => {
        console.log('[Realtime] Status:', status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [pageId]);

  const pauseUser = async (psid: string) => {
    await supabase.from('bot_paused').upsert(
      { psid, page_id: pageId, paused_at: new Date().toISOString(), auto_resume_at: null },
      { onConflict: 'psid,page_id' }
    );
  };

  const resumeUser = async (psid: string) => {
    await supabase.from('bot_paused').delete().eq('psid', psid).eq('page_id', pageId);
  };

  const togglePause = async (psid: string, currentlyPaused: boolean) => {
    try {
      if (currentlyPaused) { await resumeUser(psid); addToast('Bot resumed', 'success'); }
      else { await pauseUser(psid); addToast('Bot paused', 'success'); }
      setConvos(prev => prev.map(c => c.psid === psid ? { ...c, paused: !currentlyPaused } : c));
    } catch { addToast('Failed to toggle pause', 'error'); }
  };

  const toggleAllPaused = async () => {
    const newVal = !allPaused;
    try {
      await supabase.from('bot_config').upsert(
        { page_id: pageId, key: 'all_paused', value: String(newVal), updated_at: new Date().toISOString() },
        { onConflict: 'page_id,key' }
      );
      setAllPaused(newVal);
      addToast(newVal ? `All ${tenant.id.toUpperCase()} conversations paused` : `Bot resumed for all`, 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedPsid) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin-send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psid: selectedPsid, pageId, text: replyText.trim() })
      });
      if (!res.ok) throw new Error('Send failed');
      // Auto-pause this user when admin replies from web
      await pauseUser(selectedPsid);
      await supabase.from('bot_conversations').insert({ psid: selectedPsid, page_id: pageId, role: 'admin', content: replyText.trim() });
      setConvos(prev => prev.map(c => c.psid === selectedPsid ? { ...c, paused: true } : c));
      setReplyText('');
      fetchMessages(selectedPsid);
      addToast('Sent — bot paused for this user', 'success');
    } catch { addToast('Failed to send message', 'error'); }
    finally { setSending(false); }
  };

  const clearConvo = async (psid: string) => {
    if (!window.confirm('Delete all messages for this user?')) return;
    await supabase.from('bot_conversations').delete().eq('psid', psid).eq('page_id', pageId);
    if (selectedPsid === psid) { setSelectedPsid(null); setMessages([]); setShowChat(false); }
    fetchConvos(); addToast('Conversation cleared', 'success');
  };

  const saveSystemPrompt = async () => {
    setSavingPrompt(true);
    try {
      await supabase.from('bot_config').upsert(
        { page_id: pageId, key: 'system_prompt', value: systemPrompt, updated_at: new Date().toISOString() },
        { onConflict: 'page_id,key' }
      );
      addToast('System prompt saved', 'success');
    } catch { addToast('Failed to save', 'error'); }
    finally { setSavingPrompt(false); }
  };

  const saveKnowledge = async () => {
    if (!kbForm.topic || !kbForm.content) { addToast('Topic and content required', 'error'); return; }
    setSavingKb(true);
    try {
      const keywords = kbForm.keywords.split(',').map(k => k.trim()).filter(Boolean);
      const embedding = await generateEmbedding(`${kbForm.topic} ${kbForm.keywords} ${kbForm.content}`);
      if (!embedding) addToast('Saved without embedding', 'warning');
      if (editingKb) {
        await supabase.from('bot_knowledge').update({ topic: kbForm.topic, keywords, content: kbForm.content, embedding, updated_at: new Date().toISOString() }).eq('id', editingKb.id);
      } else {
        await supabase.from('bot_knowledge').insert({ page_id: pageId, topic: kbForm.topic, keywords, content: kbForm.content, embedding });
      }
      addToast('Knowledge saved', 'success');
      setKbModal(false); setEditingKb(null); setKbForm({ topic: '', keywords: '', content: '' });
      fetchKnowledge();
    } catch { addToast('Failed to save', 'error'); }
    finally { setSavingKb(false); }
  };

  const deleteKnowledge = async (id: string) => {
    if (!window.confirm('Delete this entry?')) return;
    await supabase.from('bot_knowledge').delete().eq('id', id);
    fetchKnowledge(); addToast('Deleted', 'success');
  };

  const selectedConvo = convos.find(c => c.psid === selectedPsid);
  const displayName = (c: Conversation) => c.name || `···${c.psid.slice(-6)}`;
  const displayPic = (c: Conversation) => c.pic || '';

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'conversations', label: 'Conversations', icon: <MessageSquare size={14} /> },
    { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen size={14} /> },
    { id: 'settings', label: 'AI Settings', icon: <Settings size={14} /> },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-gray-900">Bot Manager</h1>
          <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">{tenant.id}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleAllPaused}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
              allPaused
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {allPaused ? <><PlayCircle size={14} />Resume All</> : <><PauseCircle size={14} />Pause All</>}
          </button>
          <button onClick={() => { fetchConvos(); fetchKnowledge(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} />Refresh
          </button>
        </div>
      </div>

      {allPaused && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <PauseCircle size={16} className="text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 font-medium">Bot is paused for all {tenant.id.toUpperCase()} conversations. Users will not receive AI replies.</span>
        </div>
      )}

      {/* Custom Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold transition-colors border-b-2 ${
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

          {/* ── CONVERSATIONS ── */}
          {activeTab === 'conversations' && (
            <div className="flex flex-col md:flex-row gap-3" style={{ height: '560px' }}>
              {/* List */}
              <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-64 shrink-0 border border-gray-200 rounded-xl overflow-hidden bg-gray-50`}>
                <div className="px-3 py-2.5 border-b border-gray-200 bg-white flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Users</span>
                  <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">{convos.length}</span>
                </div>
                <div className="overflow-y-auto flex-1">
                  {loadingConvos ? (
                    <div className="p-6 text-center text-gray-400 text-xs">Loading...</div>
                  ) : convos.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">No conversations yet</div>
                  ) : convos.map(c => (
                    <button key={c.psid} onClick={() => { setSelectedPsid(c.psid); setShowChat(true); }}
                      className={`w-full text-left px-3 py-2.5 border-b border-gray-100 hover:bg-white transition-colors ${
                        selectedPsid === c.psid
                          ? c.needs_human ? 'bg-red-50 border-l-2 border-l-red-500' : 'bg-white border-l-2 border-l-[var(--color-accent)]'
                          : c.needs_human ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0 overflow-hidden text-[10px] font-bold text-[var(--color-accent)]">
                          {displayPic(c)
                            ? <img src={displayPic(c)} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                            : (c.name ? c.name.charAt(0).toUpperCase() : <User size={12} className="text-[var(--color-accent)]" />)
                          }
                        </div>
                        <span className="text-xs font-bold text-gray-800 truncate flex-1">{displayName(c)}</span>
                        {c.needs_human && <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-bold shrink-0 flex items-center gap-0.5"><AlertTriangle size={8} />HUMAN</span>}
                        {!c.needs_human && c.paused && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">PAUSED</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate pl-9">{c.last_msg}</p>
                      <p className="text-[10px] text-gray-400 pl-9 mt-0.5">{new Date(c.last_at).toLocaleDateString()} · {c.msg_count} msgs</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div className={`${!showChat ? 'hidden md:flex' : 'flex'} flex-col flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white min-w-0`}>
                {!selectedPsid ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
                    <Bot size={48} />
                    <span className="text-sm text-gray-400">Select a conversation</span>
                  </div>
                ) : (
                  <>
                    {/* Chat header */}
                    <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2 shrink-0">
                      <button onClick={() => setShowChat(false)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 shrink-0">
                        <ArrowLeft size={16} />
                      </button>
                      <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center shrink-0 overflow-hidden text-[10px] font-bold text-[var(--color-accent)]">
                        {selectedConvo && displayPic(selectedConvo)
                          ? <img src={displayPic(selectedConvo)} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                          : (selectedConvo?.name ? selectedConvo.name.charAt(0).toUpperCase() : <User size={12} className="text-[var(--color-accent)]" />)
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{selectedConvo ? displayName(selectedConvo) : '...'}</span>
                          {selectedConvo?.needs_human && <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><AlertTriangle size={8} />NEEDS HUMAN</span>}
                          {!selectedConvo?.needs_human && selectedConvo?.paused && <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">PAUSED</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => togglePause(selectedPsid, selectedConvo?.paused || false)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                            selectedConvo?.paused
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {selectedConvo?.paused ? <><Play size={11} />Resume</> : <><Pause size={11} />Pause</>}
                        </button>
                        <button onClick={() => clearConvo(selectedPsid)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 border border-gray-200 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50/60">
                      {loadingMsgs ? (
                        <div className="text-center text-gray-400 text-xs py-8">Loading...</div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-gray-400 text-xs py-8">No messages</div>
                      ) : messages.map(m => (
                        <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                            m.role === 'user'
                              ? 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                              : m.role === 'admin'
                              ? 'bg-blue-600 text-white rounded-tr-sm'
                              : 'bg-[var(--color-accent)] text-white rounded-tr-sm'
                          }`}>
                            {m.role !== 'user' && (
                              <div className="text-[10px] opacity-70 mb-0.5 font-semibold uppercase tracking-wide">
                                {m.role === 'admin' ? '👤 Admin' : '🤖 Bot'}
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-[13px]">{m.content}</p>
                            <p className={`text-[10px] mt-1 text-right ${m.role === 'user' ? 'text-gray-400' : 'opacity-60'}`}>
                              {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={msgsEndRef} />
                    </div>

                    {/* Reply */}
                    <div className="px-3 py-2.5 border-t border-gray-100 bg-white flex gap-2 items-center shrink-0">
                      <input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                        placeholder="Type a reply... (Enter to send)"
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] transition-colors"
                      />
                      <button onClick={sendReply} disabled={sending || !replyText.trim()}
                        className="w-9 h-9 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity shadow-sm">
                        <Send size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── KNOWLEDGE BASE ── */}
          {activeTab === 'knowledge' && (
            <div>
              <div className="flex justify-between items-start mb-4 gap-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">RAG Knowledge Base</h2>
                  <p className="text-xs text-gray-500 mt-0.5">AI searches this before replying. Reduces hallucinations + saves tokens.</p>
                </div>
                <button onClick={() => { setEditingKb(null); setKbForm({ topic: '', keywords: '', content: '' }); setKbModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold hover:opacity-90 transition-opacity shrink-0">
                  <Plus size={13} />Add Entry
                </button>
              </div>
              {loadingKb ? (
                <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
              ) : knowledge.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                  <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400 font-medium">No knowledge entries yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Add topics so the bot answers accurately</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {knowledge.map(k => (
                    <div key={k.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-sm">{k.topic}</h3>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditingKb(k); setKbForm({ topic: k.topic, keywords: k.keywords.join(', '), content: k.content }); setKbModal(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><Settings size={12} /></button>
                          <button onClick={() => deleteKnowledge(k.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {k.keywords.map((kw, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 text-[10px] bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-1.5 py-0.5 rounded-full font-semibold">
                            <Tag size={7} />{kw}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{k.content}</p>
                      <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">{new Date(k.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── AI SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">System Prompt</h2>
                <p className="text-xs text-gray-500 mt-0.5">Defines bot personality and rules for {tenant.id.toUpperCase()} page.</p>
              </div>
              <div>
                <label className={labelClass}>Prompt</label>
                <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                  rows={16} className={inputClass + ' font-mono text-xs resize-y'} placeholder="You are an AI assistant for..." />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">{systemPrompt.length} characters</span>
                <button onClick={saveSystemPrompt} disabled={savingPrompt}
                  className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-bold disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {savingPrompt ? 'Saving...' : 'Save Prompt'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Modal */}
      <Modal isOpen={kbModal} onClose={() => setKbModal(false)} title={editingKb ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Topic</label>
            <input value={kbForm.topic} onChange={e => setKbForm({ ...kbForm, topic: e.target.value })} className={inputClass} placeholder="e.g. Membership Process" />
          </div>
          <div>
            <label className={labelClass}>Keywords <span className="text-gray-400 font-normal text-xs">(comma separated)</span></label>
            <input value={kbForm.keywords} onChange={e => setKbForm({ ...kbForm, keywords: e.target.value })} className={inputClass} placeholder="join, membership, how to join" />
            <p className="text-xs text-gray-400 mt-1">AI uses these to find relevant entries.</p>
          </div>
          <div>
            <label className={labelClass}>Content</label>
            <textarea value={kbForm.content} onChange={e => setKbForm({ ...kbForm, content: e.target.value })} rows={6} className={inputClass} placeholder="Full details the AI should use..." />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setKbModal(false)}>Cancel</Button>
            <Button onClick={saveKnowledge} disabled={savingKb}>{savingKb ? 'Saving...' : 'Save Entry'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
