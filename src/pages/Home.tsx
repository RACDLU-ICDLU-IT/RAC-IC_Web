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
import { ZoomIn, X, ChevronLeft, ChevronRight, ArrowUpRight, MapPin, Calendar, Users, Globe, Heart } from 'lucide-react';

const defaultPhotos = [
  { id: '1', url: imgGallery1, caption: 'Service Above Self', albumTag: 'Community, Featured' },
  { id: '2', url: imgGallery2, caption: 'Rotary Team', albumTag: 'Team, Featured' },
  { id: '3', url: imgGallery3, caption: 'Giving Back', albumTag: 'Community, Featured' },
  { id: '4', url: imgGallery4, caption: 'Leadership', albumTag: 'Events, Featured' },
  { id: '5', url: imgGallery5, caption: 'Charity Walk', albumTag: 'Events, Featured' },
  { id: '6', url: imgGallery6, caption: 'Impact', albumTag: 'Team, Featured' },
];

gsap.registerPlugin(ScrollTrigger);

const INJECTED_ID = '__home_v2_styles__';
if (typeof document !== 'undefined' && !document.getElementById(INJECTED_ID)) {
  const s = document.createElement('style');
  s.id = INJECTED_ID;
  s.textContent = `
    /* ── Hero ── */
    .hv2-hero {
      position: relative;
      min-height: 100svh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .hv2-hero__noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      opacity: 0.045; pointer-events: none;
    }
    .hv2-hero__orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
    }
    .hv2-hero__headline {
      font-size: clamp(68px, 11vw, 160px);
      font-weight: 900;
      line-height: 0.88;
      letter-spacing: -0.04em;
      white-space: pre-line;
    }
    .hv2-hero__meta-line {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.15);
      margin-top: 0;
      padding-bottom: 0;
    }
    .hv2-hero__meta-name {
      font-size: clamp(13px, 4.5vw, 17px);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
      opacity: 0.7;
      width: 100%;
      text-align: center;
    }
    .hv2-hero__meta-buttons {
      display: flex;
      gap: 12px;
      width: 100%;
      margin-top: 12px;
    }
    .hv2-btn-join-custom {
      background: white !important;
      color: #ec4899 !important;
      border: none !important;
    }
    .hv2-btn-join-custom:hover {
      background: #fce4ec !important;
      color: #db2777 !important;
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.2);
    }

    /* ── Stats ribbon ── */
    .hv2-stats {
      position: relative; z-index: 20;
    }
    .hv2-stats__card {
      background: var(--color-page-bg);
      border: 1px solid rgba(0,0,0,0.07);
      border-radius: 24px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.08);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      overflow: hidden;
    }
    .hv2-stats__item {
      padding: 40px 32px;
      display: flex; flex-direction: column; align-items: center;
      position: relative;
    }
    .hv2-stats__item + .hv2-stats__item::before {
      content: ''; position: absolute; left: 0; top: 20%; height: 60%;
      width: 1px; background: rgba(0,0,0,0.07);
    }
    .hv2-stats__label {
      font-size: 9px; font-weight: 800; letter-spacing: 0.2em;
      text-transform: uppercase; color: #9ca3af; margin-bottom: 12px;
    }
    .hv2-stats__number {
      font-size: clamp(40px, 6vw, 72px);
      font-weight: 900; line-height: 1;
    }

    /* ── Section labels ── */
    .hv2-section-eyebrow {
      font-size: 9px; font-weight: 800; letter-spacing: 0.25em;
      text-transform: uppercase; color: #9ca3af;
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 24px;
    }
    .hv2-section-eyebrow::before {
      content: ''; display: block;
      width: 32px; height: 2px;
      background: var(--color-accent, #0070c9);
    }
    .hv2-mission .hv2-section-eyebrow {
      color: rgba(255,255,255,0.6);
    }
    .hv2-mission .hv2-section-eyebrow::before {
      background: rgba(255,255,255,0.5);
    }

    /* ── Mission banner ── */
    .hv2-mission {
      position: relative; overflow: hidden;
      padding: 36px 0;
    }
    @media (min-width: 768px) {
      .hv2-mission { padding: 80px 0; }
    }
    .hv2-mission__quote {
      font-size: clamp(22px, 5.5vw, 64px);
      font-weight: 800; line-height: 1.15;
      letter-spacing: -0.02em;
    }

    /* ── About split ── */
    .hv2-about {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 680px;
    }
    @media (max-width: 900px) {
      .hv2-about { grid-template-columns: 1fr; }
      .hv2-about__image-wrap { order: 2; }
      .hv2-about__content { order: 1; }
    }
    .hv2-about__image-wrap {
      position: relative; overflow: hidden;
      min-height: 340px;
    }
    @media (min-width: 900px) {
      .hv2-about__image-wrap { min-height: 100%; }
    }
    .hv2-about__image-wrap img {
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: center top;
      transition: transform 0.8s ease;
      min-height: 340px;
    }
    .hv2-about__image-wrap:hover img { transform: scale(1.04); }
    .hv2-about__content {
      display: flex; flex-direction: column; justify-content: center;
      padding: 80px 72px;
    }
    @media (max-width: 900px) {
      .hv2-about__content { padding: 56px 24px 40px; }
    }
    .hv2-about__heading {
      font-size: clamp(32px, 4vw, 52px);
      font-weight: 900; line-height: 1.05;
      letter-spacing: -0.03em;
      margin-bottom: 24px;
    }
    .hv2-about__body {
      font-size: 17px; line-height: 1.75;
      color: #6b7280; margin-bottom: 40px;
    }

    /* ── Events ── */
    .hv2-events__item {
      display: grid;
      grid-template-columns: 80px 1fr;
      gap: 32px; align-items: center;
      padding: 32px 0;
      border-bottom: 1px solid rgba(0,0,0,0.07);
      cursor: pointer;
      transition: background 0.2s;
      border-radius: 12px;
      padding-left: 16px; padding-right: 16px;
    }
    .hv2-events__item:hover { background: rgba(0,0,0,0.02); }
    .hv2-events__date-month {
      font-size: 10px; font-weight: 800; letter-spacing: 0.2em;
      text-transform: uppercase; margin-bottom: 4px;
    }
    .hv2-events__date-day {
      font-size: 40px; font-weight: 900; line-height: 1;
    }
    .hv2-events__pill {
      font-size: 9px; font-weight: 800; letter-spacing: 0.15em;
      text-transform: uppercase; padding: 4px 10px;
      border-radius: 999px; display: inline-block;
      background: rgba(0,0,0,0.06); margin-bottom: 8px;
    }
    .hv2-events__title {
      font-size: 20px; font-weight: 800;
      letter-spacing: -0.02em; margin-bottom: 4px;
    }
    .hv2-events__venue {
      font-size: 13px; color: #9ca3af;
      display: flex; align-items: center; gap: 6px;
    }
    .hv2-events__arrow {
      opacity: 0;
      transition: opacity 0.2s, transform 0.2s;
    }
    .hv2-events__item:hover .hv2-events__arrow {
      opacity: 1; transform: translateX(4px);
    }

    /* ── Gallery ── */
    .hv2-gallery__grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-template-rows: repeat(2, 300px);
      gap: 8px;
    }
    @media (max-width: 768px) {
      .hv2-gallery__grid {
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: auto;
      }
    }
    .hv2-gallery__cell {
      position: relative; overflow: hidden;
      border-radius: 12px; cursor: pointer;
      background: #e5e7eb;
    }
    .hv2-gallery__cell:nth-child(1) { grid-column: span 5; grid-row: span 2; }
    .hv2-gallery__cell:nth-child(2) { grid-column: span 4; }
    .hv2-gallery__cell:nth-child(3) { grid-column: span 3; }
    .hv2-gallery__cell:nth-child(4) { grid-column: span 3; }
    .hv2-gallery__cell:nth-child(5) { grid-column: span 4; }
    .hv2-gallery__cell:nth-child(6) { grid-column: span 5; }
    @media (max-width: 768px) {
      .hv2-gallery__cell { grid-column: span 1 !important; grid-row: span 1 !important; height: 200px; }
    }
    .hv2-gallery__cell img {
      width: 100%; height: 100%; object-fit: cover;
      transition: transform 0.6s cubic-bezier(0.4,0,0.2,1);
    }
    .hv2-gallery__cell:hover img { transform: scale(1.07); }
    .hv2-gallery__overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%);
      opacity: 0; transition: opacity 0.3s;
      display: flex; align-items: flex-end;
      padding: 20px;
    }
    .hv2-gallery__cell:hover .hv2-gallery__overlay { opacity: 1; }
    .hv2-gallery__zoom {
      position: absolute; top: 16px; right: 16px;
      background: rgba(0,0,0,0.4); border-radius: 50%;
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(8px);
      opacity: 0; transition: opacity 0.3s;
    }
    .hv2-gallery__cell:hover .hv2-gallery__zoom { opacity: 1; }

    /* ── Join CTA ── */
    .hv2-join { position: relative; overflow: hidden; }
    .hv2-join__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 520px;
      max-width: 80rem;
      margin-left: auto;
      margin-right: auto;
    }
    .hv2-join__left {
      display: flex; flex-direction: column; justify-content: center;
      padding: 100px 80px;
    }
    .hv2-join__headline {
      font-size: clamp(36px, 6vw, 72px);
      font-weight: 900; line-height: 1;
      letter-spacing: -0.04em;
      margin-bottom: 24px;
    }
    .hv2-join__sub {
      font-size: 17px; line-height: 1.7;
      opacity: 0.75; margin-bottom: 40px;
      max-width: 440px;
    }
    .hv2-join__chips {
      display: flex; flex-wrap: wrap; gap: 10px;
      margin-bottom: 40px;
    }
    .hv2-join__chip {
      font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 8px 16px; border-radius: 999px;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
    }
    .hv2-join__right {
      position: relative; overflow: hidden;
    }
    .hv2-join__right img {
      width: 100%; height: 100%; object-fit: cover;
      display: block;
    }
    /* Mobile: image stacks above text */
    @media (max-width: 900px) {
      .hv2-join__grid {
        display: flex !important;
        flex-direction: column !important;
        max-width: 100% !important;
      }
      .hv2-join__right {
        order: 0;
        width: 100%;
        height: 280px;
        flex-shrink: 0;
      }
      .hv2-join__left {
        order: 1;
        padding: 60px 32px;
      }
    }

    .hv2-join__right-img-wrap {
      position: relative;
      overflow: hidden;
    }
    .hv2-join__right-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }
    @media (max-width: 900px) {
      .hv2-join__grid {
        grid-template-columns: 1fr !important;
        display: grid !important;
      }
      .hv2-join__left-inner {
        padding: 48px 24px !important;
      }
      .hv2-join__right-img-wrap {
        order: -1;
        height: 220px !important;
        max-height: 220px !important;
      }
      .hv2-join__right-img-wrap img {
        width: 100% !important;
        height: 220px !important;
        max-height: 220px !important;
        object-fit: cover !important;
      }
    }

    /* ── Lightbox ── */
    .hv2-lightbox {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.97);
      z-index: 100;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .hv2-lightbox__nav {
      position: absolute;
      top: 50%; transform: translateY(-50%);
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 50%;
      width: 52px; height: 52px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: white;
      transition: background 0.2s;
    }
    .hv2-lightbox__nav:hover { background: rgba(255,255,255,0.18); }
    .hv2-lightbox__nav:disabled { opacity: 0.25; pointer-events: none; }
    .hv2-lightbox__close {
      position: absolute; top: 20px; right: 20px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 50%;
      width: 44px; height: 44px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: white;
      transition: background 0.2s;
    }
    .hv2-lightbox__close:hover { background: rgba(255,255,255,0.18); }
    .hv2-lightbox__counter {
      position: absolute; bottom: 24px; left: 50%;
      transform: translateX(-50%);
      font-size: 11px; font-weight: 700; letter-spacing: 0.2em;
      color: rgba(255,255,255,0.4);
    }
    .hv2-lightbox__caption {
      position: absolute; bottom: 60px; left: 50%;
      transform: translateX(-50%);
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(12px);
      border-radius: 999px; padding: 8px 20px;
      font-size: 13px; color: rgba(255,255,255,0.8);
      white-space: nowrap;
    }

    /* ── Buttons ── */
    .hv2-btn-primary {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px 28px; border-radius: 12px;
      font-size: 13px; font-weight: 800;
      letter-spacing: 0.05em; text-transform: uppercase;
      background: var(--color-accent, #0070c9);
      color: white;
      border: none; cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
      text-decoration: none;
      flex: 1;
      white-space: nowrap;
    }
    .hv2-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.2);
    }
    .hv2-btn-ghost {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px 28px; border-radius: 12px;
      font-size: 13px; font-weight: 800;
      letter-spacing: 0.05em; text-transform: uppercase;
      background: transparent;
      color: inherit;
      border: 1px solid rgba(255,255,255,0.3); cursor: pointer;
      transition: background 0.15s;
      text-decoration: none;
      flex: 1;
      white-space: nowrap;
    }
    .hv2-btn-ghost:hover { background: rgba(255,255,255,0.1); }
    .hv2-btn-outline {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 14px 28px; border-radius: 12px;
      font-size: 13px; font-weight: 800;
      letter-spacing: 0.05em; text-transform: uppercase;
      background: transparent;
      color: var(--color-accent, #0070c9);
      border: 2px solid currentColor; cursor: pointer;
      transition: background 0.15s, color 0.15s;
      text-decoration: none;
    }
    .hv2-btn-outline:hover {
      background: var(--color-accent, #0070c9);
      color: white;
    }
    .hv2-btn-white {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      padding: 16px 32px; border-radius: 12px;
      font-size: 13px; font-weight: 800;
      letter-spacing: 0.05em; text-transform: uppercase;
      background: white; color: #111;
      border: none; cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      text-decoration: none;
      width: 100%;
      text-align: center;
    }
    .hv2-btn-white:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 40px rgba(0,0,0,0.25);
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .hv2-stats__card {
        grid-template-columns: 1fr;
        border-radius: 20px;
      }
      .hv2-stats__item + .hv2-stats__item::before {
        top: 0; left: 20%; width: 60%; height: 1px;
      }
      .hv2-btn-primary,
      .hv2-btn-ghost {
        padding: 13px 16px;
        font-size: 11px;
        letter-spacing: 0.04em;
      }
    }
  `;
  document.head.appendChild(s);
}

