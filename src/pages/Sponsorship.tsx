import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

export default function Sponsorship() {
  const { tenant, settings } = useTenant();
  const [sponsors, setSponsors] = useState<{ [tier: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<any>({});

  useEffect(() => {
    supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single().then(({ data }) => {
      if (data && data.data) {
        setContent(data.data);
      }
    });

    supabase.from('sponsors').select('*').eq('tenant_id', tenant.id).order('createdAt', { ascending: true })
      .then(({ data: snap }) => {
        const data = snap || [];
        const grouped = { Platinum: [], Gold: [], Silver: [], Bronze: [] } as any;
        data.forEach((s: any) => { if (grouped[s.tier]) grouped[s.tier].push(s); });
        setSponsors(grouped);
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [tenant.id]);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const highlightBorder = 'hover:border-[var(--color-accent)]';
  
  const tierConfig = {
    Platinum: { color: 'text-slate-400' },
    Gold: { color: 'text-amber-500' },
    Silver: { color: 'text-gray-400' },
    Bronze: { color: 'text-orange-700' }
  };

  return (
    <div className="bg-[var(--color-page-bg)] min-h-screen flex flex-col font-sans">
      <SEOHead 
        title="Our Sponsors"
        description={`Discover the partners and sponsors who support the community initiatives of ${tenant.fullName}.`}
        canonicalPath="/sponsorship"
      />
      {/* Hero Section */}
      <section 
        className="relative pt-40 pb-32 px-6 w-full flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: isLight 
            ? `linear-gradient(135deg, ${tenant.brand.secondaryColor} 0%, ${tenant.brand.pageBg} 100%)`
            : `linear-gradient(135deg, ${tenant.brand.primaryColor} 0%, ${tenant.brand.heroDark || tenant.brand.heroStart} 100%)`
        }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <h1 className={`text-6xl md:text-8xl lg:text-[100px] font-heading font-extrabold ${isLight ? 'text-[var(--color-accent)]' : 'text-white'} leading-tight tracking-tighter mb-6`}>
            Our Sponsors
          </h1>
          <p className={`text-xl md:text-2xl max-w-3xl mx-auto ${isLight ? 'text-gray-600' : 'text-gray-300'} leading-relaxed font-medium`}>
            {content?.sponsorshipIntro || 'We are deeply grateful for the generous support of our community partners who make our service projects possible.'}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12 w-full flex-grow">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-t-[var(--color-accent)] border-gray-200 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-32">
            
            {/* Primary Sponsor: Parent Org */}
            <div className="flex flex-col items-center">
              <div className="text-center mb-12">
                <span className="text-sm font-bold tracking-widest text-[var(--color-accent)] uppercase mb-4 block">Proudly Sponsored By</span>
              </div>
              
              <div className="flex justify-center w-full">
                <div className="group w-full max-w-xl">
                  <a
                    href={tenant.parentOrgUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center gap-6 bg-white rounded-2xl px-7 py-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-100 transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:border-[var(--color-accent)] overflow-hidden"
                  >
                    {/* Left accent stripe */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-[var(--color-accent)]" />

                    {/* Wheel */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20">
                      <img
                        src="https://rotary-ribi.org/upimages/PageMainPics/4_Wheel2013_Transp_1200.png"
                        alt="Rotary Mark of Excellence"
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:rotate-[20deg]"
                      />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[10px] font-black tracking-[0.25em] uppercase text-[var(--color-accent)] mb-1">Parent Organization</p>
                      <h2 className="text-xl md:text-2xl font-heading font-extrabold text-gray-900 leading-snug">
                        {tenant.parentOrg}
                      </h2>
                      <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-1">
                        Rotary International D64, Bangladesh
                      </p>
                    </div>

                    {/* Arrow CTA */}
                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)] transition-all duration-300 group-hover:bg-[var(--color-accent)] group-hover:text-white group-hover:border-[var(--color-accent)]">
                      <ExternalLink size={15} />
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Platinum Sponsors */}
            {sponsors.Platinum && sponsors.Platinum.length > 0 && (
              <div className="flex flex-col items-center w-full">
                <TierHeader name="Platinum" config={tierConfig.Platinum} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-12">
                  {sponsors.Platinum.map((sponsor) => (
                    <div key={sponsor.id} className={`bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100 flex flex-col items-center text-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${highlightBorder} group`}>
                      <div className="h-40 w-full flex items-center justify-center mb-8 p-4">
                        {sponsor.logoUrl ? (
                          <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500" />
                        ) : (
                          <span className="text-3xl font-heading font-bold text-gray-400">{sponsor.name}</span>
                        )}
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 mb-4">{sponsor.name}</h4>
                      {sponsor.description && <p className="text-gray-600 mb-8 leading-relaxed max-w-md">{sponsor.description}</p>}
                      {sponsor.websiteUrl && (
                        <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gray-50 text-gray-700 font-medium hover:bg-[var(--color-accent)] hover:text-white transition-colors duration-300">
                          Visit Website <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gold Sponsors */}
            {sponsors.Gold && sponsors.Gold.length > 0 && (
              <div className="flex flex-col items-center w-full">
                <TierHeader name="Gold" config={tierConfig.Gold} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-12">
                  {sponsors.Gold.map((sponsor) => (
                    <a key={sponsor.id} href={sponsor.websiteUrl || '#'} target={sponsor.websiteUrl ? "_blank" : "_self"} rel="noopener noreferrer" 
                      className={`bg-white rounded-2xl p-8 shadow-md border border-transparent flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${highlightBorder} group h-64`}>
                      <div className="h-32 w-full flex items-center justify-center mb-6">
                        {sponsor.logoUrl ? (
                          <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
                        ) : (
                          <span className="text-2xl font-heading font-bold text-gray-400">{sponsor.name}</span>
                        )}
                      </div>
                      {(!sponsor.logoUrl || sponsor.description) && (
                         <div className="font-bold text-gray-900 line-clamp-1">{sponsor.name}</div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Silver & Bronze Sponsors (Logo Grid) */}
            {((sponsors.Silver && sponsors.Silver.length > 0) || (sponsors.Bronze && sponsors.Bronze.length > 0)) && (
              <div className="flex flex-col items-center w-full space-y-24">
                
                {sponsors.Silver && sponsors.Silver.length > 0 && (
                  <div className="w-full flex flex-col items-center">
                    <TierHeader name="Silver" config={tierConfig.Silver} />
                    <div className="flex flex-wrap justify-center gap-6 mt-12 w-full max-w-5xl">
                      {sponsors.Silver.map((sponsor) => (
                        <a key={sponsor.id} href={sponsor.websiteUrl || '#'} target={sponsor.websiteUrl ? "_blank" : "_self"} rel="noopener noreferrer" 
                          className={`bg-white rounded-xl p-4 shadow-sm border border-transparent flex items-center justify-center transition-all duration-300 hover:shadow-md hover:-translate-y-1 ${highlightBorder} group w-40 h-32 md:w-56 md:h-40`}>
                          {sponsor.logoUrl ? (
                            <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-20 max-w-full object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
                          ) : (
                            <span className="text-lg font-heading font-bold text-gray-400 text-center">{sponsor.name}</span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {sponsors.Bronze && sponsors.Bronze.length > 0 && (
                  <div className="w-full flex flex-col items-center">
                    <TierHeader name="Bronze" config={tierConfig.Bronze} />
                    <div className="flex flex-wrap justify-center gap-4 mt-8 w-full max-w-4xl">
                      {sponsors.Bronze.map((sponsor) => (
                        <a key={sponsor.id} href={sponsor.websiteUrl || '#'} target={sponsor.websiteUrl ? "_blank" : "_self"} rel="noopener noreferrer" 
                          className={`bg-white rounded-lg p-3 border border-transparent flex items-center justify-center transition-all duration-300 hover:shadow hover:-translate-y-1 ${highlightBorder} group w-32 h-24 md:w-40 md:h-28`}>
                          {sponsor.logoUrl ? (
                            <img src={sponsor.logoUrl} alt={sponsor.name} className="max-h-12 max-w-full object-contain filter grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />
                          ) : (
                            <span className="text-sm font-heading font-medium text-gray-400 text-center">{sponsor.name}</span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </section>
    </div>
  );
}

function TierHeader({ name, config }: { name: string, config: any }) {
  return (
    <div className="flex flex-col items-center">
      <h3 className={`text-4xl font-heading font-bold uppercase tracking-widest ${config.color} flex items-center gap-4`}>
        <span className={`w-12 md:w-24 h-px bg-current opacity-50`}></span>
        {name}
        <span className={`w-12 md:w-24 h-px bg-current opacity-50`}></span>
      </h3>
    </div>
  );
}
