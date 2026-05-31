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

  // RACDLU has white primary — derive text colors from brand config
  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const onPrimaryText   = isLight ? 'text-[var(--color-accent)]' : 'text-white';
  const onPrimaryMuted  = isLight ? 'text-gray-500' : 'text-gray-400';
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

  // Navbar text: always white when NOT scrolled (hero behind it is always dark/pink).
  // When scrolled: bg becomes var(--color-primary), so text must adapt.
  const navTextClass = scrolled
    ? (isLight ? 'text-gray-800 hover:text-[var(--color-accent)]' : 'text-white hover:text-[var(--color-accent)]')
    : 'text-white hover:text-[var(--color-accent)]';

  const loginBtnClass = scrolled && isLight
    ? `border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white`
    : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white';

  const hamburgerClass = scrolled && isLight ? 'text-gray-800' : 'text-white';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-500 flex items-center justify-between px-6 md:px-12 h-[85px] ${
        scrolled ? 'bg-[var(--color-primary)]/90 backdrop-blur-md border-b shadow-lg ' + onPrimaryBorder : 'bg-transparent'
      }`}>
        <Link to="/" className="relative z-50 flex items-center gap-3 shrink-0 group max-w-[40%] md:max-w-[50%]">
          {settings.logoUrl && !logoError && (
            <img 
              src={settings.logoUrl} 
              alt={settings.clubName || tenant.shortName} 
              className="w-[50px] h-[50px] md:w-[65px] md:h-[65px] object-contain shrink-0" 
              onError={() => setLogoError(true)} 
            />
          )}
          <span className={`font-bold text-base md:text-xl transition-colors duration-300 truncate ${scrolled && isLight ? 'text-gray-900 group-hover:text-[var(--color-accent)]' : 'text-white group-hover:text-[var(--color-accent)]'}`}>
            <span className="lg:hidden">{tenant.shortName}</span>
            <span className="hidden lg:inline">{settings.clubName || tenant.fullName}</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-6 justify-center flex-1 mx-4">
          {navLinks.map((link) => (
            <Link key={link.label} to={link.path} className={`font-medium text-[11px] xl:text-xs tracking-wide uppercase transition-colors shrink-0 whitespace-nowrap ${navTextClass}`}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4 relative z-50">
          <Link to="/login" className={`hidden md:flex px-5 py-2.5 rounded-full font-bold text-sm uppercase tracking-wide transition-all hover:scale-105 ${loginBtnClass}`}>
            Member Login
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className={`lg:hidden p-2 rounded-full transition-colors hover:bg-white/10 ${hamburgerClass}`}>
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Full Screen Menu Overlay — always uses accent bg or primary bg depending on white theme */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 hidden flex-col items-center justify-center"
        style={{ clipPath: 'circle(0% at 100% 0%)', backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)' }}
      >
        <div ref={linksRef} className="flex flex-col items-center gap-6 md:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.path}
              className="text-4xl md:text-6xl font-heading font-bold text-white hover:opacity-70 transition-opacity"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-8 pt-8 border-t border-white/20 w-full text-center flex flex-col items-center gap-6">
            <Link to="/login" className="text-white font-bold text-xl hover:opacity-70 transition-opacity uppercase tracking-widest">
              Member Login
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-grow relative">
        <Outlet />
      </main>

      {/* Footer — for RACDLU: use accent (pink) bg with white text instead of primary (white) bg */}
      <footer
        className="py-16 px-6"
        style={{
          backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)',
          color: 'white'
        }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <h3 className="font-heading font-bold text-2xl mb-4 text-white">{settings.clubName}</h3>
            <p className="text-white/70 text-sm leading-relaxed mb-6">A community of passionate young leaders dedicated to service, personal growth, and creating positive change.</p>
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="h-12 object-contain opacity-50 grayscale" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6 uppercase tracking-wider text-white">Explore</h4>
            <ul className="space-y-4 text-white/70">
              <li><Link to="/projects" className="hover:text-white transition-colors">Projects</Link></li>
              <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
              <li><Link to="/news" className="hover:text-white transition-colors">News</Link></li>
              <li><Link to="/board" className="hover:text-white transition-colors">Leadership</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6 uppercase tracking-wider text-white">Connect</h4>
            <ul className="space-y-4 text-white/70">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/join" className="hover:text-white transition-colors">Join the Club</Link></li>
              <li><Link to="/sponsorship" className="hover:text-white transition-colors">Sponsorship</Link></li>
              <li><a href={`mailto:${settings.contactEmail}`} className="hover:text-white transition-colors">{settings.contactEmail}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6 uppercase tracking-wider text-white">Follow Us</h4>
            <div className="flex gap-4">
              <a href={tenant.social.facebook} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white hover:text-[var(--color-accent)] transition-all text-white font-bold text-sm">FB</a>
              <a href={tenant.social.instagram} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white hover:text-[var(--color-accent)] transition-all text-white font-bold text-sm">IN</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
