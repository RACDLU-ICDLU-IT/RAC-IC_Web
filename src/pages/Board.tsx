import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

const STYLES = `
  :root {
    --hex-w: clamp(80px, 22vw, 160px);
    --hex-h: calc(var(--hex-w) * 0.866);
    --gap: 4px;
    --col-width: calc(var(--hex-w) * 0.75 + var(--gap) * 0.866);
    --row-height: calc(var(--hex-h) + var(--gap));
  }
  .b-hex {
    position: absolute;
    width: var(--hex-w);
    height: var(--hex-h);
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    overflow: hidden;
    cursor: pointer;
    transition: opacity 0.28s ease, transform 0.25s ease;
  }
  .b-hex img {
    width: 100%; height: 100%; object-fit: cover;
    transition: filter 0.4s ease;
  }
  .b-hex-border {
    position: absolute;
    width: var(--hex-w);
    height: var(--hex-h);
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    transition: background 0.3s ease;
    pointer-events: none;
  }
  .b-hex-inner {
    position: absolute;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    overflow: hidden;
    width: 100%; height: 100%;
    transition: inset 0.28s ease;
  }
  @keyframes hexPop {
    0%   { transform: scale(0.55); opacity: 0; }
    72%  { transform: scale(1.07); }
    100% { transform: scale(1);    opacity: 1; }
  }
  .b-hpop { animation: hexPop 0.46s cubic-bezier(0.34,1.56,0.64,1) both; }
  @keyframes cardIn {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  .b-card-in { animation: cardIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }
  .b-grid-container {
    position: relative;
    width: calc(var(--col-width) * 4 + var(--hex-w));
    height: calc(var(--row-height) * 2 + (var(--row-height) * 0.5) + var(--hex-h));
  }
  /* Column positions — exact from your HTML */
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

// Slot order matches p1..p10
const SLOT_CLASSES = ['b-p1','b-p2','b-p3','b-p4','b-p5','b-p6','b-p7','b-p8','b-p9','b-p10'];

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
      <section className="pt-28 pb-6 px-6 max-w-4xl mx-auto">
        <h1 className="text-6xl md:text-[96px] font-heading font-bold leading-none"
          style={{ color: 'var(--color-accent)' }}>
          Our Board.
        </h1>
        <p className="mt-3 text-base max-w-sm"
          style={{ color: 'color-mix(in srgb, var(--color-primary) 48%, transparent)' }}>
          Meet the dedicated leaders guiding {tenant.shortName}.
        </p>
      </section>

      {/* Grid */}
      <section className="px-6 pb-0 max-w-4xl mx-auto overflow-x-auto">
        {loading ? <Spinner /> : boardMembers.length === 0 ? <EmptyState /> : (
          <HexGrid members={boardMembers} activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
        )}
      </section>

      {/* Accent panel */}
      {!loading && boardMembers.length > 0 && (
        <section className="mt-8 pt-10 pb-16 px-4"
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
                <div className="flex gap-1.5 items-center">
                  {boardMembers.map((_, i) => (
                    <button key={i} onClick={() => setActiveIdx(i)}
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: i === activeIdx ? 20 : 6, height: 6,
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

/* ── Hex grid — your exact HTML layout ── */
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

        return (
          <div key={member.id}
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
            {/* Border ring */}
            <div className="b-hex-border" style={{
              inset: 0,
              background: isActive
                ? 'var(--color-accent)'
                : 'color-mix(in srgb, var(--color-accent) 20%, var(--color-page-bg))',
            }} />
            {/* Photo */}
            <div className="b-hex-inner" style={{ inset: isActive ? 3 : 2 }}>
              {member.photo ? (
                <img src={member.photo} alt={member.name}
                  style={{
                    filter: isActive
                      ? 'grayscale(0) brightness(1.05)'
                      : 'grayscale(1) brightness(0.72)',
                  }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-heading font-bold text-xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-page-bg))',
                    color: 'var(--color-accent)',
                  }}>
                  {member.name?.[0]}
                </div>
              )}
              {/* Name on active */}
              <div style={{
                position: 'absolute', inset: 'auto 0 0',
                padding: '18px 4px 6px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.72) 60%, transparent)',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 0.3s ease',
                textAlign: 'center',
              }}>
                <span style={{ color: 'white', fontSize: 8, fontWeight: 700 }}>{member.name}</span>
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
    <div className="b-card-in rounded-2xl overflow-hidden"
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
          <div key={m.id} style={{
            width: 40, height: 40, flexShrink: 0, overflow: 'hidden',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          }}>
            {m.photo
              ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) brightness(0.65)' }} />
              : <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.12)' }} />}
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
