import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { getClubPalette } from '../../theme/racPalette';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import {
  CalendarDays, Pencil, Trash2, X, Image as ImageIcon, MapPin, Clock, Eye, EyeOff,
} from 'lucide-react';

const INTER_FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
const INTER_LINK_ID = 'rac-dashboard-inter-font';
function useInterFont() {
  useEffect(() => {
    if (document.getElementById(INTER_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = INTER_LINK_ID;
    link.rel = 'stylesheet';
    link.href = INTER_FONT_URL;
    document.head.appendChild(link);
  }, []);
}

const EVENT_TYPES = ['Meeting', 'Event', 'Project', 'Workshop'] as const;
type EventType = typeof EVENT_TYPES[number];
const SUB_TYPES: Record<EventType, string[]> = {
  Meeting: ['General', 'Special', 'Board Meeting'],
  Event: ['Ceremony', 'Installation', 'Assembly', 'Other'],
  Project: ['Community Service', 'Fund Raising', 'Skill Based'],
  Workshop: ['Personal skills', 'TRF', 'Other'],
};

type Status = 'present' | 'late' | 'excused' | 'absent';
const STATUS_ORDER: Status[] = ['present', 'late', 'excused', 'absent'];
const STATUS_META: Record<Status, { letter: string; label: string }> = {
  present: { letter: 'P', label: 'Present' },
  late: { letter: 'L', label: 'Late' },
  excused: { letter: 'E', label: 'Excused' },
  absent: { letter: 'A', label: 'Absent' },
};

const uid = () => (crypto as any).randomUUID();

const emptyForm = {
  title: '', date: '', time: '', type: 'Meeting' as EventType, sub_type: SUB_TYPES.Meeting[0],
  venue: '', description: '', coverImage: '', coverImagePublicId: '', isPublic: false,
  xp_present: 0, xp_late: 0, xp_excused: 0, xp_absent: 0,
};

export default function AdminEvents() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = getClubPalette(tenant.id, dark ? 'dark' : 'light');

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const [deleteId, setDeleteId] = useState<string | null>(null);

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
  useEffect(() => { fetchEvents(); }, [tenant.id]);

  const openAdd = () => {
    setEditingEventId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };
  const openEdit = (ev: any) => {
    setEditingEventId(ev.id);
    setForm({
      title: ev.title || '', date: ev.date || '', time: ev.time || '',
      type: (ev.type as EventType) || 'Meeting', sub_type: ev.sub_type || SUB_TYPES[(ev.type as EventType) || 'Meeting'][0],
      venue: ev.venue || '', description: ev.description || '',
      coverImage: ev.coverImage || '', coverImagePublicId: ev.coverImagePublicId || '',
      isPublic: ev.isPublic ?? false,
      xp_present: ev.xp_present || 0, xp_late: ev.xp_late || 0, xp_excused: ev.xp_excused || 0, xp_absent: ev.xp_absent || 0,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date) { addToast('Title and date are required', 'error'); return; }
    setIsSaving(true);
    try {
      const id = editingEventId || uid();
      const { error } = await supabase.from('events').upsert(
        {
          id, tenant_id: tenant.id,
          title: form.title, date: form.date, time: form.time,
          type: form.type, sub_type: form.sub_type,
          venue: form.venue, description: form.description,
          coverImage: form.coverImage, coverImagePublicId: form.coverImagePublicId,
          isPublic: form.isPublic,
          xp_present: form.xp_present, xp_late: form.xp_late, xp_excused: form.xp_excused, xp_absent: form.xp_absent,
          ...(editingEventId ? {} : { createdAt: new Date().toISOString() }),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      addToast(editingEventId ? 'Event updated' : 'Event created', 'success');
      setIsFormOpen(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      addToast('Failed to save event', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteId).eq('tenant_id', tenant.id);
      if (error) throw error;
      addToast('Event deleted', 'success');
      setDeleteId(null);
      fetchEvents();
    } catch (err) {
      console.error(err);
      addToast('Failed to delete event', 'error');
    }
  };

  const card: React.CSSProperties = { borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` };
  const pillBtn: React.CSSProperties = { border: `1px solid ${p.pillBorder}`, borderRadius: 20, fontSize: 10, padding: '6px 12px', color: p.tmid, background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 };
  const solidBtn: React.CSSProperties = { background: p.green, color: '#1b0c12', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '8px 16px', border: 'none', cursor: 'pointer' };
  const input: React.CSSProperties = { width: '100%', background: p.lightCard, color: p.td, border: `1px solid ${p.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 500, outline: 'none' };

  if (loading) {
    return (
      <div style={{ background: p.bg, padding: 18 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ height: 300, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="rac-admin-events">
      <style>{`
        .rac-admin-events, .rac-admin-events * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-admin-events ::-webkit-scrollbar { display: none; }
        .rac-admin-events select { color-scheme: ${dark ? 'dark' : 'light'}; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s' }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px' }}>Events</span>
            <span style={{ fontSize: 11, color: p.pmut, fontWeight: 500 }}>{tenant.id}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={openAdd} style={{ ...solidBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={14} /> Add Event
            </button>
          </div>

          <div style={{ ...card, padding: 0 }}>
            {events.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: p.tsub }}>
                <CalendarDays size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                <p style={{ fontSize: 12 }}>No events yet. Create your first event to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {events.map((ev, i) => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderTop: i === 0 ? 'none' : `1px solid ${p.border}` }}>
                    {ev.coverImage ? (
                      <img src={ev.coverImage} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: p.lightCard, color: p.tsub, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 12.5 }}>{ev.title}</span>
                        <span style={{ fontSize: 9.5, color: p.tsub, background: p.lightCard, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                          {ev.type}{ev.sub_type ? ` · ${ev.sub_type}` : ''}
                        </span>
                        {ev.isPublic ? (
                          <span style={{ fontSize: 9, color: p.green, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700 }}><Eye size={10} /> Public</span>
                        ) : (
                          <span style={{ fontSize: 9, color: p.tsub, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}><EyeOff size={10} /> Private</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: p.tsub, marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>{ev.date}{ev.time ? ` · ${ev.time}` : ''}</span>
                        {ev.venue && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={10} /> {ev.venue}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => openEdit(ev)} title="Edit" style={{ background: 'none', border: 'none', color: p.tsub, cursor: 'pointer', padding: 8 }}><Pencil size={15} /></button>
                      <button onClick={() => setDeleteId(ev.id)} title="Delete" style={{ background: 'none', border: 'none', color: p.tsub, cursor: 'pointer', padding: 8 }}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div
          onClick={() => !isSaving && setIsFormOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{editingEventId ? 'Edit Event' : 'Add Event'}</span>
              <button onClick={() => setIsFormOpen(false)} disabled={isSaving} style={{ background: 'none', border: 'none', color: p.tsub, cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={input} placeholder="e.g. Weekly Meeting" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={input} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5, alignItems: 'center', gap: 4 }}><Clock size={10} style={{ display: 'inline', marginRight: 4 }} />Time</label>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={input} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => {
                      const type = e.target.value as EventType;
                      setForm({ ...form, type, sub_type: SUB_TYPES[type][0] });
                    }}
                    style={input}
                  >
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Sub-type</label>
                  <select value={form.sub_type} onChange={(e) => setForm({ ...form, sub_type: e.target.value })} style={input}>
                    {SUB_TYPES[form.type as EventType].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}><MapPin size={10} style={{ display: 'inline', marginRight: 4 }} />Venue</label>
                <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} style={input} placeholder="e.g. Club House" />
              </div>

              <div>
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, resize: 'vertical' }} rows={3} />
              </div>

              <div>
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 5 }}>Cover Image</label>
                <CloudinaryUpload
                  onUpload={(url: string, publicId: string) => setForm({ ...form, coverImage: url, coverImagePublicId: publicId })}
                  currentUrl={form.coverImage}
                  currentPublicId={form.coverImagePublicId}
                  aspectRatio="landscape"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} style={{ accentColor: p.green }} />
                <label style={{ fontSize: 11.5, fontWeight: 600, color: p.tl }}>Show on public Events page</label>
              </div>

              <div style={{ borderTop: `1px solid ${p.border}`, paddingTop: 12, marginTop: 4 }}>
                <label style={{ fontSize: 10, color: p.tsub, fontWeight: 600, display: 'block', marginBottom: 4 }}>Rewarded XP for Attendance</label>
                {editingEventId && (
                  <div style={{ fontSize: 9.5, color: p.tsub, marginBottom: 8, lineHeight: 1.4 }}>
                    Changing a value here retroactively adjusts XP for every member already marked with that status on this event (handled in Attendance).
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {STATUS_ORDER.map((s) => (
                    <div key={s}>
                      <label style={{ fontSize: 9.5, color: p.tsub, display: 'block', marginBottom: 4 }}>{STATUS_META[s].letter} · {STATUS_META[s].label}</label>
                      <input
                        type="number"
                        min={0}
                        value={form[`xp_${s}`]}
                        onChange={(e) => setForm({ ...form, [`xp_${s}`]: Number(e.target.value) })}
                        style={input}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={isSaving} style={{ ...solidBtn, width: '100%', marginTop: 6, padding: '11px 0', opacity: isSaving ? 0.6 : 1 }}>
                {isSaving ? 'Saving…' : editingEventId ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Event" message="Are you sure? This cannot be undone." />
    </div>
  );
}
