import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { CalendarDays, X, MapPin, Clock } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

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

export default function DashboardCalendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, 'events'), orderBy('date', 'asc')))
      .then(snap => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto relative">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900 flex items-center gap-3">
          <CalendarDays className="text-accent" /> Club Calendar
        </h1>
        <p className="text-gray-500 mt-1 text-sm">View all club meetings, projects, and activities.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative z-0">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
          events={events.map(e => ({
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

      {/* Overlay */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm transition-opacity" 
          onClick={() => setSelectedEvent(null)} 
        />
      )}

      {/* Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl transition-transform duration-500 ease-in-out flex flex-col ${selectedEvent ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-heading font-bold line-clamp-1">{selectedEvent?.title}</h2>
          <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${getTypeStyle(selectedEvent?.type)}`}>
              {selectedEvent?.type}
            </span>
            {!selectedEvent?.isPublic && (
              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-gray-100 text-gray-500">
                Members Only
              </span>
            )}
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
            <div className="mt-8 border-t pt-6 border-gray-100">
              <h4 className="font-bold text-gray-900 mb-3 font-heading text-lg">Details</h4>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
