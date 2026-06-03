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
  const footerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => { setLogoError(false); }, [settings.logoUrl]);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const onPrimaryBorder = isLight ? 'border-gray-200' : 'border-white/10';
  const isHomeOrAbout = location.pathname === '/' || location.pathname === '/about' || location.pathname === '/join';

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
        clipPath: 'circle(150% at 95% 5%)',
        duration: 0.85, ease: 'power4.inOut', display: 'flex',
      });
      if (linksRef.current) {
        gsap.fromTo(
          linksRef.current.children,
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, stagger: 0.07, delay: 0.35, ease: 'power3.out' }
        );
      }
      if (footerRef.current) {
        gsap.fromTo(
          footerRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, delay: 0.75, ease: 'power3.out' }
        );
      }
    } else {
      document.body.style.overflow = '';
      gsap.to(overlayRef.current, {
        clipPath: 'circle(0% at 95% 5%)',
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
    { label: 'Donate',   path: '/donate' },
  ];

  const navTextClass = scrolled
    ? (isLight
        ? 'text-gray-700 hover:text-[var(--color-accent)]'
        : 'text-white hover:text-[var(--color-accent)]')
    : 'text-white hover:text-white/70';

  const loginBtnClass = scrolled && isLight
    ? 'border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white'
    : 'border border-white/30 text-white hover:border-white hover:bg-white/10';

  // When menu is open → always white. Otherwise follow page/scroll logic.
  const hamburgerClass = menuOpen
    ? 'text-white'
    : (!isHomeOrAbout || (scrolled && isLight)) ? 'text-gray-800' : 'text-white';

  // Logo color: white when menu open, else page/scroll logic
  const logoColor = menuOpen
    ? '#ffffff'
    : (!isHomeOrAbout || (scrolled && isLight))
      ? 'var(--color-accent)'
      : '#ffffff';

  return (
    <div className="flex flex-col min-h-screen">

      {/* ─── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav
        className={`fixed w-full z-50 transition-all duration-500 flex items-center justify-between px-5 md:px-10 lg:px-16 ${
          scrolled && !menuOpen
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
            <div
              role="img"
              aria-label={settings.clubName || tenant.shortName}
              style={{
                WebkitMaskImage: `url(${settings.logoUrl})`,
                maskImage: `url(${settings.logoUrl})`,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                backgroundColor: logoColor,
                transition: 'background-color 0.4s ease, width 0.5s ease, height 0.5s ease',
                width:  (scrolled && !menuOpen) ? '120px' : '132px',
                height: (scrolled && !menuOpen) ? '38px'  : '40px',
                flexShrink: 0,
              }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className={`font-heading font-extrabold tracking-tight transition-all duration-300 ${
              menuOpen
                ? 'text-white text-2xl'
                : scrolled
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
        className="fixed inset-0 z-40 hidden flex-col"
        style={{
          clipPath: 'circle(0% at 95% 5%)',
          backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)',
        }}
      >
        {/* Subtle decorative rings — top-right origin matches clip-path origin */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-15vw', right: '-15vw',
          width: '70vw', height: '70vw', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', top: '-28vw', right: '-28vw',
          width: '90vw', height: '90vw', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none',
        }} />
        {/* Bottom-left accent glow */}
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: '-10vw', left: '-10vw',
          width: '55vw', height: '55vw', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)',
        }} />

        {/* ── Scrollable inner container ── */}
        <div className="flex flex-col flex-1 overflow-y-auto px-8 pt-[100px] pb-10">

          {/* ── Nav links ── */}
          <nav ref={linksRef} className="flex flex-col" aria-label="Mobile navigation">
            {navLinks.map((link, i) => (
              <Link
                key={link.label}
                to={link.path}
                className="group flex items-baseline gap-4 py-3 border-b border-white/10 last:border-0"
                style={{ textDecoration: 'none' }}
              >
                {/* Index number */}
                <span style={{
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '20px',
                  transition: 'color 0.2s',
                }}
                  className="group-hover:!text-white/50"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Label */}
                <span style={{
                  color: 'rgba(255,255,255,0.92)',
                  fontSize: 'clamp(2rem, 9vw, 3.2rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  fontFamily: 'var(--font-heading, inherit)',
                  transition: 'opacity 0.2s, transform 0.2s',
                  display: 'inline-block',
                }}
                  className="group-hover:opacity-60 group-hover:translate-x-1"
                >
                  {link.label}
                </span>

                {/* Arrow — appears on hover */}
                <span style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '1.2rem',
                  marginLeft: 'auto',
                  opacity: 0,
                  transform: 'translateX(-6px)',
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                  className="group-hover:!opacity-100 group-hover:!translate-x-0"
                >
                  →
                </span>
              </Link>
            ))}
          </nav>

          {/* ── Footer strip ── */}
          <div
            ref={footerRef}
            className="mt-auto pt-8 flex flex-col gap-5"
            style={{ opacity: 0 }}
          >
            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)' }} />

            <div className="flex items-center justify-between">
              <Link
                to="/login"
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.6'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.3)',
                  fontSize: '13px',
                }}>→</span>
                Member Login
              </Link>

              {/* Social icons */}
              <div className="flex items-center gap-2">
                {tenant.social?.facebook && (
                  <a href={tenant.social.facebook} target="_blank" rel="noopener noreferrer"
                    aria-label="Facebook"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '34px', height: '34px', borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white', transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                  </a>
                )}
                {tenant.social?.instagram && (
                  <a href={tenant.social.instagram} target="_blank" rel="noopener noreferrer"
                    aria-label="Instagram"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '34px', height: '34px', borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white', transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            {/* District tag */}
            <p style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '9px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}>
              Rotary International · District 64 · Bangladesh
            </p>
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

          <div className="flex flex-col gap-8">
            <Link to="/" aria-label={clubName}>
              {settings.logoUrl && !logoError ? (
                <div
                  role="img"
                  aria-label={clubName}
                  style={{
                    WebkitMaskImage: `url(${settings.logoUrl})`,
                    maskImage: `url(${settings.logoUrl})`,
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskPosition: 'left center',
                    maskPosition: 'left center',
                    backgroundColor: 'var(--color-primary)',
                    width: '200px',
                    height: '62px',
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

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
            <NavColumn title="Explore">
              {exploreLinks.map(l => <NavLink key={l.path} to={l.path}>{l.label}</NavLink>)}
            </NavColumn>
            <NavColumn title="Get Involved">
              {involvedLinks.map(l => <NavLink key={l.path} to={l.path}>{l.label}</NavLink>)}
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

/* ─── Sub-components ──────────────────────────────────────────────────── */

function SocialIcon({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
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

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
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
