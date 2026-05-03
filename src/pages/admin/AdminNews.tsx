import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { fetchAndBake } from '../../utils/bake';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Pencil, Trash, Newspaper } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useAuth } from '../../contexts/AuthContext';
import { marked } from 'marked';

export default function AdminNews() {
  const { profile } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { addToast } = useToast();

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc')));
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      addToast('Failed to load news', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleSave = async () => {
    const isNew = !formData.id;
    const docId = isNew ? doc(collection(db, 'news')).id : formData.id;
    
    const dataToSave = { 
      ...formData, 
      createdAt: formData.createdAt || new Date(),
      publishedAt: formData.status === 'Published' && !formData.publishedAt ? new Date() : formData.publishedAt
    };
    
    try {
      await setDoc(doc(db, 'news', docId), dataToSave, { merge: true });
      addToast('Article saved', 'success');
      setIsFormOpen(false);
      await fetchAndBake('news');
      fetchArticles();
    } catch (err) {
      console.error(err);
      addToast('Failed to save article', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'news', deleteId));
      addToast('Article deleted', 'success');
      setDeleteId(null);
      await fetchAndBake('news');
      fetchArticles();
    } catch (err) { addToast('Failed to delete', 'error'); }
  };

  const insertMarkdown = (syntax: string) => {
    const el = document.getElementById('news-body-editor') as HTMLTextAreaElement;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = formData.body || '';
    const newVal = val.substring(0, start) + syntax + val.substring(end);
    setFormData({ ...formData, body: newVal });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + syntax.length, start + syntax.length);
    }, 0);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const renderPreview = () => {
    try { return { __html: marked(formData.body || '*No content*') }; } 
    catch (e) { return { __html: '' }; }
  };

  const filtered = filter === 'all' ? articles : articles.filter(a => a.status?.toLowerCase() === filter);

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">News Articles</h1>
          <p className="text-gray-500 text-sm mt-1">Publish updates to the public site</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
             {['all','published','draft'].map(t => (
               <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${filter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                 {t}
               </button>
             ))}
          </div>
          <Button onClick={() => { setFormData({ status: 'Draft', author: profile?.name, category: 'Club News' }); setIsFormOpen(true); }}>
             Write Article
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-xl"></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl py-16 flex flex-col items-center justify-center text-gray-400 border border-gray-100">
           <Newspaper size={48} className="mb-4" />
           <p className="font-medium text-gray-500">No articles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-hidden">
               {a.coverImage ? (
                 <img src={a.coverImage} className="w-1/3 object-cover bg-gray-200 shrink-0" />
               ) : (
                 <div className="w-1/3 bg-gray-100 flex items-center justify-center text-gray-300 shrink-0"><Newspaper size={32}/></div>
               )}
               <div className="flex-1 p-4 flex flex-col relative group">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => { setFormData(a); setIsFormOpen(true); }} className="p-1.5 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"><Pencil size={14}/></button>
                     <button onClick={() => setDeleteId(a.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash size={14}/></button>
                  </div>
                  <div className="flex items-center gap-2 mb-2 pr-12">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">{a.category}</span>
                     <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${a.status === 'Published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{a.status}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 leading-snug mb-1 line-clamp-2">{a.title}</h3>
                  <p className="text-xs text-gray-500 mb-2 truncate">By {a.author || 'Unknown'}</p>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-auto">{a.body?.replace(/[#*`_]/g, '')}</p>
               </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit Article' : 'Write Article'} size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[70vh]">
          {/* Editor Panel */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            <div>
              <input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-0 py-2 text-2xl font-heading font-bold border-0 border-b border-gray-200 focus:ring-0 focus:border-accent placeholder:text-gray-300" placeholder="Article Title" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Category</label>
                <select value={formData.category || 'Club News'} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass}>
                  <option value="Club News">Club News</option><option value="Project Update">Project Update</option>
                  <option value="Achievement">Achievement</option><option value="International">International</option>
                  <option value="Community">Community</option><option value="Press Release">Press Release</option>
                </select>
              </div>
              <div><label className={labelClass}>Status</label>
                <div className="flex items-center gap-3 mt-2">
                  <label className="flex items-center gap-1.5"><input type="radio" value="Draft" checked={formData.status === 'Draft'} onChange={e => setFormData({...formData, status: e.target.value})} /> Draft</label>
                  <label className="flex items-center gap-1.5"><input type="radio" value="Published" checked={formData.status === 'Published'} onChange={e => setFormData({...formData, status: e.target.value})} /> Published</label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div><label className={labelClass}>Author Name</label><input value={formData.author || ''} onChange={e => setFormData({...formData, author: e.target.value})} className={inputClass} /></div>
            </div>

            <div>
              <label className={labelClass}>Cover Image</label>
              <CloudinaryUpload onUpload={(url) => setFormData({...formData, coverImage: url})} currentUrl={formData.coverImage} aspectRatio="landscape" />
            </div>

            <div className="flex flex-col flex-1 min-h-[300px]">
              <div className="flex gap-1.5 p-2 bg-gray-100 rounded-t-lg border border-b-0 border-gray-200">
                 <button onClick={()=>insertMarkdown('**Bold** ')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold hover:bg-gray-50">B</button>
                 <button onClick={()=>insertMarkdown('*Italic* ')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs italic hover:bg-gray-50">I</button>
                 <button onClick={()=>insertMarkdown('### Heading\n')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50">H3</button>
                 <button onClick={()=>insertMarkdown('- List item\n')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50">•</button>
                 <button onClick={()=>insertMarkdown('[Link text](https://)')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs flex items-center hover:bg-gray-50">🔗</button>
              </div>
              <textarea 
                id="news-body-editor"
                value={formData.body || ''} 
                onChange={e => setFormData({...formData, body: e.target.value})} 
                className="w-full flex-1 p-3 text-sm font-mono border border-gray-200 rounded-b-lg focus:outline-none focus:ring-1 focus:ring-accent resize-none bg-gray-50" 
                placeholder="Write your article here..."
              />
            </div>
          </div>

          {/* Live Preview Panel */}
          <div className="hidden lg:flex flex-col border-l border-gray-100 pl-8 overflow-y-auto">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Live Preview</div>
             <div className="prose prose-sm prose-primary max-w-none">
                {formData.coverImage && <img src={formData.coverImage} className="w-full rounded-lg mb-6" />}
                <h1 className="mb-2">{formData.title || 'Untitled Article'}</h1>
                <p className="text-gray-500 mb-8"><small>By {formData.author} • {formData.category}</small></p>
                <div dangerouslySetInnerHTML={renderPreview()} />
             </div>
          </div>
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
          <Button onClick={handleSave}>Save Article</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Article" message="Are you sure? It will be permanently removed." />
    </div>
  );
}
