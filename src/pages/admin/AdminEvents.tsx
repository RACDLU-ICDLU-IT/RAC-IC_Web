import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { CalendarDays, Pencil, Trash, Image as ImageIcon } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminEvents() {
  const { adminTenant: tenant } = useAdminTenant();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { addToast } = useToast();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: snap } = await supabase.from('events').select('*').eq('tenant_id', tenant.id).order('date', { ascending: false });
      setEvents(snap || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [tenant.id]);

  const handleSave = async () => {
    const isNew = !formData.id;
    const docId = isNew ? crypto.randomUUID() : formData.id;
    
    // Fallback for public if not touched
    const dataToSave = { ...formData, isPublic: formData.isPublic ?? false, tenant_id: tenant.id };
    
    try {
      const { data: savedRows, error: saveError } = await supabase
        .from('events')
        .upsert({ id: docId, ...dataToSave }, { onConflict: 'id' })
        .select('id');

      if (saveError) throw saveError;
      if (!savedRows || savedRows.length === 0) {
        throw new Error('Event could not be saved — check RLS policy for this tenant.');
      }

      addToast('Event saved', 'success');
      setIsFormOpen(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      addToast('Failed to save event', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', deleteId)
        .eq('tenant_id', tenant.id);
      if (deleteError) throw deleteError;
      addToast('Event deleted', 'success');
      setDeleteId(null);
      fetchEvents();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete event', 'error');
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Meeting': return 'bg-blue-100 text-blue-800';
      case 'Community Project': return 'bg-teal-100 text-teal-800';
      case 'International': return 'bg-purple-100 text-purple-800';
      case 'Social': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Events</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Manage club meetings and activities</p>
        </div>
        <Button onClick={() => { setFormData({ type: 'Meeting', isPublic: false }); setIsFormOpen(true); }}>
           Add Event
        </Button>
      </div>

      <Table
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'type', label: 'Type' },
          { key: 'date', label: 'Date & Time' },
          { key: 'venue', label: 'Venue' },
          { key: 'public', label: 'Public' },
          { key: 'actions', label: 'Actions' }
        ]}
        data={events}
        isLoading={loading}
        emptyIcon={<CalendarDays size={48} />}
        emptyMessage="No events found. Create your first event to get started."
        renderRow={(ev) => (
          <tr key={ev.id}>
            <td className="px-6 py-4 font-medium text-gray-900">
              <div className="flex items-center gap-3">
                {ev.coverImage ? <img src={ev.coverImage} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon size={14}/></div>}
                {ev.title}
              </div>
            </td>
            <td className="px-6 py-4">
              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getTypeStyle(ev.type)}`}>{ev.type}</span>
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">{ev.date} {ev.time ? `at ${ev.time}` : ''}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{ev.venue || '-'}</td>
            <td className="px-6 py-4">
               <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${ev.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{ev.isPublic ? 'Yes' : 'No'}</span>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button onClick={() => { setFormData(ev); setIsFormOpen(true); }} className="text-gray-500 hover:text-primary"><Pencil size={18} /></button>
                <button onClick={() => setDeleteId(ev.id)} className="text-gray-500 hover:text-red-500"><Trash size={18} /></button>
              </div>
            </td>
          </tr>
        )}
      />

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formData.id ? 'Edit Event' : 'Add Event'} size="md">
        <div className="space-y-4">
          <div><label className={labelClass}>Title</label><input value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} /></div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={formData.type || 'Meeting'} onChange={e => setFormData({...formData, type: e.target.value})} className={inputClass}>
              <option value="Meeting">Meeting</option>
              <option value="Community Project">Community Project</option>
              <option value="International">International</option>
              <option value="Social">Social</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className={labelClass}>Date</label><input type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} /></div>
             <div><label className={labelClass}>Time</label><input type="time" value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} className={inputClass} /></div>
          </div>
          <div><label className={labelClass}>Venue</label><input value={formData.venue || ''} onChange={e => setFormData({...formData, venue: e.target.value})} className={inputClass} /></div>
          <div><label className={labelClass}>Description</label><textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} rows={3} /></div>
          <div>
            <label className={labelClass}>Cover Image</label>
            <CloudinaryUpload onUpload={(url, publicId) => setFormData({...formData, coverImage: url, coverImagePublicId: publicId})} currentUrl={formData.coverImage} currentPublicId={formData.coverImagePublicId} aspectRatio="landscape" />
          </div>
          <div className="flex items-center gap-2 pt-2">
             <input type="checkbox" checked={formData.isPublic || false} onChange={e => setFormData({...formData, isPublic: e.target.checked})} />
             <label className="text-sm font-medium">Show on public Events page</label>
          </div>
        </div>
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
          <Button onClick={handleSave}>Save Event</Button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Event" message="Are you sure? This cannot be undone." />
    </div>
  );
}
