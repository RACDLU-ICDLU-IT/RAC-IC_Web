import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, writeBatch, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { fetchAndBake } from '../../utils/bake';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Pencil, Trash, User, Grid } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useSettings } from '../../contexts/SettingsContext';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ id, member, onEdit, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center p-4 gap-4 relative group cursor-default">
       <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 p-1"><Grid size={20} /></div>
       {member.photo ? (
         <img src={member.photo} className="w-12 h-12 rounded-full object-cover shrink-0" />
       ) : (
         <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><User size={20} /></div>
       )}
       <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{member.name}</h3>
          <p className="text-sm text-primary font-medium truncate">{member.position}</p>
       </div>
       <div className="flex gap-2">
         <button onClick={() => onEdit(member)} className="text-gray-400 hover:text-primary p-2"><Pencil size={18} /></button>
         <button onClick={() => onDelete(member.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash size={18} /></button>
       </div>
    </div>
  );
};

export default function AdminBoard() {
  const { settings } = useSettings();
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isConfirmYear, setIsConfirmYear] = useState(false);

  const { addToast } = useToast();

  const fetchBoard = async () => {
    setLoading(true);
    try {
       const q = query(collection(db, 'board'), where('rotaryYear', '==', settings.rotaryYear));
       const snap = await getDocs(q);
       const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       items.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
       setBoard(items);
    } catch (err) {
       console.error(err);
       addToast('Failed to load board', 'error');
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    if (settings.rotaryYear) fetchBoard();
  }, [settings.rotaryYear]);

  const handleSave = async () => {
    const isNew = !formData.id;
    const docId = isNew ? doc(collection(db, 'board')).id : formData.id;
    
    try {
      await setDoc(doc(db, 'board', docId), { ...formData, order: formData.order ?? board.length }, { merge: true });
      addToast('Board member saved', 'success');
      setIsFormOpen(false);
      await fetchAndBake('board');
      fetchBoard();
    } catch (err) {
      addToast('Failed to save', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'board', deleteId));
      addToast('Board member removed', 'success');
      setDeleteId(null);
      await fetchAndBake('board');
      fetchBoard();
    } catch (err) { addToast('Failed to delete', 'error'); }
  };

  const advanceRotaryYear = async () => {
    try {
       const current = settings.rotaryYear || '2025-2026';
       const parts = current.split('-');
       let nextYear = '';
       if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
          nextYear = `${Number(parts[0])+1}-${Number(parts[1])+1}`;
       } else {
          nextYear = 'Next Year';
       }
       await setDoc(doc(db, 'settings', 'global'), { rotaryYear: nextYear }, { merge: true });
       addToast('Rotary Year advanced', 'success');
       setIsConfirmYear(false);
    } catch(err) {
       addToast('Failed to advance year', 'error');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = board.findIndex(i => i.id === active.id);
      const newIndex = board.findIndex(i => i.id === over.id);
      const newBoard = arrayMove(board, oldIndex, newIndex);
      
      setBoard(newBoard);
      
      // Update order in firestore
      try {
        const batch = writeBatch(db);
        newBoard.forEach((m, idx) => {
          batch.update(doc(db, 'board', m.id), { order: idx });
        });
        await batch.commit();
        await fetchAndBake('board');
      } catch(err) {
        addToast('Failed to save order', 'error');
        fetchBoard(); // revert
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Board of Officers</h1>
           <p className="text-gray-500 text-sm mt-1">Current Rotary Year: <span className="font-bold text-primary">{settings.rotaryYear}</span></p>
        </div>
        <div className="flex gap-3">
           <Button variant="secondary" onClick={() => setIsConfirmYear(true)}>New Rotary Year</Button>
           <Button onClick={() => { setFormData({ rotaryYear: settings.rotaryYear, order: board.length }); setIsFormOpen(true); }}>Add Member</Button>
        </div>
      </div>

      {loading ? (
         <div className="space-y-3">
           {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl"></div>)}
         </div>
      ) : board.length === 0 ? (
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex justify-center text-gray-400">
           <p>No board members for {settings.rotaryYear}. Add your team!</p>
         </div>
      ) : (
         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
           <SortableContext items={board.map(i=>i.id)} strategy={verticalListSortingStrategy}>
             <div className="flex flex-col gap-3">
                {board.map(m => (
                  <SortableItem key={m.id} id={m.id} member={m} onEdit={(f:any)=>{setFormData(f); setIsFormOpen(true);}} onDelete={setDeleteId} />
                ))}
             </div>
           </SortableContext>
         </DndContext>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Board Member" size="md">
        <div className="space-y-4">
           <div className="flex justify-center mb-6">
              <div className="w-32"><CloudinaryUpload onUpload={(url) => setFormData({...formData, photo: url})} currentUrl={formData.photo} aspectRatio="square" label="Photo" /></div>
           </div>
           <div><label className={labelClass}>Name</label><input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
           <div><label className={labelClass}>Position</label><input value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} className={inputClass} placeholder="e.g. President" /></div>
           <div><label className={labelClass}>Bio</label><textarea value={formData.bio || ''} maxLength={150} onChange={e => setFormData({...formData, bio: e.target.value})} className={inputClass} rows={3} placeholder="Max 150 chars" />
              <p className="text-xs text-gray-400 text-right mt-1">{(formData.bio || '').length}/150</p>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Order</label><input type="number" value={formData.order || 0} onChange={e => setFormData({...formData, order: Number(e.target.value)})} className={inputClass} /></div>
              <div><label className={labelClass}>Rotary Year</label><input value={formData.rotaryYear || ''} onChange={e => setFormData({...formData, rotaryYear: e.target.value})} className={inputClass} /></div>
           </div>
        </div>
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Board Member</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Member" message="Are you sure?" />
      
      <ConfirmDialog 
        isOpen={isConfirmYear} 
        onClose={() => setIsConfirmYear(false)} 
        onConfirm={advanceRotaryYear} 
        title="Start New Rotary Year" 
        message={`This will archive the current board and start a fresh one for the next Rotary Year. The current board members will remain in Firestore with their rotaryYear tag, but the active board display will be cleared. Continue?`} 
        confirmLabel="Yes, Start New Year" 
      />
    </div>
  );
}
