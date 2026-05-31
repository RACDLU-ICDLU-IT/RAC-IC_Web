import { supabase } from '../supabase';
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';
import { Button } from '../components/ui/Button';
import MarqueeTicker from '../components/MarqueeTicker';
import { Link } from 'react-router-dom';
import ScrollAnimatedNumber from '../components/ScrollAnimatedNumber';
import FeaturedProjects from '../components/FeaturedProjects';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import imgGallery1 from '../assets/images/regenerated_image_1777783191084.jpg';
import imgGallery2 from '../assets/images/regenerated_image_1777783192770.jpg';
import imgGallery3 from '../assets/images/regenerated_image_1777783183004.jpg';
import imgGallery4 from '../assets/images/regenerated_image_1777783180868.jpg';
import imgGallery5 from '../assets/images/regenerated_image_1777783189156.jpg';
import imgGallery6 from '../assets/images/regenerated_image_1777783187022.jpg';
import generatedImgAbout from '../assets/images/regenerated_image_1777820660503.jpg';
import { ZoomIn, X, ChevronLeft, ChevronRight, ArrowUpRight, MapPin, Calendar } from 'lucide-react';

// ─── unchanged data & plugin bootstrap ────────────────────────────────────────
const defaultPhotos = [
  { id: '1', url: imgGallery1, caption: 'Service Above Self',  albumTag: 'Community, Featured' },
  { id: '2', url: imgGallery2, caption: 'Rotary Team',         albumTag: 'Team, Featured'      },
  { id: '3', url: imgGallery3, caption: 'Giving Back',         albumTag: 'Community, Featured' },
  { id: '4', url: imgGallery4, caption: 'Leadership',          albumTag: 'Events, Featured'    },
  { id: '5', url: imgGallery5, caption: 'Charity Walk',        albumTag: 'Events, Featured'    },
  { id: '6', url: imgGallery6, caption: 'Impact',              albumTag: 'Team, Featured'      },
];

gsap.registerPlugin(ScrollTrigger);

// ─── tiny helpers ──────────────────────────────────────────────────────────────
const GrainOverlay = ({ opacity = 0.035 }: { opacity?: number }) => (
  <div
    aria-hidden
    className="absolute inset-0 pointer-events-none"
    style={{
      opacity,
      backgroundImage:
        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
    }}
  />
);

const HrAccent = () => (
  <div className="flex items-center gap-3 mb-6">
    <span className="block h-px w-12 bg-[var(--color-accent)]" />
    <span className="block h-px flex-1 bg-current opacity-10" />
  </div>
);

