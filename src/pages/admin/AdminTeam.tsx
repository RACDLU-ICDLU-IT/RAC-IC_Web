import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Pencil, Trash, User, Grid, Shield, Users } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useAdminTenant } from '../../hooks/useAdminTenant';

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
        <img src={member.photo} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-12 h-12 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><User size={20} /></div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 truncate">{member.name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {member.is_board_member ? (
            <>
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-semibold">
                <Shield size={10} /> Board
              </span>
              {member.position && <p className="text-sm text-gray-500 truncate">{member.position}</p>}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">
              <Users size={10} /> Member
            </span>
          )}
        </div>
      </div>
      {member.card_image && (
        <img src={member.card_image} className="w-10 h-14 rounded object-cover shrink-0 border border-gray-100 opacity-70" title="Card image" />
      )}
      <div className="flex gap-2">
        <button onClick={() => onEdit(member)} className="text-gray-400 hover:text-primary p-2"><Pencil size={18} /></button>
        <button onClick={() => onDelete(member.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash size={18} /></button>
      </div>
    </div>
  );
};

export default function AdminTeam() {
  const { adminTenant: tenant } = useAdminTenant();
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isConfirmYear, setIsConfirmYear] = useState(false);

  const { addToast } = useToast();

  const loadSettingsAndTeam = async () => {
    setLoading(true);
    try {
      const { data: settingsRow } = await supabase.from('settings').select('data').eq('id', `${tenant.id}-global`).single();
      const stgs = settingsRow?.data || {};
      setGlobalSettings(stgs);

      if (stgs.rotaryYear) {
        const { data: snap } = await supabase.from('board').select('*').eq('tenant_id', tenant.id).eq('rotaryYear', stgs.rotaryYear);
        const items = snap || [];
        items.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
        setTeam(items);
      } else {
        setTeam([]);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load team', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndTeam();
  }, [tenant.id]);

  const handleSave = async () => {
    const isNew = !formData.id;
    const docId = isNew ? crypto.randomUUID() : formData.id;

    const payload: Record<string, any> = {
      id: docId,
      tenant_id: tenant.id,
      rotaryYear: formData.rotaryYear || globalSettings.rotaryYear || '',
      name: formData.name || '',
      position: formData.is_board_member ? (formData.position || '') : 'Member',
      bio: formData.bio || '',
      photo: formData.photo || null,
      sort_order: formData.sort_order ?? team.length,
    };

    // Attempt to include new columns; if DB doesn't have them yet, retry without
    const tryUpsert = async (withNewCols: boolean) => {
      const data = withNewCols
        ? { ...payload, is_board_member: !!formData.is_board_member, card_image: formData.card_image || null }
        : payload;
      return supabase.from('board').upsert(data, { onConflict: 'id' });
    };

    try {
      let { error } = await tryUpsert(true);
      if (error && (error.code === 'PGRST204' || error.message?.includes('column') || error.code === '42703')) {
        // Columns don't exist yet — fallback without new cols
        const fallback = await tryUpsert(false);
        if (fallback.error) throw fallback.error;
        addToast('Saved (run DB migration to enable board/card fields)', 'success');
      } else if (error) {
        throw error;
      } else {
        addToast('Team member saved', 'success');
      }
      setIsFormOpen(false);
      loadSettingsAndTeam();
    } catch (err: any) {
      console.error('Save error:', err);
      addToast(err?.message || 'Failed to save', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await supabase.from('board').delete().eq('id', deleteId).eq('tenant_id', tenant.id);
      addToast('Team member removed', 'success');
      setDeleteId(null);
      loadSettingsAndTeam();
    } catch (err) { addToast('Failed to delete', 'error'); }
  };

  const advanceRotaryYear = async () => {
    try {
      const current = globalSettings.rotaryYear || '2025-2026';
      const parts = current.split('-');
      let nextYear = '';
      if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
        nextYear = `${Number(parts[0])+1}-${Number(parts[1])+1}`;
      } else {
        nextYear = 'Next Year';
      }

      await supabase.from('settings').upsert({
        id: `${tenant.id}-global`,
        data: { ...globalSettings, rotaryYear: nextYear }
      }, { onConflict: 'id' });

      addToast('Rotary Year advanced', 'success');
      setIsConfirmYear(false);
      loadSettingsAndTeam();
    } catch(err) {
      addToast('Failed to advance year', 'error');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = team.findIndex(i => i.id === active.id);
      const newIndex = team.findIndex(i => i.id === over.id);
      const newTeam = arrayMove(team, oldIndex, newIndex);
      setTeam(newTeam);

      try {
        await Promise.all(newTeam.map((m, idx) =>
          supabase.from('board').update({ sort_order: idx }).eq('id', m.id).eq('tenant_id', tenant.id)
        ));
      } catch(err) {
        addToast('Failed to save order', 'error');
        loadSettingsAndTeam();
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const openAddForm = () => {
    setFormData({ rotaryYear: globalSettings.rotaryYear, sort_order: team.length, is_board_member: false });
    setIsFormOpen(true);
  };

  const openEditForm = (member: any) => {
    setFormData({ ...member, is_board_member: member.is_board_member ?? (member.position && member.position !== 'Member') });
    setIsFormOpen(true);
  };

  const boardCount = team.filter(m => m.is_board_member).length;
  const memberCount = team.filter(m => !m.is_board_member).length;

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Our Team</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Rotary Year: <span className="font-bold text-primary">{globalSettings.rotaryYear || 'Not set'}</span>
            {team.length > 0 && (
              <span className="ml-3 text-gray-400">
                <span className="text-primary font-semibold">{boardCount}</span> board · <span className="font-semibold text-gray-600">{memberCount}</span> members
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIsConfirmYear(true)}>New Rotary Year</Button>
          <Button onClick={openAddForm}>Add Member</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl"></div>)}
        </div>
      ) : team.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex justify-center text-gray-400">
          <p>No team members for {globalSettings.rotaryYear || 'this year'}. Add your team!</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={team.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {team.map(m => (
                <SortableItem key={m.id} id={m.id} member={m} onEdit={openEditForm} onDelete={setDeleteId} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit Team Member' : 'Add Team Member'} size="md">
        <div className="space-y-5">
          {/* Photos row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={labelClass}>Profile Photo</p>
              <CloudinaryUpload
                onUpload={(url) => setFormData({ ...formData, photo: url })}
                currentUrl={formData.photo}
                aspectRatio="square"
                label="Photo"
              />
            </div>
            <div>
              <p className={labelClass}>Card Image</p>
              <CloudinaryUpload
                onUpload={(url) => setFormData({ ...formData, card_image: url })}
                currentUrl={formData.card_image}
                aspectRatio="portrait"
                label="Card Image"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={labelClass}>Name</label>
            <input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Full name" />
          </div>

          {/* Board member toggle */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={!!formData.is_board_member}
                  onChange={e => setFormData({ ...formData, is_board_member: e.target.checked, position: e.target.checked ? formData.position : '' })}
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${formData.is_board_member ? 'bg-primary' : 'bg-gray-300'}`}></div>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.is_board_member ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Board Member</p>
                <p className="text-xs text-gray-400">{formData.is_board_member ? 'Has a designated role on the board' : 'General team member'}</p>
              </div>
            </label>
          </div>

          {/* Role — only if board member */}
          {formData.is_board_member && (
            <div>
              <label className={labelClass}>Role / Position</label>
              <input
                value={formData.position || ''}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className={inputClass}
                placeholder="e.g. President, Secretary"
              />
            </div>
          )}

          {/* Bio */}
          <div>
            <label className={labelClass}>Bio</label>
            <textarea
              value={formData.bio || ''}
              maxLength={150}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className={inputClass}
              rows={3}
              placeholder="Short bio (max 150 chars)"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{(formData.bio || '').length}/150</p>
          </div>

          {/* Order + Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Order</label>
              <input type="number" value={formData.sort_order || 0} onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Rotary Year</label>
              <input value={formData.rotaryYear || ''} onChange={e => setFormData({ ...formData, rotaryYear: e.target.value })} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Team Member</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Member" message="Remove this team member?" />

      <ConfirmDialog
        isOpen={isConfirmYear}
        onClose={() => setIsConfirmYear(false)}
        onConfirm={advanceRotaryYear}
        title="Start New Rotary Year"
        message={`This will archive the current team and start fresh for the next Rotary Year. All current members stay in the database tagged with their year. Continue?`}
        confirmLabel="Yes, Start New Year"
      />
    </div>
  );
}
