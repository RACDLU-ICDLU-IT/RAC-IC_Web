import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

const STYLES = `
  /* POINTY-TOP hexagon */
  .hex-clip {
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  }
  @keyframes hexPop {
    0%   { transform: scale(0.5); opacity: 0; }
    72%  { transform: scale(1.07); }
    100% { transform: scale(1);    opacity: 1; }
  }
  .hex-pop { animation: hexPop 0.48s cubic-bezier(0.34,1.56,0.64,1) both; }
  @keyframes cardIn {
    from { transform: translateY(18px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  .card-in { animation: cardIn 0.36s cubic-bezier(0.22,1,0.36,1) both; }
`;

/*
  POINTY-TOP hex grid (axial offset):
    hex width  W
    hex height H = W * (2/√3) ≈ W * 1.1547
    row step   = H * 0.75
    odd rows shift right by W * 0.5

  Tracing the Canva reference cluster (10 hexes):

  Row 0 (top):     col 2, col 3, col 4   → 3 hexes (right side, top)
  Row 1 (mid-top): col 1, col 2, col 3   → 3 hexes
  Row 2 (mid-bot): col 0, col 1, col 2   → 3 hexes  (shifted left)
  Row 3 (bottom):  col 1                 → 1 hex bottom-left

  That's exactly 10.
*/

const W   = 23;               // hex width as % of container
const H   = W * 1.1547;       // pointy-top hex height
const RS  = H * 0.75;         // row vertical step
const ODD = W * 0.5;          // odd-row horizontal offset

// [col, row]
const GRID: [number, number][] = [
  [2, 0],  // 0 — top right
  [3, 0],  // 1
  [4, 0],  // 2 — far right top
  [1, 1],  // 3
  [2, 1],  // 4 — center
  [3, 1],  // 5
  [0, 2],  // 6 — far left
  [1, 2],  // 7
  [2, 2],  // 8
  [1, 3],  // 9 — bottom
];

function pos(col: number, row: number) {
  return {
    left: col * W + (row % 2 === 1 ? ODD : 0),
    top:  row * RS,
  };
}

const allPos     = GRID.map(([c, r]) => pos(c, r));
const maxTop     = Math.max(...allPos.map(p => p.top));
const CONT_H_PCT = maxTop + H;

