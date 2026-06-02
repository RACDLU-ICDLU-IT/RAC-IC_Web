import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Presentation, Pencil, Trash, Users, Loader2, MoreVertical } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminProjects() {
  const { adminTenant: tenant } = useAdminTenant();
  const [projects, setProjects] = useState<any[]>([]);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'rich' | 'raw'>('rich');
  const [blocks, setBlocks] = useState<any[]>([]);

  const { addToast } = useToast();

  const fetchProjects = async (tenantId?: string) => {
    const tid = tenantId ?? tenant.id;
    setLoading(true);
    try {
      const { data: snap, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', tid)
        .order('startDate', { ascending: false });
      if (fetchError) throw fetchError;
      setProjects(snap || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const { data: snap } = await supabase.from('users').select('*').eq('tenant_id', tenant.id);
      setActiveMembers((snap || []).filter((m: any) => m.status === 'active'));
    } catch(err) { console.error(err); }
  };

  useEffect(() => {
    fetchProjects();
    fetchMembers();
  }, [tenant.id]);

  useEffect(() => {
    if (isFormOpen) {
      const desc = formData.description || '';
      try {
        const parsed = JSON.parse(desc);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
          setActiveTab('rich');
          return;
        }
      } catch (e) {}

      // Fallback: create a single text block with description content
      setBlocks([
        { id: crypto.randomUUID(), type: 'text', content: desc }
      ]);
      setActiveTab('rich');
    }
  }, [isFormOpen, formData.id]);

  const addBlock = (type: 'text' | 'image' | 'collage') => {
    const newId = crypto.randomUUID();
    let newBlock: any;
    if (type === 'text') {
      newBlock = { id: newId, type: 'text', content: '' };
    } else if (type === 'image') {
      newBlock = { id: newId, type: 'image', url: '', style: 'center', caption: '' };
    } else {
      newBlock = { id: newId, type: 'collage', urls: [], layout: 'grid2' };
    }
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updatedFields: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updatedFields } : b));
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredProjects.map(p => p.id));
    else setSelectedIds([]);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} projects?`)) return;
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .in('id', selectedIds)
        .eq('tenant_id', tenant.id);
      if (error) throw error;
      addToast(`Deleted ${selectedIds.length} projects`, 'success');
      setSelectedIds([]);
      fetchProjects();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Bulk delete failed', 'error');
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      addToast('Project name is required', 'error');
      return;
    }
    if (!formData.type) {
      addToast('Project type is required', 'error');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    // Capture tenant.id NOW so save + fetch always use the exact same value,
    // even if the admin tenant context changes between awaits.
    const currentTenantId = tenant.id;

    const isNew = !formData.id;
    // Destructure out 'gallery' — it's a local UI state key that has no
    // matching column in the database. Only 'galleryImages' is the real column.
    const { id, gallery, ...formDataWithoutId } = formData;
    const docId = isNew ? crypto.randomUUID() : id;
    
    // Convert tags string back to array if modified text, otherwise keep array
    let finalTags = formData.tags || [];
    if (typeof formData.tags === 'string') {
       finalTags = formData.tags.split(',').map((t:string) => t.trim()).filter(Boolean);
    }

    const finalDescription = activeTab === 'rich'
      ? JSON.stringify(blocks)
      : (formData.description || '');

    const currentGallery = formData.gallery || formData.galleryImages || [];
    const finalDate = formData.executionDate || formData.startDate || '';

    const dataToSave = { 
      ...formDataWithoutId, 
      description: finalDescription,
      tags: finalTags,
      memberIds: formData.memberIds || [],
      galleryImages: currentGallery,
      executionDate: finalDate,
      startDate: finalDate,
      tenant_id: currentTenantId   // always use the snapshot, not a live reference
    };
    
    try {
      // Use select() so Supabase returns the inserted/updated row.
      // Without this, upsert returns {error:null} even if RLS silently blocked the write.
      const { data: savedRows, error: saveError } = await supabase
        .from('projects')
        .upsert({ id: docId, ...dataToSave }, { onConflict: 'id' })
        .select('id');

      if (saveError) throw saveError;

      // Verify that the row was actually written (catches silent RLS failures)
      if (!savedRows || savedRows.length === 0) {
        throw new Error(
          'Project could not be saved — it may have been blocked by a database policy. ' +
          'Check that your account has write permission for the "' + currentTenantId + '" tenant.'
        );
      }

      addToast('Project saved', 'success');
      setIsFormOpen(false);
      
      // Pass currentTenantId explicitly so the list always refreshes
      // under the same tenant context that was used to save.
      await fetchProjects(currentTenantId);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to save project', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', deleteId)
        .eq('tenant_id', tenant.id);
      if (deleteError) throw deleteError;
      addToast('Project deleted', 'success');
      setDeleteId(null);
      fetchProjects();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to delete project', 'error');
    }
  };

  const generateReport = (project: any) => {
    const particip = (project.memberIds || []).map((id:string) => {
       const m = activeMembers.find(am => am.id === id);
       return m ? m.name : 'Unknown Member';
    }).join(', ');
    
    let descText = project.description || '';
    try {
      const parsed = JSON.parse(descText);
      if (Array.isArray(parsed)) {
        descText = parsed.map((b: any) => {
          if (b.type === 'text') return b.content;
          if (b.type === 'image') return `[Image: ${b.url} ${b.caption ? `(${b.caption})` : ''}]`;
          if (b.type === 'collage') return `[Collage of ${b.urls?.length || 0} images: ${(b.urls || []).join(', ')}]`;
          return '';
        }).join('\n\n');
      }
    } catch (e) {}

    const text = `PROJECT REPORT
