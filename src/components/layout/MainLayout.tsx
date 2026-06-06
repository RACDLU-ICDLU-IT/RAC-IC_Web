import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import { useTenant } from '../../hooks/useTenant';
import { Menu, X, ArrowUpRight } from 'lucide-react';

export default function MainLayout() {
  const { settings, tenant } = useTenant();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [logoError, setLogoError] = useState(false);

  const overlayRef  = useRef<HTMLDivElement>(null);
  const linksRef    = useRef<HTMLDivElement>(null);
  const metaRef     = useRef<HTMLDivElement>(null);
  const ctaRef      = useRef<HTMLDivElement>(null);
  const location    = useLocation();

  useEffect(() => { setLogoError(false); }, [settings.logoUrl]);

  const isLight         = tenant.brand.primaryColor === '#FFFFFF';
  const onPrimaryBorder = isLight ? 'border-gray-200' : 'border-white/10';

  const isLoginPage = location.pathname === '/login';

  // Pages where a full-bleed hero sits behind the transparent navbar.
  // All other pages get a solid navbar at all times so links stay readable.
  const isHeroPage = ['/', '/about', '/join', '/donate'].includes(location.pathname);

  // True when we should render the navbar in its "solid / scrolled" style.
  const navSolid = !menuOpen && (!isHeroPage || scrolled);

  /* ── Lenis smooth scroll ── */
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    const raf = (time: number) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  /* ── Scroll listener ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Menu open / close animation ── */
  useEffect(() => {
    if (!overlayRef.current) return;

    if (menuOpen) {
      document.body.style.overflow = 'hidden';

      gsap.set(overlayRef.current, { display: 'flex', opacity: 0, y: 12 });
      gsap.to(overlayRef.current, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' });

      if (linksRef.current) {
        gsap.fromTo(
          linksRef.current.children,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.32, stagger: 0.04, delay: 0.08, ease: 'power2.out' },
        );
      }

      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current,
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.28, delay: 0.22, ease: 'power2.out' },
        );
      }

      if (metaRef.current) {
        gsap.fromTo(metaRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.25, delay: 0.28, ease: 'none' },
        );
      }
    } else {
      document.body.style.overflow = '';
      gsap.to(overlayRef.current, {
        opacity: 0, y: 8,
        duration: 0.18, ease: 'power2.in',
        onComplete: () => {
          if (overlayRef.current) overlayRef.current.style.display = 'none';
        },
      });
    }
  }, [menuOpen]);

  /* ── Close on route change ── */
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  /* ─────────────────────────────────────────────────────────────────────
     NAV LINKS
  ───────────────────────────────────────────────────────────────────── */
  const primaryLinks = [
    { label: 'Home',     path: '/' },
    { label: 'About',    path: '/about' },
    { label: 'Projects', path: '/projects' },
    { label: 'Events',   path: '/events' },
    { label: 'News',     path: '/news' },
    { label: 'Board',    path: '/board' },
  ];

  const secondaryLinks = [
    { label: 'Join Us',   path: '/join' },
    { label: 'Sponsors',  path: '/sponsorship' },
    { label: 'Donate',    path: '/donate' },
  ];

  /* ─────────────────────────────────────────────────────────────────────
     COLOUR LOGIC
  ───────────────────────────────────────────────────────────────────── */
  const navTextClass = navSolid
    ? (isLight
        ? 'text-[var(--color-accent)] hover:text-[var(--color-accent)]/70'
        : 'text-white hover:text-[var(--color-accent)]')
    : 'text-white hover:text-white/70';

  const loginBtnClass = navSolid && isLight
    ? 'border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white'
    : 'border border-white/30 text-white hover:border-white hover:bg-white/10';

  const hamburgerClass = menuOpen
    ? 'text-white'
    : navSolid ? 'text-[var(--color-accent)]' : 'text-white';

  const logoColor = menuOpen
    ? '#ffffff'
    : navSolid ? 'var(--color-accent)' : '#ffffff';

  const overlayBg = isLight ? 'var(--color-accent)' : 'var(--color-primary)';

  // Navbar background: /login page always uses #e8eaf0
  const navBgStyle = isLoginPage && !menuOpen
    ? { backgroundColor: '#e8eaf0' }
    : undefined;

  // On /login, treat nav as always "solid" for text/border logic,
  // but override the actual bg color via navBgStyle above.
  const effectiveSolid = isLoginPage ? true : navSolid;

  const loginPageNavTextClass = 'text-[var(--color-accent)] hover:text-[var(--color-accent)]/70';
  const loginPageLoginBtnClass = 'border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white';
  const loginPageHamburgerClass = menuOpen ? 'text-white' : 'text-[var(--color-accent)]';
  const loginPageLogoColor = menuOpen ? '#ffffff' : 'var(--color-accent)';

  const finalNavTextClass    = isLoginPage ? loginPageNavTextClass    : navTextClass;
  const finalLoginBtnClass   = isLoginPage ? loginPageLoginBtnClass   : loginBtnClass;
  const finalHamburgerClass  = isLoginPage ? loginPageHamburgerClass  : hamburgerClass;
  const finalLogoColor       = isLoginPage ? loginPageLogoColor       : logoColor;

  /* ─────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-screen">

      {/* ═══ NAVBAR ════════════════════════════════════════════════════ */}
      <nav
        className={`fixed w-full z-50 transition-all duration-500 flex items-center justify-between px-5 md:px-10 lg:px-16 ${
          effectiveSolid
            ? `h-[72px] backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)] border-b ${onPrimaryBorder}`
            : 'h-[88px] bg-transparent'
        }`}
        style={
          effectiveSolid
            ? { ...(navBgStyle ?? { backgroundColor: 'rgb(var(--color-primary-rgb, 255 255 255) / 0.95)' }), ...(!navBgStyle ? {} : {}) }
            : undefined
        }
      >
        {/* Logo */}
        <Link
          to="/"
          className="relative z-50 flex items-center shrink-0"
          aria-label={settings.clubName || tenant.fullName}
        >
          {settings.logoUrl && !logoError ? (
            <div
              role="img"
              aria-label={settings.clubName || tenant.shortName}
              style={{
                WebkitMaskImage: `url(${settings.logoUrl})`,
                maskImage: `url(${settings.logoUrl})`,
                WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                WebkitMaskSize: 'contain',     maskSize: 'contain',
                WebkitMaskPosition: 'center',  maskPosition: 'center',
                backgroundColor: finalLogoColor,
                transition: 'background-color 0.4s ease, width 0.4s ease, height 0.4s ease',
                width:  effectiveSolid ? '120px' : '132px',
                height: effectiveSolid ? '38px'  : '40px',
                flexShrink: 0,
              }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className={`font-heading font-extrabold tracking-tight transition-all duration-300 text-2xl ${
              menuOpen ? 'text-white' : effectiveSolid ? (isLight ? 'text-[var(--color-accent)]' : 'text-white') : 'text-white'
            }`}>
              {tenant.shortName}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2 justify-center flex-1 mx-6">
          {[...primaryLinks, ...secondaryLinks].map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className={`relative px-3 py-1.5 font-semibold text-[11px] xl:text-xs tracking-widest uppercase transition-colors duration-200 shrink-0 whitespace-nowrap
                after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[1.5px] after:bg-current after:transition-all after:duration-300 hover:after:w-4/5
                ${finalNavTextClass}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 relative z-50">
          <Link
            to="/login"
            className={`hidden md:inline-flex items-center px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105 ${finalLoginBtnClass}`}
          >
            Member Login
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`lg:hidden relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-white/10 ${finalHamburgerClass}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={22} strokeWidth={2} /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {/* ═══ FULLSCREEN OVERLAY MENU ═══════════════════════════════════ */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 hidden flex-col"
        style={{ backgroundColor: overlayBg, willChange: 'opacity, transform' }}
      >
        {/* ── Noise texture overlay for depth ── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
            opacity: 0.6,
          }}
        />

        {/* ── Ambient glow top-right ── */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '380px', height: '380px', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 68%)',
        }} />

        {/* ── Ambient glow bottom-left ── */}
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: '-60px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 68%)',
        }} />

        {/* ── Scrollable body ── */}
        <div className="relative z-10 flex flex-col flex-1 overflow-y-auto px-7 pt-28 pb-8">

          {/* PRIMARY LINKS */}
          <nav
            ref={linksRef}
            className="flex flex-col"
            aria-label="Mobile navigation"
            style={{ gap: 0 }}
          >
            {primaryLinks.map((link) => (
              <MobileNavItem
                key={link.label}
                to={link.path}
                label={link.label}
                active={location.pathname === link.path}
              />
            ))}

            <div style={{
              height: '1px',
              background: 'rgba(255,255,255,0.12)',
              margin: '12px 0',
            }} />

            {secondaryLinks.map((link) => (
              <MobileNavItem
                key={link.label}
                to={link.path}
                label={link.label}
                active={location.pathname === link.path}
                secondary
              />
            ))}
          </nav>

          {/* CTA CARD */}
          <div ref={ctaRef} style={{ marginTop: '28px' }}>
            <Link
              to="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 22px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                textDecoration: 'none',
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.28)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
              }}
            >
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '3px' }}>
                  Members
                </p>
                <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  Sign in to your portal
                </p>
              </div>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ArrowUpRight size={17} color="white" strokeWidth={2.2} />
              </div>
            </Link>
          </div>

          {/* FOOTER META */}
          <div ref={metaRef} style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{
              color: 'rgba(255,255,255,0.22)',
              fontSize: '9px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}>
              Rotary Int'l · District 64 · BD
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {tenant.social?.facebook && (
                <SocialPill href={tenant.social.facebook} label="Facebook">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </SocialPill>
              )}
              {tenant.social?.instagram && (
                <SocialPill href={tenant.social.instagram} label="Instagram">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none" />
                  </svg>
                </SocialPill>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ═══ PAGE CONTENT ══════════════════════════════════════════════ */}
      <main className="flex-grow relative">
        <Outlet />
      </main>

      {/* ═══ FOOTER ════════════════════════════════════════════════════ */}
      <SiteFooter
        settings={settings}
        tenant={tenant}
        logoError={logoError}
        setLogoError={setLogoError}
        primaryColor={tenant.brand.accentColor}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE NAV ITEM
───────────────────────────────────────────────────────────────────────── */
function MobileNavItem({
  to, label, active, secondary = false,
}: {
  to: string; label: string; active: boolean; secondary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: secondary ? '11px 0' : '14px 0',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        textDecoration: 'none',
        transition: 'padding-left 0.22s ease',
        paddingLeft: hovered ? '6px' : '0',
      }}
    >
      <span style={{
        color: active
          ? '#fff'
          : hovered
            ? 'rgba(255,255,255,0.95)'
            : secondary
              ? 'rgba(255,255,255,0.55)'
              : 'rgba(255,255,255,0.88)',
        fontSize: secondary ? 'clamp(1.25rem, 5.5vw, 1.65rem)' : 'clamp(1.7rem, 7.5vw, 2.4rem)',
        fontWeight: secondary ? 600 : 700,
        letterSpacing: secondary ? '-0.01em' : '-0.025em',
        lineHeight: 1.15,
        fontFamily: 'var(--font-heading, inherit)',
        transition: 'color 0.18s ease',
      }}>
        {label}
      </span>

      {active ? (
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: '#fff', opacity: 0.9, flexShrink: 0,
        }} />
      ) : hovered ? (
        <span style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '1.1rem',
          flexShrink: 0,
          transition: 'opacity 0.18s',
        }}>
          →
        </span>
      ) : null}
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   CUSTOM HAMBURGER ICON
───────────────────────────────────────────────────────────────────────── */
function MenuIcon() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="1"  x2="22" y2="1"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4" y1="8"  x2="22" y2="8"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="15" x2="22" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SOCIAL PILL
───────────────────────────────────────────────────────────────────────── */
function SocialPill({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '32px', height: '32px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.2)',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
      }}
    >
      {children}
    </a>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SITE FOOTER