export default function Board() {
  const { tenant } = useTenant();
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeIdx, setActiveIdx]       = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('board').select('*').eq('tenant_id', tenant.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { setBoardMembers(data || []); setLoading(false); },
            err => { console.error(err); setLoading(false); });
  }, [tenant.id]);

  const go = (dir: number) => {
    if (!boardMembers.length) return;
    setActiveIdx(prev =>
      prev === null ? 0 : (prev + dir + boardMembers.length) % boardMembers.length
    );
  };

  const active = activeIdx !== null ? boardMembers[activeIdx] ?? null : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg)' }}>
      <style>{STYLES}</style>
      <SEOHead
        title="Leadership & Board"
        description={`Meet the leadership team and board members of ${tenant.fullName}.`}
        canonicalPath="/board"
      />

      {/* Heading */}
      <section className="pt-28 pb-6 px-6 max-w-3xl mx-auto">
        <h1 className="text-6xl md:text-[96px] font-heading font-bold leading-none"
          style={{ color: 'var(--color-accent)' }}>
          Our Board.
        </h1>
        <p className="mt-3 text-base max-w-sm"
          style={{ color: 'color-mix(in srgb, var(--color-primary) 48%, transparent)' }}>
          Meet the dedicated leaders guiding {tenant.shortName}.
        </p>
      </section>

      {/* Hex cluster */}
      <section className="max-w-md mx-auto px-4 pb-0">
        {loading   ? <Spinner />    :
         boardMembers.length === 0 ? <EmptyState /> :
         <HexCluster members={boardMembers} activeIdx={activeIdx} setActiveIdx={setActiveIdx} />}
      </section>

      {/* Accent panel */}
      {!loading && boardMembers.length > 0 && (
        <section className="mt-0 pt-10 pb-16 px-4"
          style={{ backgroundColor: 'var(--color-accent)' }}>
          <div className="max-w-sm mx-auto">
            {active
              ? <MemberCard key={active.id} member={active} />
              : <DefaultCard members={boardMembers} />}

            {active && (
              <div className="flex items-center justify-between mt-5 px-1">
                <button onClick={() => go(-1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  <ChevronLeft size={20} />
                </button>
                <div className="flex gap-1.5">
                  {boardMembers.map((_, i) => (
                    <button key={i} onClick={() => setActiveIdx(i)}
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: i === activeIdx ? 20 : 6,
                        height: 6,
                        backgroundColor: i === activeIdx ? 'white' : 'rgba(255,255,255,0.35)',
                      }} />
                  ))}
                </div>
                <button onClick={() => go(1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Hex cluster ── */
function HexCluster({ members, activeIdx, setActiveIdx }: {
  members: any[];
  activeIdx: number | null;
  setActiveIdx: (i: number | null) => void;
}) {
  return (
    <div className="relative w-full select-none" style={{ paddingBottom: `${CONT_H_PCT}%` }}>
      {GRID.map(([col, row], i) => {
        const member   = members[i];
        if (!member) return null;
        const { left, top } = pos(col, row);
        const isActive = activeIdx === i;
        const isDimmed = activeIdx !== null && !isActive;

        return (
          <div key={member.id}
            className="hex-pop absolute cursor-pointer"
            style={{
              left:          `${left}%`,
              top:           `${top}%`,
              width:         `${W}%`,
              paddingBottom: `${H}%`,
              animationDelay: `${i * 50}ms`,
              zIndex:    isActive ? 10 : 1,
              opacity:   isDimmed ? 0.28 : 1,
              transform: isActive ? 'scale(1.11)' : 'scale(1)',
              transition: 'opacity 0.28s ease, transform 0.25s ease',
            }}
            onClick={() => setActiveIdx(isActive ? null : i)}
          >
            {/* Border layer */}
            <div className="hex-clip absolute inset-0" style={{
              background: isActive
                ? 'var(--color-accent)'
                : 'color-mix(in srgb, var(--color-accent) 22%, var(--color-page-bg))',
              transition: 'background 0.3s ease',
            }} />
            {/* Photo layer */}
            <div className="hex-clip absolute overflow-hidden"
              style={{ inset: isActive ? '3px' : '2px', transition: 'inset 0.28s ease' }}>
              {member.photo ? (
                <img src={member.photo} alt={member.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    filter: isActive
                      ? 'grayscale(0) brightness(1.05)'
                      : 'grayscale(1) brightness(0.7)',
                    transition: 'filter 0.4s ease',
                  }} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center font-heading font-bold text-lg"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-page-bg))',
                    color: 'var(--color-accent)',
                  }}>
                  {member.name?.[0]}
                </div>
              )}
              {/* Name overlay on active */}
              <div className="absolute inset-x-0 bottom-0 pb-2 px-1 flex flex-col items-center"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.72) 55%, transparent)',
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                }}>
                <span className="text-white text-[7px] font-bold text-center leading-tight line-clamp-1 w-full">
                  {member.name}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Member card ── */
function MemberCard({ member }: { member: any }) {
  return (
    <div className="card-in rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.13)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.22)',
      }}>
      <div className="relative w-full" style={{ height: 200 }}>
        {member.photo
          ? <img src={member.photo} alt={member.name} className="w-full h-full object-cover object-top" />
          : <div className="w-full h-full flex items-center justify-center text-5xl font-heading font-bold text-white/30">
              {member.name?.[0]}
            </div>}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 35%, transparent)' }} />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-white font-heading font-bold text-xl leading-tight">{member.name}</h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
            {member.position}
          </span>
        </div>
      </div>
      <div className="px-4 py-4">
        {member.bio
          ? <p className="text-white/80 text-sm leading-relaxed">{member.bio}</p>
          : <p className="text-white/40 text-sm italic">No bio available.</p>}
        {(member.email || member.linkedin || member.profile_url) && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {member.email && (
              <a href={`mailto:${member.email}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'white' }}>
                Email
              </a>
            )}
            {(member.linkedin || member.profile_url) && (
              <a href={member.linkedin || member.profile_url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)', color: 'white' }}>
                Profile
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Default card ── */
function DefaultCard({ members }: { members: any[] }) {
  return (
    <div className="rounded-2xl p-5 text-center"
      style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
      <div className="flex justify-center gap-1.5 mb-4">
        {members.slice(0, 5).map(m => (
          <div key={m.id} className="hex-clip w-10 h-10 overflow-hidden flex-shrink-0">
            {m.photo
              ? <img src={m.photo} alt={m.name} className="w-full h-full object-cover"
                  style={{ filter: 'grayscale(1) brightness(0.65)' }} />
              : <div className="w-full h-full" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />}
          </div>
        ))}
      </div>
      <p className="text-white font-heading font-semibold text-base">{members.length} Board Members</p>
      <p className="text-white/55 text-xs mt-1">Tap any photo above to view details</p>
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
