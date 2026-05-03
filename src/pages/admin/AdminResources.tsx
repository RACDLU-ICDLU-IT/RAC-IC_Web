import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { FolderOpen, Pencil, Trash, FileText, Link as LinkIcon, Image as ImageIcon, File } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';

export default function AdminResources() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { addToast } = useToast();

  const fetchResources = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'resources'), orderBy('createdAt', 'desc')));
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      addToast('Failed to load resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleSave = async () => {
    const isNew = !formData.id;
    const docId = isNew ? doc(collection(db, 'resources')).id : formData.id;
    
    try {
      await setDoc(doc(db, 'resources', docId), { ...formData, createdAt: formData.createdAt || new Date() }, { merge: true });
      addToast('Resource saved', 'success');
      setIsFormOpen(false);
      fetchResources();
    } catch (err) {
      console.error(err);
      addToast('Failed to save resource', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'resources', deleteId));
      addToast('Resource deleted', 'success');
      setDeleteId(null);
      fetchResources();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete resource', 'error');
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const getIcon = (type: string, url: string = '') => {
    if (type === 'Link') return <LinkIcon className="text-blue-500" size={20} />;
    if (url.endsWith('.pdf')) return <FileText className="text-red-500" size={20} />;
    if (url.match(/\\.(jpeg|jpg|gif|png)$/i)) return <ImageIcon className="text-green-500" size={20} />;
    return <File className="text-gray-500" size={20} />;
  };

  const categories = Array.from(new Set(resources.map(r => r.category).filter(Boolean)));
  const [filterCat, setFilterCat] = useState('all');

  const filtered = filterCat === 'all' ? resources : resources.filter(r => r.category === filterCat);

  const openAddMinutes = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      title: `Minutes — ${today}`,
      category: 'Meeting Minutes',
      type: 'File',
      visibility: 'Officers Only'
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Resources</h1>
          <p className="text-gray-500 text-sm mt-1">Manage files and links for members</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openAddMinutes}>+ Meeting Minutes</Button>
          <Button onClick={() => { setFormData({ type: 'File', visibility: 'All Members', category: 'General' }); setIsFormOpen(true); }}>
             Add Resource
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={inputClass + ' md:w-64 max-w-full'}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
        </select>
      </div>

      <Table
        columns={[
          { key: 'icon', label: '', width: '60px' },
          { key: 'title', label: 'Title' },
          { key: 'category', label: 'Category' },
          { key: 'type', label: 'Type' },
          { key: 'visibility', label: 'Visibility' },
          { key: 'actions', label: 'Actions' }
        ]}
        data={filtered}
        isLoading={loading}
        emptyIcon={<FolderOpen size={48} />}
        emptyMessage="No resources found."
        renderRow={(r) => (
          <tr key={r.id}>
            <td className="px-6 py-4">{getIcon(r.type, r.url)}</td>
            <td className="px-6 py-4">
              <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">{r.title}</a>
              <p className="text-xs text-gray-500 line-clamp-1 truncate max-w-xs">{r.description || r.url}</p>
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">{r.category}</td>
            <td className="px-6 py-4">
               <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{r.type}</span>
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.visibility === 'Officers Only' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                {r.visibility}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button onClick={() => { setFormData(r); setIsFormOpen(true); }} className="text-gray-500 hover:text-primary"><Pencil size={18} /></button>
                <button onClick={() => setDeleteId(r.id)} className="text-gray-500 hover:text-red-500"><Trash size={18} /></button>
              </div>
            </td>
          </tr>
        )}
      />

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit Resource' : 'Add Resource'} size="md">
        <div className="space-y-4">
          <div><label className={labelClass}>Title</label><input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Description</label><textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} rows={2} /></div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className={labelClass}>Category</label>
                <input value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass} list="categories-list" />
                <datalist id="categories-list">
                  <option value="Meeting Minutes" />
                  <option value="Forms" />
                  <option value="Training Materials" />
                  <option value="Project Reports" />
                  <option value="Constitution & Bylaws" />
                  {categories.map(c => <option key={c as string} value={c as string} />)}
                </datalist>
             </div>
             <div>
                <label className={labelClass}>Visibility</label>
                <select value={formData.visibility || 'All Members'} onChange={e => setFormData({...formData, visibility: e.target.value})} className={inputClass}>
                   <option value="All Members">All Members</option>
                   <option value="Officers Only">Officers Only</option>
                </select>
             </div>
          </div>

          <div>
            <label className={labelClass}>Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" value="File" checked={formData.type === 'File'} onChange={e => setFormData({...formData, type: e.target.value})} /> File
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="Link" checked={formData.type === 'Link'} onChange={e => setFormData({...formData, type: e.target.value})} /> Link
              </label>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            {formData.type === 'Link' ? (
              <div>
                <label className={labelClass}>URL</label>
                <input value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} className={inputClass} placeholder="https://..." />
              </div>
            ) : (
              <div>
                <label className={labelClass}>Upload File</label>
                <CloudinaryUpload onUpload={(url) => setFormData({...formData, url: url})} currentUrl={formData.url ? 'File uploaded' : ''} label="Upload PDF/Doc/Image" />
                <p className="text-xs text-gray-500 mt-2">Selected: {formData.url ? <a href={formData.url} target="_blank" className="text-blue-500 underline truncate block">{formData.url}</a> : 'None'}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Resource</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Resource" message="Are you sure? Members will lose connection." />
    </div>
  );
}
