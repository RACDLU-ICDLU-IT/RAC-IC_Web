import { supabase } from '../supabase';
import React, { useState, useEffect, useRef } from 'react';
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
  .b-hex-border {
    position: absolute; inset: 0; width: 100%; height: 100%;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    transition: background 0.3s ease;
    pointer-events: none;
  }
  .b-hex-inner {
    position: absolute;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    overflow: hidden;
    transition: top 0.28s ease, left 0.28s ease, right 0.28s ease, bottom 0.28s ease,
                width 0.28s ease, height 0.28s ease;
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

  /* ── Book-page flip ── */
  .bc-scene {
    width: 100%;
    perspective: 1200px;
  }
  .bc-book {
    width: 100%; position: relative;
    transform-style: preserve-3d;
  }
  /* Flip right-to-left (next) */
  @keyframes bc-flipNext {
    0%   { transform: rotateY(0deg);    opacity: 1; }
    49%  { transform: rotateY(-90deg);  opacity: 0; }
    50%  { transform: rotateY(90deg);   opacity: 0; }
    100% { transform: rotateY(0deg);    opacity: 1; }
  }
  /* Flip left-to-right (prev) */
  @keyframes bc-flipPrev {
    0%   { transform: rotateY(0deg);   opacity: 1; }
    49%  { transform: rotateY(90deg);  opacity: 0; }
    50%  { transform: rotateY(-90deg); opacity: 0; }
    100% { transform: rotateY(0deg);   opacity: 1; }
  }
  .bc-book.flip-next { animation: bc-flipNext 0.55s cubic-bezier(0.4,0,0.2,1) both; }
  .bc-book.flip-prev { animation: bc-flipPrev 0.55s cubic-bezier(0.4,0,0.2,1) both; }

  /* ── Card layout ── */
  .bc-card {
    width: 100%;
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    min-height: 200px;
    background: white;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  }
  /* Left: text content */
  .bc-left {
    flex: 1;
    padding: 28px 20px 24px 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: linear-gradient(135deg, #fff 60%, color-mix(in srgb, var(--color-accent) 6%, white));
    min-width: 0;
  }
  .bc-position {
    font-size: 9px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 2px; margin-bottom: 10px;
    color: var(--color-accent);
  }
  .bc-name {
    font-family: var(--font-heading, sans-serif);
    font-size: clamp(16px, 4vw, 22px);
    font-weight: 800; line-height: 1.15;
    color: #1a1a2e; margin-bottom: 12px;
    letter-spacing: -0.02em;
  }
  .bc-divider {
    width: 32px; height: 3px; border-radius: 2px;
    background: var(--color-accent); margin-bottom: 12px;
  }
  .bc-bio {
    font-size: 12px; line-height: 1.65;
    color: #6b7280; margin-bottom: 16px;
  }
  .bc-links { display: flex; gap: 8px; flex-wrap: wrap; }
  .bc-link {
    font-size: 10px; font-weight: 700; padding: 6px 14px; border-radius: 20px;
    text-decoration: none; letter-spacing: 0.4px;
    background: var(--color-accent); color: white;
    transition: opacity 0.2s;
  }
  .bc-link:active { opacity: 0.8; }
  /* Right: photo */
  .bc-right {
    width: 42%;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }
  .bc-photo {
    width: 100%; height: 100%; object-fit: cover; object-position: top;
    display: block;
  }
  .bc-photo-fade {
    position: absolute; inset: 0;
    background: linear-gradient(to right, white 0%, transparent 30%);
  }
  .bc-photo-fallback {
    width: 100%; height: 100%; display: flex;
    align-items: center; justify-content: center;
    font-size: 3.5rem; font-weight: 800;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, white);
  }

  /* ── Default card (no selection) ── */
  .bc-default {
    width: 100%; border-radius: 20px; padding: 24px 20px;
    text-align: center; background: white;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  }
  .bc-default-hexes { display:flex; justify-content:center; gap:6px; margin-bottom:14px; }
  .bc-default-title { font-size:15px; font-weight:700; color:#1a1a2e; margin-bottom:4px;
    font-family: var(--font-heading, sans-serif); }
  .bc-default-hint  { font-size:12px; color:#9499b7; }

  /* ── Nav row ── */
  .bc-nav {
    display: flex; align-items: center;
    justify-content: space-between;
    margin-top: 16px; padding: 0 4px;
  }
  .bc-nav-btn {
    width: 40px; height: 40px; border-radius: 50%; border: none;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.22); color: white;
    transition: background 0.2s, transform 0.15s;
  }
  .bc-nav-btn:active { background: rgba(255,255,255,0.35); transform: scale(0.94); }
  .bc-dots { display:flex; gap:5px; align-items:center; }
  .bc-dot {
    border-radius:9999px; height:5px; border:none; cursor:pointer;
    background: rgba(255,255,255,0.35);
    transition: width 0.2s ease, background 0.2s ease;
  }
  .bc-dot-active { background: white; }
`;

const SLOT_CLASSES = ['b-p1','b-p2','b-p3','b-p4','b-p5','b-p6','b-p7','b-p8','b-p9','b-p10'];

export default function Board() {
  const { tenant } = useTenant();
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeIdx, setActiveIdx]       = useState<number | null>(null);
  const [flipClass, setFlipClass]       = useState('');
  const flipTimeout                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase
      .from('board').select('*').eq('tenant_id', tenant.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { setBoardMembers(data || []); setLoading(false); },
            err => { console.error(err); setLoading(false); });
  }, [tenant.id]);

  const go = (dir: number) => {
    if (!boardMembers.length) return;
    const cls = dir > 0 ? 'flip-next' : 'flip-prev';
    setFlipClass(cls);
    if (flipTimeout.current) clearTimeout(flipTimeout.current);
    flipTimeout.current = setTimeout(() => setFlipClass(''), 560);
    setActiveIdx(prev =>
      prev === null ? 0 : (prev + dir + boardMembers.length) % boardMembers.length
    );
  };

  const goTo = (i: number) => {
    if (activeIdx === null || i === activeIdx) { setActiveIdx(i); return; }
    const cls = i > activeIdx ? 'flip-next' : 'flip-prev';
    setFlipClass(cls);
    if (flipTimeout.current) clearTimeout(flipTimeout.current);
    flipTimeout.current = setTimeout(() => setFlipClass(''), 560);
    setActiveIdx(i);
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

      {/* ── Part 1: Header + Hex Grid ── */}
      <section className="pt-20 pb-8 px-6 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-heading font-bold leading-tight mb-2"
          style={{ color: 'var(--color-accent)' }}>
          Our Board.
        </h1>
        <p className="text-sm mb-6"
          style={{ color: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' }}>
          Meet the dedicated leaders guiding {tenant.shortName}.
        </p>

        {loading ? <Spinner /> : boardMembers.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <HexGrid members={boardMembers} activeIdx={activeIdx} setActiveIdx={(i) => {
              if (i === null) { setActiveIdx(null); return; }
              goTo(i);
            }} />
          </div>
        )}
      </section>

      {/* ── Part 2: Book-flip card panel ── */}
      {!loading && boardMembers.length > 0 && (
        <section className="pt-8 pb-14 px-4"
          style={{ backgroundColor: 'var(--color-accent)' }}>

          <div className="bc-scene">
            <div className={`bc-book ${flipClass}`}>
              {active
                ? <MemberCard member={active} />
                : <DefaultCard members={boardMembers} />}
            </div>
          </div>

          {active && (
            <div className="bc-nav">
              <button className="bc-nav-btn" onClick={() => go(-1)} aria-label="Previous">
                <ChevronLeft size={18} />
              </button>
              <div className="bc-dots">
                {boardMembers.map((_, i) => (
                  <button key={i}
                    className={`bc-dot${i === activeIdx ? ' bc-dot-active' : ''}`}
                    style={{ width: i === activeIdx ? 20 : 5 }}
                    onClick={() => goTo(i)}
                    aria-label={`Member ${i + 1}`}
                  />
                ))}
              </div>
              <button className="bc-nav-btn" onClick={() => go(1)} aria-label="Next">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ── Hex grid ── */
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
          <div key={member.id}
            className={`b-hpop ${slotClass}`}
            style={{
              position: 'absolute',
              width: 'var(--hex-w)', height: 'var(--hex-h)',
              animationDelay: `${i * 50}ms`,
              zIndex: isActive ? 10 : 1,
              opacity: isDimmed ? 0.28 : 1,
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'opacity 0.28s ease, transform 0.25s ease',
              cursor: 'pointer',
            }}
            onClick={() => setActiveIdx(isActive ? null : i)}
          >
            <div className="b-hex-border" style={{
              background: isActive
                ? 'var(--color-accent)'
                : 'color-mix(in srgb, var(--color-accent) 20%, var(--color-page-bg))',
            }} />
            <div className="b-hex-inner" style={{
              top: insetPx, left: insetPx, right: insetPx, bottom: insetPx,
              width: `calc(100% - ${insetPx * 2}px)`,
              height: `calc(100% - ${insetPx * 2}px)`,
            }}>
              {member.photo ? (
                <img src={member.photo} alt={member.name} style={{
                  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  filter: isActive ? 'grayscale(0) brightness(1.05)' : 'grayscale(1) brightness(0.72)',
                }} />
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

/* ── Member card — full width, image right ── */
function MemberCard({ member }: { member: any }) {
  return (
    <div className="bc-card">
      {/* Left: info */}
      <div className="bc-left">
        {member.position && <div className="bc-position">{member.position}</div>}
        <div className="bc-name">{member.name}</div>
        <div className="bc-divider" />
        {member.bio
          ? <p className="bc-bio">{member.bio}</p>
          : <p className="bc-bio" style={{ fontStyle: 'italic', opacity: 0.5 }}>No bio available.</p>}
        {(member.email || member.linkedin || member.profile_url) && (
          <div className="bc-links">
            {member.email && (
              <a href={`mailto:${member.email}`} className="bc-link">Email</a>
            )}
            {(member.linkedin || member.profile_url) && (
              <a href={member.linkedin || member.profile_url} target="_blank" rel="noopener noreferrer" className="bc-link">
                Profile
              </a>
            )}
          </div>
        )}
      </div>
      {/* Right: photo */}
      <div className="bc-right">
        {member.photo
          ? <>
              <img src={member.photo} alt={member.name} className="bc-photo" />
              <div className="bc-photo-fade" />
            </>
          : <div className="bc-photo-fallback">{member.name?.[0]}</div>}
      </div>
    </div>
  );
}

/* ── Default card ── */
function DefaultCard({ members }: { members: any[] }) {
  return (
    <div className="bc-default">
      <div className="bc-default-hexes">
        {members.slice(0, 5).map(m => (
          <div key={m.id} style={{
            width: 40, height: 40, flexShrink: 0, overflow: 'hidden',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          }}>
            {m.photo
              ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) brightness(0.65)' }} />
              : <div style={{ width: '100%', height: '100%', backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, white)' }} />}
          </div>
        ))}
      </div>
      <p className="bc-default-title">{members.length} Board Members</p>
      <p className="bc-default-hint">Tap any photo above to view details</p>
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
