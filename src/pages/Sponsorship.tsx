import { supabase } from '../supabase';
import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

// Rotary Mark of Excellence - Official Rotary Wheel SVG
function RotaryWheel({ size = 80, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      aria-label="Rotary Mark of Excellence"
    >
      {/* Hub */}
      <circle cx="50" cy="50" r="10" />
      {/* Inner ring */}
      <circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
      {/* Outer rim */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" />
      {/* 24 spokes */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x1 = 50 + 20 * Math.cos(rad);
        const y1 = 50 + 20 * Math.sin(rad);
        const x2 = 50 + 39 * Math.cos(rad);
        const y2 = 50 + 39 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />;
      })}
      {/* Keyway at bottom (Rotary gear notch) */}
      <rect x="44" y="88" width="12" height="8" rx="2" />
      <polygon points="44,88 56,88 52,96 48,96" />
    </svg>
  );
}

function TierHeader({ name, config }: { name: string; config: any }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-5">
        <span className="block h-px w-16 md:w-28 bg-current opacity-30" style={{ color: config.rawColor }} />
        <h3
          className="text-3xl md:text-4xl font-black uppercase tracking-[0.25em]"
          style={{ color: config.rawColor }}
        >
          {name}
        </h3>
        <span className="block h-px w-16 md:w-28 bg-current opacity-30" style={{ color: config.rawColor }} />
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-gray-400 font-semibold">{config.label}</p>
    </div>
  );
}

