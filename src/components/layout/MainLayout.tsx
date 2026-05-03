import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import { useSettings } from '../../contexts/SettingsContext';
import { Menu, X } from 'lucide-react';

export default function MainLayout() {
  const { settings } = useSettings();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      gsap.to(overlayRef.current, {
        clipPath: 'circle(150% at 100% 0%)',
        duration: 0.8,
        ease: 'power4.inOut',
        display: 'flex'
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
        duration: 0.8,
        ease: 'power4.inOut',
        onComplete: () => {
          if (overlayRef.current) overlayRef.current.style.display = 'none';
        }
      });
    }
  }, [menuOpen]);

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Projects', path: '/projects' },
    { label: 'Events', path: '/events' },
    { label: 'News', path: '/news' },
    { label: 'Board', path: '/board' },
    { label: 'Join', path: '/join' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-500 flex items-center justify-between px-6 py-4 md:px-12 md:py-6 ${
        scrolled ? 'bg-primary/80 backdrop-blur-md border-b border-white/10 shadow-lg' : 'bg-transparent'
      }`}>
        <Link to="/" className="relative z-50 flex items-center gap-3 group">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.clubName} className="w-[60px] h-[60px] object-contain transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="text-white font-heading font-bold text-xl md:text-2xl tracking-tight transition-colors duration-300 group-hover:text-accent">
              {settings.clubName}
            </div>
          )}
        </Link>
        
        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8 justify-center absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <Link key={link.label} to={link.path} className="text-white hover:text-accent font-medium text-sm tracking-wide uppercase transition-colors">
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4 relative z-50">
          <Link to="/login" className="hidden md:flex bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-full text-white font-bold text-sm uppercase tracking-wide transition-all hover:scale-105">
            Member Login
          </Link>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Full Screen Menu Overlay */}
      <div 
        ref={overlayRef} 
        className="fixed inset-0 z-40 bg-primary hidden flex-col items-center justify-center"
        style={{ clipPath: 'circle(0% at 100% 0%)' }}
      >
        <div ref={linksRef} className="flex flex-col items-center gap-6 md:gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.label} 
              to={link.path} 
              className="text-4xl md:text-6xl font-heading font-bold text-white hover:text-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-8 pt-8 border-t border-white/10 w-full text-center flex flex-col items-center gap-6">
            <Link to="/login" className="text-white font-bold text-xl hover:text-accent transition-colors uppercase tracking-widest">
              Member Login
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-grow relative">
        <Outlet />
      </main>
      
      <footer className="bg-primary text-white py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <h3 className="font-heading font-bold text-2xl mb-4">{settings.clubName}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">A community of passionate young leaders dedicated to service, personal growth, and creating positive change.</p>
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="h-12 object-contain opacity-50 grayscale" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6 uppercase tracking-wider">Explore</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link to="/projects" className="hover:text-white transition-colors">Projects</Link></li>
              <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
              <li><Link to="/news" className="hover:text-white transition-colors">News</Link></li>
              <li><Link to="/board" className="hover:text-white transition-colors">Leadership</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6 uppercase tracking-wider">Connect</h4>
            <ul className="space-y-4 text-gray-400">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/join" className="hover:text-white transition-colors">Join the Club</Link></li>
              <li><a href={`mailto:${settings.contactEmail}`} className="hover:text-white transition-colors">{settings.contactEmail}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg mb-6 uppercase tracking-wider">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent hover:text-primary transition-all">FB</a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent hover:text-primary transition-all">IN</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
