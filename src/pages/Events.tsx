import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { List, CalendarDays, MapPin, ChevronRight, X, Clock } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

function getTypeStyle(type: string) {
  switch(type) {
    case 'Meeting': return 'bg-blue-100 text-blue-800';
    case 'Community Project': return 'bg-teal-100 text-teal-800';
    case 'International': return 'bg-purple-100 text-purple-800';
    case 'Social': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getTypeColor(type: string) {
  switch(type) {
    case 'Meeting': return '#3b82f6';
    case 'Community Project': return '#14b8a6';
    case 'International': return '#a855f7';
    case 'Social': return '#f59e0b';
    default: return '#6b7280';
  }
}

export default function Events() {
  const { tenant } = useTenant();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const headingColor = isLight ? 'text-[var(--color-accent)]' : 'text-[var(--color-primary)]';
  const borderColor = isLight ? 'border-[var(--color-accent)]/30' : 'border-[var(--color-primary)]/20';

  useEffect(() => {
    supabase.from('events')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('isPublic', true)
      .order('date', { ascending: true })
      .then(({ data: snap }) => {
        setEvents(snap || []);
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [tenant.id]);

  const today = new Date().toISOString().split('T')[0];
  const filtered = typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter);
  const upcoming = filtered.filter(e => e.date >= today);
  const past = filtered.filter(e => e.date < today);

  return (
    <div className="bg-[var(--color-page-bg)] min-h-screen pt-24 pb-32 relative">
      <SEOHead 
        title="Events & Calendar"
        description={`Stay updated with upcoming meetings, social events, and community projects of the ${tenant.fullName}.`}
        canonicalPath="/events"
      />
      <section className={`py-20 px-6 max-w-7xl mx-auto border-b ${borderColor}`}>
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className={`text-6xl md:text-8xl font-heading font-bold ${headingColor}`}>Events.</h1>
            <p className="text-gray-500 mt-2 text-lg">What's happening in the club.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setView('list')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === 'list' ? `bg-white shadow ${headingColor}` : 'text-gray-500'}`}
              >
                <List size={16} /> List
              </button>
              <button 
                onClick={() => setView('calendar')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${view === 'calendar' ? `bg-white shadow ${headingColor}` : 'text-gray-500'}`}
              >
                <CalendarDays size={16} /> Calendar
              </button>
            </div>
          </div>
        </div>
        {/* Type filter pills */}
        <div className="flex flex-wrap gap-2 mt-8">
          {['all', 'Meeting', 'Community Project', 'International', 'Social'].map(type => (
            <button 
              key={type} 
              onClick={() => setTypeFilter(type)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${typeFilter === type ? 'bg-[var(--color-accent)] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {type === 'all' ? 'All Events' : type}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-12 mb-32">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'list' ? (
          <div className="space-y-16">
            {/* Upcoming Events — hidden entirely when empty */}
            {upcoming.length > 0 && (
            <div className="space-y-6">
              {upcoming.map(event => (
                  <div 
                    key={event.id}
                    className="flex items-stretch gap-6 md:gap-12 p-6 md:p-8 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedEvent(event)}
                  >
                    {/* Date block */}
                    <div className="flex flex-col items-center justify-center w-20 shrink-0 text-center">
                      <span className="text-accent font-bold text-sm uppercase tracking-wide">
                        {new Date((event.date || today) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className={`text-5xl font-heading font-bold ${headingColor} leading-none`}>
                        {new Date((event.date || today) + 'T00:00:00').getDate()}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date((event.date || today) + 'T00:00:00').getFullYear()}
                      </span>
                    </div>
                    {/* Divider */}
                    <div className="w-px bg-gray-200 shrink-0" />
                    {/* Event info */}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${getTypeStyle(event.type)}`}>
                          {event.type}
                        </span>
                        {event.time && <span className="text-gray-400 text-sm">{event.time}</span>}
                      </div>
                      <h3 className={`text-xl md:text-2xl font-heading font-bold ${headingColor} group-hover:text-accent transition-colors`}>
                        {event.title}
                      </h3>
                      {event.venue && (
                        <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
                          <MapPin size={14} /> {event.venue}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center text-gray-300 group-hover:text-accent transition-colors shrink-0">
                      <ChevronRight size={24} />
                    </div>
                  </div>
                ))}
            </div>
            )}

            {/* Past Events */}
            {past.length > 0 && (
              <div>
                <h3 className="text-2xl font-heading font-bold text-gray-400 mb-6">Past Events</h3>
                <div className="space-y-4">
                  {past.map(event => (
                    <div 
                      key={event.id}
                      className="flex items-stretch gap-6 p-4 bg-white/50 rounded-2xl border border-gray-100 cursor-pointer group opacity-75 hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex flex-col items-center justify-center w-16 shrink-0 text-center">
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-wide">
                          {new Date((event.date || today) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className={`text-3xl font-heading font-bold ${isLight ? 'text-gray-500' : 'text-gray-400'} leading-none group-hover:text-accent transition-colors`}>
                          {new Date((event.date || today) + 'T00:00:00').getDate()}
                        </span>
                      </div>
                      <div className="w-px bg-gray-200 shrink-0" />
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="text-lg font-heading font-bold text-gray-600 group-hover:text-accent transition-colors">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${getTypeStyle(event.type)}`}>
                            {event.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-gray-900">
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
              events={filtered.map(e => ({
                id: e.id,
                title: e.title,
                date: e.date,
                backgroundColor: getTypeColor(e.type),
                borderColor: 'transparent',
              }))}
              eventClick={(info) => {
                const evt = events.find(e => e.id === info.event.id);
                if (evt) setSelectedEvent(evt);
              }}
              height="auto"
              dayMaxEvents={3}
            />
          </div>
        )}
      </section>

      {/* Overlay */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" 
          onClick={() => setSelectedEvent(null)} 
        />
      )}

      {/* Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl transition-transform duration-500 ease-in-out flex flex-col ${selectedEvent ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b text-gray-900">
          <h2 className="text-xl font-heading font-bold line-clamp-1">{selectedEvent?.title}</h2>
          <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-gray-900">
          {selectedEvent?.coverImage && (
            <img src={selectedEvent.coverImage} className="w-full rounded-xl object-cover aspect-video mb-6 shadow-sm" alt="" />
          )}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${getTypeStyle(selectedEvent?.type)}`}>
              {selectedEvent?.type}
            </span>
          </div>
          <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-xl">
            <p className="flex items-center gap-3">
              <CalendarDays size={18} className="text-accent shrink-0" />
              <strong>Date:</strong> {selectedEvent?.date ? new Date((selectedEvent?.date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            </p>
            {selectedEvent?.time && (
              <p className="flex items-center gap-3">
                <Clock size={18} className="text-accent shrink-0" />
                <strong>Time:</strong> {selectedEvent.time}
              </p>
            )}
            {selectedEvent?.venue && (
              <p className="flex items-start gap-3">
                <MapPin size={18} className="text-accent shrink-0 mt-0.5" />
                <span><strong>Venue:</strong><br/>{selectedEvent.venue}</span>
              </p>
            )}
          </div>
          {selectedEvent?.description && (
            <div className="mt-8">
              <h4 className="font-bold text-gray-900 mb-3 font-heading text-lg border-b pb-2">About this event</h4>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
