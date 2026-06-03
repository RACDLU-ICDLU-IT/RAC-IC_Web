import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import { useTenant } from '../../hooks/useTenant';
import { Menu, X } from 'lucide-react';

export default function MainLayout() {
  const { settings, tenant } = useTenant();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setLogoError(false);
  }, [settings.logoUrl]);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const onPrimaryBorder = isLight ? 'border-gray-200' : 'border-white/10';

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
      gsap.to(overlayRef.current, { clipPath: 'circle(150% at 100% 0%)', duration: 0.8, ease: 'power4.inOut', display: 'flex' });
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
        duration: 0.8,
        ease: 'power4.inOut',
        onComplete: () => { if (overlayRef.current) overlayRef.current.style.display = 'none'; }
      });
    }
  }, [menuOpen]);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Projects', path: '/projects' },
    { label: 'Events', path: '/events' },
    { label: 'News', path: '/news' },
    { label: 'Board', path: '/board' },
    { label: 'Join', path: '/join' },
    { label: 'Sponsors', path: '/sponsorship' },
  ];

  const navTextClass = scrolled
    ? (isLight ? 'text-gray-700 hover:text-[var(--color-accent)]' : 'text-white hover:text-[var(--color-accent)]')
    : 'text-white hover:text-white/70';

  const loginBtnClass = scrolled && isLight
    ? `border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white`
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
                scrolled ? 'w-[54px] h-[54px] md:w-[60px] md:h-[60px]' : 'w-[68px] h-[68px] md:w-[76px] md:h-[76px]'
              }`}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span
              className={`font-heading font-extrabold tracking-tight transition-all duration-300 ${
                scrolled
                  ? (isLight ? 'text-[var(--color-accent)] text-2xl' : 'text-white text-2xl')
                  : 'text-white text-2xl'
              }`}
            >
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

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════ */}
      <SiteFooter
        settings={settings}
        tenant={tenant}
        logoError={logoError}
        setLogoError={setLogoError}
        isLight={isLight}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SITE FOOTER — World-class, production-grade
   Architecture: dark-tinted base → editorial headline → nav grid → bottom bar
═══════════════════════════════════════════════════════════════════════════ */
interface FooterProps {
  settings: any;
  tenant: any;
  logoError: boolean;
  setLogoError: (v: boolean) => void;
  isLight: boolean;
}

function SiteFooter({ settings, tenant, logoError, setLogoError, isLight }: FooterProps) {
  const clubName = settings.clubName || tenant.fullName;
  const year = new Date().getFullYear();

  const exploreLinks = [
    { label: 'About Us',     path: '/about' },
    { label: 'Projects',     path: '/projects' },
    { label: 'Events',       path: '/events' },
    { label: 'News',         path: '/news' },
    { label: 'Leadership',   path: '/board' },
  ];

  const involvedLinks = [
    { label: 'Join the Club',  path: '/join' },
    { label: 'Sponsorship',    path: '/sponsorship' },
    { label: 'Contact Us',     path: '/contact' },
  ];

  return (
    <footer
      role="contentinfo"
      aria-label="Site footer"
      style={{
        position: 'relative',
        overflow: 'hidden',
        /* Dark-tinted version of brand color for depth + professionalism */
        background: isLight
          ? 'linear-gradient(160deg, #0f0f0f 0%, #1a1a1a 100%)'
          : 'linear-gradient(160deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.72) 100%)',
        backgroundColor: isLight ? '#111' : 'var(--color-primary)',
      }}
    >
      {/* ── Noise texture overlay for depth ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '128px 128px', opacity: 0.6,
        }}
      />

      {/* ── Brand color accent glow (top edge) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: isLight
            ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)'
            : `linear-gradient(90deg, transparent 0%, var(--color-primary) 35%, var(--color-accent) 50%, var(--color-primary) 65%, transparent 100%)`,
          opacity: 0.6,
        }}
      />

      {/* ── Ambient radial glow bottom-right ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '-200px', right: '-200px',
          width: '600px', height: '600px', borderRadius: '50%', pointerEvents: 'none',
          background: isLight
            ? 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)'
            : 'radial-gradient(circle, rgba(var(--color-accent-rgb, 255,20,147),0.08) 0%, transparent 65%)',
        }}
      />

      {/* ═══════════════════════════════════════════════════════
          UPPER SECTION: Logo + Headline + Nav columns
      ═══════════════════════════════════════════════════════ */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pt-16 md:pt-20 pb-12 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-14 lg:gap-20">

          {/* LEFT: Brand identity */}
          <div className="flex flex-col gap-7 max-w-sm">

            {/* Logo */}
            <div>
              {settings.logoUrl && !logoError ? (
                <img
                  src={settings.logoUrl}
                  alt={clubName}
                  className="h-11 w-auto object-contain object-left"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-heading font-extrabold text-xl text-white tracking-tight">
                  {tenant.shortName}
                </span>
              )}
            </div>

            {/* Club name — editorial scale */}
            <div>
              <p className="text-white/35 text-[9px] tracking-[0.28em] uppercase font-semibold mb-2 flex items-center gap-2">
                <span aria-hidden="true" className="block w-4 h-px bg-white/25" />
                Rotary International · District 64
              </p>
              <h2 className="font-heading font-extrabold text-white text-2xl md:text-3xl leading-tight tracking-tight">
                {clubName}
              </h2>
            </div>

            {/* Tagline */}
            <p className="text-white/40 text-sm leading-relaxed">
              Young leaders united by service,<br />
              driven by impact.
            </p>

            {/* Social row */}
            <div className="flex items-center gap-2">
              <SocialLink href={tenant.social?.facebook} label="Facebook">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </SocialLink>
              <SocialLink href={tenant.social?.instagram} label="Instagram">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none" />
                </svg>
              </SocialLink>
              {settings.contactEmail && (
                <SocialLink href={`mailto:${settings.contactEmail}`} label="Email">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </SocialLink>
              )}
            </div>
          </div>

          {/* RIGHT: Nav columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-10 lg:gap-x-16">

            <FooterCol title="Explore">
              {exploreLinks.map(l => <FooterLink key={l.path} to={l.path}>{l.label}</FooterLink>)}
            </FooterCol>

            <FooterCol title="Get Involved">
              {involvedLinks.map(l => <FooterLink key={l.path} to={l.path}>{l.label}</FooterLink>)}
            </FooterCol>

            {/* Contact column */}
            <div className="col-span-2 sm:col-span-1">
              <FooterCol title="Contact">
                {settings.contactEmail && (
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="group inline-flex items-center gap-2 text-white/45 hover:text-white/90 text-sm transition-colors duration-200 break-all"
                    aria-label={`Email ${settings.contactEmail}`}
                  >
                    <svg
                      className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {settings.contactEmail}
                  </a>
                )}
                <p className="text-white/25 text-xs leading-relaxed mt-1.5">
                  We respond within 24&nbsp;hours.
                </p>
              </FooterCol>
            </div>

          </div>
        </div>
      </div>

      {/* ── Separator ── */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20" aria-hidden="true">
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent 100%)',
        }} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          BOTTOM BAR
      ═══════════════════════════════════════════════════════ */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-5">
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">

          {/* Left — copyright */}
          <p className="text-white/22 text-[11px] tracking-wide">
            © {year} {clubName}. All rights reserved.
          </p>

          {/* Right — district badge */}
          <div className="flex items-center gap-3">
            {/* Rotary gear icon */}
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="1.4" strokeLinecap="round"
              className="opacity-[0.18] shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
            <span className="text-white/20 text-[10px] tracking-[0.2em] uppercase font-medium">
              Rotary International · District 64 · Bangladesh
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Helper components
───────────────────────────────────────────────────────────────────────── */
function SocialLink({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/[0.06] hover:bg-white/15 hover:border-white/25 transition-all duration-200 hover:-translate-y-px"
    >
      {children}
    </a>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-white/30 font-bold text-[9px] uppercase tracking-[0.3em] mb-5">
        {title}
      </h4>
      <div className="flex flex-col gap-3.5">
        {children}
      </div>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-white/55 hover:text-white/95 text-[13px] font-medium leading-snug transition-colors duration-150"
    >
      {children}
    </Link>
  );
}
