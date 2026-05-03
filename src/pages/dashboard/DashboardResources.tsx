import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { FolderOpen, FileText, Download, ExternalLink } from 'lucide-react';

export default function DashboardResources() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    getDocs(query(collection(db, 'resources'), orderBy('createdAt', 'desc')))
      .then(snap => {
        setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const categories = ['All', ...Array.from(new Set(resources.map(r => r.category).filter(Boolean)))];

  const filtered = filter === 'All' 
    ? resources 
    : resources.filter(r => r.category === filter);

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="animate-fade-in-up max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900 flex items-center gap-3">
          <FolderOpen className="text-accent" /> Club Resources
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Access important documents, templates, and guidelines.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
        {categories.map((cat: any) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              filter === cat 
                ? 'bg-primary text-white shadow' 
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(resource => {
          const isLink = resource.url?.startsWith('http') && !resource.url.includes('cloudinary');
          
          return (
            <div key={resource.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col group hover:border-accent/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-colors">
                <FileText size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{resource.category}</span>
              <h3 className="font-bold text-gray-900 mb-2">{resource.title}</h3>
              <p className="text-sm text-gray-500 mb-6 flex-1 line-clamp-2">{resource.description}</p>
              
              <a 
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto block text-center py-2.5 bg-gray-50 hover:bg-primary hover:text-white text-gray-700 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isLink ? (
                  <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg> Open Link</>
                ) : (
                  <><Download size={16} /> Download File</>
                )}
              </a>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
            <FolderOpen size={48} className="mx-auto mb-4 text-gray-200" />
            <h3 className="text-xl font-heading font-bold text-gray-400 mb-2">No resources found.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
