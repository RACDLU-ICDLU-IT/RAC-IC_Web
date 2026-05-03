import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function FeaturedProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'projects'), orderBy('startDate', 'desc'), limit(5)));
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching projects", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading || projects.length === 0) return null;

  return (
    <section className="py-24 bg-[#F7F5F0]">
      <div className="max-w-7xl mx-auto px-6 mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-4">Our Impact.</h2>
          <p className="text-gray-600 text-lg">Featured projects shaping our community.</p>
        </div>
        <Link to="/projects" className="hidden md:inline-flex text-accent font-bold hover:underline">
          View All Projects &rarr;
        </Link>
      </div>

      {/* Horizontal Carousel */}
      <div className="w-full overflow-x-auto pb-8 hide-scrollbar cursor-grab active:cursor-grabbing snap-x snap-mandatory px-6 md:px-12">
        <div className="flex gap-6 w-max">
          {projects.map((project) => (
            <div key={project.id} className="w-[85vw] sm:w-[400px] md:w-[450px] aspect-[3/4] relative rounded-2xl overflow-hidden group snap-center shadow-lg bg-gray-200">
              {project.coverImage && (
                <img src={project.coverImage} alt={project.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"></div>
              
              <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col justify-end">
                <div className="flex gap-3 mb-4">
                  <span className="bg-accent text-primary text-xs font-bold px-3 py-1 rounded-full">{project.type}</span>
                  <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full">{project.status}</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">{project.name}</h3>
                <Link to={`/projects/${project.id}`} className="text-white hover:text-accent font-medium mt-4 flex items-center gap-2 opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  View Case Study &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