// ─── component ────────────────────────────────────────────────────────────────
export default function Home() {
  const { tenant, settings } = useTenant();
  const heroRef    = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [galleryPhotos,  setGalleryPhotos]  = useState<any[]>([]);
  const [lightboxIndex,  setLightboxIndex]  = useState<number | null>(null);

  // ── brand helpers (unchanged logic) ──
  const defaultHeroTitle = tenant.brand.primaryColor === '#FFFFFF'
    ? 'Fellowship\nThrough Service.'
    : 'Service\nAbove Self.';
  const defaultMissionText = tenant.brand.primaryColor === '#FFFFFF'
    ? 'We are young professionals united by fellowship, leadership, and service. Together, we build communities and create lasting change across Bangladesh and beyond.'
    : 'We are a generation of action. Bridging continents, uplifting communities, and proving that youth can inspire global change.';

  const [content, setContent] = useState<any>({
    homeHeroTitle:    defaultHeroTitle,
    homeHeroSubtitle: `${tenant.fullName.toUpperCase()} — ${tenant.district}`,
    homeMissionText:  defaultMissionText,
    homeStatMembers:  120,
    homeStatProjects: 45,
    homeStatHours:    1000,
  });

  const isLight       = tenant.brand.primaryColor === '#FFFFFF';
  const headingColor  = isLight ? 'text-[var(--color-accent)]' : 'text-[var(--color-primary)]';
  const heroTextColor = tenant.brand.primaryColor === '#FFFFFF'
    ? '#ffffff'
    : (tenant.brand.textOnPrimary || '#ffffff');

  // ── GSAP headline split (unchanged) ──
  useEffect(() => {
    if (!headlineRef.current) return;
    const split = new SplitType(headlineRef.current, { types: 'words,chars' });
    gsap.from(split.chars, {
      y: 80,
      opacity: 0,
      rotationZ: 6,
      duration: 1.1,
      stagger: 0.018,
      ease: 'power4.out',
      delay: 0.3,
    });
    return () => { split.revert(); };
  }, [content.homeHeroTitle]);

  // ── data fetch (unchanged) ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: eventsSnap } = await supabase.from('events')
          .select('*').eq('tenant_id', tenant.id).eq('isPublic', true)
          .gte('date', today).order('date', { ascending: true }).limit(3);
        setUpcomingEvents(eventsSnap || []);

        const { data: gallerySnap } = await supabase.from('gallery')
          .select('*').eq('tenant_id', tenant.id).order('sort_order', { ascending: true });
        const fetched = gallerySnap || [];
        if (fetched.length > 0) {
          setGalleryPhotos(fetched.filter((p: any) => p.albumTag?.toLowerCase().includes('featured')));
        } else {
          setGalleryPhotos(defaultPhotos);
        }

        const { data } = await supabase.from('page_content').select('data')
          .eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
        if (data?.data) setContent((prev: any) => ({ ...prev, ...data.data }));
      } catch (err) {
        console.error('Error fetching home data:', err);
      }
    };
    fetchData();
  }, [tenant.id]);

  // ── lightbox keyboard (unchanged) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft'  && lightboxIndex > 0)                        setLightboxIndex(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < galleryPhotos.length - 1) setLightboxIndex(lightboxIndex + 1);
      if (e.key === 'Escape')                                                  setLightboxIndex(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, galleryPhotos]);

  // ── structured data (unchanged) ──
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: tenant.fullName,
    alternateName: tenant.id === 'icdlu'
      ? [tenant.shortName, 'ICDL', 'Interact Club Dhaka Luminous', 'Interact Club of Dhaka Luminous']
      : [tenant.shortName, 'Rotaract Dhaka Luminous', 'Rotaract Club of Dhaka Luminous'],
    url: `https://${tenant.hostname}`,
    logo: `https://${tenant.hostname}${tenant.brand.logoPath}`,
    foundingDate: tenant.foundedYear,
    description: tenant.seo?.defaultDescription || tenant.tagline,
    address: { '@type': 'PostalAddress', addressLocality: 'Dhaka', addressCountry: 'BD' },
    parentOrganization: { '@type': 'Organization', name: tenant.parentOrg },
    sameAs: [tenant.social.facebook, tenant.social.instagram, tenant.social.linkedin].filter(Boolean),
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[var(--color-page-bg)] overflow-x-hidden">
      <SEOHead title="Home" canonicalPath="/" structuredData={orgSchema} />

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden"
        style={{
          background: `linear-gradient(150deg, var(--color-hero-start) 0%, ${tenant.brand.heroDark || 'var(--color-primary)'} 100%)`,
          color: heroTextColor,
        }}
      >
        <GrainOverlay opacity={0.045} />

        {/* Background radial glow */}
        <div
          aria-hidden
          className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, var(--color-accent) 0%, transparent 65%)`,
            opacity: 0.12,
            filter: 'blur(60px)',
          }}
        />
        <div
          aria-hidden
          className="absolute bottom-0 left-0 w-[50vw] h-[50vw] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, var(--color-accent) 0%, transparent 70%)`,
            opacity: 0.07,
            filter: 'blur(80px)',
          }}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 md:px-12 pt-8 z-10">
          <div
            className="flex items-center gap-3 text-xs tracking-[0.2em] uppercase font-semibold"
            style={{ color: heroTextColor, opacity: 0.7 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse"
              style={{ boxShadow: '0 0 8px var(--color-accent)' }}
            />
            {tenant.shortName.toUpperCase()}
          </div>
          <div
            className="hidden md:flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase"
            style={{ color: heroTextColor, opacity: 0.45 }}
          >
            {tenant.district}
          </div>
        </div>

        {/* Main hero content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-12 pb-16 md:pb-24">
          {/* Eyebrow */}
          <p
            className="text-[11px] tracking-[0.3em] uppercase font-bold mb-6 md:mb-8"
            style={{ color: 'var(--color-accent)' }}
          >
            {tenant.fullName}
          </p>

          {/* Headline */}
          <h1
            ref={headlineRef}
            className="font-heading font-bold leading-[0.88] tracking-tighter whitespace-pre-line"
            style={{
              fontSize: 'clamp(3.5rem, 11vw, 9.5rem)',
              color: heroTextColor,
              maxWidth: '16ch',
            }}
          >
            {typeof content.homeHeroTitle === 'string'
              ? content.homeHeroTitle.replace(/\\n/g, '\n')
              : content.homeHeroTitle}
          </h1>

          {/* Bottom row */}
          <div className="mt-12 md:mt-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <p
              className="text-base md:text-lg max-w-sm leading-relaxed"
              style={{ color: heroTextColor, opacity: 0.65 }}
            >
              {content.homeMissionText?.split(' ').slice(0, 16).join(' ')}…
            </p>
            <div className="flex flex-row gap-3 shrink-0">
              <Link to="/join">
                <Button size="lg" variant="primary">
                  <span className="flex items-center gap-2">
                    Join Our Club <ArrowUpRight size={16} />
                  </span>
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline">Learn More</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative vertical rule + scroll hint */}
        <div className="absolute right-8 md:right-12 bottom-10 flex flex-col items-center gap-3 z-10 hidden md:flex">
          <div className="w-px h-16 bg-current opacity-20" />
          <p
            className="text-[9px] tracking-[0.3em] uppercase rotate-90 origin-center"
            style={{ color: heroTextColor, opacity: 0.35 }}
          >
            scroll
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MARQUEE
      ══════════════════════════════════════════════════════════════ */}
      <MarqueeTicker items={['Unite for Good', 'People of Action', 'Create Lasting Impact']} />

      {/* ══════════════════════════════════════════════════════════════
          IMPACT STATS  — floats up, overlaps hero bottom
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-20 max-w-6xl mx-auto px-6 md:px-12 -mt-1">
        <div
          className="rounded-2xl md:rounded-3xl overflow-hidden"
          style={{
            background: 'var(--color-page-bg)',
            boxShadow: '0 4px 60px -10px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3">
            {[
              { label: 'Active Members', value: content.homeStatMembers, suffix: '+', color: 'var(--color-accent)' },
              { label: 'Projects Completed', value: content.homeStatProjects, suffix: '',  color: 'var(--color-accent)' },
              { label: 'Volunteer Hours', value: content.homeStatHours, suffix: '+', color: 'var(--color-accent)' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center justify-center py-10 px-8 text-center relative
                  ${i < 2 ? 'md:border-r border-[var(--color-page-bg)] border-opacity-20' : ''}
                  ${i > 0 ? 'border-t md:border-t-0' : ''}
                `}
                style={{ borderColor: 'rgba(0,0,0,0.07)' }}
              >
                <span
                  className="font-heading font-bold tabular-nums"
                  style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', color: stat.color, lineHeight: 1 }}
                >
                  <ScrollAnimatedNumber end={stat.value} suffix={stat.suffix} />
                </span>
                <span className="mt-2 text-xs font-bold tracking-[0.18em] uppercase text-gray-400">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          MISSION STATEMENT
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative py-28 md:py-40 mt-24 overflow-hidden"
        style={{
          background: tenant.brand.secondaryColor,
          color: tenant.brand.textOnPrimary,
        }}
      >
        <GrainOverlay opacity={0.04} />

        {/* Large decorative quote mark */}
        <div
          aria-hidden
          className="absolute -top-8 left-8 md:left-16 font-heading font-bold leading-none select-none pointer-events-none"
          style={{ fontSize: 'clamp(12rem, 28vw, 22rem)', opacity: 0.06, color: 'currentColor' }}
        >
          "
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12">
          <p
            className="text-xs font-bold tracking-[0.25em] uppercase mb-8"
            style={{ color: 'var(--color-accent)' }}
          >
            Our Mission
          </p>
          <blockquote
            className="font-heading font-medium leading-[1.1] tracking-tight"
            style={{
              fontSize: 'clamp(1.75rem, 4.5vw, 4rem)',
              color: tenant.brand.textOnPrimary,
            }}
          >
            {content.homeMissionText}
          </blockquote>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          ABOUT PREVIEW
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24 items-center">

          {/* Text column */}
          <div className="order-2 lg:order-1">
            <HrAccent />
            <p className="text-xs font-bold tracking-[0.25em] uppercase text-gray-400 mb-3">
              Our Story
            </p>
            <h2
              className={`font-heading font-bold leading-[0.95] tracking-tight mb-8 ${headingColor}`}
              style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)' }}
            >
              Building leaders<br />through service.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-10 max-w-prose">
              Founded under the guidance of {tenant.district}, our club brings together passionate
              individuals to tackle pressing local and global challenges. By joining us, you don't
              just volunteer — you learn how to lead.
            </p>
            <Link to="/about">
              <Button variant="outline-dark">
                <span className="flex items-center gap-2">
                  Read Our History <ArrowUpRight size={15} />
                </span>
              </Button>
            </Link>
          </div>

          {/* Image column */}
          <div className="order-1 lg:order-2 relative">
            {/* Main image */}
            <div
              className="aspect-[5/4] rounded-2xl overflow-hidden shadow-2xl relative z-10"
              style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.25)' }}
            >
              <img
                src={content.homeAboutImage || generatedImgAbout}
                alt="Club members volunteering"
                className="w-full h-full object-cover"
              />
              {/* Caption badge */}
              <div className="absolute bottom-4 left-4 right-4">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md"
                  style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  {tenant.shortName} — Est. {tenant.foundedYear}
                </div>
              </div>
            </div>

            {/* Accent blob behind image */}
            <div
              aria-hidden
              className="absolute -bottom-8 -right-8 w-72 h-72 rounded-full -z-0 pointer-events-none"
              style={{
                background: 'var(--color-accent)',
                opacity: 0.12,
                filter: 'blur(50px)',
              }}
            />
            {/* Subtle grid lines decoration */}
            <div
              aria-hidden
              className="absolute -top-6 -left-6 w-32 h-32 -z-0 pointer-events-none hidden md:block"
              style={{
                backgroundImage: 'radial-gradient(circle, var(--color-accent) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                opacity: 0.25,
              }}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FEATURED PROJECTS  (component, unchanged)
      ══════════════════════════════════════════════════════════════ */}
      <FeaturedProjects />

      {/* ══════════════════════════════════════════════════════════════
          UPCOMING EVENTS
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32 bg-[var(--color-page-bg)]">
        <div className="max-w-4xl mx-auto px-6 md:px-12">

          {/* Header */}
          <div className="flex items-end justify-between mb-14 gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-gray-400 mb-2">What's Coming</p>
              <h2
                className={`font-heading font-bold leading-none tracking-tight ${headingColor}`}
                style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}
              >
                Events
              </h2>
            </div>
            <Link
              to="/events"
              className="flex items-center gap-1.5 text-sm font-bold tracking-wide shrink-0 pb-1 group"
              style={{ color: 'var(--color-accent)' }}
            >
              Full Calendar
              <ArrowUpRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>

          {/* Event list */}
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event, idx) => {
              const d = new Date(event.date + 'T00:00:00');
              return (
                <Link
                  key={event.id}
                  to="/events"
                  className="group flex items-center gap-6 md:gap-8 p-5 md:p-6 rounded-2xl border transition-all duration-200 hover:shadow-lg"
                  style={{
                    borderColor: 'rgba(0,0,0,0.07)',
                    background: 'var(--color-page-bg)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.02)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-page-bg)';
                  }}
                >
                  {/* Date block */}
                  <div
                    className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl flex flex-col items-center justify-center text-white"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    <span className="text-[10px] font-bold tracking-wider uppercase leading-none">
                      {d.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="font-heading font-bold text-2xl leading-tight">
                      {d.getDate()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--color-accent)' }}
                      >
                        {event.type}
                      </span>
                    </div>
                    <h3
                      className={`font-heading font-bold text-lg md:text-xl truncate ${headingColor} transition-opacity`}
                    >
                      {event.title}
                    </h3>
                    {event.venue && (
                      <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-1">
                        <MapPin size={12} />
                        {event.venue}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <ArrowUpRight
                    size={20}
                    className="shrink-0 text-gray-300 transition-all duration-200 group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              );
            }) : (
              <div className="py-16 border border-dashed rounded-2xl text-center text-gray-400 text-sm"
                style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                No upcoming events at the moment — check back soon.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          GALLERY SNAPSHOT
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: 'var(--color-page-bg)' }}>

        {/* Section header */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 mb-10 md:mb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-gray-400 mb-2">Visual Story</p>
              <h2
                className={`font-heading font-bold leading-none tracking-tight ${headingColor}`}
                style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}
              >
                Captured Moments
              </h2>
            </div>
            <Link
              to="/gallery"
              className="flex items-center gap-1.5 text-sm font-bold tracking-wide shrink-0 pb-1 group"
              style={{ color: 'var(--color-accent)' }}
            >
              Full Gallery
              <ArrowUpRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
        </div>

        {galleryPhotos.length > 0 ? (
          /* Masonry-inspired CSS grid */
          <div
            className="max-w-7xl mx-auto px-4 md:px-6"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridAutoRows: '220px',
              gap: '12px',
            }}
          >
            {galleryPhotos.slice(0, 6).map((photo, i) => {
              let gridStyle: React.CSSProperties = {};
              if (i === 0) gridStyle = { gridColumn: 'span 2', gridRow: 'span 2' };
              if (i === 3) gridStyle = { gridColumn: 'span 2' };
              if (i === 5) gridStyle = { gridColumn: 'span 2' };

              return (
                <div
                  key={photo.id || i}
                  className="relative group overflow-hidden rounded-2xl cursor-pointer bg-gray-200"
                  style={gridStyle}
                  onClick={() => setLightboxIndex(i)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Gallery'}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Dark overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-400 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border border-white/60 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 backdrop-blur-sm bg-white/10">
                      <ZoomIn size={20} className="text-white" />
                    </div>
                  </div>

                  {/* Caption strip */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-400">
                    <p className="text-white text-sm font-medium leading-tight">{photo.caption}</p>
                    {photo.albumTag && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {photo.albumTag.split(',').map((t: string) => t.trim()).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-[9px] uppercase font-bold text-white/80 bg-white/15 px-2 py-0.5 rounded backdrop-blur-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 text-center py-12 text-gray-400 text-sm">
            No featured photos available right now.
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════
          JOIN CTA
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative py-32 md:py-40 overflow-hidden"
        style={{ backgroundColor: isLight ? 'var(--color-accent)' : '#000251' }}
      >
        <GrainOverlay opacity={0.05} />

        {/* Radial glow */}
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 text-center text-white">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-6 opacity-60">
            Ready to Lead?
          </p>
          <h2
            className="font-heading font-bold leading-[0.9] tracking-tighter mb-6"
            style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}
          >
            Make a difference.
          </h2>
          <p className="text-lg md:text-xl text-white/75 mb-12 max-w-xl mx-auto leading-relaxed">
            Join a global network of 350,000+ young leaders taking action in their communities.
          </p>
          <Link to="/join">
            <Button
              size="lg"
              className="bg-white text-gray-900 border-none hover:bg-gray-100 font-bold shadow-2xl"
            >
              <span className="flex items-center gap-2">
                Apply for Membership <ArrowUpRight size={16} />
              </span>
            </Button>
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          LIGHTBOX  (unchanged logic, refined visuals)
      ══════════════════════════════════════════════════════════════ */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.96)' }}
          onClick={() => setLightboxIndex(null)}
        >
          <GrainOverlay opacity={0.04} />

          {/* Close */}
          <button
            aria-label="Close"
            className="absolute top-5 right-5 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            <X size={20} className="text-white" />
          </button>

          {/* Prev */}
          <button
            aria-label="Previous"
            disabled={lightboxIndex === 0}
            className="absolute left-4 md:left-8 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm disabled:opacity-20 disabled:cursor-not-allowed"
            onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
          >
            <ChevronLeft size={22} className="text-white" />
          </button>

          {/* Image */}
          <img
            src={galleryPhotos[lightboxIndex]?.url}
            alt={galleryPhotos[lightboxIndex]?.caption || 'Gallery photo'}
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-xl"
            style={{ boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}
          />

          {/* Next */}
          <button
            aria-label="Next"
            disabled={lightboxIndex === galleryPhotos.length - 1}
            className="absolute right-4 md:right-8 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors backdrop-blur-sm disabled:opacity-20 disabled:cursor-not-allowed"
            onClick={e => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
          >
            <ChevronRight size={22} className="text-white" />
          </button>

          {/* Caption */}
          {galleryPhotos[lightboxIndex]?.caption && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full backdrop-blur-md bg-white/10 text-white/90 text-sm font-medium text-center max-w-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {galleryPhotos[lightboxIndex].caption}
            </div>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs font-bold tracking-widest">
            {lightboxIndex + 1} / {galleryPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