=====================
Name: ${project.name}
Type: ${project.type}
Status: ${project.status}
Date: ${project.executionDate || project.startDate || 'TBD'}
Volunteer Hours Contributed: ${project.volunteerHours || 0}

Description:
${descText}

Participants (${(project.memberIds||[]).length}):
${particip}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Report_${project.name.replace(/\s+/g, '_')}.txt`;
    a.click();
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white placeholder:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const renderDescriptionPreview = () => {
    try {
      const descVal = activeTab === 'rich' ? JSON.stringify(blocks) : (formData.description || '');
      try {
        const parsed = JSON.parse(descVal);
        if (Array.isArray(parsed)) {
          return { __html: '*Visual layout builder content represents custom styled elements*' };
        }
      } catch (e) {}
      return { __html: DOMPurify.sanitize(marked(descVal || '*No description yet*') as string) };
    } catch (e) {
      return { __html: '' };
    }
  };

  const toggleMember = (id: string) => {
    const current = formData.memberIds || [];
    if (current.includes(id)) {
      setFormData({...formData, memberIds: current.filter((x:string) => x !== id) });
    } else {
      setFormData({...formData, memberIds: [...current, id] });
    }
  };

  const filteredProjects = filter === 'all' ? projects : projects.filter(p => p.status?.toLowerCase() === filter);

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Projects</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Manage community service and initiatives</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
             {['all','upcoming','ongoing','completed'].map(t => (
               <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${filter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                 {t}
               </button>
             ))}
          </div>
          <Button onClick={() => { setFormData({ type: 'Community Service', status: 'Upcoming' }); setIsFormOpen(true); }}>
             Add Project
          </Button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-xl"></div>)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-400">
           <Presentation size={48} className="mb-4" />
           <p className="font-medium text-gray-500">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group relative">
              <div className="relative h-48 bg-gray-200">
                {p.coverImage && <img src={p.coverImage} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4">
                   <h3 className="text-white font-heading font-bold text-xl drop-shadow-md">{p.name}</h3>
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
                <div className="absolute top-2 right-2 z-10">
                  <button 
                    onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)} 
                    className="p-1.5 bg-black/40 text-white rounded-lg hover:bg-black/60 transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                  {menuOpenId === p.id && (
                    <div className="absolute top-10 right-0 w-32 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-20">
                      <button 
                         onClick={() => { setFormData(p); setIsFormOpen(true); setMenuOpenId(null); }} 
                         className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Pencil size={15}/> Edit
                      </button>
                      <button 
                         onClick={() => { setDeleteId(p.id); setMenuOpenId(null); }} 
                         className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50"
                      >
                        <Trash size={15}/> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                 <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{p.type}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      p.status==='Completed' ? 'bg-green-100 text-green-800' :
                      p.status==='Ongoing' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>{p.status}</span>
                 </div>
                 <div className="text-xs text-gray-500 font-medium font-mono">Date: {p.executionDate || p.startDate || 'TBD'}</div>
                 <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 self-start px-2 py-1 rounded">
                    <Users size={14}/> {(p.memberIds || []).length} participants
                 </div>
              </div>
              <div className="px-4 pb-4">
                 <Button variant="outline" className="w-full text-xs" onClick={() => generateReport(p)}>Generate Report</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit Project' : 'Add Project'} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="md:col-span-2 space-y-4">
            <div><label className={labelClass}>Project Name</label><input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Type</label>
                <select value={formData.type || 'Community Service'} onChange={e => setFormData({...formData, type: e.target.value})} className={inputClass}>
                  <option value="Community Service">Community Service</option>
                  <option value="International Understanding">International Understanding</option>
                  <option value="Health">Health</option>
                  <option value="Environment">Environment</option>
                  <option value="Education">Education</option>
                  <option value="Arts & Culture">Arts & Culture</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={formData.status || 'Upcoming'} onChange={e => setFormData({...formData, status: e.target.value})} className={inputClass}>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Execution Date</label>
                <input 
                  type="date" 
                  value={formData.executionDate || formData.startDate || ''} 
                  onChange={e => setFormData({
                    ...formData, 
                    executionDate: e.target.value, 
                    startDate: e.target.value
                  })} 
                  className={inputClass} 
                />
              </div>
            </div>

            <div><label className={labelClass}>Volunteer Hours</label><input type="number" value={formData.volunteerHours || 0} onChange={e => setFormData({...formData, volunteerHours: Number(e.target.value)})} className={inputClass} /></div>
            
            <div>
              <label className={labelClass}>Tags (comma-separated)</label>
              <input 
                value={typeof formData.tags === 'string' ? formData.tags : (formData.tags || []).join(', ')} 
                onChange={e => setFormData({...formData, tags: e.target.value})} 
                className={inputClass} 
                placeholder="e.g. food drive, partnership"
              />
            </div>
            
            {/* Description Tab Builder */}
            <div className="space-y-3">
              <div className="flex border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('rich')}
                  className={`py-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${activeTab === 'rich' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Rich Section Builder
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
                <div className="space-y-4">
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
                      + Single Image
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('collage')}
                      className="px-3 py-1 bg-white border border-gray-200 hover:border-accent text-xs font-medium text-gray-700 hover:text-accent rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      + Photo Collage
                    </button>
                  </div>

                  {blocks.length === 0 ? (
                    <div className="border border-dashed border-gray-200 rounded-xl py-12 text-center text-gray-400 text-xs italic">
                      No blocks added yet. Click above to add text blocks, images, or photo collages!
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {blocks.map((block, index) => (
                        <div key={block.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative group/block">
                          {/* Header bar of block */}
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3 select-none">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                block.type === 'text' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                block.type === 'image' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                'bg-purple-50 text-purple-700 border border-purple-100'
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
                                placeholder="Type markdown description text here..."
                              />
                            </div>
                          )}

                          {block.type === 'image' && (
                            <div className="space-y-3">
                              {/* Selected Image Preview / Upload */}
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
                                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Upload directly or select from Project Library below</label>
                                    <CloudinaryUpload 
                                      onUpload={(url) => updateBlock(block.id, { url })} 
                                      currentUrl={block.url} 
                                      aspectRatio="landscape"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Quick selection from library items */}
                              {((formData.gallery || formData.galleryImages || []).length > 0) && (
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Select from Project Image Library:</p>
                                  <div className="flex flex-wrap gap-1.5 p-1 bg-gray-50 rounded border border-gray-100 max-h-24 overflow-y-auto">
                                    {(formData.gallery || formData.galleryImages || []).map((url: string, assetIdx: number) => {
                                      const isSelected = block.url === url;
                                      return (
                                        <button
                                          type="button"
                                          key={assetIdx}
                                          onClick={() => updateBlock(block.id, { url })}
                                          className={`relative w-8 h-8 rounded border overflow-hidden shrink-0 transition-all ${isSelected ? 'border-accent ring-2 ring-accent/30 scale-95' : 'border-gray-200 hover:border-gray-400'}`}
                                        >
                                          <img src={url} className="w-full h-full object-cover" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

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
                                    placeholder="e.g. Distribution event"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {block.type === 'collage' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-1">Collage Layout Style</label>
                                  <select
                                    value={block.layout || 'grid2'}
                                    onChange={e => updateBlock(block.id, { layout: e.target.value })}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none bg-white"
                                  >
                                    <option value="grid2">2-Columns Side-by-Side</option>
                                    <option value="grid3">3-Columns Side-by-Side</option>
                                    <option value="mosaic">Mosaic Layout (1 large + 2 small)</option>
                                    <option value="masonry">Flexible Column Flow</option>
                                  </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                  <span className="text-xs font-bold text-gray-500">
                                    Selected Photo(s): {(block.urls || []).length}
                                  </span>
                                </div>
                              </div>

                              {/* Interactive Collage selector from gallery library */}
                              <div>
                                <p className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider font-mono">
                                  Choose library images for this collage (click to toggle):
                                </p>
                                {((formData.gallery || formData.galleryImages || []).length > 0) ? (
                                  <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded border border-gray-100 max-h-32 overflow-y-auto">
                                    {(formData.gallery || formData.galleryImages || []).map((url: string, assetIdx: number) => {
                                      const currentUrls = block.urls || [];
                                      const index = currentUrls.indexOf(url);
                                      const isSelected = index !== -1;
                                      return (
                                        <button
                                          type="button"
                                          key={assetIdx}
                                          onClick={() => {
                                            const nextUrls = isSelected
                                              ? currentUrls.filter((u: string) => u !== url)
                                              : [...currentUrls, url];
                                            updateBlock(block.id, { urls: nextUrls });
                                          }}
                                          className={`relative w-12 h-12 rounded border overflow-hidden shrink-0 transition-all ${isSelected ? 'border-purple-600 ring-4 ring-purple-100 scale-95' : 'border-gray-200 hover:border-gray-400'}`}
                                        >
                                          <img src={url} className="w-full h-full object-cover" />
                                          {isSelected && (
                                            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-purple-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center select-none">
                                              {index + 1}
                                            </div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">No images in Project Image Library. Please upload some library photos on the right first!</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                   <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} rows={6} />
                   <div className="mt-2 p-4 bg-gray-50 border border-gray-100 rounded-lg max-h-40 overflow-y-auto prose prose-sm text-gray-700" dangerouslySetInnerHTML={renderDescriptionPreview()} />
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <label className={labelClass}>Cover Image</label>
              <CloudinaryUpload onUpload={(url) => setFormData({...formData, coverImage: url})} currentUrl={formData.coverImage} aspectRatio="landscape" />
            </div>

            <div>
              <label className={labelClass}>Project Image Library</label>
              <div className="space-y-3">
                <CloudinaryUpload 
                  onUpload={(url) => {
                    if (url) {
                      setFormData((prev: any) => {
                        const currentGallery = prev.gallery || prev.galleryImages || [];
                        if (currentGallery.includes(url)) return prev;
                        const updated = [...currentGallery, url];
                        return {
                          ...prev,
                          gallery: updated,
                          galleryImages: updated
                        };
                      });
                    }
                  }} 
                  buttonText="Upload Image to Library"
                  multiple={true}
                />
                
                {/* Grid of gallery assets */}
                {((formData.gallery || formData.galleryImages || []).length > 0) ? (
                  <div className="grid grid-cols-4 gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-48 overflow-y-auto">
                    {(formData.gallery || formData.galleryImages || []).map((url: string, index: number) => (
                      <div key={index} className="relative aspect-square bg-gray-100 rounded overflow-hidden group border border-gray-200">
                        <img src={url} alt={`Asset ${index}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const currentGallery = formData.gallery || formData.galleryImages || [];
                            const updated = currentGallery.filter((_: any, i: number) => i !== index);
                            setFormData({
                              ...formData,
                              gallery: updated,
                              galleryImages: updated
                            });
                          }}
                          className="absolute inset-0 bg-red-600/85 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-bold"
                          title="Remove image"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No images in library yet</p>
                )}
                <p className="text-[10px] text-gray-400 leading-normal">Upload images here, then use them in your dynamic sections or collages below.</p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Participants</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-48 overflow-y-auto">
                {activeMembers.map(m => (
                  <label key={m.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded cursor-pointer">
                     <input type="checkbox" checked={(formData.memberIds || []).includes(m.id)} onChange={() => toggleMember(m.id)} />
                     <span className="text-sm">{m.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{(formData.memberIds || []).length} selected</p>
            </div>
          </div>

        </div>
        <div className="flex justify-between pt-6 mt-6 border-t border-gray-100">
          {formData.id ? (
            <Button type="button" variant="outline" onClick={() => { setDeleteId(formData.id); setIsFormOpen(false); }} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Trash size={16} className="mr-2" />
              Delete Project
            </Button>
          ) : <div></div>}
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Project'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Project" message="Are you sure? This cannot be undone." />
    </div>
  );
}