export default function Home() {
  const { tenant, settings } = useTenant();
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const defaultHeroTitle = tenant.brand.primaryColor === '#FFFFFF'
    ? 'Fellowship\nThrough Service.'
    : 'Service\nAbove Self.';

  const defaultMissionText = tenant.brand.primaryColor === '#FFFFFF'
    ? 'We are young professionals united by fellowship, leadership, and service. Together, we build communities and create lasting change across Bangladesh and beyond.'
    : 'We are a generation of action. Bridging continents, uplifting communities, and proving that youth can inspire global change.';

  const [content, setContent] = useState<any>({
    homeHeroTitle: defaultHeroTitle,
    homeHeroSubtitle: `${tenant.fullName.toUpperCase()} — ${tenant.district}`,
    homeMissionText: defaultMissionText,
    homeStatMembers: 120,
    homeStatProjects: 45,
    homeStatHours: 1000,
  });

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const accentColor = 'var(--color-accent)';
  const headingColorStyle = isLight
    ? { color: 'var(--color-accent)' }
    : { color: 'var(--color-primary)' };

  const getTenantLogo = () => {
    if (tenant.id === 'icdlu') {
      return 'https://res.cloudinary.com/dpaeapdp6/image/upload/vkhcwnrmfgbgje6xorcy.png';
    } else if (tenant.id === 'racdlu') {
      return 'https://res.cloudinary.com/dpaeapdp6/image/upload/csqnaoyekegjdtejaazk.png';
    }
    return null;
  };
  const tenantLogoUrl = getTenantLogo();

  // CHANGE 1 — Tenant-specific Join CTA right panel image
  const getJoinRightImage = () => {
    if (tenant.id === 'racdlu') {
      return 'https://res.cloudinary.com/dpaeapdp6/image/upload/zewqqditwamydijfyiwi.png';
    } else if (tenant.id === 'icdlu') {
      return 'https://res.cloudinary.com/dpaeapdp6/image/upload/g4y6ktn0z1sarfacwzyi.png';
    }
    return null;
  };
  const joinRightImageUrl = getJoinRightImage();

  /* ── Headline animation ── */
  useEffect(() => {
    if (!headlineRef.current) return;
    const split = new SplitType(headlineRef.current, { types: 'words,chars' });
    gsap.from(split.chars, {
      y: 120, opacity: 0, rotationZ: 8,
      duration: 1.4, stagger: 0.018,
      ease: 'power4.out', delay: 0.3,
    });
    return () => { split.revert(); };
  }, [content.homeHeroTitle]);

  /* ── Scroll reveals ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.hv2-reveal').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
        });
      });
    });
    return () => ctx.revert();
  }, []);

  /* ── Data fetch ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: eventsSnap } = await supabase.from('events')
          .select('*').eq('tenant_id', tenant.id).eq('isPublic', true)
          .gte('date', today).order('date', { ascending: true }).limit(3);
        setUpcomingEvents(eventsSnap || []);

        const { data: gallerySnap } = await supabase.from('gallery')
          .select('*').eq('tenant_id', tenant.id)
          .order('sort_order', { ascending: true });
        const fetchedPhotos = gallerySnap || [];
        if (fetchedPhotos.length > 0) {
          const featured = fetchedPhotos.filter((p: any) =>
            p.albumTag && p.albumTag.toLowerCase().includes('featured'));
          setGalleryPhotos(featured);
        } else {
          setGalleryPhotos(defaultPhotos);
        }

        const { data } = await supabase.from('page_content')
          .select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
        if (data?.data) setContent((prev: any) => ({ ...prev, ...data.data }));
      } catch (err) {
        console.error('Error fetching home data:', err);
      }
    };
    fetchData();
  }, [tenant.id]);

  /* ── Lightbox keyboard nav ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < galleryPhotos.length - 1) setLightboxIndex(lightboxIndex + 1);
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, galleryPhotos]);

  const heroTextColor = tenant.brand.primaryColor === '#FFFFFF'
    ? '#ffffff'
    : (tenant.brand.textOnPrimary || '#ffffff');

  const heroTitleLines = typeof content.homeHeroTitle === 'string'
    ? content.homeHeroTitle.replace(/\\n/g, '\n')
    : content.homeHeroTitle;

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

  return (
    <div className="bg-[var(--color-page-bg)] overflow-x-hidden">
      <SEOHead title="Home" canonicalPath="/" structuredData={orgSchema} />

      {/* ════════════════════════════════════════
          HERO — headline top, meta pinned bottom
      ════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="hv2-hero"
        style={{
          background: `linear-gradient(145deg, var(--color-hero-start) 0%, ${tenant.brand.heroDark || 'var(--color-primary)'} 100%)`,
          color: heroTextColor,
        }}
      >
        <div className="hv2-hero__noise" />
        <div
          className="hv2-hero__orb"
          style={{
            width: '60vw', height: '60vw',
            top: '-20%', right: '-15%',
            background: `radial-gradient(circle, ${accentColor}55 0%, transparent 70%)`,
          }}
        />
        <div
          className="hv2-hero__orb"
          style={{
            width: '40vw', height: '40vw',
            bottom: '0', left: '-10%',
            background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`,
          }}
        />

        {/* MIDDLE: logo positioned above the bottom meta bar */}
        {tenantLogoUrl && (
          <div style={{
            position: 'absolute',
            top: '55%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 15,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            padding: '0 24px',
          }}>
            <img
              src={tenantLogoUrl}
              alt={`${tenant.shortName} emblem`}
              style={{ maxWidth: 350, width: '100%', height: 'auto', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* TOP: headline — sits near top (logo removed) */}
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full pt-30 md:pt-34" style={{ zIndex: 5 }}>
          <h1
            ref={headlineRef}
            className="hv2-hero__headline"
            style={{ color: heroTextColor }}
          >
            {heroTitleLines}
          </h1>
        </div>

        {/* BOTTOM: club name + district + buttons — pinned to bottom */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full pb-8 md:pb-12">
          <div className="hv2-hero__meta-line" style={{ borderTopColor: `${heroTextColor}25` }}>
            <div className="hv2-hero__meta-name" style={{ color: heroTextColor }}>
              {tenant.fullName}
            </div>
            <div className="hv2-hero__rotary-line" style={{ color: heroTextColor, marginTop: '-10px' }}>
              Rotary International D64, Bangladesh
            </div>
            <div className="hv2-hero__meta-buttons">
              <Link to="/join" className="hv2-btn-primary hv2-btn-join-custom">
                Join the Club <ArrowUpRight size={14} />
              </Link>
              <Link to="/about" className="hv2-btn-ghost">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee ticker */}
      <MarqueeTicker items={['Unite for Good', 'People of Action', 'Create Lasting Impact']} />

      {/* ════════════════════════════════════════
          IMPACT STATS
      ════════════════════════════════════════ */}
      <section className="hv2-stats max-w-5xl mx-auto px-6 mt-8">
        <div ref={statsRef} className="hv2-stats__card hv2-reveal">
          {[
            { label: 'Active Members', value: content.homeStatMembers, suffix: '+' },
            { label: 'Projects Completed', value: content.homeStatProjects, suffix: '' },
            { label: 'Volunteer Hours', value: content.homeStatHours, suffix: '+' },
          ].map((stat, i) => (
            <div key={i} className="hv2-stats__item">
              <span className="hv2-stats__label">{stat.label}</span>
              <span className="hv2-stats__number font-heading" style={headingColorStyle}>
                <ScrollAnimatedNumber end={stat.value} suffix={stat.suffix} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          MISSION BANNER
      ════════════════════════════════════════ */}
      <section
        className="hv2-mission hv2-reveal"
        style={{ background: 'var(--color-accent)', color: '#ffffff', marginTop: 60 }}
      >
        <div className="hv2-hero__noise" />
        <div className="max-w-5xl mx-auto px-6 md:px-12 relative z-10">
          <div className="hv2-section-eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Our Mission
          </div>
          <p className="hv2-mission__quote" style={{ color: '#ffffff' }}>
            {content.homeMissionText}
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          ABOUT SPLIT
      ════════════════════════════════════════ */}
      <section ref={aboutRef} className="hv2-about hv2-reveal" style={{ marginTop: 0 }}>
        <div className="hv2-about__image-wrap">
          <img src={content.homeAboutImage || generatedImgAbout} alt="Club members in action" />
        </div>
        <div className="hv2-about__content" style={{ background: 'var(--color-page-bg)' }}>
          <div className="hv2-section-eyebrow">Our Story</div>
          <h2 className="hv2-about__heading font-heading" style={headingColorStyle}>
            Building leaders through service.
          </h2>
          <p className="hv2-about__body">
            Founded under the guidance of {tenant.district}, our club brings together
            passionate individuals to tackle pressing local and global challenges. By
            joining us, you don't just volunteer — you learn how to lead.
          </p>
          <Link to="/about" className="hv2-btn-outline" style={{ width: 'fit-content' }}>
            Read Our History <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FEATURED PROJECTS
      ════════════════════════════════════════ */}
      <div className="hv2-reveal">
        <FeaturedProjects />
      </div>

      {/* ════════════════════════════════════════
          UPCOMING EVENTS
      ════════════════════════════════════════ */}
      <section className="py-28 px-6 max-w-3xl mx-auto hv2-reveal">
        <div className="flex items-end justify-between mb-16">
          <div>
            <div className="hv2-section-eyebrow">What's Coming</div>
            <h2 className="font-heading text-4xl md:text-5xl font-black" style={{ ...headingColorStyle, letterSpacing: '-0.03em' }}>
              Upcoming Events
            </h2>
          </div>
          <Link
            to="/events"
            style={{
              fontSize: 12, fontWeight: 800, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', gap: 6,
              textDecoration: 'none',
            }}
          >
            Full Calendar <ArrowUpRight size={14} />
          </Link>
        </div>

        {upcomingEvents.length > 0 ? (
          <div>
            {upcomingEvents.map((event) => (
              <Link to="/events" key={event.id} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="hv2-events__item">
                  <div>
                    <div className="hv2-events__date-month" style={{ color: 'var(--color-accent)' }}>
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div className="hv2-events__date-day font-heading" style={headingColorStyle}>
                      {new Date(event.date + 'T00:00:00').getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="hv2-events__pill">{event.type}</span>
                    <div className="hv2-events__title font-heading">{event.title}</div>
                    <div className="hv2-events__venue">
                      <MapPin size={12} />
                      {event.venue || 'TBA'}
                    </div>
                  </div>
                  <ArrowUpRight size={20} className="hv2-events__arrow shrink-0" style={{ color: 'var(--color-accent)' }} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{
            border: '1px dashed rgba(0,0,0,0.12)', borderRadius: 20,
            padding: '64px 32px', textAlign: 'center', color: '#9ca3af', fontSize: 14,
          }}>
            <Calendar size={32} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            No upcoming events at the moment.
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════
          GALLERY
      ════════════════════════════════════════ */}
      <section className="py-24 hv2-reveal" style={{ background: 'rgba(0,0,0,0.02)' }}>
        <div className="max-w-7xl mx-auto px-6 mb-14">
          <div className="flex items-end justify-between">
            <div>
              <div className="hv2-section-eyebrow">Gallery</div>
              <h2 className="font-heading text-4xl md:text-5xl font-black" style={{ ...headingColorStyle, letterSpacing: '-0.03em' }}>
                Captured Moments.
              </h2>
            </div>
            <Link
              to="/gallery"
              style={{
                fontSize: 12, fontWeight: 800, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--color-accent)',
                display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
              }}
            >
              View All <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {galleryPhotos.length > 0 ? (
          <div className="hv2-gallery__grid max-w-7xl mx-auto px-6">
            {galleryPhotos.slice(0, 6).map((photo, i) => (
              <div key={photo.id || i} className="hv2-gallery__cell" onClick={() => setLightboxIndex(i)}>
                <img src={photo.url} alt={photo.caption || 'Gallery'} />
                <div className="hv2-gallery__overlay">
                  {photo.albumTag && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {photo.albumTag.split(',').map((t: string) => t.trim()).map((tag: string) => (
                        <span key={tag} style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.15em',
                          textTransform: 'uppercase', color: 'white',
                          background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 999,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="hv2-gallery__zoom">
                  <ZoomIn size={16} color="white" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-16 text-center" style={{ color: '#9ca3af' }}>
            No featured moments available.
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════
          JOIN CTA — with updated image sizing (25%)
      ════════════════════════════════════════ */}
      <section
        className="hv2-join hv2-reveal"
        style={{ background: isLight ? 'var(--color-accent)' : '#000251', color: 'white', marginTop: 80, overflow: 'hidden' }}
      >
        <div className="hv2-join__grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: 520,
          maxWidth: '80rem',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          {/* LEFT — text content */}
          <div style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '100px 80px',
          }} className="hv2-join__left-inner">
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.25em',
              textTransform: 'uppercase', opacity: 0.5,
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
            }}>
              <span style={{ display: 'block', width: 32, height: 2, background: 'rgba(255,255,255,0.4)' }} />
              Membership
            </div>
            <h2 className="hv2-join__headline font-heading">
              Ready to make a difference?
            </h2>
            <p className="hv2-join__sub">
              Join a global network of 350,000+ young leaders taking action in their
              communities every single day.
            </p>
            <div className="hv2-join__chips">
              {['Leadership', 'Fellowship', 'Service', 'Community'].map((c) => (
                <span key={c} className="hv2-join__chip">{c}</span>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Link to="/join" className="hv2-btn-white">
                Apply for Membership <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          {/* RIGHT — image (Resized to 25%) */}
          {joinRightImageUrl && (
            <div
              className="hv2-join__right-img-wrap"
              style={{
                overflow: 'hidden',
                maxHeight: 520,
                minHeight: 0,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={joinRightImageUrl}
                alt="Join the club"
                style={{
                  width: '70%',               
                  height: 'auto',             // maintain aspect ratio
                  objectFit: 'contain',       // prevent cropping
                  display: 'block',           // remove extra spacing
                }}
              />
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════
          AREAS OF FOCUS
      ════════════════════════════════════════ */}
      <section style={{ background: '#ffffff', padding: '0', margin: '0' }}>
        <img
          src={
            isMobile
              ? 'https://res.cloudinary.com/dpaeapdp6/image/upload/yqmidupa6wxeyiu1gazo.png'
              : 'https://res.cloudinary.com/dpaeapdp6/image/upload/dgead40ncvqumhzl8je1.png'
          }
          alt="Areas of Focus"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </section>

      {/* ════════════════════════════════════════
          LIGHTBOX
      ════════════════════════════════════════ */}
      {lightboxIndex !== null && (
        <div className="hv2-lightbox" onClick={() => setLightboxIndex(null)}>
          <button className="hv2-lightbox__close" onClick={() => setLightboxIndex(null)}>
            <X size={20} />
          </button>
          <button
            className="hv2-lightbox__nav" style={{ left: 24 }}
            disabled={lightboxIndex === 0}
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
          >
            <ChevronLeft size={24} />
          </button>
          <img
            src={galleryPhotos[lightboxIndex]?.url}
            alt={galleryPhotos[lightboxIndex]?.caption || 'Gallery photo'}
            style={{ maxHeight: '85vh', maxWidth: '85vw', objectFit: 'contain', borderRadius: 12 }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="hv2-lightbox__nav" style={{ right: 24 }}
            disabled={lightboxIndex === galleryPhotos.length - 1}
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
          >
            <ChevronRight size={24} />
          </button>
          {galleryPhotos[lightboxIndex]?.caption && (
            <div className="hv2-lightbox__caption">
              {galleryPhotos[lightboxIndex].caption}
            </div>
          )}
          <div className="hv2-lightbox__counter">
            {lightboxIndex + 1} / {galleryPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
