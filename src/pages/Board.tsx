import { supabase } from '../supabase';
import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import { Users, ChevronDown, MapPin, Mail, Star } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   LAYOUT DEFINITIONS
   ───────────────────────────────────────────────────────────────
   Each layout is a list of slot descriptors in FILL ORDER
   (center-first, edges last). Members are assigned in this order.
   Empty tail slots get the accent placeholder.

   Slot descriptor: { cls: CSS class, logo: bool (22-layout center) }

   CSS variable naming:
     --col   = --col-width  (horizontal step between column starts)
     --row   = --row-height (vertical step between row starts in same col)
   Both are already defined in :root as --col-width / --row-height.
═══════════════════════════════════════════════════════════════ */

// ── Layout A: 10 slots — top-to-bottom, left-to-right ──────────
// Sorted by actual pixel top value, then left. Empty slots fall
// on the bottom edge — grid always looks like a growing top cluster.
// row0.0: p2(col1) p7(col3)
// row0.5: p5(col2) p9(col4)
// row1.0: p3(col1) p8(col3)
// row1.5: p1(col0) p6(col2)
// row2.0: p4(col1) p10(col3)
const SLOTS_10 = [
  { cls: 'b-p2',  logo: false }, // row0.0 col1
  { cls: 'b-p7',  logo: false }, // row0.0 col3
  { cls: 'b-p5',  logo: false }, // row0.5 col2
  { cls: 'b-p9',  logo: false }, // row0.5 col4
  { cls: 'b-p3',  logo: false }, // row1.0 col1
  { cls: 'b-p8',  logo: false }, // row1.0 col3
  { cls: 'b-p1',  logo: false }, // row1.5 col0
  { cls: 'b-p6',  logo: false }, // row1.5 col2
  { cls: 'b-p4',  logo: false }, // row2.0 col1
  { cls: 'b-p10', logo: false }, // row2.0 col3
];

// ── Layout B: 18 slots — top-to-bottom, left-to-right ──────────
// Continues the 10-slot order downward through all 5 rows.
// row2.5: p14(col2) p18(col4)
// row3.0: p12(col1) p16(col3)
// row3.5: p11(col0) p15(col2)
// row4.0: p13(col1) p17(col3)
const SLOTS_18 = [
  { cls: 'b-p2',  logo: false }, // row0.0 col1
  { cls: 'b-p7',  logo: false }, // row0.0 col3
  { cls: 'b-p5',  logo: false }, // row0.5 col2
  { cls: 'b-p9',  logo: false }, // row0.5 col4
  { cls: 'b-p3',  logo: false }, // row1.0 col1
  { cls: 'b-p8',  logo: false }, // row1.0 col3
  { cls: 'b-p1',  logo: false }, // row1.5 col0
  { cls: 'b-p6',  logo: false }, // row1.5 col2
  { cls: 'b-p4',  logo: false }, // row2.0 col1
  { cls: 'b-p10', logo: false }, // row2.0 col3
  { cls: 'b-p14', logo: false }, // row2.5 col2
  { cls: 'b-p18', logo: false }, // row2.5 col4
  { cls: 'b-p12', logo: false }, // row3.0 col1
  { cls: 'b-p16', logo: false }, // row3.0 col3
  { cls: 'b-p11', logo: false }, // row3.5 col0
  { cls: 'b-p15', logo: false }, // row3.5 col2
  { cls: 'b-p13', logo: false }, // row4.0 col1
  { cls: 'b-p17', logo: false }, // row4.0 col3
];

