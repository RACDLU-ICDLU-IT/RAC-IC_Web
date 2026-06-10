import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

const STYLES = `
  :root {
    --hex-w: clamp(80px, 22vw, 160px);
    --hex-h: calc(var(--hex-w) * 0.866);
    --gap: 12px;
    --col-width: calc(var(--hex-w) * 0.75 + var(--gap) * 0.866);
    --row-height: calc(var(--hex-h) + var(--gap));
  }

  .bd {
    --neu-bg:    #e8eaf0;
    --neu-text:  #3d4468;
    --neu-muted: #9499b7;
    --neu-dark:  #c8cad4;
    --neu-light: #ffffff;
    --accent:    var(--color-accent, #c41e50);
  }
  .bd {
    min-height: 100vh;
    background: var(--neu-bg);
    font-family: var(--font-body, sans-serif);
  }

  @keyframes bd-fadeUp {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes hexPop {
    0%   { transform: scale(0.55); opacity: 0; }
    72%  { transform: scale(1.07); }
    100% { transform: scale(1);    opacity: 1; }
  }
  @keyframes cardIn {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  .bd-header {
    padding: 88px 24px 16px;
    max-width: 900px; margin: 0 auto;
    animation: bd-fadeUp 0.4s ease both;
  }
  .bd-title {
    font-family: var(--font-heading, sans-serif);
    font-size: clamp(2rem, 8vw, 3rem);
    font-weight: 800; letter-spacing: -0.03em;
    color: var(--accent); line-height: 1.05; margin-bottom: 6px;
  }
  .bd-subtitle { font-size: 13px; color: var(--neu-muted); font-weight: 400; }

  .bd-grid-wrap {
    margin: 0 16px;
    padding: 20px 20px 28px;
    animation: bd-fadeUp 0.45s 0.08s ease both;
    overflow-x: auto;
  }
  .bd-grid-max { max-width: 900px; margin: 0 auto; }

  .b-grid-container {
    position: relative;
    width: calc(var(--col-width) * 4 + var(--hex-w));
    height: calc(var(--row-height) * 2 + (var(--row-height) * 0.5) + var(--hex-h));
  }

  /* ── Exact HTML reference technique ──
     Outer .hex: NO clip-path, carries drop-shadow (follows child contour)
     Inner .hex-inner: clip-path here only, background matches page bg for extruded look
  */
  .bd-hex {
    position: absolute;
    width: var(--hex-w);
    height: var(--hex-h);
    cursor: pointer;
    filter:
      drop-shadow(5px 5px 8px rgba(0,0,0,0.15))
      drop-shadow(-5px -5px 8px rgba(255,255,255,0.7));
    transition: transform 0.3s ease, filter 0.3s ease, opacity 0.28s ease;
  }
  .bd-hex.is-dimmed { opacity: 0.35; }
  .bd-hex.is-active {
    transform: scale(1.1);
    filter:
      drop-shadow(5px 5px 8px rgba(0,0,0,0.15))
      drop-shadow(-5px -5px 8px rgba(255,255,255,0.7));
    z-index: 10;
  }
  .bd-hex:active {
    transform: scale(0.97);
    filter:
      drop-shadow(2px 2px 4px rgba(0,0,0,0.15))
      drop-shadow(-2px -2px 4px rgba(255,255,255,0.7));
  }

  .bd-hex-inner {
    width: 100%;
    height: 100%;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    background-color: var(--neu-bg);
    overflow: hidden;
    position: relative;
  }
  .bd-hex-inner img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    opacity: 0.95;
    transition: filter 0.35s ease;
  }

  /* Hex slots */
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

  .b-hpop    { animation: hexPop 0.46s cubic-bezier(0.34,1.56,0.64,1) both; }
  .b-card-in { animation: cardIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }

  /* ── Member panel ── */
  .bd-panel {
    margin: 4px 16px 0;
    padding: 24px 20px 28px;
    background: var(--neu-bg); border-radius: 28px;
    box-shadow: 14px 14px 40px var(--neu-dark), -14px -14px 40px var(--neu-light);
    animation: bd-fadeUp 0.4s 0.12s ease both;
  }
  .bd-panel-inner { max-width: 420px; margin: 0 auto; }

  .bd-member-card {
    border-radius: 20px; overflow: hidden;
    box-shadow: inset 5px 5px 12px var(--neu-dark), inset -5px -5px 12px var(--neu-light);
  }
  .bd-member-photo { position: relative; width: 100%; height: 180px; }
  .bd-member-photo img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; }
  .bd-member-photo-fallback {
    width:100%; height:100%; display:flex; align-items:center; justify-content:center;
    font-size: 3rem; font-weight: 800; color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--neu-bg));
  }
  .bd-photo-overlay { position:absolute; inset:0; background: linear-gradient(to top, rgba(0,0,0,0.7) 30%, transparent); }
  .bd-photo-info { position:absolute; bottom:12px; left:16px; right:16px; }
  .bd-member-name { font-family: var(--font-heading, sans-serif); font-size: 18px; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 3px; }
  .bd-member-pos  { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.65); }
  .bd-member-body { padding: 14px 16px 16px; background: var(--neu-bg); }
  .bd-member-bio  { font-size: 13px; line-height: 1.65; color: var(--neu-muted); }
  .bd-member-bio-empty { font-size: 13px; color: color-mix(in srgb, var(--neu-muted) 50%, transparent); font-style: italic; }
  .bd-member-links { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
  .bd-link-btn {
    font-size: 11px; font-weight: 700; padding: 7px 16px; border-radius: 10px;
    border: none; cursor: pointer; text-decoration: none; color: var(--accent);
    background: var(--neu-bg);
    box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light);
    transition: box-shadow 0.2s ease;
  }
  .bd-link-btn:active { box-shadow: inset 2px 2px 6px var(--neu-dark), inset -2px -2px 6px var(--neu-light); }

  .bd-default-card {
    border-radius: 20px; padding: 20px 16px; text-align: center;
    box-shadow: inset 5px 5px 12px var(--neu-dark), inset -5px -5px 12px var(--neu-light);
  }
  .bd-default-hexes { display:flex; justify-content:center; gap:6px; margin-bottom:12px; }
  .bd-default-name  { font-size:14px; font-weight:700; color:var(--neu-text); margin-bottom:3px; }
  .bd-default-hint  { font-size:12px; color:var(--neu-muted); }

  .bd-nav { display:flex; align-items:center; justify-content:space-between; margin-top:16px; }
  .bd-nav-btn {
    width:40px; height:40px; border-radius:12px; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    background: var(--neu-bg); color: var(--accent);
    box-shadow: 5px 5px 12px var(--neu-dark), -5px -5px 12px var(--neu-light);
    transition: box-shadow 0.2s ease, transform 0.15s ease;
  }
  .bd-nav-btn:active {
    box-shadow: inset 3px 3px 7px var(--neu-dark), inset -3px -3px 7px var(--neu-light);
    transform: scale(0.96);
  }
  .bd-dots { display:flex; gap:6px; align-items:center; }
  .bd-dot {
    border-radius: 9999px; height:6px; border:none; cursor:pointer;
    background: var(--neu-dark);
    transition: width 0.2s ease, background 0.2s ease;
  }
  .bd-dot-active { background: var(--accent); }

  .bd-spinner-wrap { display:flex; justify-content:center; padding:48px 0; }
  .bd-spinner {
    width:36px; height:36px; border-radius:50%; border:3px solid transparent;
    border-top-color: var(--accent);
    animation: bd-spin 0.8s linear infinite;
  }
  @keyframes bd-spin { to { transform: rotate(360deg); } }

  .bd-empty {
    text-align:center; padding:48px 20px; border-radius:24px;
    box-shadow: inset 5px 5px 14px var(--neu-dark), inset -5px -5px 14px var(--neu-light);
  }
  .bd-empty-icon {
    width:64px; height:64px; border-radius:50%; margin:0 auto 16px;
    display:flex; align-items:center; justify-content:center; color:var(--accent);
    box-shadow: 6px 6px 16px var(--neu-dark), -6px -6px 16px var(--neu-light);
  }
  .bd-empty-title { font-size:16px; font-weight:700; color:var(--neu-text); margin-bottom:4px; }
  .bd-empty-sub   { font-size:13px; color:var(--neu-muted); }

  @media (prefers-reduced-motion:reduce) {
    .bd, .bd * { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
  }
`;

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
    <div className="bd">
      <style>{STYLES}</style>
      <SEOHead
        title="Leadership & Board"
        description={`Meet the leadership team and board members of ${tenant.fullName}.`}
        canonicalPath="/board"
      />

      <div className="bd-header">
        <h1 className="bd-title">Our Board.</h1>
        <p className="bd-subtitle">Meet the dedicated leaders guiding {tenant.shortName}.</p>
      </div>

      <div className="bd-grid-wrap">
        <div className="bd-grid-max">
          {loading
            ? <div className="bd-spinner-wrap"><div className="bd-spinner" /></div>
            : boardMembers.length === 0
              ? <EmptyState />
              : <HexGrid members={boardMembers} activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
          }
        </div>
      </div>

      {!loading && boardMembers.length > 0 && (
        <div className="bd-panel" style={{ paddingBottom: 32 }}>
          <div className="bd-panel-inner">
            {active
              ? <MemberCard key={active.id} member={active} />
              : <DefaultCard members={boardMembers} />}
            {active && (
              <div className="bd-nav">
                <button className="bd-nav-btn" onClick={() => go(-1)} aria-label="Previous">
                  <ChevronLeft size={18} />
                </button>
                <div className="bd-dots">
                  {boardMembers.map((_, i) => (
                    <button
                      key={i}
                      className={`bd-dot${i === activeIdx ? ' bd-dot-active' : ''}`}
                      style={{ width: i === activeIdx ? 20 : 6 }}
                      onClick={() => setActiveIdx(i)}
                      aria-label={`Go to member ${i + 1}`}
                    />
                  ))}
                </div>
                <button className="bd-nav-btn" onClick={() => go(1)} aria-label="Next">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ height: 40 }} />
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

        return (
          <div
            key={member.id}
            className={`b-hpop bd-hex ${slotClass}${isActive ? ' is-active' : ''}${isDimmed ? ' is-dimmed' : ''}`}
            style={{ animationDelay: `${i * 50}ms`, zIndex: isActive ? 10 : 1 }}
            onClick={() => setActiveIdx(isActive ? null : i)}
          >
            <div className="bd-hex-inner">
              {member.photo ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  style={{
                    filter: isActive
                      ? 'grayscale(0) brightness(1.05)'
                      : 'grayscale(1) brightness(0.72)',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontWeight: 800, fontSize: '1.4rem',
                }}>
                  {member.name?.[0]}
                </div>
              )}
              {/* Name overlay on active */}
              <div style={{
                position: 'absolute', inset: 'auto 0 0',
                padding: '20px 4px 8px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 60%, transparent)',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 0.3s ease',
                textAlign: 'center',
              }}>
                <span style={{ color: 'white', fontSize: 9, fontWeight: 700 }}>{member.name}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MemberCard({ member }: { member: any }) {
  return (
    <div className="bd-member-card b-card-in">
      <div className="bd-member-photo">
        {member.photo
          ? <img src={member.photo} alt={member.name} />
          : <div className="bd-member-photo-fallback">{member.name?.[0]}</div>}
        <div className="bd-photo-overlay" />
        <div className="bd-photo-info">
          <div className="bd-member-name">{member.name}</div>
          {member.position && <div className="bd-member-pos">{member.position}</div>}
        </div>
      </div>
      <div className="bd-member-body">
        {member.bio
          ? <p className="bd-member-bio">{member.bio}</p>
          : <p className="bd-member-bio-empty">No bio available.</p>}
        {(member.email || member.linkedin || member.profile_url) && (
          <div className="bd-member-links">
            {member.email && (
              <a href={`mailto:${member.email}`} className="bd-link-btn">Email</a>
            )}
            {(member.linkedin || member.profile_url) && (
              <a href={member.linkedin || member.profile_url} target="_blank" rel="noopener noreferrer" className="bd-link-btn">
                Profile
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultCard({ members }: { members: any[] }) {
  return (
    <div className="bd-default-card">
      <div className="bd-default-hexes">
        {members.slice(0, 5).map(m => (
          <div key={m.id} style={{
            width: 38, height: 38, flexShrink: 0, overflow: 'hidden',
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          }}>
            {m.photo
              ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) brightness(0.7)' }} />
              : <div style={{ width: '100%', height: '100%', background: 'color-mix(in srgb, var(--accent) 10%, #e8eaf0)' }} />}
          </div>
        ))}
      </div>
      <p className="bd-default-name">{members.length} Board Members</p>
      <p className="bd-default-hint">Tap any photo above to view details</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bd-empty">
      <div className="bd-empty-icon"><Users size={32} /></div>
      <p className="bd-empty-title">Board info coming soon.</p>
      <p className="bd-empty-sub">Check back later for updates.</p>
    </div>
  );
}
