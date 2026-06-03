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
        {/* Logo only — no text */}
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
            /* Fallback monogram if logo fails */
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

        {/* Desktop Links — centred */}
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

        {/* Right Side */}
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
        {/* Subtle decorative ring */}
        <div
          className="absolute top-[-20vw] right-[-20vw] w-[80vw] h-[80vw] rounded-full border border-white/10 pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[-25vw] left-[-25vw] w-[70vw] h-[70vw] rounded-full border border-white/10 pointer-events-none"
          aria-hidden="true"
        />

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
      <footer
        style={{
          backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Decorative ambient circles (depth / texture) ── */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-120px', right: '-120px',
          width: '480px', height: '480px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.07)', pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '280px', height: '280px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: '60px', left: '-100px',
          width: '320px', height: '320px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />

        {/* ══════════════════════════════════════════════════
            HERO BAND — big club name + tagline + CTA
        ══════════════════════════════════════════════════ */}
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-16 pt-16 pb-12 border-b border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            {/* Left — logo + headline */}
            <div className="flex flex-col gap-5">
              {settings.logoUrl && !logoError ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.clubName || tenant.shortName}
                  className="h-14 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-heading font-extrabold text-3xl text-white">
                  {tenant.shortName}
                </span>
              )}
              <div>
                <h2 className="font-heading font-extrabold text-3xl md:text-4xl lg:text-5xl text-white leading-tight tracking-tight">
                  {settings.clubName || tenant.fullName}
                </h2>
                <p className="text-white/50 text-sm mt-2 tracking-widest uppercase font-medium">
                  Rotary International · District 64 · Bangladesh
                </p>
              </div>
            </div>

            {/* Right — tagline + social + CTA */}
            <div className="flex flex-col gap-6 lg:items-end lg:text-right max-w-sm">
              <p className="text-white/65 text-base leading-relaxed">
                A community of passionate young leaders dedicated to service, personal growth, and creating positive change.
              </p>
              {/* Social icons */}
              <div className="flex gap-3 lg:justify-end">
                <SocialLink href={tenant.social?.facebook} aria="Facebook">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </SocialLink>
                <SocialLink href={tenant.social?.instagram} aria="Instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none" />
                  </svg>
                </SocialLink>
              </div>
              {/* Join CTA */}
              <Link
                to="/join"
                className="inline-flex items-center gap-2.5 bg-white text-[var(--color-accent)] font-extrabold text-xs uppercase tracking-widest px-7 py-3.5 rounded-full hover:bg-white/90 transition-all duration-300 hover:scale-105 shadow-lg shadow-black/10 self-start lg:self-auto"
              >
                Join the Club
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            LINK GRID — 3 columns
        ══════════════════════════════════════════════════ */}
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10">

            {/* Explore */}
            <FooterCol title="Explore">
              <FooterLink to="/projects">Projects</FooterLink>
              <FooterLink to="/events">Events</FooterLink>
              <FooterLink to="/news">News</FooterLink>
              <FooterLink to="/board">Leadership</FooterLink>
              <FooterLink to="/about">About Us</FooterLink>
            </FooterCol>

            {/* Connect */}
            <FooterCol title="Connect">
              <FooterLink to="/contact">Contact Us</FooterLink>
              <FooterLink to="/join">Join the Club</FooterLink>
              <FooterLink to="/sponsorship">Sponsorship</FooterLink>
              {settings.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="text-white/55 hover:text-white transition-colors duration-200 text-sm break-all"
                >
                  {settings.contactEmail}
                </a>
              )}
            </FooterCol>

            {/* Members */}
            <div className="col-span-2 md:col-span-1">
              <FooterCol title="Members">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 border border-white/30 hover:border-white/70 hover:bg-white/10 transition-all duration-300 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-full w-fit"
                >
                  Member Login
                </Link>
                <p className="text-white/40 text-xs leading-relaxed mt-1 max-w-[200px]">
                  Access your member dashboard, resources, and club tools.
                </p>
              </FooterCol>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            BOTTOM BAR
        ══════════════════════════════════════════════════ */}
        <div className="relative border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/30 text-xs tracking-wide text-center sm:text-left">
              © {new Date().getFullYear()} {settings.clubName || tenant.fullName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
              <p className="text-white/25 text-xs tracking-wide text-center">
                Rotary International District 64 · Bangladesh
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Small helper components ──────────────────────────────────────────── */

function SocialLink({ href, aria, children }: { href?: string; aria: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={aria}
      className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 bg-white/10 hover:bg-white/25 hover:border-white/40 transition-all duration-200 hover:-translate-y-0.5"
    >
      {children}
    </a>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em] mb-6">{title}</h4>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-white/60 hover:text-white transition-colors duration-200 text-sm"
    >
      {children}
    </Link>
  );
}
