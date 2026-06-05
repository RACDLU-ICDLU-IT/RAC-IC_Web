import { supabase } from '../supabase';
import React, { useState, useEffect, useRef } from 'react';
import FeaturedProjects from '../components/FeaturedProjects';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

function getStatusStyle(status: string) {
  switch(status.toLowerCase()) {
    case 'upcoming': return 'bg-blue-100 text-blue-800';
    case 'ongoing': return 'bg-teal-100 text-teal-800';
    case 'completed': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

const STATUS_TABS = ['All', 'Upcoming', 'Ongoing', 'Completed'];

export default function Projects() {
  const { tenant } = useTenant();
  const location = useLocation();
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const allProjectsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    supabase.from('projects').select('*').eq('tenant_id', tenant.id).order('startDate', { ascending: false })
      .then(({ data: snap }) => {
        setAllProjects(snap || []);
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [tenant.id]);

  // Handle #all-projects hash — scroll when data is loaded or on navigation
  useEffect(() => {
    if (location.hash === '#all-projects' && !loading) {
      setTimeout(() => {
        const el = document.getElementById('all-projects');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.hash, loading]);

  const categories = ['All', ...Array.from(new Set(allProjects.map(p => p.type).filter(Boolean)))];

  const filtered = allProjects.filter(p => {
    const categoryMatch = activeCategory === 'All' || p.type === activeCategory;
    const statusMatch = activeStatus === 'All' || (p.status || '').toLowerCase() === activeStatus.toLowerCase();
    return categoryMatch && statusMatch;
  });

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const headingColor = isLight ? 'text-[var(--color-accent)]' : 'text-[var(--color-primary)]';

  return (
    <div className="bg-[var(--color-page-bg)] min-h-screen pt-24 pb-32">
      <SEOHead 
        title="Our Projects"
        description={`Explore the community service projects and initiatives undertaken by the ${tenant.fullName} in Dhaka.`}
        canonicalPath="/projects"
      />
      {/* Header */}
      <section className="py-16 px-6 max-w-7xl mx-auto text-center">
        <h1 className={`text-5xl md:text-7xl font-heading font-bold ${headingColor} mb-6`}>Our Work</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-16">Creating lasting change through targeted action in our local communities and around the world.</p>
        
        {/* Category Filter Pills */}
        {!loading && categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat: any) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeCategory === cat 
                    ? 'bg-accent text-primary shadow-md transform scale-105' 
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Featured Strip */}
      {activeCategory === 'All' && activeStatus === 'All' && (
        <FeaturedProjects title="Featured Projects" />
      )}

      {/* All Projects Grid */}
      <section id="all-projects" ref={allProjectsRef} className="max-w-7xl mx-auto px-6 mt-16 scroll-mt-24">
        {/* Status Tabs */}
        {!loading && (
          <div className="flex flex-wrap gap-2 mb-10">
            {STATUS_TABS.map((tab) => {
              const count = tab === 'All'
                ? allProjects.filter(p => activeCategory === 'All' || p.type === activeCategory).length
                : allProjects.filter(p =>
                    (activeCategory === 'All' || p.type === activeCategory) &&
                    (p.status || '').toLowerCase() === tab.toLowerCase()
                  ).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveStatus(tab)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                    activeStatus === tab
                      ? tab === 'Upcoming'
                        ? 'bg-blue-600 text-white shadow-md'
                        : tab === 'Ongoing'
                        ? 'bg-teal-600 text-white shadow-md'
                        : tab === 'Completed'
                        ? 'bg-gray-700 text-white shadow-md'
                        : 'bg-[var(--color-accent)] text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeStatus === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((project) => (
              <Link to={`/projects/${project.id}`} key={project.id}>
                <div className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 h-full cursor-pointer">
                  <div className="aspect-video overflow-hidden relative bg-primary/5">
                    {project.coverImage ? (
                      <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-white/90 backdrop-blur text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">{project.type}</span>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow relative overflow-hidden">
                    <div className="mb-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getStatusStyle(project.status || '')}`}>
                        {project.status}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold font-heading text-primary mb-2 line-clamp-2">{project.name}</h3>
                    <p className="text-sm text-gray-500 mb-6 font-mono">Date: {project.executionDate || project.startDate || 'TBD'}</p>
                    
                    {/* Hover Button */}
                    <div className="mt-auto pt-4 border-t border-gray-50 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="text-accent font-bold group-hover:underline">View Project Details &rarr;</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </section>
    </div>
  );
}
