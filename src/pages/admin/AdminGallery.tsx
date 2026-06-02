import { supabase } from '../../supabase';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Image as ImageIcon, Pencil, Trash, Download, ZoomIn, X, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useAdminTenant } from '../../hooks/useAdminTenant';

const defaultPhotos = [
  { url: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?w=800&q=80', caption: 'Service Above Self', albumTag: 'Community, Featured', sort_order: 1 },
  { url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', caption: 'Rotary Team', albumTag: 'Team, Featured', sort_order: 2 },
  { url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80', caption: 'Giving Back', albumTag: 'Community, Featured', sort_order: 3 },
  { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80', caption: 'Leadership', albumTag: 'Events, Featured', sort_order: 4 },
  { url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80', caption: 'Charity Walk', albumTag: 'Events, Featured', sort_order: 5 },
  { url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80', caption: 'Impact', albumTag: 'Team, Featured', sort_order: 6 },
];

export default function AdminGallery() {
  const { adminTenant: tenant } = useAdminTenant();
  const [photos, setPhotos] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>(['Projects', 'Events', 'Team', 'Community']);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const { addToast } = useToast();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Track in-flight bulk uploads so sort_order doesn't collide and
  // fetchPhotos only fires once after all uploads complete.
  const bulkUploadCounterRef = useRef(0);
  const bulkUploadPendingRef = useRef(0);
  const bulkFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const { data: snap } = await supabase.from('gallery').select('*').eq('tenant_id', tenant.id).order('sort_order', { ascending: true });
      setPhotos(snap || []);
      
      const { data } = await supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
      if (data && data.data?.galleryTags) {
        setTags(data.data.galleryTags);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load gallery', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    const updatedTags = [...tags, newTag.trim()];
    setTags(updatedTags);
    setNewTag('');
    try {
      const { data: existing } = await supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
      const merged = { ...(existing?.data || {}), galleryTags: updatedTags };
      const { error: saveError } = await supabase.from('page_content').upsert({ id: 'pageContent', tenant_id: tenant.id, data: merged }, { onConflict: 'id, tenant_id' });
      if (saveError) throw saveError;
      addToast('Tag added', 'success');
      
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to add tag', 'error');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    try {
      const { data: existing } = await supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
      const merged = { ...(existing?.data || {}), galleryTags: updatedTags };
      const { error: saveError } = await supabase.from('page_content').upsert({ id: 'pageContent', tenant_id: tenant.id, data: merged }, { onConflict: 'id, tenant_id' });
      if (saveError) throw saveError;
      addToast('Tag removed', 'success');
      
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to remove tag', 'error');
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [tenant.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < photos.length - 1) setLightboxIndex(lightboxIndex + 1);
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, photos]);

  const handleSave = async () => {
    if (!formData.url) return;
    const isNew = !formData.id;
    const docId = isNew ? crypto.randomUUID() : formData.id;
    
    try {
      const { error } = await supabase.from('gallery').upsert({
        id: docId,
        url: formData.url,
        caption: formData.caption || '',
        albumTag: formData.albumTag || '',
        sort_order: formData.sort_order ?? photos.length,
        createdAt: formData.createdAt || new Date().toISOString(),
        tenant_id: tenant.id
      }, { onConflict: 'id' });
      if (error) throw error;
      addToast('Photo saved', 'success');
      setIsFormOpen(false);
      
      fetchPhotos();
    } catch (err) {
      console.error(err);
      addToast('Failed to save photo', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: deleteError } = await supabase.from('gallery').delete().eq('id', deleteId).eq('tenant_id', tenant.id);
      if (deleteError) throw deleteError;
      
      addToast('Photo removed', 'success');
      setDeleteId(null);
      
      fetchPhotos();
    } catch (err: any) { 
      console.error(err);
      addToast(err.message || 'Failed to delete', 'error'); 
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(photos.map(p => p.id));
    else setSelectedIds([]);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} photos?`)) return;
    try {
      const { error } = await supabase
        .from('gallery')
        .delete()
        .in('id', selectedIds)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      addToast(`Deleted ${selectedIds.length} photos`, 'success');
      setSelectedIds([]);
      fetchPhotos();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Bulk delete failed', 'error');
    }
  };

  const handleBulkUpload = async (url: string) => {
    if (!url) return;

    // Each upload gets a unique, monotonically increasing sort_order so
    // parallel callbacks do not collide on the same value.
    const sortOffset = bulkUploadCounterRef.current++;
    bulkUploadPendingRef.current++;

    try {
      const { error } = await supabase.from('gallery').insert({
        id: crypto.randomUUID(),
        url: url,
        caption: '',
        albumTag: '',
        sort_order: photos.length + sortOffset,
        createdAt: new Date().toISOString(),
        tenant_id: tenant.id
      });
      if (error) throw error;
      addToast('Image uploaded successfully', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      bulkUploadPendingRef.current--;
      // Debounce: wait until all parallel uploads finish, then refresh once.
      if (bulkFetchTimerRef.current) clearTimeout(bulkFetchTimerRef.current);
      bulkFetchTimerRef.current = setTimeout(() => {
        bulkUploadCounterRef.current = 0;
        fetchPhotos();
      }, 600);
    }
  };

  const handleImportDefaults = async () => {
    try {
      const rows = defaultPhotos.map(p => ({
        id: crypto.randomUUID(),
        url: p.url,
        caption: p.caption,
        albumTag: p.albumTag,
        sort_order: p.sort_order,
        createdAt: new Date().toISOString(),
        tenant_id: tenant.id
      }));

      const { error } = await supabase.from('gallery').insert(rows);

      if (error) {
        console.error('Seed error:', error);
        addToast(`Failed to seed: ${error.message}`, 'error');
        return;
      }

      addToast('Default photos seeded successfully', 'success');
      fetchPhotos();
    } catch (err: any) {
      console.error(err);
      addToast('Failed to import defaults', 'error');
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Gallery</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Manage public site photos and albums</p>
        </div>
        <div className="flex gap-2">
          {photos.length === 0 && (
            <Button variant="outline" onClick={handleImportDefaults}>
               <Download size={16} className="mr-2" />
               Seed Defaults
            </Button>
          )}
          <div className="w-[160px]">
            <CloudinaryUpload 
              onUpload={handleBulkUpload} 
              buttonText="Bulk Upload"
              multiple={true}
            />
          </div>
          <Button onClick={() => { setFormData({}); setIsFormOpen(true); }}>Add Photo</Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <span className="text-sm font-bold text-primary">{selectedIds.length} selected</span>
             <button onClick={() => setSelectedIds([])} className="text-xs text-primary hover:underline font-medium">Clear</button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleBulkDelete}>
              <Trash size={16} className="mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
           {[1,2,3,4,5].map(i => <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-xl"></div>)}
        </div>
      ) : photos.length === 0 ? (
        <div className="space-y-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-center justify-between">
            <p className="text-sm"><strong>No uploaded photos.</strong> The images below are placeholders shown on the public site. Seed them to database to edit or remove them.</p>
            <Button variant="primary" size="sm" onClick={handleImportDefaults}>Seed Defaults</Button>
          </div>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 opacity-50 pointer-events-none grayscale">
             {defaultPhotos.map((p, i) => (
                <div key={i} className="relative group break-inside-avoid rounded-xl overflow-hidden cursor-pointer">
                   <img src={p.url} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-full object-cover bg-gray-100 transition-transform duration-300" />
                   <div className="absolute inset-0 bg-black/50 opacity-100 flex flex-col justify-between p-3">
                      <div></div>
                      <div>
                         {p.albumTag && <span className="text-[10px] uppercase font-bold text-primary bg-primary/20 px-2 py-0.5 rounded">{p.albumTag}</span>}
                         {p.caption && <p className="text-white text-xs font-medium mt-1 truncate">{p.caption}</p>}
                      </div>
                   </div>
                </div>
             ))}
          </div>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
           {photos.map((p, i) => (
              <div key={p.id} className="relative group break-inside-avoid rounded-xl overflow-hidden cursor-pointer">
                 <div onClick={() => setLightboxIndex(i)}>
                   <img src={p.url} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-full object-cover bg-gray-100 transition-transform duration-300 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center pointer-events-none">
                      <ZoomIn size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                   </div>
                 </div>

                 {/* Select Checkbox */}
                 <div className="absolute top-3 left-3 z-10">
                   <input
                     type="checkbox"
                     checked={selectedIds.includes(p.id)}
                     onChange={(e) => handleSelect(e, p.id)}
                     className="w-5 h-5 rounded border-2 border-white/80 bg-black/20 text-accent focus:ring-accent checked:bg-accent cursor-pointer"
                   />
                 </div>

                 {/* 3-dot Menu (Kebab) */}
                 <div className="absolute top-2 right-2 z-10 pointer-events-auto">
                   <button 
                     onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id) }} 
                     className="p-1.5 bg-black/40 text-white rounded-lg hover:bg-black/60 transition-colors"
                   >
                     <MoreVertical size={20} />
                   </button>
                   {menuOpenId === p.id && (
                     <div className="absolute top-10 right-0 w-32 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-20">
                       <button 
                          onClick={(e) => { e.stopPropagation(); setFormData(p); setIsFormOpen(true); setMenuOpenId(null); }} 
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                       >
                         <Pencil size={15}/> Edit
                       </button>
                       <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); setMenuOpenId(null); }} 
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50"
                       >
                         <Trash size={15}/> Delete
                       </button>
                     </div>
                   )}
                 </div>

                 <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none bg-gradient-to-t from-black/80 to-transparent">
                    <div>
                       {p.albumTag && <span className="text-[10px] uppercase font-bold text-primary bg-primary/20 px-2 py-0.5 rounded backdrop-blur-sm inline-block mb-1">{p.albumTag}</span>}
                       {p.caption && <p className="text-white text-xs font-medium mt-1 truncate">{p.caption}</p>}
                    </div>
                 </div>
              </div>
           ))}
        </div>
      )}

      {/* Tag Management */}
      <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Gallery Filters (Tags)</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map(tag => (
            <div key={tag} className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="text-gray-400 hover:text-red-500 ml-1 focus:outline-none">
                <X size={14} />
              </button>
            </div>
          ))}
          {tags.length === 0 && <p className="text-sm text-gray-500">No tags configured.</p>}
        </div>
        <div className="flex gap-2 max-w-sm">
          <input 
            type="text" 
            value={newTag} 
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag name (e.g., Campaigns)" 
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
          />
          <Button onClick={handleAddTag} disabled={!newTag.trim()}>Add Tag</Button>
        </div>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Photo Details" size="md">
        <div className="space-y-6">
           <div className="bg-gray-50 p-4 rounded-lg flex justify-center border border-gray-100 border-dashed">
              <div className="max-w-xs w-full">
                 <CloudinaryUpload onUpload={(url, _publicId) => setFormData({...formData, url})} currentUrl={formData.url} label="Upload Image" />
              </div>
           </div>

           <div><label className={labelClass}>Caption</label><input value={formData.caption || ''} onChange={e => setFormData({...formData, caption: e.target.value})} className={inputClass} /></div>
           <div>
               <label className={labelClass}>Album Tag</label>
               <input value={formData.albumTag || ''} onChange={e => setFormData({...formData, albumTag: e.target.value})} className={inputClass} placeholder="e.g. Events" />
               <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(tag => (
                     <button key={tag} type="button" onClick={() => {
                        const currentTags = formData.albumTag ? formData.albumTag.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
                        if (!currentTags.includes(tag)) {
                          setFormData({...formData, albumTag: [...currentTags, tag].join(', ')});
                        }
                     }} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full font-medium transition-colors">
                        + {tag}
                     </button>
                  ))}
                  <button type="button" onClick={() => {
                        const currentTags = formData.albumTag ? formData.albumTag.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
                        if (!currentTags.includes('Featured')) {
                          setFormData({...formData, albumTag: [...currentTags, 'Featured'].join(', ')});
                        }
                     }} className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium transition-colors">
                        + Featured
                  </button>
               </div>
           </div>
        </div>
        <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
          {formData.id ? (
            <Button type="button" variant="outline" onClick={() => { setDeleteId(formData.id); setIsFormOpen(false); }} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Trash size={16} className="mr-2" />
              Delete Photo
            </Button>
          ) : <div></div>}
          <Button type="button" onClick={handleSave} disabled={!formData.url}>Save Photo</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Photo" message="Are you sure?" />

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-accent transition-colors z-50 bg-black/20 p-2 rounded-full" onClick={() => setLightboxIndex(null)}>
            <X size={32} />
          </button>
          
          <button 
            className="absolute left-4 md:left-8 text-white hover:text-accent transition-colors z-50 disabled:opacity-30 bg-black/20 p-2 md:p-4 rounded-full"
            disabled={lightboxIndex === 0} 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
          >
            <ChevronLeft size={32} />
          </button>
          
          <img 
            src={photos[lightboxIndex]?.url} 
            onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
            alt="" 
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
          
          <button 
            className="absolute right-4 md:right-8 text-white hover:text-accent transition-colors z-50 disabled:opacity-30 bg-black/20 p-2 md:p-4 rounded-full"
            disabled={lightboxIndex === photos.length - 1} 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
          >
            <ChevronRight size={32} />
          </button>
          
          {photos[lightboxIndex]?.caption && (
            <div className="absolute bottom-12 md:bottom-8 text-white/90 text-base font-medium text-center px-4 bg-black/50 py-2 rounded-full max-w-xl mx-auto backdrop-blur-sm">
              {photos[lightboxIndex].caption}
            </div>
          )}
          <div className="absolute bottom-4 text-white/40 text-xs font-bold tracking-widest">{lightboxIndex + 1} / {photos.length}</div>
        </div>
      )}
    </div>
  );
}
