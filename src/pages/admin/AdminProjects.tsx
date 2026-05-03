import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { fetchAndBake } from '../../utils/bake';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Presentation, Pencil, Trash, Users } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { marked } from 'marked';

export default function AdminProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { addToast } = useToast();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'projects'), orderBy('startDate', 'desc')));
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      addToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      setActiveMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((m: any) => m.status === 'active'));
    } catch(err) { console.error(err); }
  };

  useEffect(() => {
    fetchProjects();
    fetchMembers();
  }, []);

  const handleSave = async () => {
    const isNew = !formData.id;
    const docId = isNew ? doc(collection(db, 'projects')).id : formData.id;
    
    // Convert tags string back to array if modified text, otherwise keep array
    let finalTags = formData.tags || [];
    if (typeof formData.tags === 'string') {
       finalTags = formData.tags.split(',').map((t:string) => t.trim()).filter(Boolean);
    }

    const dataToSave = { 
      ...formData, 
      tags: finalTags,
      memberIds: formData.memberIds || [],
      galleryImages: formData.galleryImages || []
    };
    
    try {
      await setDoc(doc(db, 'projects', docId), dataToSave, { merge: true });
      addToast('Project saved', 'success');
      setIsFormOpen(false);
      await fetchAndBake('projects');
      fetchProjects();
    } catch (err) {
      console.error(err);
      addToast('Failed to save project', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'projects', deleteId));
      addToast('Project deleted', 'success');
      setDeleteId(null);
      await fetchAndBake('projects');
      fetchProjects();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete project', 'error');
    }
  };

  const generateReport = (project: any) => {
    const particip = (project.memberIds || []).map((id:string) => {
       const m = activeMembers.find(am => am.id === id);
       return m ? m.name : 'Unknown Member';
    }).join(', ');
    
    const text = `PROJECT REPORT
=====================
Name: ${project.name}
Type: ${project.type}
Status: ${project.status}
Dates: ${project.startDate || 'TBD'} to ${project.endDate || 'TBD'}
Volunteer Hours Contributed: ${project.volunteerHours || 0}

Description:
${project.description}

Participants (${(project.memberIds||[]).length}):
${particip}`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Report_${project.name.replace(/\\s+/g, '_')}.txt`;
    a.click();
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white placeholder:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const renderDescriptionPreview = () => {
    try {
      return { __html: marked(formData.description || '*No description yet*') };
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
          <h1 className="text-2xl font-heading font-bold text-gray-900">Projects</h1>
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
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group">
              <div className="relative h-48 bg-gray-200">
                {p.coverImage && <img src={p.coverImage} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4">
                   <h3 className="text-white font-heading font-bold text-xl drop-shadow-md">{p.name}</h3>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setFormData(p); setIsFormOpen(true); }} className="p-2 bg-white/90 text-gray-800 rounded-lg hover:bg-white"><Pencil size={16}/></button>
                   <button onClick={() => setDeleteId(p.id)} className="p-2 bg-red-600/90 text-white rounded-lg hover:bg-red-600"><Trash size={16}/></button>
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
                 <div className="text-xs text-gray-500 font-medium">Starts: {p.startDate || 'TBD'}</div>
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
              <div><label className={labelClass}>Start Date</label><input type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} className={inputClass} /></div>
              <div><label className={labelClass}>End Date (Optional)</label><input type="date" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} className={inputClass} /></div>
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
            
            <div>
               <label className={labelClass}>Description (Markdown)</label>
               <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} rows={6} />
               <div className="mt-2 p-4 bg-gray-50 border border-gray-100 rounded-lg max-h-40 overflow-y-auto prose prose-sm text-gray-700" dangerouslySetInnerHTML={renderDescriptionPreview()} />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <label className={labelClass}>Cover Image</label>
              <CloudinaryUpload onUpload={(url) => setFormData({...formData, coverImage: url})} currentUrl={formData.coverImage} aspectRatio="landscape" />
            </div>

            <div>
              <label className={labelClass}>Participants</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-64 overflow-y-auto">
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
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Project</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Project" message="Are you sure? This cannot be undone." />
    </div>
  );
}
