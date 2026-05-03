import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Megaphone, Pin } from 'lucide-react';

export default function DashboardAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')))
      .then(snap => {
        setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  // Sort pinned to top internally just in case query order isn't perfect for it
  const sorted = [...announcements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className="animate-fade-in-up max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 flex items-center gap-3">
            <Megaphone className="text-accent" /> Announcements
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Important club news, updates, and notices.</p>
        </div>
      </div>

      <div className="space-y-6">
        {sorted.map(ann => (
          <div 
            key={ann.id} 
            className={`bg-white rounded-2xl p-6 md:p-8 border shadow-sm relative overflow-hidden transition-all hover:shadow-md ${ann.isPinned ? 'border-accent/40' : 'border-gray-100'}`}
          >
            {ann.isPinned && (
              <div className="absolute top-0 right-0 bg-accent text-white px-4 py-1.5 rounded-bl-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Pin size={12} className="fill-white" /> Pinned
              </div>
            )}
            
            <div className="flex flex-col gap-1 mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {ann.createdAt ? new Date(ann.createdAt.toDate()).toLocaleDateString() : 'Recent'}
              </span>
              <h2 className="text-2xl font-heading font-bold text-primary">{ann.title}</h2>
            </div>
            
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Megaphone size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-heading font-bold text-gray-600 mb-2">No active announcements.</h3>
            <p className="text-gray-400">Check back later for updates.</p>
          </div>
        )}
      </div>
    </div>
  );
}
