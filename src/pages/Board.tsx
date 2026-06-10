import { supabase } from '../supabase';
import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import { Users, ChevronDown, MapPin, Mail, Star } from 'lucide-react';

/* ─────────────────────────────────────────────
   HEX GRID STYLES — UNTOUCHED FROM ORIGINAL
───────────────────────────────────────────── */
const HEX_STYLES = `
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

/* ─────────────────────────────────────────────
   PAGE STYLES — production-grade, contrast-safe
   Uses --color-accent (pink) for brand moments.
   All text uses explicit rgba/hex — never
   color-mix(…var(--color-primary)…) on light bg.
───────────────────────────────────────────── */
const PAGE_STYLES = `
  .tm-page {
    min-height: 100vh;
    background-color: var(--color-page-bg);
  }

  /* ── Hero ── */
  .tm-hero {
    padding: 80px 20px 0;
    max-width: 900px;
    margin: 0 auto;
  }
  .tm-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--color-accent);
    margin-bottom: 16px;
  }
  .tm-eyebrow-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-accent);
    opacity: 0.6;
  }
  .tm-heading {
    font-size: clamp(2.4rem, 8vw, 4rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--color-accent);
    font-family: var(--font-heading, inherit);
    margin: 0 0 16px;
  }
  .tm-subtext {
    font-size: 0.9375rem;
    line-height: 1.65;
    color: #6b7280;
    max-width: 460px;
    margin: 0 0 28px;
  }

  /* ── Stat strip ── */
  .tm-stats {
    display: flex;
    gap: 0;
    margin-bottom: 48px;
    border: 1px solid rgba(212, 19, 103, 0.12);
    border-radius: 14px;
    overflow: hidden;
    width: fit-content;
  }
  .tm-stat {
    padding: 14px 28px;
    text-align: center;
    min-width: 100px;
  }
  .tm-stat + .tm-stat {
    border-left: 1px solid rgba(212, 19, 103, 0.12);
  }
  .tm-stat-num {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--color-accent);
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .tm-stat-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #9ca3af;
    margin-top: 4px;
  }

  /* ── Grid section wrapper ── */
  .tm-grid-section {
    padding: 0 16px 20px;
    max-width: 900px;
    margin: 0 auto;
  }
  .tm-grid-panel {
    border: 1px solid rgba(212, 19, 103, 0.1);
    border-radius: 24px;
    padding: 36px 20px 32px;
    background: rgba(212, 19, 103, 0.015);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    overflow: hidden;
  }
  .tm-grid-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 28px;
    font-size: 11.5px;
    font-weight: 500;
    color: #9ca3af;
    letter-spacing: 0.01em;
  }
  .tm-hint-icon {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.5px solid rgba(212, 19, 103, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .tm-hint-icon::after {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--color-accent);
    opacity: 0.7;
  }

  /* ── Member detail card ── */
  .tm-detail-section {
    padding: 0 16px 60px;
    max-width: 900px;
    margin: 0 auto;
  }
  .tm-detail-card {
    border: 1px solid rgba(212, 19, 103, 0.18);
    border-radius: 20px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 4px 24px rgba(212, 19, 103, 0.07), 0 1px 4px rgba(0,0,0,0.04);
    animation: cardSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes cardSlide {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .tm-card-accent-bar {
    height: 4px;
    background: linear-gradient(90deg, var(--color-accent), rgba(212,19,103,0.4));
  }
  .tm-card-body {
    padding: 24px 24px 28px;
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }
  .tm-card-avatar-wrap {
    flex-shrink: 0;
  }
  .tm-card-avatar-hex {
    width: 72px;
    height: 62px;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    overflow: hidden;
    background: rgba(212, 19, 103, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tm-card-avatar-hex img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tm-card-avatar-initial {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--color-accent);
  }
  .tm-card-info {
    flex: 1;
    min-width: 0;
  }
  .tm-card-name {
    font-size: 1.2rem;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 0 0 4px;
  }
  .tm-card-role {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-accent);
    background: rgba(212, 19, 103, 0.08);
    border-radius: 6px;
    padding: 3px 9px;
    margin-bottom: 12px;
  }
  .tm-card-bio {
    font-size: 0.875rem;
    line-height: 1.6;
    color: #6b7280;
    margin: 0;
  }
  .tm-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 0 24px 20px;
    border-top: 1px solid #f3f4f6;
    padding-top: 16px;
  }
  .tm-card-meta-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #9ca3af;
  }
  .tm-card-meta-item svg {
    flex-shrink: 0;
  }
  .tm-card-close {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 14px 24px;
    border-top: 1px solid #f3f4f6;
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
    cursor: pointer;
    background: none;
    border-left: none;
    border-right: none;
    border-bottom: none;
    width: 100%;
    text-align: left;
    transition: color 0.15s;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .tm-card-close:hover {
    color: var(--color-accent);
  }

  /* ── Empty & Spinner ── */
  .tm-empty {
    text-align: center;
    padding: 64px 24px;
    border: 1px solid rgba(212, 19, 103, 0.12);
    border-radius: 20px;
    background: rgba(212, 19, 103, 0.025);
  }
  .tm-empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(212, 19, 103, 0.08);
    color: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }
  .tm-empty h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 6px;
  }
  .tm-empty p {
    font-size: 0.875rem;
    color: #9ca3af;
    margin: 0;
  }

  /* ── Footer note ── */
  .tm-footer-note {
    text-align: center;
    padding: 0 20px 40px;
    font-size: 12px;
    color: #d1d5db;
    letter-spacing: 0.04em;
  }
  .tm-footer-note strong {
    color: rgba(212, 19, 103, 0.45);
    font-weight: 600;
  }
