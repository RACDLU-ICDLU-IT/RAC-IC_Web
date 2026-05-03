import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';
import { Button } from '../components/ui/Button';
import MarqueeTicker from '../components/MarqueeTicker';
import { Link } from 'react-router-dom';
import ScrollAnimatedNumber from '../components/ScrollAnimatedNumber';
import FeaturedProjects from '../components/FeaturedProjects';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import imgGallery1 from '../assets/images/regenerated_image_1777783191084.jpg';
import imgGallery2 from '../assets/images/regenerated_image_1777783192770.jpg';
import imgGallery3 from '../assets/images/regenerated_image_1777783183004.jpg';
import imgGallery4 from '../assets/images/regenerated_image_1777783180868.jpg';
import imgGallery5 from '../assets/images/regenerated_image_1777783189156.jpg';
import imgGallery6 from '../assets/images/regenerated_image_1777783187022.jpg';
import generatedImgAbout from '../assets/images/regenerated_image_1777820660503.jpg';
import { ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react';

const defaultPhotos = [
  { id: '1', url: imgGallery1, caption: 'Service Above Self', albumTag: 'Community, Featured' },
  { id: '2', url: imgGallery2, caption: 'Rotary Team', albumTag: 'Team, Featured' },
  { id: '3', url: imgGallery3, caption: 'Giving Back', albumTag: 'Community, Featured' },
  { id: '4', url: imgGallery4, caption: 'Leadership', albumTag: 'Events, Featured' },
  { id: '5', url: imgGallery5, caption: 'Charity Walk', albumTag: 'Events, Featured' },
  { id: '6', url: imgGallery6, caption: 'Impact', albumTag: 'Team, Featured' },
];

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [content, setContent] = useState<any>({
    homeHeroTitle: 'Service\nAbove Self.',
    homeHeroSubtitle: 'INTERACT CLUB OF DHAKA LUMINOUS — District 64',
    homeMissionText: 'We are a generation of action. Bridging continents, uplifting communities, and proving that youth can inspire global change.',
    homeStatMembers: 120,
    homeStatProjects: 45,
    homeStatHours: 1000,
  });

  useEffect(() => {
    if (!headlineRef.current) return;
    
    // Split text animation
    const split = new SplitType(headlineRef.current, { types: 'words,chars' });
    
    gsap.from(split.chars, {
      y: 100,
      opacity: 0,
      rotationZ: 10,
      duration: 1.2,
      stagger: 0.02,
      ease: 'power4.out',
      delay: 0.2,
    });

    return () => {
      split.revert();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch up to 3 upcoming public events
        const eventsSnap = await getDocs(
          query(collection(db, 'events'), where('isPublic', '==', true), where('date', '>=', today), orderBy('date', 'asc'), limit(3))
        );
        setUpcomingEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Fetch gallery photos
        const gallerySnap = await getDocs(
          query(collection(db, 'gallery'), orderBy('order', 'asc'))
        );
        const fetchedPhotos = gallerySnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (fetchedPhotos.length > 0) {
          const featuredPhotos = fetchedPhotos.filter((p: any) => p.albumTag && p.albumTag.toLowerCase().includes('featured'));
          setGalleryPhotos(featuredPhotos);
        } else {
          setGalleryPhotos(defaultPhotos);
        }

        // Fetch page content
        const contentSnap = await getDoc(doc(db, 'settings', 'pageContent'));
        if (contentSnap.exists()) {
          setContent((prev: any) => ({ ...prev, ...contentSnap.data() }));
        }
        
      } catch (err) {
        console.error("Error fetching home data:", err);
      }
    };
    
    fetchData();
  }, []);

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

  return (
    <div className="bg-[#F7F5F0]">
      {/* Hero Section */}
      <section 
        ref={heroRef} 
        className="relative min-h-[90vh] flex flex-col justify-end pb-24 bg-[#020728] text-white pt-32 overflow-hidden"
      >
        {/* Particle/Grain Background overlay (CSS) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}>
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 flex flex-col md:flex-row justify-between items-end gap-12">
          <div className="max-w-4xl">
            <div className="inline-flex flex-col items-start gap-1 px-4 py-3 rounded-2xl border border-white/20 text-xs tracking-widest uppercase mb-8 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <span className="font-bold">INTERACT CLUB OF DHAKA LUMINOUS</span>
              </div>
              <span className="text-white/70 text-[10px] pl-4">SPONSORED BY ROTARY CLUB OF DHAKA LUMINOUS</span>
            </div>
            <h1 
              ref={headlineRef}
              className="text-fluid-hero font-heading text-6xl md:text-8xl lg:text-[120px] font-bold leading-[0.9] tracking-tighter whitespace-pre-line"
            >
              {typeof content.homeHeroTitle === 'string' ? content.homeHeroTitle.replace(/\\n/g, '\n') : content.homeHeroTitle}
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Link to="/join">
              <Button size="lg" variant="primary">Join Our Club</Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline">Learn More</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Marquee Ticker */}
      <MarqueeTicker items={['Unite for Good', 'People of Action', 'Create Lasting Impact']} />

      {/* Impact Stats Overlay */}
      <section className="relative -mt-12 z-20 max-w-6xl mx-auto px-6">
        <div className="bg-[#F7F5F0] rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-2">Members</span>
              <span className="text-6xl font-heading font-semibold text-primary">
                <ScrollAnimatedNumber end={content.homeStatMembers} suffix="+" />
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-2">Projects</span>
              <span className="text-6xl font-heading font-semibold text-primary">
                <ScrollAnimatedNumber end={content.homeStatProjects} />
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <span className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-2">Vol. Hours</span>
              <span className="text-6xl font-heading font-semibold text-primary">
                <ScrollAnimatedNumber end={content.homeStatHours} suffix="+" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-32 bg-[#020728] text-white mt-32 relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}>
        </div>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-3xl md:text-5xl lg:text-6xl font-heading leading-tight font-medium text-[#f0f0f0]">
            {content.homeMissionText}
          </p>
        </div>
      </section>

      {/* About Preview */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5">
            <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-4">Our Story</h2>
            <h3 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-6">Building leaders through service.</h3>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Founded under the guidance of Rotary International District 64, our club brings together passionate students aged 12-18 to tackle pressing local and global challenges. By joining us, you don't just volunteer—you learn how to lead.
            </p>
            <Link to="/about">
              <Button variant="outline" className="text-primary border-primary hover:bg-primary hover:text-white">Read Our History</Button>
            </Link>
          </div>
          <div className="lg:col-span-7 relative">
            <div className="aspect-[4/3] bg-gray-200 rounded-xl overflow-hidden shadow-2xl relative translate-x-0 lg:translate-x-12">
              <img src={generatedImgAbout} alt="Interact members volunteering" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-accent rounded-full -z-10 mix-blend-multiply blur-2xl opacity-60 hidden md:block"></div>
          </div>
        </div>
      </section>

      <FeaturedProjects />

      {/* Upcoming Events Teaser */}
      <section className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col items-center justify-center text-center mb-16 space-y-4">
            <h2 className="text-4xl font-heading font-bold text-primary">Events</h2>
            <Link to="/events" className="text-accent font-bold hover:underline">Full Calendar &rarr;</Link>
          </div>
          <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <Link to="/events" key={event.id} className="flex flex-col md:flex-row gap-6 md:gap-12 p-6 md:p-8 rounded-2xl hover:bg-[#F7F5F0] transition-colors border border-transparent hover:border-gray-200 group cursor-pointer block">
                <div className="flex flex-col md:w-32 shrink-0">
                  <span className="text-accent font-bold text-lg uppercase tracking-wide">
                    {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-5xl font-heading font-bold text-primary">
                    {new Date(event.date + 'T00:00:00').getDate()}
                  </span>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex gap-2 items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full">{event.type}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-primary mb-2 group-hover:text-accent transition-colors">{event.title}</h3>
                  <p className="text-gray-500 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {event.venue || 'TBA'}
                  </p>
                </div>
              </Link>
            )) : (
              <div className="py-12 border border-dashed border-gray-200 rounded-2xl text-center text-gray-500 bg-gray-50">
                No upcoming events at the moment.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Gallery Snapshot */}
      <section className="py-24 bg-[#F7F5F0]">
        <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
          <h2 className="text-4xl font-heading font-bold text-primary mb-4">Captured Moments.</h2>
          <p className="text-gray-600">Glimpses of our journey and camaraderie.</p>
        </div>
        
        {galleryPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-6 max-w-7xl mx-auto auto-rows-[250px]">
            {galleryPhotos.slice(0, 6).map((photo, i) => {
              // Creating a Masonry-like layout through specific spanning classes
              let spanClass = '';
              if (i === 1) spanClass = 'md:row-span-2 aspect-auto';
              else if (i === 5) spanClass = 'md:col-start-3 md:col-span-2 aspect-auto';
              else spanClass = 'aspect-auto';

              return (
                <div key={photo.id || i} className={`${spanClass} relative group bg-gray-200 rounded-xl overflow-hidden cursor-pointer`} onClick={() => setLightboxIndex(i)}>
                  <img src={photo.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={photo.caption || "Gallery"} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center">
                     <ZoomIn size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex flex-wrap gap-1 mt-1">
                      {photo.albumTag && photo.albumTag.split(',').map((t: string) => t.trim()).map((tag: string) => (
                        <span key={tag} className="text-[10px] uppercase font-bold text-white bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 text-center py-12 text-gray-500">
             No featured captured moments available right now.
          </div>
        )}
        
        <div className="mt-12 text-center">
          <Link to="/gallery">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">Visit Full Gallery</Button>
          </Link>
        </div>
      </section>

      {/* Join Section */}
      <section className="py-32 bg-primary text-white text-center px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-5xl md:text-7xl font-heading font-bold mb-6">Ready to make a difference?</h2>
          <p className="text-xl text-gray-300 mb-10">Join a global network of 350,000+ young leaders taking action in their communities.</p>
          <Link to="/join">
            <Button size="lg" variant="primary">Apply for Membership</Button>
          </Link>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-accent transition-colors z-50 bg-black/20 p-2 rounded-full" onClick={() => setLightboxIndex(null)}>
            <X size={32} />
          </button>
          
          <button 
            className="absolute left-4 md:left-8 text-white hover:text-accent transition-colors z-50 disabled:opacity-30 bg-black/20 p-2 md:p-4 rounded-full"
            disabled={lightboxIndex === 0} 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
          >
            <ChevronLeft size={32} />
          </button>
          
          <img 
            src={galleryPhotos[lightboxIndex]?.url} 
            alt={galleryPhotos[lightboxIndex]?.caption || "Gallery photo"} 
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
          
          <button 
            className="absolute right-4 md:right-8 text-white hover:text-accent transition-colors z-50 disabled:opacity-30 bg-black/20 p-2 md:p-4 rounded-full"
            disabled={lightboxIndex === galleryPhotos.length - 1} 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
          >
            <ChevronRight size={32} />
          </button>
          
          {galleryPhotos[lightboxIndex]?.caption && (
            <div className="absolute bottom-12 md:bottom-8 text-white/90 text-base font-medium text-center px-4 bg-black/50 py-2 rounded-full max-w-xl mx-auto backdrop-blur-sm">
              {galleryPhotos[lightboxIndex].caption}
            </div>
          )}
          <div className="absolute bottom-4 text-white/40 text-xs font-bold tracking-widest">{lightboxIndex + 1} / {galleryPhotos.length}</div>
        </div>
      )}
    </div>
  );
}