// ── Layout C: 22 slots (logo in exact center x2y2) ─────────────
// Grid center: (2.00, 2.165). x2y2 is logo — always rendered last, never a member.
// Members fill the 22 surrounding slots center-outward.
const SLOTS_22 = [
  { cls: 'b-q-x2y1', logo: false }, // #1  dist=0.866
  { cls: 'b-q-x2y3', logo: false }, // #2  dist=0.866
  { cls: 'b-q-x1y1', logo: false }, // #3  dist=0.866
  { cls: 'b-q-x3y1', logo: false }, // #4  dist=0.866
  { cls: 'b-q-x1y2', logo: false }, // #5  dist=0.866
  { cls: 'b-q-x3y2', logo: false }, // #6  dist=0.866
  { cls: 'b-q-x1y0', logo: false }, // #7  dist=1.500
  { cls: 'b-q-x3y0', logo: false }, // #8  dist=1.500
  { cls: 'b-q-x1y3', logo: false }, // #9  dist=1.500
  { cls: 'b-q-x3y3', logo: false }, // #10 dist=1.500
  { cls: 'b-q-x0y2', logo: false }, // #11 dist=1.500
  { cls: 'b-q-x4y2', logo: false }, // #12 dist=1.500
  { cls: 'b-q-x2y0', logo: false }, // #13 dist=1.732
  { cls: 'b-q-x2y4', logo: false }, // #14 dist=1.732
  { cls: 'b-q-x0y1', logo: false }, // #15 dist=1.732
  { cls: 'b-q-x4y1', logo: false }, // #16 dist=1.732
  { cls: 'b-q-x0y3', logo: false }, // #17 dist=1.732
  { cls: 'b-q-x4y3', logo: false }, // #18 dist=1.732
  { cls: 'b-q-x0y0', logo: false }, // #19 dist=2.291 — corner
  { cls: 'b-q-x0y4', logo: false }, // #20 dist=2.291 — corner
  { cls: 'b-q-x4y0', logo: false }, // #21 dist=2.291 — corner
  { cls: 'b-q-x4y4', logo: false }, // #22 dist=2.291 — corner
  { cls: 'b-q-x2y2', logo: true  }, // logo — always center, never a member
];