`;

const SLOT_CLASSES = ['b-p1','b-p2','b-p3','b-p4','b-p5','b-p6','b-p7','b-p8','b-p9','b-p10'];

export default function Board() {
  const { tenant } = useTenant();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('board').select('*').eq('tenant_id', tenant.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { setMembers(data || []); setLoading(false); },
            err => { console.error(err); setLoading(false); });
  }, [tenant.id]);

  useEffect(() => {
    if (activeIdx !== null && detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
  }, [activeIdx]);

  const activeMember = activeIdx !== null ? members[activeIdx] : null;

  return (
    <div className="tm-page">
      <style>{HEX_STYLES + PAGE_STYLES}</style>
      <SEOHead
        title={`Our Team — ${tenant.shortName}`}
        description={`Meet the full team and leadership of ${tenant.fullName}.`}
        canonicalPath="/board"
      />

      {/* ── Hero ── */}
      <div className="tm-hero">
        <div className="tm-eyebrow">
          <span className="tm-eyebrow-dot" />
          {tenant.shortName}
        </div>
        <h1 className="tm-heading">The people<br />behind the work.</h1>
        <p className="tm-subtext">
          Every initiative, every event, every milestone — driven by this team.
          From the board to every active member, this is who makes {tenant.shortName} run.
        </p>

        {/* Stat strip — only when data loaded */}
        {!loading && members.length > 0 && (
          <div className="tm-stats">
            <div className="tm-stat">
              <div className="tm-stat-num">{members.length}</div>
              <div className="tm-stat-label">Members</div>
            </div>
            <div className="tm-stat">
              <div className="tm-stat-num">
                {[...new Set(members.map(m => m.role).filter(Boolean))].length || '—'}
              </div>
              <div className="tm-stat-label">Roles</div>
            </div>
            <div className="tm-stat">
              <div className="tm-stat-num">
                {new Date().getFullYear() - (tenant.foundedYear || new Date().getFullYear()) || '1'}
              </div>
              <div className="tm-stat-label">Year{(new Date().getFullYear() - (tenant.foundedYear || new Date().getFullYear()) || 1) !== 1 ? 's' : ''}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Hex Grid Panel ── */}
      <div className="tm-grid-section">
        <div className="tm-grid-panel">
          {loading ? (
            <Spinner />
          ) : members.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <HexGrid members={members} activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
              <p className="tm-grid-hint">
                <span className="tm-hint-icon" />
                Tap a photo to view member details
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Member Detail Card ── */}
      <div className="tm-detail-section" ref={detailRef}>
        {activeMember && (
          <div className="tm-detail-card" key={activeMember.id}>
            <div className="tm-card-accent-bar" />
            <div className="tm-card-body">
              <div className="tm-card-avatar-wrap">
                <div className="tm-card-avatar-hex">
                  {activeMember.photo
                    ? <img src={activeMember.photo} alt={activeMember.name} />
                    : <span className="tm-card-avatar-initial">{activeMember.name?.[0]}</span>
                  }
                </div>
              </div>
              <div className="tm-card-info">
                <h2 className="tm-card-name">{activeMember.name}</h2>
                {activeMember.role && (
                  <span className="tm-card-role">{activeMember.role}</span>
                )}
                {activeMember.bio && (
                  <p className="tm-card-bio">{activeMember.bio}</p>
                )}
              </div>
            </div>

            {(activeMember.email || activeMember.location || activeMember.joined_year) && (
              <div className="tm-card-meta">
                {activeMember.email && (
                  <span className="tm-card-meta-item">
                    <Mail size={12} />
                    {activeMember.email}
                  </span>
                )}
                {activeMember.location && (
                  <span className="tm-card-meta-item">
                    <MapPin size={12} />
                    {activeMember.location}
                  </span>
                )}
                {activeMember.joined_year && (
                  <span className="tm-card-meta-item">
                    <Star size={12} />
                    Member since {activeMember.joined_year}
                  </span>
                )}
              </div>
            )}

            <button className="tm-card-close" onClick={() => setActiveIdx(null)}>
              <ChevronDown size={13} />
              Close
            </button>
          </div>
        )}
      </div>

      {/* ── Footer note ── */}
      {!loading && members.length > 0 && (
        <p className="tm-footer-note">
          <strong>{tenant.shortName}</strong> · Rotary International District 3281
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEX GRID — ZERO MODIFICATIONS TO ORIGINAL
───────────────────────────────────────────── */
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
                background: isActive ? 'var(--color-accent)' : 'var(--color-page-bg)',
              }}
            />
            <div
              className="b-hex-inner"
              style={{
                top: insetPx, left: insetPx, right: insetPx, bottom: insetPx,
                width: `calc(100% - ${insetPx * 2}px)`,
                height: `calc(100% - ${insetPx * 2}px)`,
              }}
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
                  backgroundColor: 'rgba(212,19,103,0.1)',
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
      <div
        style={{
          width: 36, height: 36,
          border: '3px solid rgba(212,19,103,0.15)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="tm-empty">
      <div className="tm-empty-icon">
        <Users size={32} />
      </div>
      <h2>Team info coming soon.</h2>
      <p>Check back later for updates.</p>
    </div>
  );
}
