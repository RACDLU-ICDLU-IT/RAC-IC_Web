import { supabase } from '../../supabase';
import React, { useState, useEffect } from 'react';
import { Presentation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';

function getStatusStyle(status: string) {
  switch(status) {
    case 'upcoming': return 'bg-blue-100 text-blue-800';
    case 'ongoing': return 'bg-teal-100 text-teal-800';
    case 'completed': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function DashboardProjects() {
  const { tenant } = useTenant();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('projects').select('*').eq('tenant_id', tenant.id).order('startDate', { ascending: false })
      .then(({ data: snap }) => {
        setProjects(snap || []);
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [tenant.id]);

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="animate-fade-in-up max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 flex items-center gap-3">
            <Presentation className="text-accent" /> Club Projects
          </h1>
          <p className="text-gray-500 mt-1 text-sm">View ongoing, upcoming, and past projects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div className="aspect-video overflow-hidden relative bg-primary/5">
              {project.coverImage ? (
                <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${getStatusStyle(project.status?.toLowerCase() ?? '')}`}>
                  {project.status}
                </span>
              </div>
            </div>
            <div className="p-6 flex flex-col flex-grow relative overflow-hidden">
              <span className="text-xs font-bold text-accent uppercase tracking-widest mb-2">{project.type}</span>
              <h3 className="text-xl font-bold font-heading text-primary mb-2 line-clamp-2">{project.name}</h3>
              <p className="text-sm text-gray-500 mb-6 font-mono">Date: {project.executionDate || project.startDate || 'TBD'}</p>
              
              <div className="mt-auto pt-4 border-t border-gray-50">
                <Link to={`/projects/${project.id}`} className="text-primary font-bold hover:text-accent transition-colors text-sm">
                  View Public Details &rarr;
                </Link>
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
            <Presentation size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No projects found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
