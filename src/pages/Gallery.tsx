import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

const defaultPhotos = [
  { id: '1', url: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?w=800&q=80', caption: 'Service Above Self', albumTag: 'Community, Featured' },
  { id: '2', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', caption: 'Rotary Team', albumTag: 'Team, Featured' },
  { id: '3', url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80', caption: 'Giving Back', albumTag: 'Community, Featured' },
  { id: '4', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80', caption: 'Leadership', albumTag: 'Events, Featured' },
  { id: '5', url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80', caption: 'Charity Walk', albumTag: 'Events, Featured' },
  { id: '6', url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80', caption: 'Impact', albumTag: 'Team, Featured' },
];

export default function Gallery() {
  const { tenant } = useTenant();
  const [photos, setPhotos] = useState<any[]>([]);
  const [albums, setAlbums] = useState<string[]>([]);
  const [albumFilter, setAlbumFilter] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [content, setContent] = useState<any>({});

  useEffect(() => {
    const fetchData = async () => {
      let currentTags: string[] | null = null;
      try {
        const { data } = await supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
        if (data && data.data) {
          setContent(data.data);
          if (data.data.galleryTags) {
            currentTags = data.data.galleryTags;
          }
        }
      } catch (_) {}

      try {
        const { data: snap } = await supabase.from('gallery').select('*').eq('tenant_id', tenant.id).order('sort_order', { ascending: true });
        const galleryData = snap || [];
        const activePhotos = galleryData.length > 0 ? galleryData : defaultPhotos;
        setPhotos(activePhotos);
        
        if (currentTags) {
          setAlbums(currentTags);
        } else {
          const tags = activePhotos.flatMap((p: any) => p.albumTag ? p.albumTag.split(',').map((t: string) => t.trim()) : []);
          const uniqueAlbums = Array.from(new Set(tags)).filter((t: any) => t.toLowerCase() !== 'featured');
          setAlbums(uniqueAlbums as string[]);
        }
      } catch (err) {
        console.error('Gallery fetch error:', err);
        setPhotos(defaultPhotos);
      }
    };
    fetchData();
  }, [tenant.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < filtered.length - 1) setLightboxIndex(lightboxIndex + 1);
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, photos, albumFilter]);

  const filtered = albumFilter === 'all' 
    ? photos 
    : photos.filter(p => p.albumTag && p.albumTag.split(',').map((t: string) => t.trim()).includes(albumFilter));

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const headingColor = isLight ? 'text-[var(--color-accent)]' : 'text-[var(--color-primary)]';

  return (
    <div className="bg-[var(--color-page-bg)] min-h-screen pt-24 pb-32">
      <SEOHead 
        title="Photo Gallery"
        description={`View photos from events and community service activities by ${tenant.fullName}.`}
        canonicalPath="/gallery"
      />
      <section className="py-16 md:py-24 px-6 max-w-7xl mx-auto">
        <h1 className={`text-7xl md:text-[120px] font-heading font-bold ${headingColor} leading-none text-center md:text-left mb-6`}>
          Gallery.
        </h1>
        <p className="text-gray-500 text-xl max-w-3xl text-center md:text-left mb-12 whitespace-pre-line">
          {content?.galleryIntro || 'Glimpses of our journey and camaraderie through community service and events.'}
        </p>
        
        {albums.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <button 
              onClick={() => setAlbumFilter('all')}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${albumFilter === 'all' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              All Photos
            </button>
            {albums.map(album => (
              <button 
                key={album} 
                onClick={() => setAlbumFilter(album)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${albumFilter === album ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {album}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 px-4 md:px-6 max-w-7xl mx-auto">
          {filtered.map((photo, i) => (
            <div 
              key={photo.id} 
              className="break-inside-avoid mb-4 group relative overflow-hidden rounded-xl cursor-pointer"
              onClick={() => setLightboxIndex(i)}
            >
              <img 
                src={photo.url} 
                alt={photo.caption || 'Gallery photo'} 
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                loading="lazy" 
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                <ZoomIn size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 md:p-8" onClick={() => setLightboxIndex(null)}>
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
            src={filtered[lightboxIndex]?.url} 
            alt="" 
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
          
          <button 
            className="absolute right-4 md:right-8 text-white hover:text-accent transition-colors z-50 disabled:opacity-30 bg-black/20 p-2 md:p-4 rounded-full"
            disabled={lightboxIndex === filtered.length - 1} 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
          >
            <ChevronRight size={32} />
          </button>
          
          {filtered[lightboxIndex]?.caption && (
            <div className="absolute bottom-12 md:bottom-8 text-white/90 text-base font-medium text-center px-4 bg-black/50 py-2 rounded-full max-w-xl mx-auto backdrop-blur-sm">
              {filtered[lightboxIndex].caption}
            </div>
          )}
          <div className="absolute bottom-4 text-white/40 text-xs font-bold tracking-widest">{lightboxIndex + 1} / {filtered.length}</div>
        </div>
      )}
    </div>
  );
}
