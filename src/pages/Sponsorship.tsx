import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';

export default function Sponsorship() {
  const [sponsors, setSponsors] = useState<{ [tier: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'pageContent')).then(snap => {
      if (snap.exists()) setContent(snap.data());
    });

    getDocs(query(collection(db, 'sponsors'), orderBy('createdAt', 'asc')))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        const grouped = { Platinum: [], Gold: [], Silver: [], Bronze: [] } as any;
        data.forEach((s: any) => { if (grouped[s.tier]) grouped[s.tier].push(s); });
        setSponsors(grouped);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const tiers = [
    { name: 'Platinum', color: 'text-slate-500', heightClass: 'h-24' },
    { name: 'Gold', color: 'text-amber-500', heightClass: 'h-18' },
    { name: 'Silver', color: 'text-gray-400', heightClass: 'h-14' },
    { name: 'Bronze', color: 'text-orange-700', heightClass: 'h-10' }
  ];

  const allEmpty = !loading && tiers.every(t => sponsors[t.name]?.length === 0);

  return (
    <div className="bg-[#F7F5F0] min-h-screen pt-24 pb-0 flex flex-col">
      <section className="py-16 md:py-24 px-6 max-w-7xl mx-auto border-b-2 border-primary w-full">
        <h1 className="text-7xl md:text-[120px] font-heading font-bold text-primary leading-none">
          Our Sponsors.
        </h1>
        <p className="text-gray-500 mt-4 text-xl max-w-3xl whitespace-pre-line">
          {content?.sponsorshipIntro || 'We are deeply grateful for the generous support of our community partners who make our service projects possible.'}
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-16 mb-24 w-full flex-grow">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allEmpty ? (
          <div className="text-center py-24 border border-gray-100 bg-white rounded-3xl">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <HeartHandshake size={48} />
            </div>
            <h2 className="text-2xl font-bold font-heading text-gray-900 mb-2">Partner with us</h2>
            <p className="text-gray-500">We are currently looking for sponsors to support our upcoming initiatives.</p>
          </div>
        ) : (
          <div className="space-y-20">
            {tiers.map(tier => {
              const tierSponsors = sponsors[tier.name];
              if (!tierSponsors || tierSponsors.length === 0) return null;

              return (
                <div key={tier.name} className="flex flex-col items-center">
                  <h3 className={`text-2xl font-heading font-bold uppercase tracking-widest mb-10 ${tier.color} relative inline-block`}>
                    <span className="relative z-10 bg-[#F7F5F0] px-4">{tier.name} Partners</span>
                    <div className="absolute top-1/2 left-[-50vw] right-[-50vw] h-px bg-gray-200 z-0" />
                  </h3>
                  
                  <div className="flex flex-wrap justify-center gap-12 md:gap-16 items-center">
                    {tierSponsors.map(sponsor => (
                      <a 
                        key={sponsor.id} 
                        href={sponsor.websiteUrl || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative flex items-center justify-center p-4 hover:scale-105 transition-transform duration-300"
                        title={sponsor.name}
                      >
                        {sponsor.logoUrl ? (
                          <img 
                            src={sponsor.logoUrl} 
                            alt={sponsor.name} 
                            className={`object-contain grayscale group-hover:grayscale-0 opacity-70 group-hover:opacity-100 transition-all duration-500 ${tier.heightClass}`}
                          />
                        ) : (
                          <div className={`flex items-center justify-center px-6 py-4 bg-white border border-gray-200 rounded-xl font-heading font-bold text-gray-400 group-hover:text-primary transition-colors ${tier.heightClass}`}>
                            {sponsor.name}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <HeartHandshake size={48} className="text-accent mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6">Partner with us to empower youth.</h2>
          <p className="text-white/70 text-lg mb-10 leading-relaxed max-w-2xl mx-auto">
            By sponsoring our Interact Club, you directly support local community service projects, youth leadership development, and international understanding initiatives.
          </p>
          <Link to="/contact" className="inline-block bg-accent text-primary px-8 py-4 rounded-full font-bold text-lg hover:bg-white transition-colors duration-300">
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
