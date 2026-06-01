import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';

export default function FeaturedProjects() {
  const { tenant } = useTenant();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data: snap } = await supabase
          .from('projects')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('startDate', { ascending: false });
        setProjects((snap || []).slice(0, 5));
      } catch (err) {
        console.error('Error fetching projects', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [tenant.id]);

  if (loading || projects.length === 0) return null;

  return (
    /*
     * FIX: was bg-[var(--color-hero-start)] which resolves to the hero's hot-pink
     * gradient start color for RACDLU — making the entire section magenta.
     * Use an explicit dark bg so all card text (white) is legible and the section
     * creates a strong visual break in the page hierarchy.
     */
    <section className="py-24" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-12 flex justify-between items-end">
        <div>
          {/* FIX: was text-primary (magenta) on a magenta bg = invisible.
              Now white on dark bg. */}
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
            Our Impact.
          </h2>
          {/* FIX: was text-gray-600 on magenta = poor contrast. Now muted on dark. */}
          <p className="text-gray-400 text-lg">
            Featured projects shaping our community.
          </p>
        </div>
        <Link
          to="/projects"
          className="hidden md:inline-flex font-bold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-accent)' }}
        >
          View All Projects &rarr;
        </Link>
      </div>

      {/* Horizontal carousel */}
      <div
        className="w-full overflow-x-auto pb-8 cursor-grab active:cursor-grabbing snap-x snap-mandatory px-6 md:px-12"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-6 w-max">
          {projects.map((project) => (
            <div
              key={project.id}
              className="w-[85vw] sm:w-[400px] md:w-[450px] aspect-[3/4] relative rounded-2xl overflow-hidden group snap-center shadow-xl"
              /*
               * FIX: was bg-gray-200 (light grey) which made the card look broken
               * when no coverImage is present. A dark gradient placeholder looks
               * intentional and keeps all overlaid white text readable.
               */
              style={{
                background: project.coverImage
                  ? '#111'
                  : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              }}
            >
              {/* Cover image */}
              {project.coverImage && (
                <img
                  src={project.coverImage}
                  alt={project.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}

              {/*
               * FIX: was `from-primary/90` using a Tailwind opacity modifier on a
               * CSS custom property — Tailwind cannot compute the RGBA value at
               * build time from a var(), so the gradient silently fails and the
               * overlay renders as fully transparent. Using an inline style with a
               * CSS var in a gradient works reliably in all browsers.
               */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, var(--color-primary) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)',
                }}
              />

              {/* Card content */}
              <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col justify-end">
                <div className="flex gap-3 mb-4 flex-wrap">
                  {/* Type badge */}
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{
                      background: 'var(--color-accent)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {project.type}
                  </span>
                  {/* Status badge */}
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  >
                    {project.status}
                  </span>
                </div>

                <h3 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2 leading-tight">
                  {project.name}
                </h3>

                {project.description && (
                  <p className="text-white/70 text-sm line-clamp-2 mb-2">
                    {project.description}
                  </p>
                )}

                <Link
                  to={`/projects/${project.id}`}
                  className="text-white font-medium mt-4 flex items-center gap-2 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                  style={{ color: 'var(--color-accent)' }}
                >
                  View Case Study &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile "view all" link */}
      <div className="mt-8 px-6 md:hidden">
        <Link
          to="/projects"
          className="font-bold text-sm"
          style={{ color: 'var(--color-accent)' }}
        >
          View All Projects &rarr;
        </Link>
      </div>
    </section>
  );
}
