import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Link } from 'react-router-dom';
import { CalendarDays, Bell, Presentation, ChevronRight, User } from 'lucide-react';

export default function DashboardHome() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch up to 3 upcoming events
        const eventsSnap = await getDocs(
          query(collection(db, 'events'), where('date', '>=', today), orderBy('date', 'asc'), limit(3))
        );
        setUpcomingEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Fetch recent announcements
        const annSnap = await getDocs(
          query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(3))
        );
        setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [profile]);

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Welcome Banner */}
      <div className="bg-primary text-white p-8 md:p-12 rounded-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-primary/80" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-2">
              Welcome back, {profile?.name?.split(' ')[0]}!
            </h1>
            <p className="text-white/70 text-lg">
              {settings.clubName} • {settings.rotaryYear || 'Current Year'}
            </p>
          </div>
          {profile?.photo ? (
            <img src={profile.photo} alt={profile.name} className="w-24 h-24 rounded-full border-4 border-accent object-cover shadow-xl" />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-accent bg-white/10 flex items-center justify-center text-3xl font-heading font-bold text-accent shadow-xl">
              {profile?.name?.[0]}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Events & Announcements */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Events */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                <CalendarDays className="text-accent" /> Upcoming Events
              </h2>
              <Link to="/dashboard/calendar" className="text-sm font-bold text-gray-400 hover:text-primary transition-colors flex items-center">
                View all <ChevronRight size={16} />
              </Link>
            </div>
            
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">No upcoming events scheduled.</p>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-50 group cursor-pointer">
                    <div className="w-16 flex flex-col items-center justify-center shrink-0 border-r border-gray-100 pr-4">
                      <span className="text-accent font-bold text-xs uppercase tracking-widest">{new Date((event.date) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className="text-2xl font-heading font-bold text-primary leading-none group-hover:text-accent transition-colors">{new Date((event.date) + 'T00:00:00').getDate()}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1 leading-tight">{event.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">{event.time} {event.venue && `• ${event.venue}`}</p>
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{event.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Announcements */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                <Bell className="text-accent" /> Announcements
              </h2>
              <Link to="/dashboard/announcements" className="text-sm font-bold text-gray-400 hover:text-primary transition-colors flex items-center">
                View all <ChevronRight size={16} />
              </Link>
            </div>
            
            {announcements.length === 0 ? (
              <p className="text-gray-400 text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">No announcements at this time.</p>
            ) : (
              <div className="space-y-4">
                {announcements.map(ann => (
                  <div key={ann.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 relative">
                    {ann.isPinned && <span className="absolute top-0 right-6 -translate-y-1/2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Pinned</span>}
                    <h3 className="font-bold text-gray-900 mb-2">{ann.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{ann.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Quick Stats & Links */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <User size={18} className="text-accent" /> Your Profile Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Status</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest ${profile.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {profile.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Role</span>
                <span className="font-bold text-primary capitalize">{profile.role}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Join Date</span>
                <span className="font-bold text-primary">
                  {profile.joinDate ? new Date((profile.joinDate) + 'T00:00:00').toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
            <Link to="/dashboard/profile" className="block w-full text-center mt-6 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-600 rounded-xl transition-colors">
              Edit Profile
            </Link>
          </div>

          <Link to="/dashboard/projects" className="block bg-primary text-white p-6 rounded-3xl border border-primary hover:-translate-y-1 hover:shadow-lg transition-all group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Presentation className="text-accent mb-4" size={32} />
            <h3 className="font-heading font-bold text-xl mb-1">Active Projects</h3>
            <p className="text-sm text-white/60">View ongoing club projects and volunteer opportunities.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
