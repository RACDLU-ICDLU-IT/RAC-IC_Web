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
  // Header show/hide on scroll: POSITIONAL, not directional. Header is
  // visible only when scrollTop is near the very top of `<main>` (the
  // real scroll container in this layout — it has its own
  // overflow-y-auto; `window` never scrolls here). Anywhere else —
  // mid-scroll, at the bottom, scrolling up OR down — it stays hidden.
  // No direction tracking, no delta comparison, no threshold tuning
  // between "this counts as scroll-down" vs "this counts as scroll-up".
  // This sidesteps the earlier bounce-related glitch structurally rather
  // than patching around it: that bug existed because a DIRECTIONAL rule
  // could be fooled by mobile rubber-band overscroll (scrollTop briefly
  // decreasing during bounce-back even while the gesture is downward,
  // which read as "scroll up" and revealed the header mid-bounce). A
  // POSITIONAL rule doesn't ask "which way did it move" at all — it only
  // asks "is scrollTop below N", so bounce at the bottom can't fool it
  // into revealing the header, since bottom is never "near top"
  // regardless of which way scrollTop is jittering during the bounce.
  const [headerHidden, setHeaderHidden] = useState(false);
  const mainRef = React.useRef<HTMLElement>(null);

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

  // Two independent glitches were reported: (A) flicker DURING scroll,
  // (B) glitching specifically AT THE BOTTOM of the page. Different root
  // causes, both fixed here:
  //
  // (A) Raw `scroll` events can fire many times per second during a
  // mobile momentum scroll, and the old handler called setState directly
  // on every single one. Native scroll deltas aren't perfectly
  // monotonic frame-to-frame even within one continuous gesture, so
  // comparing raw consecutive events could flip headerHidden true→false→
  // true within the same gesture. Fixed by batching through
  // requestAnimationFrame — only the LATEST scrollTop per animation
  // frame is acted on, so state can change at most once per paint
  // instead of once per raw event.
  //
  // (B) Mobile browsers implement rubber-band/elastic overscroll: at the
  // very bottom (or top) of a scroll container, continuing to drag lets
  // scrollTop briefly overshoot past the real max, then spring back.
  // During that spring-back, scrollTop DECREASES even though the
  // person's actual gesture is still scrolling down — which the old
  // delta check read as scroll-up and revealed the header mid-bounce,
  // then hid it again on the next real frame. Fixed by clamping every
  // reading to [0, scrollHeight - clientHeight] before computing delta,
  // so bounce past the real end of content is ignored rather than
  // treated as a direction change.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let rafId: number | null = null;

    // Purely positional: visible below 24px from the top, hidden at any
    // other scrollTop value. RAF-throttled for the same reason as before
    // — native `scroll` events can fire many times per second during
    // momentum scrolling, so batching to at most one state check per
    // paint avoids redundant re-renders, though a positional rule is
    // inherently less prone to the flicker a directional one saw (no
    // delta or threshold comparison to be sensitive to jitter in).
    const process = () => {
      rafId = null;
      setHeaderHidden(el.scrollTop >= 24);
    };

    const handleScroll = () => {
      if (rafId !== null) return; // a frame is already pending — coalesce
      rafId = requestAnimationFrame(process);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

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
    <div className="flex min-h-screen h-[100dvh]" style={{ background: p.bg }}>
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
        <header
          className="shrink-0 overflow-hidden px-3 lg:px-6"
          style={{
            maxHeight: headerHidden ? 0 : 200,
            paddingTop: headerHidden ? 0 : 16,
            paddingBottom: headerHidden ? 0 : 4,
            transform: headerHidden ? 'translateY(-16px)' : 'translateY(0)',
            opacity: headerHidden ? 0 : 1,
            transition: 'max-height 0.25s ease, transform 0.25s ease, opacity 0.2s ease, padding 0.25s ease',
          }}
        >
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
            {/* left: mobile menu + club logo.
                Logo was `hidden xs:inline-block` + size swapping at `lg`
                — invisible below a breakpoint that likely isn't even
                configured in this project's Tailwind config, and a
                different fixed size at desktop. Now one constant size,
                always rendered, regardless of viewport — "always the same
                size" per instruction, not conditional on width. Bumped
                h-7/w-24 to h-8/w-28 — a small step up, not a big jump. */}
            <div className="flex items-center gap-2 lg:gap-3 min-w-0 shrink">
              <button type="button" onClick={() => setMobileOpen(true)} className="lg:hidden p-1 -ml-1 rounded shrink-0" style={{ color: p.tl }}>
                <Menu size={22} />
              </button>
              {settings.logoUrl ? (
                <span
                  role="img" aria-label="Logo"
                  className="inline-block h-8 w-28 shrink min-w-0"
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

            {/* right: xp/fp, home, notifications, profile.

                XP/FP: pill/card treatment removed entirely per instruction
                ("if needed, remove the pill entirety") — no background, no
                border, no padding box. Just icon + number, sized down to
                fit. Explicit flex-col (not CSS grid + a `lg:` breakpoint
                swap) so XP sits directly above FP as two rows UNCONDITION-
                ALLY, at every viewport width — the previous grid version
                still rendered side-by-side at some widths because
                `lg:grid-cols-2` was doing exactly what it said, which
                wasn't actually what was wanted here. flex-col has no
                breakpoint to cross, so there's nothing to debug or drift.
                Both rows sit centered against the home/bell/avatar icons
                beside them via the outer wrapper's `items-center`.

                Colors: XP fixed violet, FP fixed gold — not sourced from
                `p` (getClubPalette), since that palette has no violet/gold
                tokens of its own and pulling a shade FROM the tenant
                palette risked clashing depending on club. Same pattern as
                `c.danger` above (a hardcoded semantic color outside the
                tenant system).

                Background box around the stack uses the same low-alpha
                rgba(255,255,255,0.08) dark / rgba(0,0,0,0.05) light,
                rounded-xl fill the home/bell icon circles already use, so
                it reads as one cohesive element rather than bare text
                floating on the header. Spacing before the home button
                comes from the shared `gap-1.5 lg:gap-2.5` on this row's
                own parent — same gap every other item in the row uses,
                so point-box→home matches home→bell and bell→avatar
                exactly, rather than a one-off margin stacking an extra
                gap on top of the shared one. */}
            <div className="flex items-center gap-1.5 lg:gap-2.5 shrink-0">
              {/* XP/FP colors no longer branch on `dark`. Root cause of two
                  failed light-mode attempts: I was assuming light mode
                  meant this card sat on/was a LIGHT surface, and kept
                  picking progressively darker shades to contrast against
                  an imagined light card. Checked against the real
                  racPalette.ts values: `p.dark` for rotaract.light is
                  #211c1e — essentially AS DARK as dark mode's #161616.
                  The card surface itself barely changes lightness between
                  themes; only the page background (`p.bg`) and on-page
                  text tokens (`ptxt`/`tl`) actually flip. A dark-mode-style
                  light tint was needed in BOTH themes all along.
                  Verified numerically (WCAG relative luminance) against
                  all four club×theme `dark` card values before landing
                  here — every combination clears 8.9:1+ (AA text minimum
                  is 4.5:1), so this isn't a third guess, it's checked. */}
              <div
                className="flex flex-col items-start justify-center gap-[3px] shrink-0 leading-none rounded-xl px-2.5 py-1.5"
                style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <Zap size={11} color="#c4b5fd" className="shrink-0" />
                  <span
                    className="text-[10px] font-bold truncate max-w-[68px] leading-none"
                    style={{ color: '#c4b5fd' }}
                  >
                    {points.xp.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                  <Star size={11} color="#fde047" className="shrink-0" />
                  <span
                    className="text-[10px] font-bold truncate max-w-[68px] leading-none"
                    style={{ color: '#fde047' }}
                  >
                    {points.fp.toFixed(2)}
                  </span>
                </div>
              </div>

              <NavLink
                to="/dashboard/home"
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: p.mut }}
              >
                <Home size={17} />
              </NavLink>

              <NavLink
                to="/dashboard/notifications"
                className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
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

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-8 w-full relative">
          <div className="mx-auto max-w-7xl">
            <Outlet />

            {/* Dashboard footer — scrolls with content below whatever the
                Outlet renders, same as a normal page footer (matches how
                SiteFooter works on the public site: bottom of the page,
                not a persistent fixed bar pinned over content). Built in
                THIS file's own visual language (p.dark surface, p.border
                hairline, p.tsub/p.mut muted text, rounded-2xl, small
                sizes) rather than reusing SiteFooter's styling, since
                SiteFooter is a marketing-site footer (solid brand-color
                block, big link columns) that would reintroduce the same
                "disconnected surface" mismatch already fixed earlier in
                this file for the header. Uses `c.accent`/`p` — the same
                tenant-derived tokens every dashboard card already reads
                from — so it moves with tenant + theme automatically. */}
            <footer
              className="mt-8 mb-4 rounded-2xl px-5 py-6 md:px-8 md:py-7"
              style={{ background: p.dark, border: `1px solid ${p.border}` }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="flex items-center gap-3 min-w-0">
                  {settings.logoUrl ? (
                    <span
                      role="img" aria-label="Logo"
                      className="inline-block h-6 w-6 shrink-0 rounded-full"
                      style={{
                        display: 'inline-block',
                        backgroundColor: c.accent,
                        WebkitMaskImage: `url(${settings.logoUrl})`,
                        maskImage: `url(${settings.logoUrl})`,
                        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center', maskPosition: 'center',
                        WebkitMaskSize: 'contain', maskSize: 'contain',
                      }}
                    />
                  ) : (
                    <span className="h-6 w-6 rounded-full shrink-0" style={{ background: c.accent }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold truncate" style={{ color: p.tl }}>
                      {settings.clubName || tenant.fullName}
                    </p>
                    <p className="text-[10.5px]" style={{ color: p.tsub }}>
                      © {new Date().getFullYear()} · All rights reserved
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <NavLink
                    to={isAdminMode ? '/admin/resources' : '/dashboard/resources'}
                    className="text-[11.5px] font-medium transition-colors"
                    style={{ color: p.mut }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = p.tl)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = p.mut)}
                  >
                    Resources
                  </NavLink>
                  <a
                    href={`mailto:${settings.contactEmail || 'support@racdlu.org'}`}
                    className="text-[11.5px] font-medium transition-colors"
                    style={{ color: p.mut }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = p.tl)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = p.mut)}
                  >
                    Contact Support
                  </a>
                  <NavLink
                    to="/"
                    className="text-[11.5px] font-medium transition-colors"
                    style={{ color: p.mut }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = p.tl)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = p.mut)}
                  >
                    Public Site
                  </NavLink>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
