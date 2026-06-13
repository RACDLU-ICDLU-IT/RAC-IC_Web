import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { supabase } from '../../supabase';
import {
  Home, User, CalendarDays, Calendar, Presentation, Bell, Settings,
  Users, UserCheck, CheckSquare, FolderOpen, Newspaper, Image as ImageIcon,
  HeartHandshake, Megaphone, Inbox, Palette, LogOut, Menu, X, LucideIcon, FileText, CreditCard,
  Zap, HandCoins, Trophy
} from 'lucide-react';

export default function DashboardLayout({ isAdminMode = false }: { isAdminMode?: boolean }) {
  const { profile, signOut } = useAuth();
  const { settings, theme } = useTenant();
  const { adminTenant, setAdminTenant } = useAdminTenant();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const isLight = theme.primary === '#FFFFFF' || theme.primary.toLowerCase() === '#ffffff';

  const sidebarText    = isLight ? 'text-gray-900'              : 'text-white';
  const sidebarMuted   = isLight ? 'text-gray-500'              : 'text-white/60';
  const sidebarSection = isLight ? 'text-gray-400'              : 'text-white/30';
  const sidebarBorder  = isLight ? 'border-gray-200'            : 'border-white/10';
  const sidebarHoverBg = isLight ? 'hover:bg-gray-100'          : 'hover:bg-white/5';
  
  const sidebarActiveClass = isLight
    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold'
    : 'bg-white/10 text-white font-bold';
    
  const sidebarInactiveClass = isLight
    ? `text-gray-600 ${sidebarHoverBg} hover:text-[var(--color-accent)]`
    : `text-white/60 hover:bg-white/5 hover:text-white`;

  useEffect(() => {
    if (!isAdminMode) return;

    supabase.from('applications').select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('tenant_id', adminTenant.id)
      .then(({ count }) => setPendingCount(count ?? 0));

    supabase.from('contact_messages').select('*', { count: 'exact', head: true })
      .eq('read', false)
      .eq('tenant_id', adminTenant.id)
      .then(({ count }) => setUnreadCount(count ?? 0));

    const channel = supabase.channel('admin-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        supabase.from('applications').select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('tenant_id', adminTenant.id)
          .then(({ count }) => setPendingCount(count ?? 0));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
        supabase.from('contact_messages').select('*', { count: 'exact', head: true })
          .eq('read', false)
          .eq('tenant_id', adminTenant.id)
          .then(({ count }) => setUnreadCount(count ?? 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdminMode, adminTenant.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  const roleColors: Record<string, string> = {
    admin: 'bg-amber-100 text-amber-800',
    member: 'bg-gray-100 text-gray-800',
    master_admin: 'bg-amber-800 text-white',
  };

  type NavItem = { path: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number };
  type NavSection = { title?: string; items: NavItem[] };

  const memberNav: NavSection[] = [
    { items: [
      { path: '/dashboard', label: 'Dashboard Home', icon: Home, exact: true },
      { path: '/dashboard/profile', label: 'My Profile', icon: User },
      { path: '/dashboard/attendance', label: 'Attendance', icon: CheckSquare },
      { path: '/dashboard/projects', label: 'Projects', icon: Presentation },
      { path: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
      { path: '/dashboard/reminders', label: 'Reminders', icon: Bell },
      { path: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/dashboard/resources', label: 'Resources', icon: FolderOpen },
      { path: '/dashboard/dues', label: 'Dues & Fees', icon: CreditCard },
      { path: '/dashboard/points', label: 'My Points', icon: Zap },
    ]}
  ];

  const adminNav: NavSection[] = [
    { items: [
      { path: '/admin', label: 'Overview', icon: Home, exact: true },
    ]},
    { title: 'Members', items: [
      { path: '/admin/members', label: 'Members', icon: Users },
      { path: '/admin/applications', label: 'Applications', icon: UserCheck, badge: pendingCount },
      { path: '/admin/attendance', label: 'Attendance', icon: CheckSquare },
      { path: '/admin/dues', label: 'Dues & Fees', icon: CreditCard },
      { path: '/admin/donations', label: 'Donations', icon: HandCoins },
      { path: '/admin/levels', label: 'Level Config', icon: Trophy },
    ]},
    { title: 'Operations', items: [
      { path: '/admin/events', label: 'Events', icon: Calendar },
      { path: '/admin/projects', label: 'Projects', icon: Presentation },
      { path: '/admin/communications', label: 'Communications', icon: Megaphone },
      { path: '/admin/reminders', label: 'Reminders', icon: Bell },
      { path: '/admin/resources', label: 'Resources', icon: FolderOpen },
      { path: '/admin/forms', label: 'Forms', icon: FileText },
    ]},
    { title: 'Website', items: [
      { path: '/admin/pages', label: 'Page Content', icon: Newspaper },
      { path: '/admin/news', label: 'News', icon: Newspaper },
      { path: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
      { path: '/admin/board', label: 'Our Team', icon: Users },
      { path: '/admin/contact', label: 'Contact Inbox', icon: Inbox, badge: unreadCount },
    ]},
    { title: 'System', items: [
      { path: '/admin/theme', label: 'Theme', icon: Palette },
      { path: '/admin/settings', label: 'Settings', icon: Settings },
    ]}
  ];

  const navToUse = isAdminMode ? adminNav : memberNav;

  return (
    <div className="flex min-h-screen bg-gray-50 h-[100dvh]">
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={closeMobile} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative flex flex-col w-[260px] h-full bg-[var(--color-primary)] ${sidebarText} z-50 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* Top Header */}
        <div className={`p-6 shrink-0 border-b ${sidebarBorder} flex flex-col gap-4`}>
          <NavLink to="/" className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} 
                className={`h-10 w-auto object-contain ${isLight ? 'bg-gray-100' : 'bg-white/10'} rounded p-1`} 
              />
            ) : (
              <span className="font-heading font-bold text-lg">{settings.clubName}</span>
            )}
          </NavLink>
          <div className="flex flex-col gap-1">
            <span className={`text-sm font-medium ${isLight ? 'text-gray-700' : 'text-white/90'}`}>{profile?.name || 'Loading...'}</span>
            <div className="flex">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleColors[profile?.role || 'member']}`}>
                {profile?.role || 'Member'}
              </span>
            </div>
          </div>
        </div>

        {/* Tenant Switcher (Master Admin Only) */}
        {isAdminMode && profile?.role === 'master_admin' && (
          <div className="mx-3 mt-4 p-1 bg-black/10 rounded-lg flex gap-1 shrink-0">
            <button
              onClick={() => setAdminTenant('icdlu')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                adminTenant.id === 'icdlu' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : `${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/70 hover:text-white'}`
              }`}
            >
              ICDLU
            </button>
            <button
              onClick={() => setAdminTenant('racdlu')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                adminTenant.id === 'racdlu' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : `${isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/70 hover:text-white'}`
              }`}
            >
              RACDLU
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 hide-scrollbar">
          {navToUse.map((section, idx) => (
            <div key={idx} className="mb-4">
              {section.title && (
                <h4 className={`text-[10px] font-bold uppercase tracking-widest ${sidebarSection} px-3 mt-2 mb-2`}>
                  {section.title}
                </h4>
              )}
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                        isActive
                          ? sidebarActiveClass
                          : sidebarInactiveClass
                      }`
                    }
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${sidebarBorder} shrink-0`}>
          <button
            onClick={handleSignOut}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-sm ${sidebarMuted} ${sidebarHoverBg} hover:${isLight ? 'text-[var(--color-accent)]' : 'text-white'}`}
          >
            <LogOut size={18} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Mobile Navbar */}
        <header className="md:hidden flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1 text-gray-500 hover:text-gray-900 rounded">
            <Menu size={24} />
          </button>
          <span className="font-heading font-bold text-gray-900">{isAdminMode ? 'Admin Panel' : 'Dashboard'}</span>
          <div className="w-6"></div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 w-full relative">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
