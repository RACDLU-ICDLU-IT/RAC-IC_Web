import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';

export default function FeaturedProjects() {
  const { tenant } = useTenant();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const isLight = tenant.brand.primaryColor === '#FFFFFF';

  const handleViewAll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/projects') {
      // Already on projects page — just scroll down
      const el = document.getElementById('all-projects');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/projects#all-projects');
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data: snap } = await supabase
          .from('projects')
          .select('*')
          .eq('tenant_id', tenant.id)
          .in('status', ['Ongoing', 'Completed'])   // only ongoing + completed
          .order('startDate', { ascending: false });  // newest first

        // Only show projects tagged "featured" or "Featured"
        const featured = (snap || []).filter((p: any) =>
          Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase() === 'featured')
        );
        setProjects(featured);
      } catch (err) {
        console.error('Error fetching projects', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [tenant.id]);

  if (loading || projects.length === 0) return null;

  /*
   * Theme strategy:
   * - Light tenant (isLight): use primary color bg (e.g. white/light) with
   *   accent-colored headings and dark card gradients for contrast.
   * - Dark tenant: use the hero primary bg so the section feels part of the
   *   brand palette, not a random black block.
   *
   * All colors resolved from CSS vars so they work for any tenant config.
   */
  const sectionBg = isLight
    ? 'var(--color-accent)'
    : 'var(--color-primary)';

  const headingColor = isLight
    ? 'var(--color-page-bg)'
    : 'var(--color-text-on-primary, #ffffff)';

  const subColor = isLight
    ? 'rgba(255,255,255,0.7)'
    : 'rgba(255,255,255,0.55)';

  const cardPlaceholderBg = isLight
    ? 'linear-gradient(135deg, #e8eaf0 0%, #d0d4e8 50%, #bcc3db 100%)'
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';

  const overlayGradient = isLight
    ? 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)'
    : 'linear-gradient(to top, var(--color-primary) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)';

  return (
    <section className="py-24" style={{ background: sectionBg }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-12 flex justify-between items-end">
        <div>
          <h2
            className="text-4xl md:text-5xl font-heading font-bold mb-4"
            style={{ color: headingColor }}
          >
            Our Impact.
          </h2>
          <p className="text-lg" style={{ color: subColor }}>
            Featured projects shaping our community.
          </p>
        </div>
        <button
          onClick={handleViewAll}
          className="hidden md:inline-flex font-bold hover:opacity-80 transition-opacity cursor-pointer"
          style={{ color: 'var(--color-accent)', background: 'none', border: 'none', padding: 0 }}
        >
          View All Projects &rarr;
        </button>
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
              style={{
                background: project.coverImage ? '#111' : cardPlaceholderBg,
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

              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{ background: overlayGradient }}
              />

              {/* Card content */}
              <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col justify-end">
                <div className="flex gap-3 mb-4 flex-wrap">
                  {/* Type badge */}
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{
                      background: 'var(--color-accent)',
                      color: '#ffffff',
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
                  className="font-medium mt-4 flex items-center gap-2 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
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
        <button
          onClick={handleViewAll}
          className="font-bold text-sm cursor-pointer"
          style={{ color: 'var(--color-accent)', background: 'none', border: 'none', padding: 0 }}
        >
          View All Projects &rarr;
        </button>
      </div>
    </section>
  );
}
