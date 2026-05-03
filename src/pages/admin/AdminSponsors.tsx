import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { fetchAndBake } from '../../utils/bake';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Pencil, Trash, Globe } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';

export default function AdminSponsors() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { addToast } = useToast();

  const fetchSponsors = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'sponsors')));
      setSponsors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      addToast('Failed to load sponsors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const handleSave = async () => {
    const isNew = !formData.id;
    const docId = isNew ? doc(collection(db, 'sponsors')).id : formData.id;
    
    try {
      await setDoc(doc(db, 'sponsors', docId), { ...formData, createdAt: formData.createdAt || new Date() }, { merge: true });
      addToast('Sponsor saved', 'success');
      setIsFormOpen(false);
      await fetchAndBake('sponsors');
      fetchSponsors();
    } catch (err) {
      addToast('Failed to save', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'sponsors', deleteId));
      addToast('Sponsor removed', 'success');
      setDeleteId(null);
      await fetchAndBake('sponsors');
      fetchSponsors();
    } catch (err) { addToast('Failed to delete', 'error'); }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];

  return (
    <div className="space-y-12 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Sponsors</h1>
          <p className="text-gray-500 text-sm mt-1">Manage partners supporting your club</p>
        </div>
        <Button onClick={() => { setFormData({ tier: 'Platinum' }); setIsFormOpen(true); }}>Add Sponsor</Button>
      </div>

      {loading ? (
         <div className="space-y-4">
           {[1,2].map(i => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-xl"></div>)}
         </div>
      ) : sponsors.length === 0 ? (
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex justify-center text-gray-400">
           <p>No sponsors found. Add one to show appreciation!</p>
         </div>
      ) : (
         <div className="space-y-12">
            {tiers.map(tier => {
               const st = sponsors.filter(s => s.tier === tier);
               if (st.length === 0) return null;
               
               const cardSize = tier === 'Platinum' ? 'h-32' : tier === 'Gold' ? 'h-24' : 'h-20';
               const gridCols = tier === 'Platinum' ? 'grid-cols-1 md:grid-cols-2' : tier === 'Gold' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4';

               return (
                 <section key={tier}>
                   <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-200 pb-2">{tier} Sponsors</h2>
                   <div className={`grid gap-4 ${gridCols}`}>
                      {st.map(s => (
                         <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col group relative overflow-hidden transition-all hover:shadow-md">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded backdrop-blur">
                               <button onClick={() => { setFormData(s); setIsFormOpen(true); }} className="text-gray-500 hover:text-primary"><Pencil size={14}/></button>
                               <button onClick={() => setDeleteId(s.id)} className="text-gray-500 hover:text-red-500"><Trash size={14}/></button>
                            </div>
                            <div className={`w-full ${cardSize} flex items-center justify-center mb-3 bg-gray-50 rounded-lg p-2`}>
                               {s.logoUrl ? <img src={s.logoUrl} className="max-w-full max-h-full object-contain mix-blend-multiply" /> : <span className="text-gray-300">No Logo</span>}
                            </div>
                            <div className="flex-1 flex flex-col justify-between items-center text-center">
                               <h3 className="font-bold text-gray-900 mb-1">{s.name}</h3>
                               {tier === 'Platinum' && s.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{s.description}</p>}
                               {s.websiteUrl && <a href={s.websiteUrl} target="_blank" className="mt-auto text-primary opacity-50 hover:opacity-100 transition-opacity"><Globe size={16}/></a>}
                            </div>
                         </div>
                      ))}
                   </div>
                 </section>
               );
            })}
         </div>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit Sponsor' : 'Add Sponsor'} size="md">
        <div className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Name</label><input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
              <div>
                <label className={labelClass}>Tier</label>
                <select value={formData.tier || 'Platinum'} onChange={e => setFormData({...formData, tier: e.target.value})} className={inputClass}>
                   <option value="Platinum">Platinum</option><option value="Gold">Gold</option>
                   <option value="Silver">Silver</option><option value="Bronze">Bronze</option>
                </select>
              </div>
           </div>
           
           <div>
              <label className={labelClass}>Logo</label>
              <CloudinaryUpload onUpload={(url) => setFormData({...formData, logoUrl: url})} currentUrl={formData.logoUrl} aspectRatio="landscape" />
           </div>

           <div><label className={labelClass}>Website URL</label><input value={formData.websiteUrl || ''} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} className={inputClass} placeholder="https://" /></div>
           
           {(formData.tier === 'Platinum' || formData.tier === 'Gold') && (
             <div><label className={labelClass}>Description (Short)</label><textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} rows={2} /></div>
           )}
        </div>
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Sponsor</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Sponsor" message="Are you sure?" />
    </div>
  );
}