// ── Layout D: 23 slots — center-outward, all member slots ──────
// x2y2 (the exact center) is slot #1 — the most prominent member.
// Expands outward identically to Layout C thereafter.
const SLOTS_23 = [
  { cls: 'b-q-x2y2', logo: false }, // #1  dist=0.000 — dead center
  { cls: 'b-q-x2y1', logo: false }, // #2  dist=0.866
  { cls: 'b-q-x2y3', logo: false }, // #3  dist=0.866
  { cls: 'b-q-x1y1', logo: false }, // #4  dist=0.866
  { cls: 'b-q-x3y1', logo: false }, // #5  dist=0.866
  { cls: 'b-q-x1y2', logo: false }, // #6  dist=0.866
  { cls: 'b-q-x3y2', logo: false }, // #7  dist=0.866
  { cls: 'b-q-x1y0', logo: false }, // #8  dist=1.500
  { cls: 'b-q-x3y0', logo: false }, // #9  dist=1.500
  { cls: 'b-q-x1y3', logo: false }, // #10 dist=1.500
  { cls: 'b-q-x3y3', logo: false }, // #11 dist=1.500
  { cls: 'b-q-x0y2', logo: false }, // #12 dist=1.500
  { cls: 'b-q-x4y2', logo: false }, // #13 dist=1.500
  { cls: 'b-q-x2y0', logo: false }, // #14 dist=1.732
  { cls: 'b-q-x2y4', logo: false }, // #15 dist=1.732
  { cls: 'b-q-x0y1', logo: false }, // #16 dist=1.732
  { cls: 'b-q-x4y1', logo: false }, // #17 dist=1.732
  { cls: 'b-q-x0y3', logo: false }, // #18 dist=1.732
  { cls: 'b-q-x4y3', logo: false }, // #19 dist=1.732
  { cls: 'b-q-x0y0', logo: false }, // #20 dist=2.291 — corner
  { cls: 'b-q-x0y4', logo: false }, // #21 dist=2.291 — corner
  { cls: 'b-q-x4y0', logo: false }, // #22 dist=2.291 — corner
  { cls: 'b-q-x4y4', logo: false }, // #23 dist=2.291 — corner
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
  /* ── CSS variables ── */
  .b-grid-wrap {
    /* hex-w auto-fits: 5 columns + 4 gaps must fit panel width (panel = 100vw - 32px padding - 40px panel-padding*2) */
    --hex-w: min(
      calc((100vw - 32px - 40px) / (4 * 0.75 + 1)),
      160px
    );
    --hex-h: calc(var(--hex-w) * 0.866025);
    --gap: 2px;
    /* 10/18 layout uses --col-width / --row-height */
    --col-width:  calc(var(--hex-w) * 0.75 + var(--gap) * 0.866);
    --row-height: calc(var(--hex-h) + var(--gap));
    /* 22/23 layout uses --col-spacing / --row-spacing */
    --col-spacing: calc(var(--hex-w) * 0.75 + var(--gap) * 0.866);
    --row-spacing:  calc(var(--hex-h) + var(--gap));
  }

  /* ── shared hex pieces ── */
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

  /* ── 10-slot container ── */
  .b-grid-container-10 {
    position: relative;
    width: calc(var(--col-width) * 4 + var(--hex-w));
    height: calc(var(--row-height) * 2 + var(--row-height) * 0.5 + var(--hex-h));
  }
  /* 10-slot positions */
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

  /* ── 18-slot container ── */
  .b-grid-container-18 {
    position: relative;
    width: calc(var(--col-width) * 4 + var(--hex-w));
    height: calc(var(--row-height) * 4 + var(--row-height) * 0.5 + var(--hex-h));
  }
  /* 18-slot additional positions (p11–p18) */
  .b-p11 { left: calc(var(--col-width)*0); top: calc(var(--row-height)*3.5); }
  .b-p12 { left: calc(var(--col-width)*1); top: calc(var(--row-height)*3);   }
  .b-p13 { left: calc(var(--col-width)*1); top: calc(var(--row-height)*4);   }
  .b-p14 { left: calc(var(--col-width)*2); top: calc(var(--row-height)*2.5); }
  .b-p15 { left: calc(var(--col-width)*2); top: calc(var(--row-height)*3.5); }
  .b-p16 { left: calc(var(--col-width)*3); top: calc(var(--row-height)*3);   }
  .b-p17 { left: calc(var(--col-width)*3); top: calc(var(--row-height)*4);   }
  .b-p18 { left: calc(var(--col-width)*4); top: calc(var(--row-height)*2.5); }

  /* ── 22/23-slot container (5 full cols × 5 rows) ── */
  .b-grid-container-22 {
    position: relative;
    width:  calc(var(--col-spacing) * 4 + var(--hex-w));
    height: calc(var(--row-spacing) * 4 + var(--hex-h));
  }
  /* Column 0 — even, starts at row 0 */
  .b-q-x0y0 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*0); }
  .b-q-x0y1 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*1); }
  .b-q-x0y2 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*2); }
  .b-q-x0y3 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*3); }
  .b-q-x0y4 { left: calc(var(--col-spacing)*0); top: calc(var(--row-spacing)*4); }
  /* Column 1 — odd, offset 0.5 row */
  .b-q-x1y0 { left: calc(var(--col-spacing)*1); top: calc(var(--row-spacing)*0.5); }
  .b-q-x1y1 { left: calc(var(--col-spacing)*1); top: calc(var(--row-spacing)*1.5); }
  .b-q-x1y2 { left: calc(var(--col-spacing)*1); top: calc(var(--row-spacing)*2.5); }
  .b-q-x1y3 { left: calc(var(--col-spacing)*1); top: calc(var(--row-spacing)*3.5); }
  /* Column 2 — even */
  .b-q-x2y0 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*0); }
  .b-q-x2y1 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*1); }
  .b-q-x2y2 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*2); }
  .b-q-x2y3 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*3); }
  .b-q-x2y4 { left: calc(var(--col-spacing)*2); top: calc(var(--row-spacing)*4); }
  /* Column 3 — odd */
  .b-q-x3y0 { left: calc(var(--col-spacing)*3); top: calc(var(--row-spacing)*0.5); }
  .b-q-x3y1 { left: calc(var(--col-spacing)*3); top: calc(var(--row-spacing)*1.5); }
  .b-q-x3y2 { left: calc(var(--col-spacing)*3); top: calc(var(--row-spacing)*2.5); }
  .b-q-x3y3 { left: calc(var(--col-spacing)*3); top: calc(var(--row-spacing)*3.5); }
  /* Column 4 — even */
  .b-q-x4y0 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*0); }
  .b-q-x4y1 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*1); }
  .b-q-x4y2 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*2); }
  .b-q-x4y3 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*3); }
  .b-q-x4y4 { left: calc(var(--col-spacing)*4); top: calc(var(--row-spacing)*4); }

  /* ── Logo slot (22-layout center) ── */
  .b-logo-slot {
    position: absolute;
    width: var(--hex-w);
    height: var(--hex-h);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
  }
  .b-logo-mask {
    width: 60%;
    height: 60%;
    -webkit-mask-image: url('https://res.cloudinary.com/dpaeapdp6/image/upload/i7kkght9us3vc59fwmz5.svg');
    mask-image: url('https://res.cloudinary.com/dpaeapdp6/image/upload/i7kkght9us3vc59fwmz5.svg');
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
    background-color: var(--color-accent);
    animation: b-logo-spin 20s linear infinite;
    opacity: 0.85;
  }
  @keyframes b-logo-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

