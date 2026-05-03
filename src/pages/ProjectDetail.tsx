import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { marked } from 'marked';

function getStatusStyle(status: string) {
  switch(status) {
    case 'upcoming': return 'bg-blue-100 text-blue-800';
    case 'ongoing': return 'bg-teal-100 text-teal-800';
    case 'completed': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getDoc(doc(db, 'projects', id)).then(snap => {
      if (snap.exists()) setProject({ id: snap.id, ...snap.data() });
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div className="min-h-screen pt-32 pb-24 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (!project) {
    return <div className="min-h-screen pt-32 pb-24 text-center">
      <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">Project Not Found</h1>
      <Link to="/projects" className="text-accent font-bold hover:underline">← Back to Projects</Link>
    </div>;
  }

  return (
    <div className="bg-white min-h-screen pt-24 pb-32">
      <article>
        {/* Full-width hero image */}
        <div className="relative w-full h-[60vh] min-h-[400px] bg-primary">
          {project.coverImage && (
            <img src={project.coverImage} className="w-full h-full object-cover opacity-60" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 max-w-5xl mx-auto inset-x-0">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-accent bg-primary/50 px-3 py-1 rounded-full backdrop-blur-sm">
                {project.type}
              </span>
              <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-sm ${getStatusStyle(project.status.toLowerCase())}`}>
                {project.status}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold text-white leading-tight mb-4">
              {project.name}
            </h1>
            <div className="text-white/80 text-lg">
              Started: <strong>{project.startDate || 'TBD'}</strong>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div 
            className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:font-bold prose-headings:text-primary prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-p:text-gray-700 prose-p:leading-relaxed prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: marked(project.description || '') }} 
          />
        </div>

        {project.gallery && project.gallery.length > 0 && (
          <div className="max-w-7xl mx-auto px-6 py-16 border-t border-gray-100">
            <h2 className="text-3xl font-heading font-bold text-primary mb-8">Gallery</h2>
            <div className="flex overflow-x-auto pb-8 gap-6 hide-scrollbar snap-x">
              {project.gallery.map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="h-64 rounded-xl object-cover snap-center" />
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-6 pb-16">
          <Link to="/projects" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary font-bold transition-colors">
            ← Back to Projects
          </Link>
        </div>
      </article>
    </div>
  );
}
