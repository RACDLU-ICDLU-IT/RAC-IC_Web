import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { supabase } from '../../supabase';
import {
  Home, User, CalendarDays, Calendar, Presentation, Bell, Settings,
  Users, UserCheck, CheckSquare, FolderOpen, Newspaper, Image as ImageIcon,
  HeartHandshake, Megaphone, Inbox, Palette, LogOut, Menu, LucideIcon, FileText, CreditCard,
  Zap, HandCoins, Trophy, Bot, Share2
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function DashboardLayout({ isAdminMode = false }: { isAdminMode?: boolean }) {
  const { profile, signOut } = useAuth();
  const { settings, theme } = useTenant();
  const { adminTenant, setAdminTenant } = useAdminTenant();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const isLight = theme.primary === '#FFFFFF' || theme.primary.toLowerCase() === '#ffffff';

  useEffect(() => {
    if (!isAdminMode) return;

    supabase.from('applications').select('*', { count: 'exact', head: true })
      .eq('status', 'pending').eq('tenant_id', adminTenant.id)
      .then(({ count }) => setPendingCount(count ?? 0));

    supabase.from('contact_messages').select('*', { count: 'exact', head: true })
      .eq('read', false).eq('tenant_id', adminTenant.id)
      .then(({ count }) => setUnreadCount(count ?? 0));

    const channel = supabase.channel('admin-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        supabase.from('applications').select('*', { count: 'exact', head: true })
          .eq('status', 'pending').eq('tenant_id', adminTenant.id)
          .then(({ count }) => setPendingCount(count ?? 0));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, () => {
        supabase.from('contact_messages').select('*', { count: 'exact', head: true })
          .eq('read', false).eq('tenant_id', adminTenant.id)
          .then(({ count }) => setUnreadCount(count ?? 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdminMode, adminTenant.id]);

  const handleSignOut = async () => { await signOut(); navigate('/'); };
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
    { title: 'Social Media', items: [
      { path: '/admin/bot', label: 'Bot Manager', icon: Bot },
      { path: '/admin/posts', label: 'Post Manager', icon: Share2 },
    ]},
    { title: 'System', items: [
      { path: '/admin/sponsors', label: 'Sponsors', icon: HeartHandshake },
      { path: '/admin/theme', label: 'Theme', icon: Palette },
      { path: '/admin/settings', label: 'Settings', icon: Settings },
    ]}
  ];

  const navToUse = isAdminMode ? adminNav : memberNav;

  return (
    <div className="flex min-h-screen h-[100dvh] bg-[#f5f5f9] dark:bg-[#25293c]">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobile} />
      )}

      {/* Sneat-style sidebar */}
      <aside
        className={`fixed lg:relative flex flex-col w-[260px] h-full z-50 transform transition-transform duration-300 ease-in-out
        bg-white dark:bg-[#2f3349] border-r border-[#eceef1] dark:border-white/10
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand */}
        <div className="h-[64px] shrink-0 flex items-center px-5 border-b border-[#eceef1] dark:border-white/10">
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                className="h-8 w-8 object-contain rounded"
              />
            ) : (
              <span className="h-8 w-8 rounded-full bg-[#696cff] shrink-0" />
            )}
            <span className="font-heading font-bold text-[1.05rem] tracking-tight text-[#566a7f] dark:text-white truncate">
              {settings.clubName}
            </span>
          </NavLink>
        </div>

        {/* User card */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex flex-col gap-1.5 px-3 py-3 rounded-lg bg-[#f5f5f9] dark:bg-white/5">
            <span className="text-sm font-medium text-[#566a7f] dark:text-white/90 truncate">
              {profile?.name || 'Loading...'}
            </span>
            <span className={`self-start inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleColors[profile?.role || 'member']}`}>
              {profile?.role || 'Member'}
            </span>
          </div>
        </div>

        {isAdminMode && profile?.role === 'master_admin' && (
          <div className="mx-4 mt-2 p-1 bg-[#f5f5f9] dark:bg-white/5 rounded-lg flex gap-1 shrink-0">
            <button onClick={() => setAdminTenant('icdlu')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                adminTenant.id === 'icdlu' ? 'bg-[#696cff] text-white shadow-sm' : 'text-[#a1acb8] hover:text-[#696cff]'
              }`}>ICDLU</button>
            <button onClick={() => setAdminTenant('racdlu')}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all ${
                adminTenant.id === 'racdlu' ? 'bg-[#696cff] text-white shadow-sm' : 'text-[#a1acb8] hover:text-[#696cff]'
              }`}>RACDLU</button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 hide-scrollbar">
          {navToUse.map((section, idx) => (
            <div key={idx} className="mb-3">
              {section.title && (
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#a1acb8] dark:text-white/30 px-3 mt-3 mb-2">
                  {section.title}
                </h4>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.exact} onClick={closeMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-[13.5px] font-medium ${
                        isActive
                          ? 'bg-[#696cff] text-white shadow-[0_2px_6px_rgba(105,108,255,0.4)]'
                          : 'text-[#566a7f] dark:text-white/70 hover:bg-[#f5f5f9] dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1 rounded-full bg-[#ff3e1d] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#eceef1] dark:border-white/10 shrink-0 flex flex-col gap-3">
          <ThemeToggle isLight={isLight} />
          <button onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-[13.5px] font-medium text-[#a1acb8] hover:bg-[#f5f5f9] dark:hover:bg-white/5 hover:text-[#ff3e1d]"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top navbar, Sneat-style */}
        <header className="h-[64px] shrink-0 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-[#2f3349] border-b border-[#eceef1] dark:border-white/10">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1 text-[#566a7f] dark:text-white/70 hover:text-[#696cff] rounded">
            <Menu size={22} />
          </button>
          <span className="hidden lg:block font-heading font-semibold text-[#566a7f] dark:text-white">
            {isAdminMode ? 'Admin Panel' : 'Dashboard'}
          </span>
          <div className="w-6 lg:hidden" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full relative">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
