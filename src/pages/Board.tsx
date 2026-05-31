import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

export default function Board() {
  const { tenant } = useTenant();
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const headingColor = isLight ? 'text-[var(--color-accent)]' : 'text-[var(--color-primary)]';
  const borderColor = isLight ? 'border-[var(--color-accent)]/30' : 'border-[var(--color-primary)]/20';

  useEffect(() => {
    supabase.from('board').select('*').eq('tenant_id', tenant.id).order('sort_order', { ascending: true })
      .then(({ data: snap }) => {
        setBoardMembers(snap || []);
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [tenant.id]);

  const president = boardMembers.find(m => m.position?.toLowerCase() === 'president') || boardMembers[0];
  const otherMembers = boardMembers.filter(m => m.id !== president?.id);

  return (
    <div className="bg-[var(--color-page-bg)] min-h-screen pt-24 pb-32">
      <SEOHead 
        title="Leadership & Board"
        description={`Meet the leadership team and board members of ${tenant.fullName}.`}
        canonicalPath="/board"
      />
      <section className={`py-16 md:py-24 px-6 max-w-7xl mx-auto border-b-2 ${borderColor}`}>
        <h1 className={`text-7xl md:text-[120px] font-heading font-bold ${headingColor} leading-none`}>
          Our Board.
        </h1>
        <p className="text-gray-500 mt-4 text-xl max-w-2xl">
          Meet the dedicated leaders guiding {tenant.shortName} towards service, leadership, and community impact.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : boardMembers.length === 0 ? (
          <div className="text-center py-24 border border-gray-100 bg-white rounded-3xl">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <Users size={48} />
            </div>
            <h2 className="text-2xl font-bold font-heading text-gray-900 mb-2">Our board information will be posted soon.</h2>
            <p className="text-gray-500">Check back later for updates on our leadership team.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {president && (
              <div 
                className="col-span-full md:col-span-2 text-white rounded-3xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center border border-white/10 shadow-xl overflow-hidden relative group"
                style={{ backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)' }}
              >
                <div 
                  className="absolute inset-0 bg-gradient-to-tr opacity-50"
                  style={{
                    backgroundImage: isLight 
                      ? 'linear-gradient(to top right, var(--color-accent), rgba(212, 19, 103, 0.8))'
                      : 'linear-gradient(to top right, var(--color-primary), rgba(10, 14, 26, 0.8))'
                  }}
                />
                <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden shrink-0 border-4 border-white/50 shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-105">
                  {president.photo ? (
                    <img src={president.photo} className="w-full h-full object-cover" alt={president.name} />
                  ) : (
                    <div className="w-full h-full bg-white/20 flex items-center justify-center text-5xl font-heading font-bold text-white">
                      {president.name?.[0]}
                    </div>
                  )}
                </div>
                <div className="relative z-10 text-center md:text-left flex-1">
                  <div className="text-white text-sm font-bold uppercase tracking-widest mb-3 bg-white/20 rounded-full px-4 py-1.5 inline-block backdrop-blur-sm">
                    {president.position}
                  </div>
                  <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4">{president.name}</h2>
                  <p className="text-white/80 leading-relaxed text-lg line-clamp-4">{president.bio}</p>
                </div>
              </div>
            )}

            {otherMembers.map(member => (
              <div key={member.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-gray-50 group-hover:border-accent transition-colors shadow-inner">
                  {member.photo ? (
                    <img src={member.photo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={member.name} />
                  ) : (
                    <div className="w-full h-full bg-accent/10 flex items-center justify-center text-3xl font-heading font-bold text-accent">
                      {member.name?.[0]}
                    </div>
                  )}
                </div>
                <h3 className="font-heading font-bold text-gray-900 text-2xl mb-1 group-hover:text-accent transition-colors">{member.name}</h3>
                <p className="text-accent text-sm font-bold uppercase tracking-widest mb-4 inline-block">{member.position}</p>
                {member.bio && <p className="text-gray-500 text-sm leading-relaxed line-clamp-3">{member.bio}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
