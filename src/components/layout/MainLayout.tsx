import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import { useTenant } from '../../hooks/useTenant';
import { Menu, X } from 'lucide-react';

/* ─── Utility: convert a hex color to its HSL hue angle (0-360) ─────────── */
function hexToHue(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return Math.round(h * 360);
}

export default function MainLayout() {
  const { settings, tenant } = useTenant();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => { setLogoError(false); }, [settings.logoUrl]);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const onPrimaryBorder = isLight ? 'border-gray-200' : 'border-white/10';

  // Hue angle derived from accent hex — used to CSS-filter the white logo to accent color
  const accentHue = hexToHue(tenant.brand.accentColor ?? '#000000');

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
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      gsap.to(overlayRef.current, {
        clipPath: 'circle(150% at 100% 0%)',
        duration: 0.8, ease: 'power4.inOut', display: 'flex',
      });
      if (linksRef.current) {
        gsap.fromTo(linksRef.current.children,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, delay: 0.3, ease: 'power3.out' }
        );
      }
    } else {
      document.body.style.overflow = '';
      gsap.to(overlayRef.current, {
        clipPath: 'circle(0% at 100% 0%)',
        duration: 0.8, ease: 'power4.inOut',
        onComplete: () => { if (overlayRef.current) overlayRef.current.style.display = 'none'; },
      });
    }
  }, [menuOpen]);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const navLinks = [
    { label: 'Home',     path: '/' },
    { label: 'About',    path: '/about' },
    { label: 'Projects', path: '/projects' },
    { label: 'Events',   path: '/events' },
    { label: 'News',     path: '/news' },
    { label: 'Board',    path: '/board' },
    { label: 'Join',     path: '/join' },
    { label: 'Sponsors', path: '/sponsorship' },
  ];

  const navTextClass = scrolled
    ? (isLight
        ? 'text-gray-700 hover:text-[var(--color-accent)]'
        : 'text-white hover:text-[var(--color-accent)]')
    : 'text-white hover:text-white/70';

  const loginBtnClass = scrolled && isLight
    ? 'border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white'
    : 'border border-white/30 text-white hover:border-white hover:bg-white/10';

  const hamburgerClass = scrolled && isLight ? 'text-gray-800' : 'text-white';

  return (
    <div className="flex flex-col min-h-screen">

      {/* ─── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav
        className={`fixed w-full z-50 transition-all duration-500 flex items-center justify-between px-5 md:px-10 lg:px-16 ${
          scrolled
            ? `h-[72px] bg-[var(--color-primary)]/95 backdrop-blur-xl shadow-[0_2px_32px_rgba(0,0,0,0.10)] border-b ${onPrimaryBorder}`
            : 'h-[88px] bg-transparent'
        }`}
      >
        <Link
          to="/"
          className="relative z-50 flex items-center shrink-0 group"
          aria-label={settings.clubName || tenant.fullName}
        >
          {settings.logoUrl && !logoError ? (
            <img
              src={settings.logoUrl}
              alt={settings.clubName || tenant.shortName}
              className={`object-contain transition-all duration-500 ${
                scrolled
                  ? 'w-[54px] h-[54px] md:w-[60px] md:h-[60px]'
                  : 'w-[68px] h-[68px] md:w-[76px] md:h-[76px]'
              }`}
              style={{
                // When scrolled on a light-primary navbar, recolor the white logo
                // to the accent color using CSS filter chain:
                // brightness(0) → turns everything black
                // invert(1)     → turns black to white (clean base)
                // Then sepia+saturate+hue-rotate paints it the accent hue.
                // We use a strong saturate so the accent color comes through vividly.
                // On dark/colored navbars (unscrolled), no filter — logo stays white.
                filter: scrolled && isLight
                  ? `brightness(0) invert(1) sepia(1) saturate(10) hue-rotate(${accentHue}deg)`
                  : 'none',
                transition: 'filter 0.5s ease, width 0.5s ease, height 0.5s ease',
              }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className={`font-heading font-extrabold tracking-tight transition-all duration-300 ${
              scrolled
                ? (isLight ? 'text-[var(--color-accent)] text-2xl' : 'text-white text-2xl')
                : 'text-white text-2xl'
            }`}>
              {tenant.shortName}
            </span>
          )}
        </Link>

        <div className="hidden lg:flex items-center gap-1 xl:gap-2 justify-center flex-1 mx-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className={`relative px-3 py-1.5 font-semibold text-[11px] xl:text-xs tracking-widest uppercase transition-colors duration-200 shrink-0 whitespace-nowrap after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-[1.5px] after:bg-current after:transition-all after:duration-300 hover:after:w-4/5 ${navTextClass}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 relative z-50">
          <Link
            to="/login"
            className={`hidden md:inline-flex items-center px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105 ${loginBtnClass}`}
          >
            Member Login
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`lg:hidden p-2 rounded-full transition-all duration-200 hover:bg-white/10 ${hamburgerClass}`}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={26} strokeWidth={2.5} /> : <Menu size={26} strokeWidth={2.5} />}
          </button>
        </div>
      </nav>

      {/* ─── FULLSCREEN MENU OVERLAY ────────────────────────────────────── */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 hidden flex-col items-center justify-center"
        style={{
          clipPath: 'circle(0% at 100% 0%)',
          backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)',
        }}
      >
        <div className="absolute top-[-20vw] right-[-20vw] w-[80vw] h-[80vw] rounded-full border border-white/10 pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-[-25vw] left-[-25vw] w-[70vw] h-[70vw] rounded-full border border-white/10 pointer-events-none" aria-hidden="true" />
        <div ref={linksRef} className="flex flex-col items-center gap-5 md:gap-7 px-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className="text-[2.6rem] md:text-6xl font-heading font-extrabold text-white hover:opacity-60 transition-opacity duration-200 tracking-tight leading-none"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-8 pt-8 border-t border-white/20 w-full text-center flex flex-col items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-white font-bold text-sm hover:opacity-60 transition-opacity uppercase tracking-[0.25em]"
            >
              Member Login
            </Link>
          </div>
        </div>
      </div>

      {/* ─── PAGE CONTENT ───────────────────────────────────────────────── */}
      <main className="flex-grow relative">
        <Outlet />
      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
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

/* ═══════════════════════════════════════════════════════════════════════════
   SITE FOOTER
   Background = tenant.brand.primaryColor directly (the real hex).
   No overlays, no dark vignettes — pure brand color, white text on top.
═══════════════════════════════════════════════════════════════════════════ */
interface FooterProps {
  settings:     any;
  tenant:       any;
  logoError:    boolean;
  setLogoError: (v: boolean) => void;
  primaryColor: string; // tenant.brand.accentColor — e.g. "#E2006A" (magenta) or "#1D4ED8" (blue)
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
    { label: 'Contact Us',    path: '/contact' },
  ];

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      style={{ backgroundColor: primaryColor, color: '#fff', position: 'relative', overflow: 'hidden' }}
    >

      {/* ── Overlay 1: very faint bottom-half darkening for text contrast
              Starts transparent at 35% from top, fades to 0.13 black at bottom.
              Logo sits in the top zone — completely untouched. ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.13) 100%)',
        }}
      />

      {/* ── Overlay 2: top-edge white shimmer line — 1px, purely decorative ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 40%, rgba(255,255,255,0.22) 60%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Overlay 3: bottom-right radial white glow — adds warmth/depth ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '-140px', right: '-140px',
          width: '420px', height: '420px', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 60%)',
        }}
      />

      {/* ══════════════════════════════════════════════════════════════
          MAIN BODY — logo + tagline left / nav columns right
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pt-16 pb-12 md:pt-20 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-14 lg:gap-24">

          {/* ── LEFT: Brand block ────────────────────────────────── */}
          <div className="flex flex-col gap-8">

            {/* Logo — hero size */}
            <Link to="/" aria-label={clubName}>
              {settings.logoUrl && !logoError ? (
                <img
                  src={settings.logoUrl}
                  alt={clubName}
                  className="h-20 md:h-24 w-auto object-contain object-left"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span
                  style={{
                    fontFamily: '"Georgia", "Times New Roman", serif',
                    fontWeight: 800,
                    fontSize: '1.75rem',
                    color: '#fff',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                  }}
                >
                  {tenant.shortName}
                </span>
              )}
            </Link>

            {/* Tagline */}
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.75, maxWidth: '300px' }}>
              A community of passionate young leaders dedicated to service, personal growth, and creating positive change.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2.5">
              <SocialIcon href={tenant.social?.facebook} label="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </SocialIcon>
              <SocialIcon href={tenant.social?.instagram} label="Instagram">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none" />
                </svg>
              </SocialIcon>
            </div>

          </div>

          {/* ── RIGHT: Nav columns ───────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">

            {/* Explore */}
            <NavColumn title="Explore">
              {exploreLinks.map(l => <NavLink key={l.path} to={l.path}>{l.label}</NavLink>)}
            </NavColumn>

            {/* Get Involved */}
            <NavColumn title="Get Involved">
              {involvedLinks.map(l => <NavLink key={l.path} to={l.path}>{l.label}</NavLink>)}
            </NavColumn>

            {/* Contact */}
            <div className="col-span-2 md:col-span-1">
              <NavColumn title="Contact">
                {settings.contactEmail && (
                  <ContactEmail address={settings.contactEmail} />
                )}
                {/* Hard-coded support email as instructed */}
                <ContactEmail address="support@racdlu.org" />
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', lineHeight: 1.6, marginTop: '4px' }}>
                  We typically respond within 24 hours.
                </p>
              </NavColumn>
            </div>

          </div>
        </div>
      </div>

      {/* ── Full-width separator ── */}
      <div
        aria-hidden="true"
        className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20"
      >
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BOTTOM BAR
      ══════════════════════════════════════════════════════════════ */}
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

/* ─────────────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────────────── */

function SocialIcon({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
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
      {/* Column heading — clear, confident, not whisper-small */}
      <h4
        style={{
          color: 'rgba(255,255,255,0.95)',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '20px',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {title}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        color: 'rgba(255,255,255,0.6)',
        fontSize: '14px',
        fontWeight: 450,
        lineHeight: 1.4,
        textDecoration: 'none',
        transition: 'color 0.15s, padding-left 0.15s',
        display: 'inline-block',
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
        color: 'rgba(255,255,255,0.6)',
        fontSize: '13.5px',
        fontWeight: 450,
        textDecoration: 'none',
        wordBreak: 'break-all',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.95)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
    >
      {/* Mail icon */}
      <svg
        width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.7 }}
        aria-hidden="true"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      {address}
    </a>
  );
}