═══════════════════════════════════════════════════════════════════════════ */
interface FooterProps {
  settings:     any;
  tenant:       any;
  logoError:    boolean;
  setLogoError: (v: boolean) => void;
  primaryColor: string;
}

function SiteFooter({ settings, tenant, logoError, setLogoError, primaryColor }: FooterProps) {
  const clubName = settings.clubName || tenant.fullName;
  const year     = new Date().getFullYear();

  const exploreLinks = [
    { label: 'About Us',   path: '/about' },
    { label: 'Projects',   path: '/projects' },
    { label: 'Events',     path: '/events' },
    { label: 'News',       path: '/news' },
    { label: 'Leadership', path: '/board' },
  ];

  const involvedLinks = [
    { label: 'Join the Club', path: '/join' },
    { label: 'Sponsorship',   path: '/sponsorship' },
    { label: 'Donate',        path: '/donate' },
    { label: 'Contact Us',    path: '/contact' },
  ];

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      style={{ backgroundColor: primaryColor, color: '#fff', position: 'relative', overflow: 'hidden' }}
    >
      {/* Gradients & decorative elements */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.13) 100%)',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.22) 60%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      <div aria-hidden="true" style={{
        position: 'absolute', bottom: '-140px', right: '-140px',
        width: '420px', height: '420px', borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 60%)',
      }} />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pt-16 pb-12 md:pt-20 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-14 lg:gap-24">

          {/* Brand column */}
          <div className="flex flex-col gap-8">
            <Link to="/" aria-label={clubName}>
              {settings.logoUrl && !logoError ? (
                <div
                  role="img"
                  aria-label={clubName}
                  style={{
                    WebkitMaskImage: `url(${settings.logoUrl})`,
                    maskImage: `url(${settings.logoUrl})`,
                    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                    WebkitMaskSize: 'contain',     maskSize: 'contain',
                    WebkitMaskPosition: 'left center', maskPosition: 'left center',
                    backgroundColor: 'var(--color-primary)',
                    width: '200px', height: '62px',
                  }}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span style={{
                  fontFamily: '"Georgia", "Times New Roman", serif',
                  fontWeight: 800, fontSize: '1.75rem', color: '#fff',
                  letterSpacing: '-0.02em', lineHeight: 1.1,
                }}>
                  {tenant.shortName}
                </span>
              )}
            </Link>

            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.75, maxWidth: '300px' }}>
              A community of passionate young leaders dedicated to service, personal growth, and creating positive change.
            </p>

            <div className="flex items-center gap-2.5">
              <FooterSocialIcon href={tenant.social?.facebook} label="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </FooterSocialIcon>
              <FooterSocialIcon href={tenant.social?.instagram} label="Instagram">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none" />
                </svg>
              </FooterSocialIcon>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
            <NavColumn title="Explore">
              {exploreLinks.map(l => <FooterNavLink key={l.path} to={l.path}>{l.label}</FooterNavLink>)}
            </NavColumn>
            <NavColumn title="Get Involved">
              {involvedLinks.map(l => <FooterNavLink key={l.path} to={l.path}>{l.label}</FooterNavLink>)}
            </NavColumn>
            <div className="col-span-2 md:col-span-1">
              <NavColumn title="Contact">
                {settings.contactEmail && <ContactEmail address={settings.contactEmail} />}
                <ContactEmail address="support@racdlu.org" />
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', lineHeight: 1.6, marginTop: '4px' }}>
                  We typically respond within 24 hours.
                </p>
              </NavColumn>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div aria-hidden="true" className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', letterSpacing: '0.03em' }}>
            © {year} {clubName}. All rights reserved.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500 }}>
            Rotary International · District 64 · Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Footer sub-components ────────────────────────────────────────────── */

function FooterSocialIcon({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '38px', height: '38px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.22)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.4)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {children}
    </a>
  );
}

function NavColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 style={{
        color: 'rgba(255,255,255,0.95)', fontSize: '13px', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: '20px', paddingBottom: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
      }}>
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}

function FooterNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 450,
        lineHeight: 1.4, textDecoration: 'none',
        transition: 'color 0.15s, padding-left 0.15s', display: 'inline-block',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.95)';
        (e.currentTarget as HTMLElement).style.paddingLeft = '4px';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
        (e.currentTarget as HTMLElement).style.paddingLeft = '0';
      }}
    >
      {children}
    </Link>
  );
}

function ContactEmail({ address }: { address: string }) {
  return (
    <a
      href={`mailto:${address}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        color: 'rgba(255,255,255,0.6)', fontSize: '13.5px', fontWeight: 450,
        textDecoration: 'none', wordBreak: 'break-all', transition: 'color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.95)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.7 }} aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      {address}
    </a>
  );
}