const PAGE_STYLES = `
  .tm-page {
    min-height: 100vh;
    background-color: var(--color-page-bg);
    padding-bottom: 60px;
  }
  .tm-hero {
    padding: 80px 20px 28px;
    max-width: 900px;
    margin: 0 auto;
  }
  .tm-heading {
    font-size: clamp(2.2rem, 8vw, 4rem);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--color-accent);
    font-family: var(--font-heading, inherit);
    margin: 0 0 14px;
  }
  .tm-subtext {
    font-size: 0.9375rem;
    line-height: 1.65;
    color: #6b7280;
    max-width: 460px;
    margin: 0;
  }
  .tm-grid-section {
    padding: 0 16px 0;
    max-width: 900px;
    margin: 0 auto;
  }
  .tm-grid-panel {
    border: 1px solid rgba(212, 19, 103, 0.1);
    border-radius: 24px;
    padding: 28px 20px 20px;
    background: rgba(212, 19, 103, 0.015);
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
  }
  .tm-grid-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 20px;
    font-size: 11.5px;
    font-weight: 500;
    color: #9ca3af;
    letter-spacing: 0.01em;
  }
  .tm-hint-icon {
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 1.5px solid rgba(212, 19, 103, 0.4);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .tm-hint-icon::after {
    content: '';
    width: 4px; height: 4px;
    border-radius: 50%;
    background: var(--color-accent);
    opacity: 0.7;
  }
  .tm-detail-section {
    padding: 16px 16px 40px;
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
    padding: 20px 20px 16px;
    display: flex; gap: 16px; align-items: flex-start;
  }
  .tm-card-avatar-wrap { flex-shrink: 0; }
  .tm-card-avatar-hex {
    width: 64px; height: 55px;
    clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
    overflow: hidden;
    background: rgba(212, 19, 103, 0.08);
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
    display: inline-block; font-size: 10px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--color-accent); background: rgba(212, 19, 103, 0.08);
    border-radius: 5px; padding: 3px 8px; margin-bottom: 8px;
  }
  .tm-card-bio { font-size: 0.85rem; line-height: 1.6; color: #6b7280; margin: 0; }
  .tm-card-meta {
    display: flex; flex-wrap: wrap; gap: 10px;
    padding: 12px 20px 14px;
    border-top: 1px solid #f3f4f6;
  }
  .tm-card-meta-item {
    display: flex; align-items: center; gap: 4px;
    font-size: 11px; color: #9ca3af;
  }
  .tm-card-meta-item svg { flex-shrink: 0; }
  .tm-card-close {
    display: flex; align-items: center; gap: 5px;
    padding: 12px 20px;
    border-top: 1px solid #f3f4f6;
    font-size: 10px; font-weight: 700; color: #9ca3af;
    cursor: pointer; background: none;
    border-left: none; border-right: none; border-bottom: none;
    width: 100%; text-align: left;
    transition: color 0.15s;
    letter-spacing: 0.1em; text-transform: uppercase;
  }
  .tm-card-close:hover { color: var(--color-accent); }
  .tm-empty {
    text-align: center; padding: 56px 24px;
    border: 1px solid rgba(212, 19, 103, 0.12);
    border-radius: 20px;
    background: rgba(212, 19, 103, 0.025);
    width: 100%;
  }
  .tm-empty-icon {
    width: 60px; height: 60px; border-radius: 50%;
    background: rgba(212, 19, 103, 0.08); color: var(--color-accent);
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

      <div className="tm-hero">
        <h1 className="tm-heading">The people<br />behind the work.</h1>
        <p className="tm-subtext">
          Every initiative, every event, every milestone — driven by this team.
          From the board to every active member, this is who makes {tenant.shortName} run.
        </p>
      </div>

      <div className="tm-grid-section">
        <div className="tm-grid-panel">
          {loading ? (
            <Spinner />
          ) : members.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <HexGrid
                members={members}
                activeIdx={activeIdx}
                setActiveIdx={setActiveIdx}
                tenant={tenant}
              />
              <p className="tm-grid-hint">
                <span className="tm-hint-icon" />
                Tap a photo to view member details
              </p>
            </>
          )}
        </div>
      </div>

      {activeMember && (
        <div className="tm-detail-section" ref={detailRef}>
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
                {activeMember.role && <span className="tm-card-role">{activeMember.role}</span>}
                {activeMember.bio  && <p className="tm-card-bio">{activeMember.bio}</p>}
              </div>
            </div>
            {(activeMember.email || activeMember.location || activeMember.joined_year) && (
              <div className="tm-card-meta">
                {activeMember.email       && <span className="tm-card-meta-item"><Mail   size={11} />{activeMember.email}</span>}
                {activeMember.location    && <span className="tm-card-meta-item"><MapPin size={11} />{activeMember.location}</span>}
                {activeMember.joined_year && <span className="tm-card-meta-item"><Star   size={11} />Member since {activeMember.joined_year}</span>}
              </div>
            )}
            <button className="tm-card-close" onClick={() => setActiveIdx(null)}>
              <ChevronDown size={12} />Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HEX GRID COMPONENT
   • Selects layout by member count
   • Maps members to slots in fill-order (center-first)
   • Renders logo in center slot for 22-layout
   • Empty slots: accent fill, no icon, not clickable
═══════════════════════════════════════════════════════════════ */
function HexGrid({
  members,
  activeIdx,
  setActiveIdx,
  tenant,
}: {
  members: any[];
  activeIdx: number | null;
  setActiveIdx: (i: number | null) => void;
  tenant: any;
}) {
  const { slots, key } = getLayout(members.length);

  // Map fill-order slot index → member
  // Logo slots never get a member; member index skips logo slots
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
          const isActive = !isLogo && activeIdx === i;
          const isDimmed = activeIdx !== null && !isActive && !isLogo;
          const isEmpty  = !member && !isLogo;
          const insetPx  = isActive ? 3 : 2;

          if (isLogo) {
            // Center logo slot — no hex shell, just the spinning logo
            return (
              <div
                key={slot.cls}
                className={`${slot.cls} b-logo-slot`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="b-logo-mask" />
              </div>
            );
          }

          return (
            <div
              key={slot.cls}
              className={`b-hpop ${slot.cls}`}
              style={{
                position: 'absolute',
                width: 'var(--hex-w)',
                height: 'var(--hex-h)',
                animationDelay: `${i * 30}ms`,
                zIndex: isActive ? 10 : 1,
                opacity: isDimmed ? 0.28 : 1,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                transition: 'opacity 0.28s ease, transform 0.25s ease',
                cursor: isEmpty ? 'default' : 'pointer',
              }}
              onClick={() => !isEmpty && setActiveIdx(isActive ? null : i)}
            >
              {/* border ring — hidden for empty slots */}
              {!isEmpty && (
                <div
                  className="b-hex-border"
                  style={{
                    background: isActive ? 'var(--color-accent)' : 'var(--color-page-bg)',
                  }}
                />
              )}

              {/* inner content */}
              <div
                className="b-hex-inner"
                style={{
                  top: isEmpty ? 0 : insetPx,
                  left: isEmpty ? 0 : insetPx,
                  right: isEmpty ? 0 : insetPx,
                  bottom: isEmpty ? 0 : insetPx,
                  width:  isEmpty ? '100%' : `calc(100% - ${insetPx * 2}px)`,
                  height: isEmpty ? '100%' : `calc(100% - ${insetPx * 2}px)`,
                }}
              >
                {isEmpty ? (
                  // Accent placeholder — no icon
                  <div style={{
                    width: '100%', height: '100%',
                    background: 'rgba(212,19,103,0.07)',
                  }} />
                ) : member!.photo ? (
                  <img
                    src={member!.photo}
                    alt={member!.name}
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                      filter: isActive
                        ? 'grayscale(0) brightness(1.05)'
                        : 'grayscale(1) brightness(0.72)',
                    }}
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
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
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
