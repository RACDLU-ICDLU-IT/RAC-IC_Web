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

  // Footer background color token
  const footerBg = isLight ? 'var(--color-accent)' : 'var(--color-primary)';

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

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER — World-class, production-grade redesign
      ═══════════════════════════════════════════════════════════════════ */}
      <footer
        style={{ backgroundColor: footerBg, color: 'white', position: 'relative', overflow: 'hidden' }}
        role="contentinfo"
        aria-label="Site footer"
      >
        {/* ── Layered ambient background texture ── */}
        <FooterAmbience />

        {/* ══ SECTION 1: Brand statement ═════════════════════════════════ */}
        <div className="relative">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pt-20 pb-16">
            <div className="flex flex-col lg:flex-row lg:items-start gap-12 lg:gap-0">

              {/* LEFT — Identity block */}
              <div className="flex flex-col gap-6 lg:w-[46%] lg:pr-16">
                {/* Logo / monogram */}
                {settings.logoUrl && !logoError ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.clubName || tenant.shortName}
                    className="h-12 w-auto object-contain object-left"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="font-heading font-extrabold text-2xl text-white tracking-tight">
                    {tenant.shortName}
                  </span>
                )}

                {/* Club name headline */}
                <div>
                  <h2 className="font-heading font-extrabold text-3xl md:text-4xl xl:text-[2.6rem] text-white leading-[1.1] tracking-tight">
                    {settings.clubName || tenant.fullName}
                  </h2>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="block w-5 h-[1.5px] bg-white/30 rounded-full" />
                    <p className="text-white/45 text-[10px] tracking-[0.22em] uppercase font-semibold">
                      Rotary International · District 64 · Bangladesh
                    </p>
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-white/55 text-[15px] leading-[1.75] max-w-[340px]">
                  A community of passionate young leaders dedicated to service, personal growth, and creating lasting positive change.
                </p>

                {/* Social icons */}
                <div className="flex items-center gap-2.5 mt-1">
                  <SocialLink href={tenant.social?.facebook} aria="Facebook">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </SocialLink>
                  <SocialLink href={tenant.social?.instagram} aria="Instagram">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none" />
                    </svg>
                  </SocialLink>
                </div>
              </div>

              {/* RIGHT — Navigation grid */}
              <div className="lg:w-[54%] lg:border-l lg:border-white/[0.08] lg:pl-16">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-10">

                  <FooterCol title="Explore">
                    <FooterLink to="/projects">Projects</FooterLink>
                    <FooterLink to="/events">Events</FooterLink>
                    <FooterLink to="/news">News & Updates</FooterLink>
                    <FooterLink to="/board">Leadership</FooterLink>
                    <FooterLink to="/about">About Us</FooterLink>
                  </FooterCol>

                  <FooterCol title="Get Involved">
                    <FooterLink to="/join">Join the Club</FooterLink>
                    <FooterLink to="/sponsorship">Sponsorship</FooterLink>
                    <FooterLink to="/contact">Contact Us</FooterLink>
                  </FooterCol>

                  <FooterCol title="Get in Touch">
                    {settings.contactEmail && (
                      <a
                        href={`mailto:${settings.contactEmail}`}
                        className="group inline-flex items-start gap-2 text-white/55 hover:text-white transition-colors duration-200 text-sm leading-snug break-all"
                        aria-label={`Email us at ${settings.contactEmail}`}
                      >
                        <svg
                          className="mt-0.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                          width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <rect x="2" y="4" width="20" height="16" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        {settings.contactEmail}
                      </a>
                    )}
                    <p className="text-white/35 text-xs leading-relaxed mt-1">
                      We typically respond within 24 hours.
                    </p>
                  </FooterCol>

                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ══ DIVIDER ═════════════════════════════════════════════════════ */}
        <div
          className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20"
          aria-hidden="true"
        >
          <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>

        {/* ══ SECTION 2: Bottom bar ═══════════════════════════════════════ */}
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            {/* Copyright */}
            <p className="text-white/28 text-[11px] tracking-wide">
              © {new Date().getFullYear()} {settings.clubName || tenant.fullName}. All rights reserved.
            </p>

            {/* Centre badge */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Rotary wheel mark */}
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="1.5" strokeLinecap="round"
                className="opacity-25"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="8" />
                <line x1="12" y1="16" x2="12" y2="22" />
                <line x1="2" y1="12" x2="8" y2="12" />
                <line x1="16" y1="12" x2="22" y2="12" />
              </svg>
              <span className="text-white/22 text-[10px] tracking-[0.18em] uppercase font-medium">
                Rotary International District 64
              </span>
            </div>

            {/* Right — minimal nav echo */}
            <nav aria-label="Footer quick links" className="flex items-center gap-5">
              {[
                { label: 'About', path: '/about' },
                { label: 'Projects', path: '/projects' },
                { label: 'Contact', path: '/contact' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-white/28 hover:text-white/70 text-[11px] tracking-wide transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Footer ambient background — purely decorative, aria-hidden
───────────────────────────────────────────────────────────────────────── */
function FooterAmbience() {
  return (
    <div aria-hidden="true" className="pointer-events-none select-none">
      {/* Large halo — top-right */}
      <div style={{
        position: 'absolute', top: '-140px', right: '-140px',
        width: '520px', height: '520px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
      }} />
      {/* Stroke ring — top-right */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.06)',
      }} />
      <div style={{
        position: 'absolute', top: '-50px', right: '-50px',
        width: '220px', height: '220px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.04)',
      }} />
      {/* Large halo — bottom-left */}
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-120px',
        width: '440px', height: '440px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', left: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.05)',
      }} />
      {/* Subtle top-edge glow line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.12) 60%, transparent 100%)',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Helper components
───────────────────────────────────────────────────────────────────────── */
function SocialLink({ href, aria, children }: { href?: string; aria: string; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={aria}
      className="w-9 h-9 rounded-full flex items-center justify-center border border-white/15 bg-white/[0.07] hover:bg-white/20 hover:border-white/35 transition-all duration-200 hover:-translate-y-0.5"
    >
      {children}
    </a>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-white/90 font-bold text-[10px] uppercase tracking-[0.22em] mb-5 flex items-center gap-2">
        <span className="block w-3 h-[1.5px] bg-white/30 rounded-full" aria-hidden="true" />
        {title}
      </h4>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-white/50 hover:text-white text-sm leading-snug transition-colors duration-200 hover:translate-x-0.5 inline-block"
      style={{ transitionProperty: 'color, transform' }}
    >
      {children}
    </Link>
  );
}
