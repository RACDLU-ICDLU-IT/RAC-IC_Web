import { supabase } from '../supabase';
import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import { Users, ChevronDown, Shield, X } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   FILL-ORDER SLOT DEFINITIONS
   top-to-bottom for 10/18 (looks cleanest with sparse counts)
   center-outward for 22/23 (symmetric grids always look full)
═══════════════════════════════════════════════════════════════ */
const SLOTS_10 = [
  { cls: 'b-p2',  logo: false },
  { cls: 'b-p7',  logo: false },
  { cls: 'b-p5',  logo: false },
  { cls: 'b-p9',  logo: false },
  { cls: 'b-p3',  logo: false },
  { cls: 'b-p8',  logo: false },
  { cls: 'b-p1',  logo: false },
  { cls: 'b-p6',  logo: false },
  { cls: 'b-p4',  logo: false },
  { cls: 'b-p10', logo: false },
];

const SLOTS_18 = [
  { cls: 'b-p2',  logo: false },
  { cls: 'b-p7',  logo: false },
  { cls: 'b-p5',  logo: false },
  { cls: 'b-p9',  logo: false },
  { cls: 'b-p3',  logo: false },
  { cls: 'b-p8',  logo: false },
  { cls: 'b-p1',  logo: false },
  { cls: 'b-p6',  logo: false },
  { cls: 'b-p4',  logo: false },
  { cls: 'b-p10', logo: false },
  { cls: 'b-p14', logo: false },
  { cls: 'b-p18', logo: false },
  { cls: 'b-p12', logo: false },
  { cls: 'b-p16', logo: false },
  { cls: 'b-p11', logo: false },
  { cls: 'b-p15', logo: false },
  { cls: 'b-p13', logo: false },
  { cls: 'b-p17', logo: false },
];

const SLOTS_22 = [
  { cls: 'b-q-x2y1', logo: false },
  { cls: 'b-q-x2y3', logo: false },
  { cls: 'b-q-x1y1', logo: false },
  { cls: 'b-q-x3y1', logo: false },
  { cls: 'b-q-x1y2', logo: false },
  { cls: 'b-q-x3y2', logo: false },
  { cls: 'b-q-x1y0', logo: false },
  { cls: 'b-q-x3y0', logo: false },
  { cls: 'b-q-x1y3', logo: false },
  { cls: 'b-q-x3y3', logo: false },
  { cls: 'b-q-x0y2', logo: false },
  { cls: 'b-q-x4y2', logo: false },
  { cls: 'b-q-x2y0', logo: false },
  { cls: 'b-q-x2y4', logo: false },
  { cls: 'b-q-x0y1', logo: false },
  { cls: 'b-q-x4y1', logo: false },
  { cls: 'b-q-x0y3', logo: false },
  { cls: 'b-q-x4y3', logo: false },
  { cls: 'b-q-x0y0', logo: false },
  { cls: 'b-q-x0y4', logo: false },
  { cls: 'b-q-x4y0', logo: false },
  { cls: 'b-q-x4y4', logo: false },
  { cls: 'b-q-x2y2', logo: true  },
];

const SLOTS_23 = [
  { cls: 'b-q-x2y2', logo: false },
  { cls: 'b-q-x2y1', logo: false },
  { cls: 'b-q-x2y3', logo: false },
  { cls: 'b-q-x1y1', logo: false },
  { cls: 'b-q-x3y1', logo: false },
  { cls: 'b-q-x1y2', logo: false },
  { cls: 'b-q-x3y2', logo: false },
  { cls: 'b-q-x1y0', logo: false },
  { cls: 'b-q-x3y0', logo: false },
  { cls: 'b-q-x1y3', logo: false },
  { cls: 'b-q-x3y3', logo: false },
  { cls: 'b-q-x0y2', logo: false },
  { cls: 'b-q-x4y2', logo: false },
  { cls: 'b-q-x2y0', logo: false },
  { cls: 'b-q-x2y4', logo: false },
  { cls: 'b-q-x0y1', logo: false },
  { cls: 'b-q-x4y1', logo: false },
  { cls: 'b-q-x0y3', logo: false },
  { cls: 'b-q-x4y3', logo: false },
  { cls: 'b-q-x0y0', logo: false },
  { cls: 'b-q-x0y4', logo: false },
  { cls: 'b-q-x4y0', logo: false },
  { cls: 'b-q-x4y4', logo: false },
];

