import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Megaphone, Mail, Trash, Copy, Edit3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminCommunications() {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState<'announcements'|'email'>('announcements');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Announcements form
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [targetRole, setTargetRole] = useState('All Members');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Email form
  const [emailTo, setEmailTo] = useState('All Active Members');
  const [emailSubj, setEmailSubj] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const { addToast } = useToast();

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')));
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      addToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'announcements') fetchAnnouncements();
  }, [tab]);

  const handlePublish = async () => {
    if (!title || !content) {
      addToast('Title and body required', 'error');
      return;
    }
    try {
      const docId = activeId || doc(collection(db, 'announcements')).id;
      const data = {
        title, content, targetRole, isPinned,
        authorId: user?.uid,
        authorName: profile?.name,
        ...(activeId ? {} : { createdAt: serverTimestamp() })
      };
      await setDoc(doc(db, 'announcements', docId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
      addToast('Announcement published', 'success');
      resetForm();
      fetchAnnouncements();
    } catch(err) { addToast('Failed to publish', 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'announcements', deleteId));
      addToast('Announcement deleted', 'success');
      if (activeId === deleteId) resetForm();
      setDeleteId(null);
      fetchAnnouncements();
    } catch (err) { addToast('Failed to delete', 'error'); }
  };

  const resetForm = () => {
    setActiveId(null);
    setTitle('');
    setContent('');
    setIsPinned(false);
    setTargetRole('All Members');
  };

  const selectAnnouncement = (a: any) => {
    setActiveId(a.id);
    setTitle(a.title);
    setContent(a.content || a.body || '');
    setIsPinned(a.isPinned || false);
    setTargetRole(a.targetRole || 'All Members');
  };

  const insertMarkdown = (syntax: string, isEmail: boolean = false) => {
    const el = document.getElementById(isEmail ? 'email-editor' : 'announcement-editor') as HTMLTextAreaElement;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = isEmail ? emailBody : content;
    const newVal = val.substring(0, start) + syntax + val.substring(end);
    if (isEmail) setEmailBody(newVal); else setContent(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + syntax.length, start + syntax.length);
    }, 0);
  };

  const copyEmail = () => {
    const text = `Subject: ${emailSubj}\n\n${emailBody}`;
    navigator.clipboard.writeText(text);
    addToast('Email content copied to clipboard', 'success');
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Communications</h1>
          <p className="text-gray-500 text-sm mt-1">Broadcast messages to members</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[ {id:'announcements', label:'Dashboard Announcements', icon: Megaphone}, {id:'email', label:'Email Blast', icon: Mail} ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-6 py-3 font-medium text-sm border-b-2 flex items-center gap-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'announcements' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
           {/* List */}
           <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                 <span className="font-bold text-gray-700 text-sm uppercase tracking-wider">Past Announcements</span>
                 <button onClick={resetForm} className="text-primary hover:bg-primary/10 p-1 rounded"><Edit3 size={16}/></button>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                 {loading ? <div className="p-4 text-gray-400 text-center">Loading...</div> : 
                 announcements.map(a => (
                   <div key={a.id} onClick={() => selectAnnouncement(a)} className={`p-3 rounded-lg border transition-colors cursor-pointer group flex flex-col ${activeId === a.id ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-gray-50'}`}>
                      <div className="flex justify-between items-start">
                         <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{a.title}</h4>
                         <button onClick={(e) => { e.stopPropagation(); setDeleteId(a.id); }} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={14} /></button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.content || a.body}</p>
                      <span className="text-[10px] text-gray-400 mt-2">{a.createdAt?.toDate().toLocaleDateString() || 'Recent'}</span>
                   </div>
                 ))}
                 {announcements.length === 0 && !loading && <div className="p-4 text-gray-400 text-sm text-center">No announcements yet.</div>}
              </div>
           </div>

           {/* Composer */}
           <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h3 className="font-bold text-lg mb-4">{activeId ? 'Edit Announcement' : 'New Announcement'}</h3>
              <div className="space-y-4 flex-1 flex flex-col">
                 <div><label className={labelClass}>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} className={inputClass} placeholder="Keep it brief and urgent..." /></div>
                 <div>
                    <label className={labelClass}>Audience</label>
                    <div className="flex gap-4">
                       <label className="flex items-center gap-2 text-sm"><input type="radio" value="All Members" checked={targetRole === 'All Members'} onChange={e=>setTargetRole(e.target.value)} /> All Members</label>
                       <label className="flex items-center gap-2 text-sm"><input type="radio" value="Officers Only" checked={targetRole === 'Officers Only'} onChange={e=>setTargetRole(e.target.value)} /> Officers Only</label>
                    </div>
                 </div>
                 
                 <div className="flex-1 flex flex-col">
                    <label className={labelClass}>Message Body</label>
                    <div className="flex gap-1.5 p-2 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200">
                      <button onClick={()=>insertMarkdown('**Bold**', false)} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold hover:bg-gray-100">B</button>
                      <button onClick={()=>insertMarkdown('*Italic*', false)} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs italic hover:bg-gray-100">I</button>
                      <button onClick={()=>insertMarkdown('[Link](https://)', false)} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-100">🔗</button>
                    </div>
                    <textarea id="announcement-editor" value={content} onChange={e=>setContent(e.target.value)} className={`${inputClass} flex-1 rounded-none resize-none`} placeholder="Type markdown here..." />
                 </div>
                 <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={e => setIsPinned(e.target.checked)}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="font-medium text-gray-700">Pin to top of member dashboard</span>
                 </label>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
                 <Button onClick={handlePublish}>Publish Announcement</Button>
              </div>
           </div>
        </div>
      )}

      {tab === 'email' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col max-w-4xl h-[600px]">
           <div className="mb-4">
              <h3 className="font-bold text-lg">Email Draft Composer</h3>
              <p className="text-gray-500 text-sm">Draft an email to copy-paste into your club's Gmail account. To get emails, go to <strong>Members &gt; Export CSV</strong>.</p>
           </div>
           
           <div className="space-y-4 flex-1 flex flex-col">
              <div><label className={labelClass}>To (BCC)</label><input value={emailTo} onChange={e=>setEmailTo(e.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Subject</label><input value={emailSubj} onChange={e=>setEmailSubj(e.target.value)} className={inputClass} /></div>
              
              <div className="flex-1 flex flex-col">
                 <label className={labelClass}>Message Body</label>
                 <div className="flex gap-1.5 p-2 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200">
                    <button onClick={()=>insertMarkdown('**Bold**', true)} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold hover:bg-gray-100">B</button>
                    <button onClick={()=>insertMarkdown('*Italic*', true)} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs italic hover:bg-gray-100">I</button>
                    <button onClick={()=>insertMarkdown('[Link](https://)', true)} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-100">🔗</button>
                 </div>
                 <textarea id="email-editor" value={emailBody} onChange={e=>setEmailBody(e.target.value)} className={`${inputClass} flex-1 rounded-t-none rounded-b-lg resize-none`} placeholder="Dear Interactors..." />
              </div>
           </div>

           <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={copyEmail}><Copy size={16} className="mr-2" /> Copy Content</Button>
           </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Announcement" message="Confirm deletion?" />
    </div>
  );
}
