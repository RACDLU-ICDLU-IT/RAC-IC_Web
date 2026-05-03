import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useSettings } from '../../contexts/SettingsContext';
import { Users, UserCheck, CalendarDays, Presentation, Plus, Megaphone, Inbox, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminOverview() {
  const { settings } = useSettings();
  const [stats, setStats] = useState({ activeMembers: 0, pendingApps: 0, eventsThisMonth: 0, ongoingProjects: 0 });
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const p1 = getDocs(query(collection(db, 'users'), where('status', '==', 'active'), where('role', '==', 'member')));
        const p2 = getDocs(query(collection(db, 'applications'), where('status', '==', 'pending')));
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const p3 = getDocs(query(collection(db, 'events'), where('date', '>=', startOfMonth)));
        const p4 = getDocs(query(collection(db, 'projects'), where('status', '==', 'ongoing')));

        const [usersSnap, appsSnap, eventsSnap, projectsSnap] = await Promise.all([p1, p2, p3, p4]);

        setStats({
          activeMembers: usersSnap.size,
          pendingApps: appsSnap.size,
          eventsThisMonth: eventsSnap.size,
          ongoingProjects: projectsSnap.size
        });

        const recentEventsSnap = await getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(5)));
        const recentProjectsSnap = await getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(5)));
        
        let feed: any[] = [];
        recentEventsSnap.forEach(doc => {
          feed.push({ id: doc.id, type: 'event', text: `Event "${doc.data().title}" created`, ts: doc.data().createdAt?.toMillis() || 0 });
        });
        recentProjectsSnap.forEach(doc => {
          feed.push({ id: doc.id, type: 'project', text: `Project "${doc.data().name}" created`, ts: doc.data().createdAt?.toMillis() || 0 });
        });
        
        feed.sort((a, b) => b.ts - a.ts);
        setActivityFeed(feed.slice(0, 10));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Active Members', value: stats.activeMembers, icon: Users, route: '/admin/members', color: 'text-blue-500' },
    { label: 'Pending Apps', value: stats.pendingApps, icon: UserCheck, route: '/admin/applications', color: 'text-amber-500' },
    { label: 'Events This Month', value: stats.eventsThisMonth, icon: CalendarDays, route: '/admin/events', color: 'text-purple-500' },
    { label: 'Ongoing Projects', value: stats.ongoingProjects, icon: Presentation, route: '/admin/projects', color: 'text-green-500' },
  ];

  const quickActions = [
    { title: 'Add Event', desc: 'Schedule a new meeting', icon: CalendarDays, route: '/admin/events' },
    { title: 'Add Announcement', desc: 'Broadcast to dashboard', icon: Megaphone, route: '/admin/communications' },
    { title: 'Review Applications', desc: 'Approve new members', icon: UserCheck, route: '/admin/applications' },
    { title: 'Upload Photos', desc: 'Add to public gallery', icon: ImageIcon, route: '/admin/gallery' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Admin Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back. Here's what's happening at {settings?.clubName || 'your club'}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <Link to={card.route} key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:border-gray-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">{card.label}</span>
              <card.icon className={card.color} size={24} />
            </div>
            {loading ? (
              <div className="h-12 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <span className="text-5xl font-heading font-bold text-gray-900">{card.value}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, i) => (
                <Link to={action.route} key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-accent group transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-accent group-hover:text-primary transition-colors">
                    <action.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-0.5">{action.title}</h4>
                    <p className="text-xs text-gray-500">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-6">Recent Activity</h3>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded"></div>)}
              </div>
            ) : activityFeed.length > 0 ? (
              <div className="space-y-6">
                {activityFeed.map((item, i) => (
                  <div key={i} className="flex gap-4 items-start relative">
                    {i !== activityFeed.length - 1 && <div className="absolute left-4 top-8 bottom-[-24px] w-px bg-gray-100"></div>}
                    <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 z-10">
                      {item.type === 'event' ? <CalendarDays size={14} className="text-purple-500" /> : <Presentation size={14} className="text-green-500" />}
                    </div>
                    <div className="pt-1.5 flex-1 pr-2">
                       <p className="text-sm text-gray-700 leading-snug">{item.text}</p>
                       <p className="text-xs text-gray-400 mt-1">{item.ts ? new Date(item.ts).toLocaleDateString() : 'Recently'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity found.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