function getLayout(count: number) {
  if (count <= 10) return { slots: SLOTS_10, key: '10' };
  if (count <= 18) return { slots: SLOTS_18, key: '18' };
  if (count <= 22) return { slots: SLOTS_22, key: '22' };
  return { slots: SLOTS_23, key: '23' };
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════ */
const HEX_STYLES = `
  .b-grid-wrap {
    --hex-w: min(calc((100vw - 32px - 40px) / (4 * 0.75 + 1)), 160px);
    --hex-h: calc(var(--hex-w) * 0.866025);
    --gap: 2px;
    --col-width:   calc(var(--hex-w) * 0.75 + var(--gap) * 0.866);
    --row-height:  calc(var(--hex-h) + var(--gap));
    --col-spacing: calc(var(--hex-w) * 0.75 + var(--gap) * 0.866);
    --row-spacing: calc(var(--hex-h) + var(--gap));
  }
  .b-hex-border {
    position: absolute; inset: 0; width: 100%; height: 100%;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    transition: background 0.3s ease; pointer-events: none;
  }
  .b-hex-inner {
    position: absolute;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    overflow: hidden; transition: inset 0.28s ease;
  }
  @keyframes hexPop {
    0%   { transform: scale(0.55); opacity: 0; }
    72%  { transform: scale(1.07); }
    100% { transform: scale(1);    opacity: 1; }
  }
  .b-hpop { animation: hexPop 0.46s cubic-bezier(0.34,1.56,0.64,1) both; }

  /* ── 10-slot ── */
  .b-grid-container-10 {
    position: relative;
    width:  calc(var(--col-width) * 4 + var(--hex-w));
    height: calc(var(--row-height) * 2 + var(--row-height) * 0.5 + var(--hex-h));
  }
  .b-p1  { left: calc(var(--col-width)*0); top: calc(var(--row-height)*1.5); }
  .b-p2  { left: calc(var(--col-width)*1); top: calc(var(--row-height)*0);   }
  .b-p3  { left: calc(var(--col-width)*1); top: calc(var(--row-height)*1);   }
  .b-p4  { left: calc(var(--col-width)*1); top: calc(var(--row-height)*2);   }
  .b-p5  { left: calc(var(--col-width)*2); top: calc(var(--row-height)*0.5); }
  .b-p6  { left: calc(var(--col-width)*2); top: calc(var(--row-height)*1.5); }
  .b-p7  { left: calc(var(--col-width)*3); top: calc(var(--row-height)*0);   }
  .b-p8  { left: calc(var(--col-width)*3); top: calc(var(--row-height)*1);   }
  .b-p9  { left: calc(var(--col-width)*4); top: calc(var(--row-height)*0.5); }
  .b-p10 { left: calc(var(--col-width)*3); top: calc(var(--row-height)*2);   }

  /* ── 18-slot ── */
  .b-grid-container-18 {
    position: relative;
    width:  calc(var(--col-width) * 4 + var(--hex-w));
    height: calc(var(--row-height) * 4 + var(--row-height) * 0.5 + var(--hex-h));
  }
  .b-p11 { left: calc(var(--col-width)*0); top: calc(var(--row-height)*3.5); }
  .b-p12 { left: calc(var(--col-width)*1); top: calc(var(--row-height)*3);   }
  .b-p13 { left: calc(var(--col-width)*1); top: calc(var(--row-height)*4);   }
  .b-p14 { left: calc(var(--col-width)*2); top: calc(var(--row-height)*2.5); }
  .b-p15 { left: calc(var(--col-width)*2); top: calc(var(--row-height)*3.5); }
  .b-p16 { left: calc(var(--col-width)*3); top: calc(var(--row-height)*3);   }
  .b-p17 { left: calc(var(--col-width)*3); top: calc(var(--row-height)*4);   }
  .b-p18 { left: calc(var(--col-width)*4); top: calc(var(--row-height)*2.5); }

  /* ── 22/23-slot ── */
  .b-grid-container-22 {
    position: relative;
    width:  calc(var(--col-spacing) * 4 + var(--hex-w));
    height: calc(var(--row-spacing) * 4 + var(--hex-h));
  }
  .b-q-x0y0 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*0);   }
  .b-q-x0y1 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*1);   }
  .b-q-x0y2 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*2);   }
  .b-q-x0y3 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*3);   }
  .b-q-x0y4 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*4);   }
  .b-q-x1y0 { left: calc(var(--col-spacing)*1); top: calc(var(--row-spacing)*0.5); }
  .b-q-x1y1 { left: calc(var(--col-spacing)*1); top: calc(var(--row-spacing)*1.5); }
  .b-q-x1y2 { left: calc(var(--col-spacing)*1); top: calc(var(--row-spacing)*2.5); }
  .b-q-x1y3 { left: calc(var(--col-spacing)*1); top: calc(var(--row-spacing)*3.5); }
  .b-q-x2y0 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*0);   }
  .b-q-x2y1 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*1);   }
  .b-q-x2y2 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*2);   }
  .b-q-x2y3 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*3);   }
  .b-q-x2y4 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*4);   }
  .b-q-x3y0 { left: calc(var(--col-spacing)*3); top: calc(var(--row-spacing)*0.5); }
  .b-q-x3y1 { left: calc(var(--col-spacing)*3); top: calc(var(--row-spacing)*1.5); }
  .b-q-x3y2 { left: calc(var(--col-spacing)*3); top: calc(var(--row-spacing)*2.5); }
  .b-q-x3y3 { left: calc(var(--col-spacing)*3); top: calc(var(--row-spacing)*3.5); }
  .b-q-x4y0 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*0);   }
  .b-q-x4y1 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*1);   }
  .b-q-x4y2 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*2);   }
  .b-q-x4y3 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*3);   }
  .b-q-x4y4 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*4);   }

  /* ── Logo slot ── */
  .b-logo-slot {
    position: absolute; width: var(--hex-w); height: var(--hex-h);
    display: flex; align-items: center; justify-content: center;
    pointer-events: none; z-index: 5;
  }
  .b-logo-mask {
    width: 60%; height: 60%;
    -webkit-mask-image: url('https://res.cloudinary.com/dpaeapdp6/image/upload/i7kkght9us3vc59fwmz5.svg');
    mask-image: url('https://res.cloudinary.com/dpaeapdp6/image/upload/i7kkght9us3vc59fwmz5.svg');
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
    -webkit-mask-size: contain; mask-size: contain;
    -webkit-mask-position: center; mask-position: center;
    background-color: var(--color-accent);
    animation: b-logo-spin 20s linear infinite; opacity: 0.85;
  }
  @keyframes b-logo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  /* ── Board-mode ring: accent border for board members ── */
  .b-board-ring {
    position: absolute; inset: 0; width: 100%; height: 100%;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    pointer-events: none; z-index: 4;
    box-shadow: inset 0 0 0 3px var(--color-accent);
    animation: boardRingPulse 2.5s ease-in-out infinite;
  }
  @keyframes boardRingPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }
`;

const PAGE_STYLES = `
  .tm-page {
    min-height: 100vh;
    background-color: var(--color-page-bg);
    padding-bottom: 60px;
  }

  /* ── Hero ── */
  .tm-hero {
    padding: 80px 20px 0;
    max-width: 900px;
    margin: 0 auto;
  }
  .tm-heading {
    font-size: clamp(2.2rem, 8vw, 4rem);
    font-weight: 800; line-height: 1.05; letter-spacing: -0.03em;
    color: var(--color-accent);
    font-family: var(--font-heading, inherit);
    margin: 0 0 12px;
  }
  .tm-subtext {
    font-size: 0.9375rem; line-height: 1.65; color: #6b7280;
    max-width: 440px; margin: 0 0 16px;
  }

  /* ── Filter bar ── */
  .tm-filter-bar {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 16px; flex-wrap: wrap;
  }
  .tm-filter-count {
    font-size: 12px; font-weight: 600; color: #9ca3af;
    letter-spacing: 0.04em;
  }
  .tm-filter-count strong { color: var(--color-accent); font-weight: 700; }
  .tm-board-toggle {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 100px;
    font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; cursor: pointer;
    border: 1.5px solid rgba(212, 19, 103, 0.25);
    background: transparent;
    color: #9ca3af;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .tm-board-toggle:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    background: rgba(212, 19, 103, 0.04);
  }
  .tm-board-toggle.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #fff;
    box-shadow: 0 2px 12px rgba(212, 19, 103, 0.3);
  }
  .tm-board-toggle svg { flex-shrink: 0; }
  .tm-board-badge {
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; border-radius: 50%;
    font-size: 10px; font-weight: 800;
    background: rgba(255,255,255,0.25);
    color: inherit;
  }
  .tm-board-toggle:not(.active) .tm-board-badge {
    background: rgba(212, 19, 103, 0.1);
    color: var(--color-accent);
  }

  /* ── Grid panel ── */
  .tm-grid-section {
    padding: 0 16px 0; max-width: 900px; margin: 0 auto;
  }
  .tm-grid-panel {
    border: 1px solid rgba(212, 19, 103, 0.1);
    border-radius: 24px; padding: 28px 20px 20px;
    background: rgba(212, 19, 103, 0.015);
    display: flex; flex-direction: column; align-items: center;
    overflow: hidden;
  }
  .tm-grid-hint {
    display: flex; align-items: center; gap: 6px;
    margin-top: 20px; font-size: 11.5px; font-weight: 500;
    color: #9ca3af; letter-spacing: 0.01em;
  }
  .tm-hint-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--color-accent); opacity: 0.5; flex-shrink: 0;
  }

  /* ── Member card ── */
  .tm-detail-section {
    padding: 16px 16px 40px; max-width: 900px; margin: 0 auto;
  }

  /* Card image variant — landscape (the card already has all info printed on it) */
  .tm-card-image-wrap {
    position: relative;
    border-radius: 18px; overflow: hidden;
    box-shadow: 0 8px 40px rgba(212, 19, 103, 0.14), 0 2px 10px rgba(0,0,0,0.10);
    animation: cardSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    width: 100%;
  }
  /* Show the full card image uncropped at its natural ratio */
  .tm-card-image-wrap img.tm-card-main-img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 18px;
  }
  /* Close button — sits in top-right corner, semi-transparent dark pill */
  .tm-card-image-close {
    position: absolute; top: 10px; right: 10px;
    display: flex; align-items: center; gap: 4px;
    padding: 5px 11px 5px 8px;
    border-radius: 100px;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.12);
    cursor: pointer; color: rgba(255,255,255,0.85);
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
    font-family: inherit;
    transition: background 0.15s;
  }
  .tm-card-image-close:hover { background: rgba(0,0,0,0.65); }
  /* Unused overlay/name/role/bio styles removed — info is on the card itself */
  .tm-card-image-accent-bar { display: none; }
  .tm-card-image-overlay    { display: none; }
  .tm-card-image-name       { display: none; }
  .tm-card-image-role       { display: none; }
  .tm-card-image-bio        { display: none; }

  /* Text card variant (no card_image) */
  .tm-detail-card {
    border: 1px solid rgba(212, 19, 103, 0.18);
    border-radius: 20px; overflow: hidden; background: #fff;
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
    padding: 20px 20px 16px; display: flex; gap: 16px; align-items: flex-start;
  }
  .tm-card-avatar-hex {
    width: 64px; height: 55px; flex-shrink: 0;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    overflow: hidden; background: rgba(212,19,103,0.08);
    display: flex; align-items: center; justify-content: center;
  }
  .tm-card-avatar-hex img { width: 100%; height: 100%; object-fit: cover; }
  .tm-card-avatar-initial { font-size: 1.4rem; font-weight: 800; color: var(--color-accent); }
  .tm-card-info { flex: 1; min-width: 0; }
  .tm-card-name {
    font-size: 1.1rem; font-weight: 800; color: #111827;
    letter-spacing: -0.02em; line-height: 1.2; margin: 0 0 5px;
  }
  .tm-card-role {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--color-accent);
    background: rgba(212,19,103,0.08); border-radius: 5px;
    padding: 3px 8px; margin-bottom: 8px;
  }
  .tm-card-bio { font-size: 0.85rem; line-height: 1.6; color: #6b7280; margin: 0; }
  .tm-card-close {
    display: flex; align-items: center; gap: 5px;
    padding: 12px 20px; border-top: 1px solid #f3f4f6;
    font-size: 10px; font-weight: 700; color: #9ca3af;
    cursor: pointer; background: none;
    border-left: none; border-right: none; border-bottom: none;
    width: 100%; text-align: left; transition: color 0.15s;
    letter-spacing: 0.1em; text-transform: uppercase; font-family: inherit;
  }
  .tm-card-close:hover { color: var(--color-accent); }

  /* ── Empty / Spinner ── */
  .tm-empty {
    text-align: center; padding: 56px 24px;
    border: 1px solid rgba(212,19,103,0.12); border-radius: 20px;
    background: rgba(212,19,103,0.025); width: 100%;
  }
  .tm-empty-icon {
    width: 60px; height: 60px; border-radius: 50%;
    background: rgba(212,19,103,0.08); color: var(--color-accent);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px;
  }
  .tm-empty h2 { font-size: 1rem; font-weight: 700; color: #111827; margin: 0 0 6px; }
  .tm-empty p  { font-size: 0.85rem; color: #9ca3af; margin: 0; }
`;

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function Board() {
  const { tenant } = useTenant();
  const [members, setMembers]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeIdx, setActiveIdx]   = useState<number | null>(null);
  const [boardMode, setBoardMode]   = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('board').select('*').eq('tenant_id', tenant.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { setMembers(data || []); setLoading(false); },
            err   => { console.error(err); setLoading(false); });
  }, [tenant.id]);

  useEffect(() => {
    if (activeIdx !== null && detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
    }
  }, [activeIdx]);

  const activeMember  = activeIdx !== null ? members[activeIdx] : null;
  const boardCount    = members.filter(m => m.is_board_member).length;

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
        <h1 className="tm-heading">The people<br />behind the work.</h1>
        <p className="tm-subtext">
          Every initiative, every event, every milestone — driven by this team.
          From the board to every active member, this is who makes {tenant.shortName} run.
        </p>

        {/* Filter bar */}
        {!loading && members.length > 0 && (
          <div className="tm-filter-bar">
            <span className="tm-filter-count">
              <strong>{members.length}</strong> member{members.length !== 1 ? 's' : ''}
            </span>
            <button
              className={`tm-board-toggle${boardMode ? ' active' : ''}`}
              onClick={() => { setBoardMode(v => !v); setActiveIdx(null); }}
            >
              <Shield size={11} />
              Show Board
              {boardCount > 0 && <span className="tm-board-badge">{boardCount}</span>}
            </button>
          </div>
        )}
      </div>

      {/* ── Hex Grid ── */}
      <div className="tm-grid-section">
        <div className="tm-grid-panel">
          {loading ? <Spinner /> : members.length === 0 ? <EmptyState /> : (
            <>
              <HexGrid
                members={members}
                activeIdx={activeIdx}
                setActiveIdx={setActiveIdx}
                boardMode={boardMode}
                tenant={tenant}
              />
              <p className="tm-grid-hint">
                <span className="tm-hint-dot" />
                Tap a photo to view member details
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Member detail ── */}
      {activeMember && (
        <div className="tm-detail-section" ref={detailRef}>
          {activeMember.card_image ? (
            /* ── Card image — show full landscape card, info already printed on it ── */
            <div className="tm-card-image-wrap" key={activeMember.id}>
              <img
                className="tm-card-main-img"
                src={activeMember.card_image}
                alt={`${activeMember.name} member card`}
              />
              <button
                className="tm-card-image-close"
                onClick={() => setActiveIdx(null)}
                aria-label="Close"
              >
                <X size={12} />
                Close
              </button>
            </div>
          ) : (
            /* ── Text card fallback ── */
            <div className="tm-detail-card" key={activeMember.id}>
              <div className="tm-card-accent-bar" />
              <div className="tm-card-body">
                <div className="tm-card-avatar-hex">
                  {activeMember.photo
                    ? <img src={activeMember.photo} alt={activeMember.name} />
                    : <span className="tm-card-avatar-initial">{activeMember.name?.[0]}</span>
                  }
                </div>
                <div className="tm-card-info">
                  <h2 className="tm-card-name">{activeMember.name}</h2>
                  {(activeMember.position || activeMember.role) && (
                    <span className="tm-card-role">
                      {activeMember.is_board_member && <Shield size={9} />}
                      {activeMember.position || activeMember.role}
                    </span>
                  )}
                  {activeMember.bio && <p className="tm-card-bio">{activeMember.bio}</p>}
                </div>
              </div>
              <button className="tm-card-close" onClick={() => setActiveIdx(null)}>
                <ChevronDown size={12} />Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEX GRID
═══════════════════════════════════════════════════════════════ */
function HexGrid({
  members, activeIdx, setActiveIdx, boardMode, tenant,
}: {
  members: any[];
  activeIdx: number | null;
  setActiveIdx: (i: number | null) => void;
  boardMode: boolean;
  tenant: any;
}) {
  const { slots, key } = getLayout(members.length);

  let memberCursor = 0;
  const assignments = slots.map(slot => {
    if (slot.logo) return { member: null, isLogo: true };
    const member = members[memberCursor] ?? null;
    memberCursor++;
    return { member, isLogo: false };
  });

  const containerCls =
    key === '10' ? 'b-grid-container-10' :
    key === '18' ? 'b-grid-container-18' :
                   'b-grid-container-22';

  return (
    <div className="b-grid-wrap" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div className={containerCls}>
        {slots.map((slot, i) => {
          const { member, isLogo } = assignments[i];

          /* ── Logo slot ── */
          if (isLogo) {
            return (
              <div key={slot.cls} className={`${slot.cls} b-logo-slot`}>
                <div className="b-logo-mask" />
              </div>
            );
          }

          const isEmpty    = !member;
          const isBoard    = !isEmpty && !!member!.is_board_member;
          const isActive   = !isEmpty && activeIdx === i;

          /* Board mode visibility logic */
          const isDimmed = boardMode
            ? !isBoard                          // non-board members fade out
            : (activeIdx !== null && !isActive); // normal: dim when another active

          const insetPx = isActive ? 3 : 2;

          /* Border color:
             - active always: accent
             - board mode + is board: accent
             - normal: page-bg (invisible, just structural) */
          const borderBg = isEmpty
            ? 'transparent'
            : isActive
              ? 'var(--color-accent)'
              : (boardMode && isBoard)
                ? 'var(--color-accent)'
                : 'var(--color-page-bg)';

          /* Photo filter:
             - active: full color
             - board mode + is board: full color (they're highlighted)
             - else: grayscale */
          const photoFilter = (isActive || (boardMode && isBoard))
            ? 'grayscale(0) brightness(1.05)'
            : 'grayscale(1) brightness(0.72)';

          return (
            <div
              key={slot.cls}
              className={`b-hpop ${slot.cls}`}
              style={{
                position: 'absolute',
                width: 'var(--hex-w)', height: 'var(--hex-h)',
                animationDelay: `${i * 30}ms`,
                zIndex: isActive ? 10 : 1,
                opacity: isDimmed ? (isEmpty ? 0.07 : 0.18) : 1,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'opacity 0.28s ease, transform 0.25s ease',
                cursor: isEmpty ? 'default' : 'pointer',
              }}
              onClick={() => !isEmpty && setActiveIdx(isActive ? null : i)}
            >
              {!isEmpty && (
                <div className="b-hex-border" style={{ background: borderBg }} />
              )}

              <div
                className="b-hex-inner"
                style={{
                  top:    isEmpty ? 0 : insetPx,
                  left:   isEmpty ? 0 : insetPx,
                  right:  isEmpty ? 0 : insetPx,
                  bottom: isEmpty ? 0 : insetPx,
                  width:  isEmpty ? '100%' : `calc(100% - ${insetPx * 2}px)`,
                  height: isEmpty ? '100%' : `calc(100% - ${insetPx * 2}px)`,
                }}
              >
                {isEmpty ? (
                  <div style={{ width: '100%', height: '100%', background: 'rgba(212,19,103,0.07)' }} />
                ) : member!.photo ? (
                  <img
                    src={member!.photo}
                    alt={member!.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: photoFilter }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(212,19,103,0.1)',
                    color: 'var(--color-accent)', fontWeight: 700, fontSize: '1.2rem',
                  }}>
                    {member!.name?.[0]}
                  </div>
                )}
              </div>

              {/* Pulsing accent ring for board members in board mode */}
              {boardMode && isBoard && !isActive && (
                <div className="b-board-ring" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0' }}>
      <div style={{
        width: 34, height: 34,
        border: '3px solid rgba(212,19,103,0.15)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%', animation: 'spin 0.75s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="tm-empty">
      <div className="tm-empty-icon"><Users size={28} /></div>
      <h2>Team info coming soon.</h2>
      <p>Check back later for updates.</p>
    </div>
  );
}
