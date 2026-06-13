import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { Users, UserCheck, CalendarDays, Presentation, Plus, Megaphone, Inbox, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { usePoints, FundAccount } from '../../hooks/usePoints';
import { Landmark, Briefcase, TrendingUp } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export default function AdminOverview() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const [stats, setStats] = useState({ activeMembers: 0, pendingApps: 0, eventsThisMonth: 0, ongoingProjects: 0 });
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubName, setClubName] = useState(tenant.shortName);
  
  // Dashboard Image Management
  const [dashboardImage, setDashboardImage] = useState<string>('');
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [fundAccounts, setFundAccounts] = useState<FundAccount[]>([]);
  const { fetchFundAccounts } = usePoints();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', `${tenant.id}-global`).single();
      if (data && data.data && data.data.clubName) {
        setClubName(data.data.clubName);
      } else {
        setClubName(tenant.shortName);
      }

      // Also fetch pageContent for home image
      const { data: pageData } = await supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
      if (pageData?.data?.homeAboutImage) {
        setDashboardImage(pageData.data.homeAboutImage);
      }
    };
    fetchSettings();
  }, [tenant.id]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const p1 = supabase.from('users').select('*').eq('status', 'active').eq('tenant_id', tenant.id);
        const p2 = supabase.from('applications').select('*').eq('status', 'Pending').eq('tenant_id', tenant.id);
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const p3 = supabase.from('events').select('*').gte('date', startOfMonth).eq('tenant_id', tenant.id);
        const p4 = supabase.from('projects').select('*').eq('status', 'Ongoing').eq('tenant_id', tenant.id);

        // Fetch fund accounts in parallel with other stats so they all resolve together
        const [usersSnap, appsSnap, eventsSnap, projectsSnap, fundData] = await Promise.all([
          p1, p2, p3, p4, fetchFundAccounts()
        ]);

        setFundAccounts(fundData);
        setStats({
          activeMembers: (usersSnap.data || []).length,
          pendingApps: (appsSnap.data || []).length,
          eventsThisMonth: (eventsSnap.data || []).length,
          ongoingProjects: (projectsSnap.data || []).length
        });

        const { data: recentEventsSnap } = await supabase.from('events').select('*').eq('tenant_id', tenant.id).order('createdAt', { ascending: false }).limit(5);
        const { data: recentProjectsSnap } = await supabase.from('projects').select('*').eq('tenant_id', tenant.id).order('createdAt', { ascending: false }).limit(5);
        
        let feed: any[] = [];
        (recentEventsSnap || []).forEach(doc => {
          feed.push({ id: doc.id, type: 'event', text: `Event "${doc.title}" created`, ts: new Date(doc.created_at || doc.createdAt || 0).getTime() });
        });
        (recentProjectsSnap || []).forEach(doc => {
          feed.push({ id: doc.id, type: 'project', text: `Project "${doc.name}" created`, ts: new Date(doc.created_at || doc.createdAt || 0).getTime() });
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
  }, [tenant.id]);

  const handleImageUpload = async (url: string) => {
    setIsSavingImage(true);
    setDashboardImage(url);
    try {
      const { data: currentData } = await supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
      const updatedData = { ...(currentData?.data || {}), homeAboutImage: url };
      
      const { error } = await supabase.from('page_content').upsert({ 
        id: 'pageContent', 
        tenant_id: tenant.id, 
        data: updatedData 
      }, { onConflict: 'id, tenant_id' });
      
      if (error) throw error;
      addToast('Dashboard image updated successfully', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update image', 'error');
    } finally {
      setIsSavingImage(false);
    }
  };

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
    { title: 'Edit Home Image', desc: 'Change the About image', icon: ImageIcon, route: '/admin/pages' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Admin Overview</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Welcome back. Here's what's happening at {clubName}.</p>
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

      {/* Fund Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { type: 'administrative', label: 'Administrative Fund', icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
          { type: 'project',        label: 'Project Fund',        icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { type: 'endowment',      label: 'Endowment Fund',      icon: Landmark,   color: 'text-purple-600 bg-purple-50' },
        ].map(({ type, label, icon: Icon, color }) => {
          const fund = fundAccounts.find(f => f.account_type === type);
          return (
            <div key={type} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={"w-9 h-9 rounded-lg flex items-center justify-center " + color}>
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{type}</span>
              </div>
              <p className="text-xs text-gray-500 font-bold mb-1">{label}</p>
              <p className="text-2xl font-heading font-bold text-gray-900">
                {loading ? '–' : (fund?.balance || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Total in: {(fund?.total_in || 0).toLocaleString()}</p>
            </div>
          );
        })}
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

          <section>
            <h3 className="font-heading font-bold text-lg text-gray-900 mb-4">Master Image Settings</h3>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-gray-900">Public Dashboard Image</h4>
                  <p className="text-sm text-gray-500">Update the primary visual on public-facing master pages.</p>
                </div>
                {isSavingImage && <span className="text-sm text-gray-400 font-bold animate-pulse">Saving...</span>}
              </div>
              <div className="w-full max-w-sm">
                <CloudinaryUpload 
                  onUpload={handleImageUpload} 
                  currentUrl={dashboardImage} 
                  aspectRatio="landscape"
                  label="Change Storefront Image"
                />
              </div>
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
