import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../supabase';
import {
  Home, User, CalendarDays, Calendar, Presentation, Bell, Settings,
  Users, UserCheck, CheckSquare, FolderOpen, Newspaper, Image as ImageIcon,
  HeartHandshake, Megaphone, Inbox, Palette, LogOut, Menu, LucideIcon, FileText, CreditCard,
  Zap, HandCoins, Trophy, Bot, Share2, ChevronLeft
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function DashboardLayout({ isAdminMode = false }: { isAdminMode?: boolean }) {
  const { profile, signOut } = useAuth();
  const { settings } = useTenant();
  const { adminTenant, setAdminTenant } = useAdminTenant();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const dark = resolvedTheme === 'dark';

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

  // Sneat design tokens, resolved per-render from actual theme state (no stray dark: classes)
  const c = {
    pageBg: dark ? '#25293c' : '#f5f5f9',
    sidebarBg: dark ? 'rgba(47,51,73,0.85)' : 'rgba(255,255,255,0.9)',
    headerBg: dark ? 'rgba(47,51,73,0.85)' : 'rgba(255,255,255,0.85)',
    border: dark ? 'rgba(255,255,255,0.1)' : '#eceef1',
    brandText: dark ? '#ffffff' : '#566a7f',
    sectionLabel: dark ? 'rgba(255,255,255,0.3)' : '#a1acb8',
    navText: dark ? 'rgba(255,255,255,0.7)' : '#697a8d',
    navIcon: dark ? 'rgba(255,255,255,0.4)' : '#a1acb8',
    navHoverBg: dark ? 'rgba(255,255,255,0.05)' : 'rgba(105,108,255,0.06)',
    activeBg: dark ? 'rgba(105,108,255,0.16)' : 'rgba(105,108,255,0.1)',
    accent: '#696cff',
    danger: '#ff3e1d',
    tenantSwitchBg: dark ? 'rgba(255,255,255,0.05)' : '#f5f5f9',
  };

  return (
    <div className="flex min-h-screen h-[100dvh]" style={{ background: c.pageBg }}>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobile} />
      )}

      <aside
        className={`fixed lg:relative flex flex-col h-full z-50 transition-[width,transform] duration-300 ease-in-out backdrop-blur-xl backdrop-saturate-150 border-r
        ${collapsed ? 'w-[84px]' : 'w-[260px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: c.sidebarBg, borderColor: c.border, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}
      >
        <button
          type="button"
          onClick={() => { if (window.innerWidth < 1024) closeMobile(); else setCollapsed(v => !v); }}
          className={`flex absolute -right-3 top-[26px] w-6 h-6 rounded-full text-white items-center justify-center shadow-md z-10 ${mobileOpen ? '' : 'hidden lg:flex'}`}
          style={{ background: c.accent }}
        >
          <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="h-[64px] shrink-0 flex items-center px-5">
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                className="h-7 w-7 object-contain rounded shrink-0"
              />
            ) : (
              <span className="h-7 w-7 rounded-full shrink-0" style={{ background: c.accent }} />
            )}
            {!collapsed && (
              <span className="font-heading font-bold text-[1.1rem] tracking-tight truncate" style={{ color: c.brandText }}>
                {settings.clubName}
              </span>
            )}
          </NavLink>
        </div>

        {isAdminMode && profile?.role === 'master_admin' && !collapsed && (
          <div className="mx-4 mb-2 p-1 rounded-lg flex gap-1 shrink-0" style={{ background: c.tenantSwitchBg }}>
            <button type="button" onClick={() => setAdminTenant('icdlu')}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all"
              style={adminTenant.id === 'icdlu' ? { background: c.accent, color: '#fff' } : { color: c.sectionLabel }}
            >ICDLU</button>
            <button type="button" onClick={() => setAdminTenant('racdlu')}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all"
              style={adminTenant.id === 'racdlu' ? { background: c.accent, color: '#fff' } : { color: c.sectionLabel }}
            >RACDLU</button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2 px-4 flex flex-col gap-0.5 hide-scrollbar">
          {navToUse.map((section, idx) => (
            <div key={idx} className="mb-1">
              {section.title && !collapsed && (
                <h4 className="text-[11px] font-semibold uppercase tracking-widest px-2 mt-5 mb-2" style={{ color: c.sectionLabel }}>
                  {section.title}
                </h4>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.exact} onClick={closeMobile} title={collapsed ? item.label : undefined}
                    className={`relative flex items-center gap-3 rounded-md transition-colors text-[13.5px] ${collapsed ? 'justify-center px-0' : 'px-2'} py-2`}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className="absolute inset-0 rounded-md -z-10"
                          style={{ background: isActive ? c.activeBg : 'transparent' }}
                        />
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full" style={{ background: c.accent }} />
                        )}
                        <item.icon size={18} strokeWidth={2} className="shrink-0" style={{ color: isActive ? c.accent : c.navIcon }} />
                        {!collapsed && (
                          <span className="flex-1 truncate" style={{ color: isActive ? c.accent : c.navText, fontWeight: isActive ? 600 : 400 }}>
                            {item.label}
                          </span>
                        )}
                        {!collapsed && item.badge !== undefined && item.badge > 0 && (
                          <span className="min-w-[20px] h-5 px-1 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: c.danger }}>
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

        {!collapsed && (
          <div className="mx-4 mb-3 rounded-xl p-4 text-white shrink-0" style={{ background: `linear-gradient(135deg, ${c.accent}, #8f92ff)` }}>
            <p className="text-sm font-semibold">Need help?</p>
            <p className="text-xs text-white/80 mt-0.5">Check club resources & guides</p>
            <NavLink to={isAdminMode ? '/admin/resources' : '/dashboard/resources'}
              className="mt-3 block w-full text-center bg-white text-xs font-bold py-2 rounded-lg" style={{ color: c.accent }}>
              Resources
            </NavLink>
          </div>
        )}

        <div className="p-4 flex flex-col gap-3 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleColors[profile?.role || 'member']}`}>
                {profile?.role || 'Member'}
              </span>
              <span className="text-[13px] font-medium truncate" style={{ color: c.brandText }}>
                {profile?.name || 'Loading...'}
              </span>
            </div>
          )}
          {!collapsed && <ThemeToggle isLight={!dark} />}
          <button type="button" onClick={handleSignOut} title={collapsed ? 'Sign Out' : undefined}
            className={`flex items-center gap-3 w-full px-2 py-2 rounded-md transition-colors text-[13.5px] ${collapsed ? 'justify-center' : ''}`}
            style={{ color: c.sectionLabel }}
            onMouseEnter={(e) => (e.currentTarget.style.color = c.danger)}
            onMouseLeave={(e) => (e.currentTarget.style.color = c.sectionLabel)}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-[64px] shrink-0 flex items-center justify-between px-4 lg:px-6 backdrop-blur-xl border-b"
          style={{ background: c.headerBg, borderColor: c.border }}>
          <button type="button" onClick={() => setMobileOpen(true)} className="lg:hidden p-1 rounded" style={{ color: c.brandText }}>
            <Menu size={22} />
          </button>
          <span className="hidden lg:block font-heading font-semibold" style={{ color: c.brandText }}>
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
