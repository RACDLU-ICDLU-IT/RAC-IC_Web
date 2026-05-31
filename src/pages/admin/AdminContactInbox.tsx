import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Inbox, Mail, MailOpen, Trash, Reply, Circle } from 'lucide-react';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminContactInbox() {
  const { adminTenant: tenant } = useAdminTenant();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const { addToast } = useToast();

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data: snap } = await supabase.from('contact_messages').select('*').eq('tenant_id', tenant.id).order('createdAt', { ascending: false });
      setMessages(snap || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(); }, [tenant.id]);

  const handleSelect = async (msg: any) => {
    setSelectedMsg(msg);
    if (!msg.read) {
      try {
        await supabase.from('contact_messages').update({
          read: true,
          readAt: new Date().toISOString(),
        }).eq('id', msg.id).eq('tenant_id', tenant.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
      } catch (err) { console.error(err); }
    }
  };

  const handleMarkAllRead = async () => {
    const unread = messages.filter(m => !m.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(m => supabase.from('contact_messages').update({ read: true }).eq('id', m.id).eq('tenant_id', tenant.id)));
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
      addToast('All messages marked as read', 'success');
    } catch { addToast('Failed to update', 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('contact_messages').delete().eq('id', deleteId).eq('tenant_id', tenant.id);
      addToast('Message deleted', 'success');
      if (selectedMsg?.id === deleteId) setSelectedMsg(null);
      setDeleteId(null);
      fetchMessages();
    } catch { addToast('Failed to delete', 'error'); }
  };

  const filtered = filter === 'all' ? messages : filter === 'unread' ? messages.filter(m => !m.read) : messages.filter(m => m.read);
  const unreadCount = messages.filter(m => !m.read).length;

  const formatTs = (ts: any) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
            <div className="flex items-center gap-3">
              <Inbox size={24} className="text-accent" /> Contact Inbox
              <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
                {tenant.id}
              </span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{unreadCount} new</span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Messages submitted through the public contact form.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={handleMarkAllRead}>Mark All Read</Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit gap-1">
        {(['all', 'unread', 'read'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors capitalize ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f} {f === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Message List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
              <Mail size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No messages here.</p>
            </div>
          ) : filtered.map(msg => (
            <button
              key={msg.id}
              onClick={() => handleSelect(msg)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedMsg?.id === msg.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                {!msg.read && (
                  <Circle size={8} className="text-blue-500 fill-blue-500 mt-2 shrink-0" />
                )}
                {msg.read && <div className="w-2 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`font-bold text-sm truncate ${!msg.read ? 'text-gray-900' : 'text-gray-600'}`}>
                      {msg.name}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {msg.createdAt ? formatTs(msg.createdAt).split(',')[0] : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{msg.email}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{msg.message}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-3">
          {!selectedMsg ? (
            <div className="bg-white rounded-xl border border-gray-100 h-full min-h-[300px] flex flex-col items-center justify-center text-gray-400 p-10">
              <MailOpen size={48} className="mb-4 opacity-30" />
              <p className="font-medium">Select a message to read</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-gray-900">{selectedMsg.name}</h2>
                    <a href={`mailto:${selectedMsg.email}`} className="text-sm text-accent hover:underline">{selectedMsg.email}</a>
                    <p className="text-xs text-gray-400 mt-1">{formatTs(selectedMsg.createdAt)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={`mailto:${selectedMsg.email}?subject=Re: Your message to ${selectedMsg.name}&body=%0A%0A----%0AOriginal message:%0A${encodeURIComponent(selectedMsg.message)}`}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Reply size={14} /> Reply
                    </a>
                    <button
                      onClick={() => setDeleteId(selectedMsg.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedMsg.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Message"
        message="This message will be permanently deleted. Continue?"
      />
    </div>
  );
}