function SponsorCard({ sponsor, size = 'lg', highlightColor }: { sponsor: any; size?: 'lg' | 'md' | 'sm' | 'xs'; highlightColor: string }) {
  const sizeMap = {
    lg: { card: 'rounded-3xl p-10 md:p-12 shadow-2xl', logo: 'h-44', name: 'text-2xl', btn: true },
    md: { card: 'rounded-2xl p-8 shadow-xl h-64', logo: 'h-28', name: 'text-xl', btn: false },
    sm: { card: 'rounded-xl p-5 shadow-md w-44 h-36 md:w-56 md:h-44', logo: 'h-20', name: 'text-base', btn: false },
    xs: { card: 'rounded-lg p-4 shadow w-32 h-24 md:w-44 md:h-32', logo: 'h-12', name: 'text-sm', btn: false },
  };
  const cfg = sizeMap[size];

  const inner = (
    <>
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]"
        style={{ background: `radial-gradient(circle at 50% 0%, ${highlightColor}18 0%, transparent 70%)` }}
      />
      <div className={`${cfg.logo} w-full flex items-center justify-center mb-6`}>
        {sponsor.logoUrl ? (
          <img
            src={sponsor.logoUrl}
            alt={sponsor.name}
            className="max-h-full max-w-full object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
          />
        ) : (
          <span className="text-2xl font-black text-gray-300 text-center leading-tight">{sponsor.name}</span>
        )}
      </div>
      {(size === 'lg' || size === 'md') && (
        <h4 className={`${cfg.name} font-black text-gray-900 text-center mb-3 leading-tight`}>{sponsor.name}</h4>
      )}
      {size === 'lg' && sponsor.description && (
        <p className="text-gray-500 text-sm leading-relaxed text-center max-w-md mx-auto mb-8">{sponsor.description}</p>
      )}
      {cfg.btn && sponsor.websiteUrl && (
        <a
          href={sponsor.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-auto inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border-2 transition-all duration-300 group/btn"
          style={{ borderColor: highlightColor, color: highlightColor }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = highlightColor;
            (e.currentTarget as HTMLElement).style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = highlightColor;
          }}
        >
          Visit Website <ExternalLink size={14} />
        </a>
      )}
    </>
  );

  const baseClass = `relative overflow-hidden bg-white border border-gray-100 flex flex-col items-center text-center transition-all duration-400 hover:-translate-y-2 group ${cfg.card}`;
  const hoverBorder = `hover:border-[${highlightColor}]`;

  if (sponsor.websiteUrl && size !== 'lg') {
    return (
      <a
        href={sponsor.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClass} ${hoverBorder} cursor-pointer`}
        style={{ '--hover-border': highlightColor } as any}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = highlightColor)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#f3f4f6')}
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      className={`${baseClass}`}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = highlightColor)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#f3f4f6')}
    >
      {inner}
    </div>
  );
}

export default function Sponsorship() {
  const { tenant, settings } = useTenant();
  const [sponsors, setSponsors] = useState<{ [tier: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<any>({});
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('page_content')
      .select('data')
      .eq('id', 'pageContent')
      .eq('tenant_id', tenant.id)
      .single()
      .then(({ data }) => {
        if (data?.data) setContent(data.data);
      });

    supabase
      .from('sponsors')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('createdAt', { ascending: true })
      .then(
        ({ data: snap }) => {
          const data = snap || [];
          const grouped: any = { Platinum: [], Gold: [], Silver: [], Bronze: [] };
          data.forEach((s: any) => { if (grouped[s.tier]) grouped[s.tier].push(s); });
          setSponsors(grouped);
          setLoading(false);
        },
        (err) => { console.error(err); setLoading(false); }
      );
  }, [tenant.id]);

  // Slow spinning wheel on scroll
  useEffect(() => {
    let deg = 0;
    const onScroll = () => {
      if (!wheelRef.current) return;
      deg = window.scrollY * 0.08;
      wheelRef.current.style.transform = `rotate(${deg}deg)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const accent = tenant.brand.accentColor || '#F03E84';
  const isLight = tenant.brand.primaryColor === '#FFFFFF';

  const tierConfig = {
    Platinum: { rawColor: '#94a3b8', label: 'Our Highest Honour' },
    Gold: { rawColor: '#f59e0b', label: 'Gold Partners' },
    Silver: { rawColor: '#9ca3af', label: 'Silver Partners' },
    Bronze: { rawColor: '#c2773a', label: 'Bronze Partners' },
  };

  // Animated number for stats
  const hasTiers =
    (sponsors.Platinum?.length || 0) +
    (sponsors.Gold?.length || 0) +
    (sponsors.Silver?.length || 0) +
    (sponsors.Bronze?.length || 0);

  return (
    <div className="bg-[var(--color-page-bg)] min-h-screen flex flex-col font-sans">
      <SEOHead
        title="Our Sponsors"
        description={`Discover the partners and sponsors who support the community initiatives of ${tenant.fullName}.`}
        canonicalPath="/sponsorship"
      />

      {/* ── HERO ── */}
      <section
        className="relative pt-40 pb-36 px-6 w-full flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: isLight
            ? `linear-gradient(160deg, ${tenant.brand.secondaryColor} 0%, #fff 60%, ${tenant.brand.pageBg} 100%)`
            : `linear-gradient(160deg, ${tenant.brand.primaryColor} 0%, ${tenant.brand.heroDark || tenant.brand.heroStart} 100%)`,
        }}
      >
        {/* Decorative large wheel background */}
        <div
          ref={wheelRef}
          className="absolute right-[-10%] top-[-10%] opacity-[0.04] pointer-events-none select-none transition-none"
          style={{ color: '#F7A81B' }}
        >
          <RotaryWheel size={520} />
        </div>

        {/* Thin accent line left */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 opacity-60"
          style={{ background: `linear-gradient(to bottom, transparent, ${accent}, transparent)` }}
        />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Small wheel badge */}
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-8 mx-auto"
            style={{ background: '#F7A81B18', color: '#F7A81B' }}
          >
            <RotaryWheel size={38} />
          </div>

          <p
            className="text-xs font-black tracking-[0.35em] uppercase mb-5"
            style={{ color: accent }}
          >
            Rotaract Club of Dhaka Luminous
          </p>

          <h1
            className={`text-[clamp(3rem,12vw,7rem)] font-black leading-[0.9] tracking-tighter mb-8 ${isLight ? 'text-gray-900' : 'text-white'}`}
          >
            Our<br />
            <span style={{ color: accent }}>Partners</span>
          </h1>

          <div
            className="w-16 h-1 mx-auto mb-8 rounded-full"
            style={{ background: accent }}
          />

          <p
            className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium ${isLight ? 'text-gray-500' : 'text-gray-300'}`}
          >
            {content?.sponsorshipIntro ||
              'We are deeply grateful for the generous support of our community partners who make our service projects possible.'}
          </p>

          {/* Stat chips */}
          {!loading && hasTiers > 0 && (
            <div className="flex flex-wrap justify-center gap-4 mt-12">
              {[
                { label: 'Total Partners', val: hasTiers },
                { label: 'Platinum', val: sponsors.Platinum?.length || 0 },
                { label: 'Gold', val: sponsors.Gold?.length || 0 },
              ]
                .filter((s) => s.val > 0)
                .map((s) => (
                  <div
                    key={s.label}
                    className="px-5 py-3 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm"
                  >
                    <span className="text-2xl font-black mr-2" style={{ color: accent }}>
                      {s.val}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">{s.label}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--color-page-bg)] to-transparent pointer-events-none" />
      </section>

      {/* ── BODY ── */}
      <section className="max-w-7xl mx-auto px-6 py-20 w-full flex-grow">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div
              className="w-14 h-14 border-4 border-gray-100 rounded-full animate-spin"
              style={{ borderTopColor: accent }}
            />
          </div>
        ) : (
          <div className="space-y-36">

            {/* ── PRIMARY SPONSOR ── */}
            <div className="flex flex-col items-center">
              <div className="text-center mb-14">
                <p
                  className="text-xs font-black tracking-[0.35em] uppercase mb-4"
                  style={{ color: accent }}
                >
                  Proudly Sponsored By
                </p>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                  Our Pillar of Support
                </h2>
              </div>

              <a
                href={tenant.parentOrgUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden w-full max-w-3xl rounded-[2.5rem] bg-white shadow-[0_20px_80px_-20px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col items-center justify-center py-16 px-8 md:px-16 text-center transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_30px_100px_-20px_rgba(0,0,0,0.2)]"
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = accent)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#f3f4f6')}
              >
                {/* Shimmer */}
                <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />

                {/* Accent top bar */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-b-full"
                  style={{ background: accent }}
                />

                {/* Rotary Wheel replacing HeartHandshake */}
                <div
                  className="mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12"
                  style={{ color: '#F7A81B' }}
                >
                  <RotaryWheel size={72} />
                </div>

                <div className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-5">
                  {tenant.parentOrg}
                </div>

                <div className="flex items-center gap-4 text-gray-400 font-bold tracking-[0.22em] uppercase text-xs md:text-sm">
                  <span className="w-8 h-px" style={{ background: accent }} />
                  {tenant.district}
                  <span className="w-8 h-px" style={{ background: accent }} />
                </div>

                {/* External link indicator */}
                {tenant.parentOrgUrl && (
                  <div
                    className="mt-8 inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ color: accent }}
                  >
                    Visit <ExternalLink size={12} />
                  </div>
                )}
              </a>
            </div>

            {/* ── PLATINUM ── */}
            {sponsors.Platinum?.length > 0 && (
              <div className="flex flex-col items-center w-full gap-14">
                <TierHeader name="Platinum" config={tierConfig.Platinum} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                  {sponsors.Platinum.map((s) => (
                    <SponsorCard key={s.id} sponsor={s} size="lg" highlightColor={tierConfig.Platinum.rawColor} />
                  ))}
                </div>
              </div>
            )}

            {/* ── GOLD ── */}
            {sponsors.Gold?.length > 0 && (
              <div className="flex flex-col items-center w-full gap-14">
                <TierHeader name="Gold" config={tierConfig.Gold} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {sponsors.Gold.map((s) => (
                    <SponsorCard key={s.id} sponsor={s} size="md" highlightColor={tierConfig.Gold.rawColor} />
                  ))}
                </div>
              </div>
            )}

            {/* ── SILVER ── */}
            {sponsors.Silver?.length > 0 && (
              <div className="flex flex-col items-center w-full gap-14">
                <TierHeader name="Silver" config={tierConfig.Silver} />
                <div className="flex flex-wrap justify-center gap-5 w-full max-w-5xl mx-auto">
                  {sponsors.Silver.map((s) => (
                    <SponsorCard key={s.id} sponsor={s} size="sm" highlightColor={tierConfig.Silver.rawColor} />
                  ))}
                </div>
              </div>
            )}

            {/* ── BRONZE ── */}
            {sponsors.Bronze?.length > 0 && (
              <div className="flex flex-col items-center w-full gap-10">
                <TierHeader name="Bronze" config={tierConfig.Bronze} />
                <div className="flex flex-wrap justify-center gap-4 w-full max-w-4xl mx-auto">
                  {sponsors.Bronze.map((s) => (
                    <SponsorCard key={s.id} sponsor={s} size="xs" highlightColor={tierConfig.Bronze.rawColor} />
                  ))}
                </div>
              </div>
            )}

            {/* ── EMPTY STATE ── */}
            {!loading && hasTiers === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="mb-6 opacity-20" style={{ color: '#F7A81B' }}>
                  <RotaryWheel size={64} />
                </div>
                <p className="text-gray-400 font-semibold text-lg">No sponsors listed yet.</p>
              </div>
            )}

          </div>
        )}
      </section>

    </div>
  );
}
