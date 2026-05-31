import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, ExternalLink } from 'lucide-react';
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
                <h2 className="text-4xl md:text-5xl font-heading font-bold text-gray-900">Our Pillar of Support</h2>
              </div>
              
              <div className="flex justify-center w-full">
                <a 
                  href={tenant.parentOrgUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden flex flex-col items-center justify-center py-16 px-8 md:px-16 transition-all duration-500 bg-white rounded-[2rem] shadow-2xl border-2 border-transparent max-w-4xl w-full text-center hover:-translate-y-2"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 100%), linear-gradient(135deg, ${tenant.brand.primaryColor} 0%, ${tenant.brand.accentColor} 100%)`,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:translate-x-full transition-transform duration-1000 -skew-x-12 opacity-50"></div>
                  
                  <HeartHandshake size={64} className="text-[var(--color-accent)] mb-8 opacity-80 group-hover:scale-110 transition-transform duration-500" />
                  
                  <div className={`text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold text-gray-900 mb-4 bg-clip-text`}>
                    {tenant.parentOrg}
                  </div>
                  <div className="text-gray-500 font-bold tracking-[0.2em] uppercase text-sm md:text-base mt-2 flex items-center gap-3">
                    <span className="w-8 h-px bg-[var(--color-accent)]"></span>
                    {tenant.district}
                    <span className="w-8 h-px bg-[var(--color-accent)]"></span>
                  </div>
                </a>
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
