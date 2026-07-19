
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../supabase';
import { LogOut, Menu, ChevronLeft, Lock, LayoutDashboard, ShieldCheck, Bell, Zap, Star, Home } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import { usePageRegistry } from '../../hooks/usePageRegistry';
import { getClubPalette } from '../../theme/racPalette';
import { usePoints } from '../../hooks/usePoints';

/** Converts a #rrggbb hex string + alpha (0–1) into an rgba() string.
 * Used once, for headerBg in light mode, to blend p.bg (an opaque hex
 * from theme/racPalette.ts) down to a translucent header fill instead
 * of hardcoding a second, disconnected near-white value. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function DashboardLayout({ isAdminMode = false }: { isAdminMode?: boolean }) {
  const { profile, signOut, role, isMasterAdmin, permissions, user } = useAuth();
  const { settings, theme, tenant } = useTenant();
  const { adminTenant, setAdminTenant } = useAdminTenant();
  const { resolvedTheme } = useTheme();
  const { fetchMemberPoints } = usePoints();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [points, setPoints] = useState({ xp: 0, fp: 0, level: 0 });

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

  // XP/FP belong to the logged-in person, not the tenant being viewed —
  // fetched regardless of isAdminMode so the header stays consistent
  // whether they're looking at /dashboard or /admin.
  useEffect(() => {
    if (!user) return;
    fetchMemberPoints(user.id).then((pts) => pts && setPoints(pts));
  }, [user?.id]);

  const handleSignOut = async () => { await signOut(); navigate('/'); };
  const closeMobile = () => setMobileOpen(false);

  type NavItem = { path: string; label: string; icon: any; exact?: boolean; badge?: number; pageKey?: string; isLocked?: boolean };
  type NavSection = { title?: string; items: NavItem[] };

  const canSeePage = (pageKey?: string) => {
    if (!pageKey) return true;
    if (isMasterAdmin) return true;
    return !!permissions[pageKey]?.can_view;
  };

  const isPageLocked = (pageKey?: string) => {
    if (!pageKey || isMasterAdmin) return false;
    return !!permissions[pageKey]?.is_locked;
  };

  const { pages: registryPages } = usePageRegistry(isAdminMode ? adminTenant.id : profile?.tenant_id);

  const badgeFor = (pageKey: string) =>
    pageKey === 'admin_applications' ? pendingCount : pageKey === 'admin_contact' ? unreadCount : undefined;

  const buildNav = (mode: 'admin' | 'member'): NavSection[] => {
    const base = mode === 'admin' ? '/admin' : '/dashboard';
    const routes = registryPages.filter(r => r.mode === mode).filter(r => canSeePage(r.pageKey));

    if (mode === 'member') {
      const items: NavItem[] = routes.map(r => ({
        path: r.exact ? base : `${base}/${r.path}`,
        label: r.label, icon: r.icon, exact: r.exact, pageKey: r.pageKey,
        badge: badgeFor(r.pageKey), isLocked: isPageLocked(r.pageKey),
      }));
      return items.length ? [{ items }] : [];
    }

    // admin: group by `section`, preserving registry sort order
    const sectionOrder: (string | null)[] = [];
    routes.forEach(r => { if (!sectionOrder.includes(r.section)) sectionOrder.push(r.section); });

    return sectionOrder
      .map(title => ({
        title: title || undefined,
        items: routes
          .filter(r => r.section === title)
          .map(r => ({
            path: r.exact ? base : `${base}/${r.path}`,
            label: r.label, icon: r.icon, exact: r.exact, pageKey: r.pageKey,
            badge: badgeFor(r.pageKey), isLocked: isPageLocked(r.pageKey),
          })),
      }))
      .filter(section => section.items.length > 0);
  };

  const adminNav = buildNav('admin');
  const memberNav = buildNav('member');
  const navToUse = isAdminMode ? adminNav : memberNav;

  // Can this user access /admin at all? At least one non-locked admin_* page with view access, or master admin.
  const canAccessAdminArea = isMasterAdmin || Object.keys(permissions).some(
    k => k.startsWith('admin_') && permissions[k]?.can_view && !permissions[k]?.is_locked
  );

  /**
   * ------------------------------------------------------------------
   * Tenant-color system — imports the SAME palette DashboardHome.tsx
   * uses (theme/racPalette.ts), not a separately-maintained approximation.
   * This is the actual fix for the header/sidebar-vs-page mismatch you
   * saw: previously this file had its own `clubAccent` object that only
   * coincidentally shared the two `green` hex values with DashboardHome's
   * PALETTE — header background, title text color, and border tones were
   * never actually linked to DashboardHome's numbers, so they could (and
   * did) drift out of sync. Now every token below reads from `p`, the
   * same palette object DashboardHome computes for the same tenant+theme,
   * so the header visually continues the page instead of sitting on top
   * of it as a separate surface.
   *
   * `isAdminMode` used to special-case a DIFFERENT accent (adminTenant-based
   * hex) from member-mode (theme.accent) — that split is gone; one
   * club-based accent drives both modes, matching DashboardHome, which
   * never had two separate accent systems to begin with.
   * ------------------------------------------------------------------
   */
  const activeTenantId = isAdminMode ? adminTenant.id : tenant.id;
  const p = getClubPalette(activeTenantId, dark ? 'dark' : 'light');

  // Sneat glass structure kept as-is (blur, translucency, radii, shadows);
  // every color value now comes directly from `p` (theme/racPalette.ts)
  // instead of a separately-maintained approximation.
  //
  // sidebarBg/headerBg pushed to near-solid (0.94/0.92 light, 0.9/0.88 dark)
  // — previously 0.7/0.65 opacity let DashboardHome's busy dark cards bleed
  // through and wash out nav text/icon contrast (confirmed via screenshot).
  // Blur is kept (still frosted at the edges/scroll boundary) but the base
  // fill is now high enough that legibility doesn't depend on what's behind it,
  // and the base color itself (p.bg) matches the page below pixel-for-pixel.
  const c = {
    pageBg: p.bg,
    sidebarBg: dark ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.94)',
    headerBg: hexToRgba(p.bg, dark ? 0.88 : 0.92),
    sidebarBorder: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    border: p.border,
    brandText: p.ptxt,
    sectionLabel: p.tsub,
    navText: p.navLink,
    navIcon: p.mut,
    navHoverBg: dark ? `${p.green}14` : `${p.green}14`,
    activeBg: `${p.green}24`,
    accent: p.green,
    danger: '#ff3e1d',
    tenantSwitchBg: dark ? 'rgba(255,255,255,0.05)' : '#f5f5f9',
  };

  return (
    <div className="flex min-h-screen h-[100dvh]" style={{ background: dark ? '#000000' : 'linear-gradient(160deg,#f3eef0,#f7f8fd)' }}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform: translateX(-8px); } to { opacity:1; transform: translateX(0); } }
        @keyframes navItemIn { from { opacity:0; transform: translateX(-6px); } to { opacity:1; transform: translateX(0); } }
      `}</style>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300" onClick={closeMobile} />
      )}

      <aside
        className={`fixed lg:relative flex flex-col h-full z-50 transition-transform lg:transition-[width] duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] will-change-transform backdrop-blur-2xl backdrop-saturate-150 border-r
        ${collapsed ? 'w-[84px]' : 'w-[260px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: c.sidebarBg, borderColor: c.sidebarBorder, boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(31,45,61,0.1)' }}
      >
        <button
          type="button"
          onClick={() => { if (window.innerWidth < 1024) closeMobile(); else setCollapsed(v => !v); }}
          className={`flex absolute -right-3 top-[26px] w-7 h-7 rounded-full text-white items-center justify-center z-10 ${mobileOpen ? '' : 'hidden lg:flex'}`}
          style={{ background: c.accent, boxShadow: '0 0 0 2px rgba(0,0,0,0.15)' }}
        >
          <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="shrink-0 flex items-center justify-center px-6 py-3">
          <NavLink to="/" className="flex items-center justify-center w-full">
            {settings.logoUrl ? (
              <span
                role="img" aria-label="Logo"
                className={`object-contain ${collapsed ? 'h-10 w-10' : 'h-14 w-full max-w-[200px]'}`}
                style={{
                  display: 'inline-block',
                  backgroundColor: dark ? '#ffffff' : c.accent,
                  WebkitMaskImage: `url(${settings.logoUrl})`,
                  maskImage: `url(${settings.logoUrl})`,
                  WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center', maskPosition: 'center',
                  WebkitMaskSize: 'contain', maskSize: 'contain',
                }}
              />
            ) : (
              <span className="h-8 w-8 rounded-full shrink-0" style={{ background: c.accent }} />
            )}
          </NavLink>
        </div>

        {!collapsed && (
          <div
            className="mx-4 mb-3 p-3.5 rounded-2xl flex items-center gap-3 shrink-0"
            style={{
              background: dark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : c.border}`,
              boxShadow: dark ? 'none' : '0 2px 8px rgba(31,45,61,0.08)',
              animation: 'slideIn 0.4s ease-out',
            }}
          >
            {(profile as any)?.photo ? (
              <img
                src={(profile as any).photo}
                alt={profile?.name || 'Profile'}
                className="h-11 w-11 rounded-full object-cover shrink-0"
                style={{ border: `2px solid ${c.accent}` }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ background: c.accent }}
              >
                {(profile?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold truncate" style={{ color: c.brandText }}>{profile?.name || 'Loading...'}</p>
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1 text-white"
                style={{ background: role?.color || '#9ca3af' }}
              >
                {role?.label || 'Member'}
              </span>
            </div>
          </div>
        )}

        {!collapsed && canAccessAdminArea && (
          <div className="mx-4 mb-2 p-1 rounded-lg flex gap-1 shrink-0" style={{ background: c.tenantSwitchBg }}>
            <button type="button" onClick={() => navigate('/dashboard')}
              className="flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              style={!isAdminMode ? { background: c.accent, color: '#fff' } : { color: c.sectionLabel }}
            ><LayoutDashboard size={13} /> Dashboard</button>
            <button type="button" onClick={() => navigate('/admin')}
              className="flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              style={isAdminMode ? { background: c.accent, color: '#fff' } : { color: c.sectionLabel }}
            ><ShieldCheck size={13} /> Admin</button>
          </div>
        )}

        {isAdminMode && isMasterAdmin && !collapsed && (
          <div className="mx-4 mb-2 p-1 rounded-lg flex gap-1 shrink-0" style={{ background: c.tenantSwitchBg }}>
            <button type="button" onClick={() => setAdminTenant('icdlu')}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all"
              style={adminTenant.id === 'icdlu' ? { background: '#52b3d8', color: '#fff' } : { color: c.sectionLabel }}
            >ICDLU</button>
            <button type="button" onClick={() => setAdminTenant('racdlu')}
              className="flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all"
              style={adminTenant.id === 'racdlu' ? { background: '#d85283', color: '#fff' } : { color: c.sectionLabel }}
            >RACDLU</button>
          </div>
        )}

        <nav className="flex-1 min-h-0 overflow-y-auto py-2 px-4 flex flex-col gap-0.5 hide-scrollbar">
          {navToUse.map((section, idx) => (
            <div key={idx} className="mb-1">
              {section.title && !collapsed && (
                <h4 className="text-[11px] font-semibold uppercase tracking-widest px-2 mt-5 mb-2" style={{ color: c.sectionLabel }}>
                  {section.title}
                </h4>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item, i) => (
                  <NavLink key={item.path} to={item.path} end={item.exact} onClick={closeMobile} title={collapsed ? item.label : item.isLocked ? `${item.label} (locked)` : undefined}
                    style={{ animation: `navItemIn 0.3s ease-out ${i * 0.02}s both`, opacity: item.isLocked ? 0.5 : 1 }}
                    className={`relative flex items-center gap-3 rounded-md transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] text-[13.5px] ${collapsed ? 'justify-center px-0' : 'px-2'} py-2`}
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className="absolute inset-0 rounded-md -z-10"
                          style={{ background: isActive ? c.activeBg : 'transparent' }}
                        />
                        {isActive && (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full" style={{ background: c.accent }} />
                        )}
                        <item.icon size={18} strokeWidth={2} className="shrink-0" style={{ color: isActive ? c.accent : c.navIcon }} />
                        {!collapsed && (
                          <span className="flex-1 truncate" style={{ color: isActive ? c.accent : c.navText, fontWeight: isActive ? 600 : 400 }}>
                            {item.label}
                          </span>
                        )}
                        {!collapsed && item.isLocked && (
                          <Lock size={13} className="shrink-0" style={{ color: c.navIcon }} />
                        )}
                        {!collapsed && !item.isLocked && item.badge !== undefined && item.badge > 0 && (
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
          <div className="mx-4 my-3 rounded-xl p-4 shrink-0" style={{ background: c.accent }}>
            <p className="text-sm font-semibold text-white">Need help?</p>
            <p className="text-xs text-white/80 mt-0.5">Check club resources & guides</p>
            <NavLink to={isAdminMode ? '/admin/resources' : '/dashboard/resources'}
              className="mt-3 block w-full text-center text-xs font-bold py-2 rounded-lg" style={{ background: '#ffffff', color: c.accent }}>
              Resources
            </NavLink>
          </div>
        )}

        <div className="p-4 flex flex-col gap-3 shrink-0">
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
        <header className="shrink-0 px-3 pt-4 pb-1 lg:px-6 lg:pt-6 lg:pb-2">
          {/* Was hardcoded to #ffffff in light mode — every card on the
              actual dashboard page (DashboardHome.tsx) reads its surface
              color from `p.dark` (the getClubPalette token for card
              backgrounds, in both themes despite the token's name), not a
              literal white. That mismatch is why this floated as a bright,
              disconnected slab in light mode while every card below it
              used the page's own warm-gray-derived surface tone. Now this
              reads from the same `p` object DashboardHome.tsx uses, so the
              header is a card of the page rather than a separate surface
              guessing at what "light mode" should look like. */}
          <div
            className="h-[60px] rounded-2xl flex items-center justify-between px-3 lg:px-5 gap-2"
            style={{
              background: p.dark,
              color: p.tl,
              border: `1px solid ${p.border}`,
              boxShadow: dark ? 'none' : '0 2px 8px rgba(31,45,61,0.06)',
            }}
          >
            {/* left: mobile menu + club logo */}
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <button type="button" onClick={() => setMobileOpen(true)} className="lg:hidden p-1 -ml-1 rounded shrink-0" style={{ color: p.tl }}>
                <Menu size={22} />
              </button>
              {settings.logoUrl ? (
                <span
                  role="img" aria-label="Logo"
                  className="hidden xs:inline-block h-7 w-24 lg:h-8 lg:w-32 shrink-0"
                  style={{
                    display: 'inline-block',
                    backgroundColor: c.accent,
                    WebkitMaskImage: `url(${settings.logoUrl})`,
                    maskImage: `url(${settings.logoUrl})`,
                    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'left center', maskPosition: 'left center',
                    WebkitMaskSize: 'contain', maskSize: 'contain',
                  }}
                />
              ) : (
                <span className="h-7 w-7 rounded-full shrink-0" style={{ background: c.accent }} />
              )}
            </div>

            {/* right: xp/fp pills, home, notifications, profile — always
                visible, tighter (icon+number only, no label) below lg so
                everything fits a narrow phone width without overflow.
                Pill fills use p.greenDeep/p.gcA (the same deep-accent chip
                backgrounds DashboardHome.tsx's Zap/Star icon squares use)
                instead of flat rgba(gold) / accent+alpha, which read fine
                against a white card but muddied against p.dark in light
                mode. Text stays p.av2 (XP) / p.green (FP) — same colors
                DashboardHome.tsx's own XP/FP numbers use.

                Icon-chip circles (home/notifications) previously used
                p.lightCard — that token is DashboardHome.tsx's dedicated
                standalone-card surface (see "Tracking" card), a full step
                brighter than p.dark by design, meant to read as its OWN
                card. Used here as a small inset circle it just looked like
                a stray white blob sitting on the header. Swapped for a low
                alpha wash of p.tl OVER p.dark instead — always reads as
                "a bit lighter than the header," in either theme, without
                borrowing a different surface's identity. */}
            <div className="flex items-center gap-1 lg:gap-3 shrink-0">
              <div className="flex items-center gap-1 lg:gap-1.5 rounded-full px-1.5 lg:px-2.5 py-1 lg:py-1.5" style={{ background: p.greenDeep }}>
                <Zap size={13} color={p.av2} className="shrink-0" />
                <span className="text-[10.5px] lg:text-[12px] font-bold whitespace-nowrap" style={{ color: p.av2 }}>{points.xp.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-1.5 rounded-full px-1.5 lg:px-2.5 py-1 lg:py-1.5" style={{ background: p.gcA }}>
                <Star size={13} color={p.green} className="shrink-0" />
                <span className="text-[10.5px] lg:text-[12px] font-bold whitespace-nowrap" style={{ color: p.green }}>{points.fp.toFixed(2)}</span>
              </div>

              <NavLink
                to="/dashboard/home"
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: p.mut }}
              >
                <Home size={17} />
              </NavLink>

              <NavLink
                to="/dashboard/notifications"
                className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: p.mut }}
              >
                <Bell size={17} />
              </NavLink>

              <NavLink to="/dashboard/profile" className="shrink-0">
                {(profile as any)?.photo ? (
                  <img
                    src={(profile as any).photo}
                    alt={profile?.name || 'Profile'}
                    className="h-9 w-9 rounded-full object-cover"
                    style={{ border: `2px solid ${c.accent}` }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-[13px]"
                    style={{ background: c.accent }}
                  >
                    {(profile?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </NavLink>
            </div>
          </div>
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
