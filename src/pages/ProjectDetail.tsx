import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useTenant } from '../hooks/useTenant';

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
  const { tenant } = useTenant();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from('projects').select('*').eq('id', id).eq('tenant_id', tenant.id).single().then(({ data }) => {
        if (data) {
          setProject(data);
        }
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [id, tenant.id]);

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

  let isJsonBlocks = false;
  let parsedBlocks: any[] = [];
  try {
    const parsed = JSON.parse(project.description || '');
    if (Array.isArray(parsed)) {
      isJsonBlocks = true;
      parsedBlocks = parsed;
    }
  } catch (e) {}

  const nestedUrl = (arr: any[], index: number) => {
    return arr && arr.length > index ? arr[index] : null;
  };

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
            <div className="text-white/80 text-lg font-mono">
              Date: <strong>{project.executionDate || project.startDate || 'TBD'}</strong>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-16">
          {isJsonBlocks ? (
            <div className="after:content-[''] after:table after:clear-both space-y-8">
              {parsedBlocks.map((block: any, idx: number) => {
                if (block.type === 'text') {
                  return (
                    <div 
                      key={block.id || idx}
                      className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:font-bold prose-headings:text-primary prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-p:text-gray-700 prose-p:leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(block.content || '') as string) }} 
                    />
                  );
                }
                
                if (block.type === 'image') {
                  const floatClass = block.style === 'left' ? 'md:float-left md:mr-8 md:max-w-[45%] w-full mb-6' :
                                     block.style === 'right' ? 'md:float-right md:ml-8 md:max-w-[45%] w-full mb-6' :
                                     block.style === 'full' ? 'w-full max-w-none mb-8' :
                                     'max-w-xl mx-auto w-full flex flex-col items-center justify-center text-center mb-8';
                  return (
                    <div key={block.id || idx} className={floatClass}>
                      <img src={block.url || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop&q=60'} alt={block.caption || ""} className="rounded-xl shadow-md border border-gray-100 object-cover w-full" />
                      {block.caption && (
                        <span className="text-xs text-gray-500 mt-2 font-medium tracking-wide">
                          {block.caption}
                        </span>
                      )}
                    </div>
                  );
                }

                if (block.type === 'collage') {
                  const urls = block.urls || [];
                  if (urls.length === 0) return null;
                  return (
                    <div key={block.id || idx} className="my-10 clear-both">
                      {block.layout === 'grid2' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {urls.map((url: string, index: number) => (
                            <img key={index} src={url} alt="" className="rounded-xl object-cover aspect-video w-full shadow-sm border border-gray-100" />
                          ))}
                        </div>
                      )}
                      {block.layout === 'grid3' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {urls.map((url: string, index: number) => (
                            <img key={index} src={url} alt="" className="rounded-xl object-cover aspect-video w-full shadow-sm border border-gray-100" />
                          ))}
                        </div>
                      )}
                      {block.layout === 'mosaic' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {nestedUrl(urls, 0) && (
                            <div className="sm:col-span-2">
                              <img src={urls[0]} alt="" className="rounded-xl object-cover h-full min-h-[220px] w-full shadow-sm border border-gray-100" />
                            </div>
                          )}
                          <div className="flex flex-col gap-4">
                            {urls.slice(1, 3).map((url: string, index: number) => (
                              <img key={index} src={url} alt="" className="rounded-xl object-cover aspect-video w-full shadow-sm border border-gray-100 flex-1" />
                            ))}
                          </div>
                        </div>
                      )}
                      {block.layout === 'masonry' && (
                        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
                          {urls.map((url: string, index: number) => (
                            <div key={index} className="break-inside-avoid">
                              <img src={url} alt="" className="rounded-xl object-cover w-full shadow-sm border border-gray-100" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <div 
              className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:font-bold prose-headings:text-primary prose-a:text-accent prose-a:no-underline hover:prose-a:underline prose-p:text-gray-700 prose-p:leading-relaxed prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(project.description || '') as string) }} 
            />
          )}
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
