import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import { Users } from 'lucide-react';

const STYLES = `
  :root {
    --hex-w: clamp(80px, 22vw, 160px);
    --hex-h: calc(var(--hex-w) * 0.866);
    --gap: 1px;
    --col-width: calc(var(--hex-w) * 0.75 + var(--gap) * 0.866);
    --row-height: calc(var(--hex-h) + var(--gap));
  }
  .b-hex-border {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    transition: background 0.3s ease;
    pointer-events: none;
  }
  .b-hex-inner {
    position: absolute;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    overflow: hidden;
    transition: inset 0.28s ease;
  }
  @keyframes hexPop {
    0%   { transform: scale(0.55); opacity: 0; }
    72%  { transform: scale(1.07); }
    100% { transform: scale(1);    opacity: 1; }
  }
  .b-hpop { animation: hexPop 0.46s cubic-bezier(0.34,1.56,0.64,1) both; }
  .b-grid-container {
    position: relative;
    width: calc(var(--col-width) * 4 + var(--hex-w));
    height: calc(var(--row-height) * 2 + (var(--row-height) * 0.5) + var(--hex-h));
  }
  .b-p1  { left: calc(var(--col-width) * 0); top: calc(var(--row-height) * 1 + var(--row-height) * 0.5); }
  .b-p2  { left: calc(var(--col-width) * 1); top: calc(var(--row-height) * 0); }
  .b-p3  { left: calc(var(--col-width) * 1); top: calc(var(--row-height) * 1); }
  .b-p4  { left: calc(var(--col-width) * 1); top: calc(var(--row-height) * 2); }
  .b-p5  { left: calc(var(--col-width) * 2); top: calc(var(--row-height) * 0 + var(--row-height) * 0.5); }
  .b-p6  { left: calc(var(--col-width) * 2); top: calc(var(--row-height) * 1 + var(--row-height) * 0.5); }
  .b-p7  { left: calc(var(--col-width) * 3); top: calc(var(--row-height) * 0); }
  .b-p8  { left: calc(var(--col-width) * 3); top: calc(var(--row-height) * 1); }
  .b-p9  { left: calc(var(--col-width) * 4); top: calc(var(--row-height) * 0 + var(--row-height) * 0.5); }
  .b-p10 { left: calc(var(--col-width) * 3); top: calc(var(--row-height) * 2); }
`;

const SLOT_CLASSES = ['b-p1','b-p2','b-p3','b-p4','b-p5','b-p6','b-p7','b-p8','b-p9','b-p10'];

export default function Board() {
  const { tenant } = useTenant();
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('board').select('*').eq('tenant_id', tenant.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { setBoardMembers(data || []); setLoading(false); },
            err => { console.error(err); setLoading(false); });
  }, [tenant.id]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg)' }}>
      <style>{STYLES}</style>
      <SEOHead
        title="Leadership & Board"
        description={`Meet the leadership team and board members of ${tenant.fullName}.`}
        canonicalPath="/board"
      />

      <section className="pt-20 pb-2 px-3 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight"
          style={{ color: 'var(--color-accent)' }}>
          Our Board.
        </h1>
        <p className="mt-1 text-sm max-w-xs"
          style={{ color: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' }}>
          Meet the dedicated leaders guiding {tenant.shortName}.
        </p>
      </section>

      <section className="px-0 pb-14 max-w-4xl mx-auto flex justify-center">
        {loading ? <Spinner /> : boardMembers.length === 0 ? <EmptyState /> : (
          <HexGrid members={boardMembers} activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
        )}
      </section>
    </div>
  );
}

function HexGrid({ members, activeIdx, setActiveIdx }: {
  members: any[];
  activeIdx: number | null;
  setActiveIdx: (i: number | null) => void;
}) {
  return (
    <div className="b-grid-container">
      {SLOT_CLASSES.map((slotClass, i) => {
        const member = members[i];
        if (!member) return null;
        const isActive = activeIdx === i;
        const isDimmed = activeIdx !== null && !isActive;
        const insetPx  = isActive ? 3 : 2;
        return (
          <div
            key={member.id}
            className={`b-hpop ${slotClass}`}
            style={{
              position: 'absolute',
              width: 'var(--hex-w)',
              height: 'var(--hex-h)',
              animationDelay: `${i * 50}ms`,
              zIndex: isActive ? 10 : 1,
              opacity: isDimmed ? 0.28 : 1,
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'opacity 0.28s ease, transform 0.25s ease',
              cursor: 'pointer',
            }}
            onClick={() => setActiveIdx(isActive ? null : i)}
          >
            <div
              className="b-hex-border"
              style={{
                background: isActive
                  ? 'var(--color-accent)'
                  : 'var(--color-page-bg)',
              }}
            />
            <div
              className="b-hex-inner"
              style={{ top: insetPx, left: insetPx, right: insetPx, bottom: insetPx, width: `calc(100% - ${insetPx * 2}px)`, height: `calc(100% - ${insetPx * 2}px)` }}
            >
              {member.photo ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                    filter: isActive ? 'grayscale(0) brightness(1.05)' : 'grayscale(1) brightness(0.72)',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-page-bg))',
                  color: 'var(--color-accent)', fontWeight: 700, fontSize: '1.25rem',
                }}>
                  {member.name?.[0]}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 border rounded-3xl"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-page-bg))',
      }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', color: 'var(--color-accent)' }}>
        <Users size={40} />
      </div>
      <h2 className="text-xl font-bold font-heading mb-1" style={{ color: 'var(--color-primary)' }}>
        Board info coming soon.
      </h2>
      <p className="text-sm" style={{ color: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' }}>
        Check back later for updates.
      </p>
    </div>
  );
}
