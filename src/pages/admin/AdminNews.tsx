import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Pencil, Trash, Newspaper } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useAuth } from '../../contexts/AuthContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { getBodyExcerpt } from '../../utils/format';

export default function AdminNews() {
  const { adminTenant: tenant } = useAdminTenant();
  const { profile } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Rich content block builder (same pattern as Add/Edit Project)
  const [activeTab, setActiveTab] = useState<'rich' | 'raw'>('rich');
  const [blocks, setBlocks] = useState<any[]>([]);

  const { addToast } = useToast();

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data: snap } = await supabase.from('news').select('*').eq('tenant_id', tenant.id).order('createdAt', { ascending: false });
      setArticles(snap || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load news', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [tenant.id]);

  // Whenever the form opens (new article or edit), hydrate the block builder from body
  useEffect(() => {
    if (isFormOpen) {
      const body = formData.body || '';
      try {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
          setActiveTab('rich');
          return;
        }
      } catch (e) {}

      setBlocks([
        { id: crypto.randomUUID(), type: 'text', content: body }
      ]);
      setActiveTab('rich');
    }
  }, [isFormOpen, formData.id]);

  const addBlock = (type: 'text' | 'image') => {
    const newId = crypto.randomUUID();
    const newBlock =
      type === 'text'
        ? { id: newId, type: 'text', content: '' }
        : { id: newId, type: 'image', url: '', style: 'center', caption: '' };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updatedFields: any) => {
    setBlocks(blocks.map(b => (b.id === id ? { ...b, ...updatedFields } : b)));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setBlocks(updated);
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleSave = async () => {
    const isNew = !formData.id;
    const docId = isNew ? crypto.randomUUID() : formData.id;

    const slug = formData.slug || formData.title?.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const finalBody = activeTab === 'rich' ? JSON.stringify(blocks) : (formData.body || '');

    const dataToSave = {
      ...formData,
      body: finalBody,
      slug,
      createdAt: formData.createdAt || new Date().toISOString(),
      publishedAt: formData.status === 'Published' && !formData.publishedAt ? new Date().toISOString() : formData.publishedAt,
      tenant_id: tenant.id
    };

    try {
      const { data: savedRows, error: saveError } = await supabase
        .from('news')
        .upsert({ id: docId, ...dataToSave }, { onConflict: 'id' })
        .select('id');

      if (saveError) throw saveError;
      if (!savedRows || savedRows.length === 0) {
        throw new Error('Article could not be saved — check RLS policy for this tenant.');
      }

      addToast('Article saved', 'success');
      setIsFormOpen(false);
      fetchArticles();
    } catch (err) {
      console.error(err);
      addToast('Failed to save article', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: deleteError } = await supabase
        .from('news')
        .delete()
        .eq('id', deleteId)
        .eq('tenant_id', tenant.id);
      if (deleteError) throw deleteError;
      addToast('Article deleted', 'success');
      setDeleteId(null);
      fetchArticles();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete', 'error');
    }
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

  const filtered = filter === 'all' ? articles : articles.filter(a => a.status?.toLowerCase() === filter);

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">News Articles</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
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
                 <img src={a.coverImage} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-1/3 object-cover bg-gray-200 shrink-0" />
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
                  <p className="text-xs text-gray-600 line-clamp-2 mt-auto">{getBodyExcerpt(a.body)}</p>
               </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit Article' : 'Write Article'} size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[75vh]">
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
               <div><label className={labelClass}>Custom URL Slug</label><input value={formData.slug || ''} placeholder="e.g. key-project-update" onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')})} className={inputClass} /></div>
            </div>

            <div>
              <label className={labelClass}>Cover Image</label>
              <CloudinaryUpload onUpload={(url, publicId) => setFormData({...formData, coverImage: url, coverImagePublicId: publicId})} currentUrl={formData.coverImage} currentPublicId={formData.coverImagePublicId} aspectRatio="landscape" />
            </div>

            {/* Content Tab Builder */}
            <div className="flex flex-col flex-1 min-h-[300px] space-y-3">
              <div className="flex border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('rich')}
                  className={`py-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${activeTab === 'rich' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Rich Content Builder
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('raw')}
                  className={`py-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${activeTab === 'raw' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Raw Markdown Text
                </button>
              </div>

              {activeTab === 'rich' ? (
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap gap-2 items-center p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Add Content Section:</span>
                    <button
                      type="button"
                      onClick={() => addBlock('text')}
                      className="px-3 py-1 bg-white border border-gray-200 hover:border-accent text-xs font-medium text-gray-700 hover:text-accent rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      + Text block
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('image')}
                      className="px-3 py-1 bg-white border border-gray-200 hover:border-accent text-xs font-medium text-gray-700 hover:text-accent rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      + Image
                    </button>
                  </div>

                  {blocks.length === 0 ? (
                    <div className="border border-dashed border-gray-200 rounded-xl py-12 text-center text-gray-400 text-xs italic">
                      No sections added yet. Click above to add text or images to the article body!
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                      {blocks.map((block, index) => (
                        <div key={block.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group/block">
                          {/* Header bar of block */}
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3 select-none">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                block.type === 'text' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {block.type} section
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveBlock(index, 'up')}
                                disabled={index === 0}
                                className="p-1 hover:bg-gray-100 disabled:opacity-30 rounded text-gray-500 font-bold"
                                title="Move Up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBlock(index, 'down')}
                                disabled={index === blocks.length - 1}
                                className="p-1 hover:bg-gray-100 disabled:opacity-30 rounded text-gray-500 font-bold"
                                title="Move Down"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteBlock(block.id)}
                                className="p-1 hover:bg-red-50 text-red-600 rounded ml-2 font-bold"
                                title="Delete Section"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          {/* Content block editor body */}
                          {block.type === 'text' && (
                            <div className="space-y-2">
                              <textarea
                                value={block.content || ''}
                                onChange={e => updateBlock(block.id, { content: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-white"
                                rows={4}
                                placeholder="Type markdown article text here..."
                              />
                            </div>
                          )}

                          {block.type === 'image' && (
                            <div className="space-y-3">
                              <div className="flex gap-4 items-start">
                                <div className="w-24 aspect-video bg-gray-50 rounded border border-gray-200 overflow-hidden shrink-0">
                                  {block.url ? (
                                    <img src={block.url} alt="Selected" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                                  )}
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Upload an image for this section</label>
                                    <CloudinaryUpload
                                      onUpload={(url) => updateBlock(block.id, { url })}
                                      currentUrl={block.url}
                                      aspectRatio="landscape"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">Display Style</label>
                                  <select
                                    value={block.style || 'center'}
                                    onChange={e => updateBlock(block.id, { style: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none bg-white"
                                  >
                                    <option value="center">Centered (Standard)</option>
                                    <option value="full">Full Width</option>
                                    <option value="left">Left Floating Wrap</option>
                                    <option value="right">Right Floating Wrap</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">Caption / Subtitle</label>
                                  <input
                                    type="text"
                                    value={block.caption || ''}
                                    onChange={e => updateBlock(block.id, { caption: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none bg-white"
                                    placeholder="e.g. Handing out supplies"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  <div className="flex gap-1.5 p-2 bg-gray-100 rounded-t-lg border border-b-0 border-gray-200">
                     <button onClick={()=>insertMarkdown('**Bold** ')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold hover:bg-gray-50">B</button>
                     <button onClick={()=>insertMarkdown('*Italic* ')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs italic hover:bg-gray-50">I</button>
                     <button onClick={()=>insertMarkdown('### Heading\n')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50">H3</button>
                     <button onClick={()=>insertMarkdown('- List item\n')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50">•</button>
                     <button onClick={()=>insertMarkdown('[Link text](https://)')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs flex items-center hover:bg-gray-50">🔗</button>
                     <button onClick={()=>insertMarkdown('![Alt text](https://)')} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs flex items-center hover:bg-gray-50">🖼️</button>
                  </div>
                  <textarea
                    id="news-body-editor"
                    value={formData.body || ''}
                    onChange={e => setFormData({...formData, body: e.target.value})}
                    className="w-full flex-1 p-3 text-sm font-mono border border-gray-200 rounded-b-lg focus:outline-none focus:ring-1 focus:ring-accent resize-none bg-gray-50"
                    placeholder="Write your article here..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Panel */}
          <div className="hidden lg:flex flex-col border-l border-gray-100 pl-8 overflow-y-auto">
             <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Live Preview</div>
             <div className="prose prose-sm prose-primary max-w-none after:content-[''] after:table after:clear-both">
                {formData.coverImage && <img src={formData.coverImage} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-full rounded-lg mb-6" />}
                <h1 className="mb-2">{formData.title || 'Untitled Article'}</h1>
                <p className="text-gray-500 mb-8"><small>By {formData.author} • {formData.category}</small></p>

                {activeTab === 'rich' ? (
                  blocks.length === 0 ? (
                    <p className="italic text-gray-400">No content yet</p>
                  ) : (
                    blocks.map((block, idx) => {
                      if (block.type === 'text') {
                        return (
                          <div
                            key={block.id || idx}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(block.content || '') as string) }}
                          />
                        );
                      }
                      if (block.type === 'image') {
                        const floatClass = block.style === 'left' ? 'float-left mr-4 max-w-[45%] mb-4' :
                                           block.style === 'right' ? 'float-right ml-4 max-w-[45%] mb-4' :
                                           block.style === 'full' ? 'w-full mb-6' :
                                           'max-w-sm mx-auto flex flex-col items-center text-center mb-6';
                        return (
                          <div key={block.id || idx} className={floatClass}>
                            {block.url ? (
                              <img src={block.url} alt={block.caption || ''} className="rounded-lg w-full" />
                            ) : (
                              <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs">No image selected</div>
                            )}
                            {block.caption && <span className="block text-xs text-gray-500 mt-1 not-italic">{block.caption}</span>}
                          </div>
                        );
                      }
                      return null;
                    })
                  )
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(formData.body || '*No content*') as string) }} />
                )}
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
