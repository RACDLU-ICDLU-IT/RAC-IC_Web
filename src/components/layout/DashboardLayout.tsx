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

      <aside
        className={`fixed lg:relative flex flex-col w-[260px] h-full z-50 transform transition-transform duration-300 ease-in-out
        bg-white/70 dark:bg-[#2f3349]/60 backdrop-blur-xl backdrop-saturate-150 border-r border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.06)]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-[64px] shrink-0 flex items-center px-5">
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                className="h-7 w-7 object-contain rounded"
              />
            ) : (
              <span className="h-7 w-7 rounded-full bg-[#696cff] shrink-0" />
            )}
            <span className="font-heading font-bold text-[1.1rem] tracking-tight text-[#566a7f] dark:text-white truncate">
              {settings.clubName}
            </span>
          </NavLink>
        </div>

        {isAdminMode && profile?.role === 'master_admin' && (
          <div className="mx-4 mb-2 p-1 bg-[#f5f5f9] dark:bg-white/5 rounded-lg flex gap-1 shrink-0">
            <button onClick={() => setAdminTenant('icdlu')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                adminTenant.id === 'icdlu' ? 'bg-[#696cff] text-white shadow-sm' : 'text-[#a1acb8] hover:text-[#696cff]'
              }`}>ICDLU</button>
            <button onClick={() => setAdminTenant('racdlu')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                adminTenant.id === 'racdlu' ? 'bg-[#696cff] text-white shadow-sm' : 'text-[#a1acb8] hover:text-[#696cff]'
              }`}>RACDLU</button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2 px-4 flex flex-col gap-0.5 hide-scrollbar">
          {navToUse.map((section, idx) => (
            <div key={idx} className="mb-1">
              {section.title && (
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#a1acb8] dark:text-white/30 px-2 mt-5 mb-2">
                  {section.title}
                </h4>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.exact} onClick={closeMobile}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-[13.5px] ${
                        isActive
                          ? 'bg-white/60 dark:bg-white/10 backdrop-blur-sm shadow-[0_2px_10px_rgba(105,108,255,0.15)] text-[#696cff] font-semibold'
                          : 'text-[#697a8d] dark:text-white/70 hover:bg-white/30 dark:hover:bg-white/5 hover:text-[#696cff] font-normal'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} strokeWidth={2} className={`shrink-0 ${isActive ? 'text-[#696cff]' : 'text-[#a1acb8] group-hover:text-[#696cff]'}`} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="min-w-[20px] h-5 px-1 rounded-full bg-[#ff3e1d] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2.5 px-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleColors[profile?.role || 'member']}`}>
              {profile?.role || 'Member'}
            </span>
            <span className="text-[13px] font-medium text-[#566a7f] dark:text-white/80 truncate">
              {profile?.name || 'Loading...'}
            </span>
          </div>
          <ThemeToggle isLight={isLight} />
          <button onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-2 py-2 rounded-md transition-colors text-[13.5px] text-[#a1acb8] hover:text-[#ff3e1d]"
          >
            <LogOut size={18} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
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
