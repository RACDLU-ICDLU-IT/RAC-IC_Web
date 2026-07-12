import { supabase } from '../../supabase';
import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, FileText, Download, ExternalLink, X } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';

/* ------------------------------- font loader -------------------------------
 * Same pattern as DashboardHome.tsx — page opts out of tenant font system,
 * loads Inter directly, link injected once and left in place. */
const INTER_FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
const INTER_LINK_ID = 'rac-dashboard-inter-font';

function useInterFont() {
  useEffect(() => {
    if (document.getElementById(INTER_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = INTER_LINK_ID;
    link.rel = 'stylesheet';
    link.href = INTER_FONT_URL;
    document.head.appendChild(link);
  }, []);
}

/* ------------------------------- palette -------------------------------
 * Identical token set to DashboardHome.tsx's PALETTE so this page shares
 * the exact same visual identity, tenant-detected, theme-aware. */
const PALETTE = {
  rotaract: {
    light: {
      bg: '#dcd3d6', navLink: '#4f4a4c', navActive: '#121011', ptxt: '#161616', pmut: '#8a8f89',
      dark: '#211c1e', tl: '#eee', lightCard: '#ead9df', td: '#161616', mut: '#7c6c72',
      border: '#292929', pillBorder: '#3a3a3a', bar: 'rgba(255,255,255,.92)', dots: '#7a7a7a', tmid: '#9a9a9a',
      tsub: '#8f8f8f', tblBg: '#292929', tblText: '#c9c9c9', weekBg: '#262626', weekText: '#cfcfcf',
      green: '#d85283', greenDeep: '#270612', av2: '#db618e', gcA: '#3d0a1c', gcB: '#140309', gcBd: '#3f1223',
      recBd: '#3d1322', recTx: '#b5617f', ilA: '#691634', ilB: '#8d1743', ilC: '#380b1b', ilD: '#b4295c',
      tdH: '#beb4b8', tlC: '#cac0c4',
    },
    dark: {
      bg: '#0a0a0a', navLink: '#a09a9c', navActive: '#f2eff0', ptxt: '#f2eff0', pmut: '#897e82',
      dark: '#161616', tl: '#eee', lightCard: '#22181c', td: '#e9dfe3', mut: '#95888d',
      border: '#262626', pillBorder: '#333', bar: 'rgba(255,255,255,.92)', dots: '#7a7a7a', tmid: '#9a9a9a',
      tsub: '#8f8f8f', tblBg: '#292929', tblText: '#c9c9c9', weekBg: '#262626', weekText: '#cfcfcf',
      green: '#d85283', greenDeep: '#270612', av2: '#db618e', gcA: '#3d0a1c', gcB: '#140309', gcBd: '#3f1223',
      recBd: '#3d1322', recTx: '#b5617f', ilA: '#691634', ilB: '#8d1743', ilC: '#380b1b', ilD: '#b4295c',
      tdH: '#beb4b8', tlC: '#cac0c4',
    },
  },
  interact: {
    light: {
      bg: '#d3d9dc', navLink: '#4a4e4f', navActive: '#101212', ptxt: '#161616', pmut: '#8a8f89',
      dark: '#1c2021', tl: '#eee', lightCard: '#d9e5ea', td: '#161616', mut: '#6c787c',
      border: '#292929', pillBorder: '#3a3a3a', bar: 'rgba(255,255,255,.92)', dots: '#7a7a7a', tmid: '#9a9a9a',
      tsub: '#8f8f8f', tblBg: '#292929', tblText: '#c9c9c9', weekBg: '#262626', weekText: '#cfcfcf',
      green: '#52b3d8', greenDeep: '#0d1b20', av2: '#61b9db', gcA: '#122b35', gcB: '#050f12', gcBd: '#17313b',
      recBd: '#172f39', recTx: '#6999ac', ilA: '#224c5c', ilB: '#2b647a', ilC: '#0f2933', ilD: '#298db4',
      tdH: '#b4bbbe', tlC: '#c0c7ca',
    },
    dark: {
      bg: '#0a0a0a', navLink: '#9a9fa0', navActive: '#eff1f2', ptxt: '#eff1f2', pmut: '#7e8689',
      dark: '#161616', tl: '#eee', lightCard: '#181f22', td: '#dfe6e9', mut: '#889195',
      border: '#262626', pillBorder: '#333', bar: 'rgba(255,255,255,.92)', dots: '#7a7a7a', tmid: '#9a9a9a',
      tsub: '#8f8f8f', tblBg: '#292929', tblText: '#c9c9c9', weekBg: '#262626', weekText: '#cfcfcf',
      green: '#52b3d8', greenDeep: '#0d1b20', av2: '#61b9db', gcA: '#122b35', gcB: '#050f12', gcBd: '#17313b',
      recBd: '#172f39', recTx: '#6999ac', ilA: '#224c5c', ilB: '#2b647a', ilC: '#0f2933', ilD: '#298db4',
      tdH: '#b4bbbe', tlC: '#c0c7ca',
    },
  },
};

export default function DashboardResources() {
  const { tenant } = useTenant();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedResource, setSelectedResource] = useState<any | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const club = tenant.id === 'racdlu' ? 'rotaract' : 'interact';
  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = PALETTE[club][dark ? 'dark' : 'light'];

  useEffect(() => {
    supabase
      .from('resources')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('createdAt', { ascending: false })
      .then(
        ({ data: snap }) => {
          setResources(snap || []);
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setLoading(false);
        }
      );
  }, [tenant.id]);

  // Detail modal: lock background scroll while open, move focus into it,
  // and let Escape close it — standard dialog behavior.
  useEffect(() => {
    if (!selectedResource) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedResource(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedResource]);

  const categories = ['All', ...Array.from(new Set(resources.map((r) => r.category).filter(Boolean)))];
  const q = search.trim().toLowerCase();
  const filtered = resources
    .filter((r) => filter === 'All' || r.category === filter)
    .filter((r) => !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q));

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading resources"
        style={{ background: p.bg, padding: 18, minHeight: '100vh' }}
        className="p-4 md:p-8 -m-4 md:-m-8"
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div
            style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ height: 190, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rac-resources-page">
      <style>{`
        .rac-resources-page, .rac-resources-page * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-resources-page ::-webkit-scrollbar { display: none; }
        .rac-resources-cats { scrollbar-width: none; }
        .rac-resources-shell {
          min-height: 100vh;
        }
        @supports (min-height: 100dvh) {
          .rac-resources-shell {
            min-height: 100dvh;
          }
        }
        .rac-search-bar {
          transition: border-color .15s;
        }
        .rac-search-bar:focus-within {
          border-color: ${p.green};
        }
        .rac-clear-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 8px;
          transition: background .15s;
        }
        .rac-clear-btn:hover {
          background: ${p.border};
        }
        .rac-cat-pill {
          transition: border-color .15s, color .15s, transform .1s;
        }
        .rac-cat-pill:hover {
          border-color: ${p.green};
          color: ${p.tl};
        }
        .rac-cat-pill:active {
          transform: scale(.96);
        }
        .rac-resource-card {
          transition: border-color .15s, transform .15s, box-shadow .15s;
          text-decoration: none;
        }
        .rac-resource-card:hover {
          border-color: ${p.green};
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,.25);
        }
        .rac-resource-card:active {
          transform: translateY(0);
          box-shadow: none;
        }
        .rac-resources-page a:focus-visible,
        .rac-resources-page button:focus-visible,
        .rac-resources-page input:focus-visible {
          outline: 2px solid ${p.green};
          outline-offset: 2px;
        }
        .rac-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 200;
          animation: rac-modal-fade .15s ease;
        }
        .rac-modal {
          width: 100%;
          max-width: 440px;
          max-height: 80vh;
          overflow-y: auto;
          animation: rac-modal-pop .18s ease;
        }
        @keyframes rac-modal-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes rac-modal-pop {
          from { opacity: 0; transform: translateY(12px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .rac-modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          transition: background .15s;
        }
        .rac-modal-close:hover {
          background: ${p.border};
        }
      `}</style>
      <div
        style={{ background: p.bg, padding: 18, transition: 'background .25s' }}
        className="rac-resources-shell p-4 md:p-8 -m-4 md:-m-8"
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* ---------------- page-top ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderOpen size={18} color={p.green} /> Club Resources
            </span>
            <span style={{ fontSize: 11, color: p.pmut, fontWeight: 500 }}>
              {filtered.length} {filtered.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          {/* ---------------- search ---------------- */}
          <div
            className="rac-search-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '11px 14px',
              borderRadius: 14,
              background: p.dark,
              border: `1px solid ${p.border}`,
              marginBottom: 10,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={p.tmid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              aria-label="Search resources"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: 12.5,
                color: p.tl,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="rac-clear-btn"
                style={{ background: 'none', border: 'none', color: p.tmid, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* ---------------- category filter ---------------- */}
          <div
            className="rac-resources-cats"
            style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}
          >
            {categories.map((cat: any) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                type="button"
                className="rac-cat-pill"
                aria-pressed={filter === cat}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: filter === cat ? 'none' : `1px solid ${p.pillBorder}`,
                  background: filter === cat ? p.green : 'transparent',
                  color: filter === cat ? '#fff' : p.tmid,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ---------------- resource grid ---------------- */}
          {filtered.length === 0 ? (
            <div style={{ borderRadius: 20, padding: '48px 16px', textAlign: 'center', background: p.dark, border: `1px solid ${p.border}` }}>
              <FolderOpen size={32} color={p.tmid} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: p.tl }}>
                {q || filter !== 'All' ? 'No matching resources' : 'No resources yet'}
              </div>
              {(q || filter !== 'All') && (
                <div style={{ fontSize: 11, color: p.tsub, marginTop: 6 }}>Try a different search or category.</div>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-3">
              {filtered.map((resource) => {
                const isLink = resource.url?.startsWith('http') && !resource.url.includes('cloudinary');
                return (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => setSelectedResource(resource)}
                    aria-label={`View details for ${resource.title || 'resource'}`}
                    className="rac-resource-card"
                    style={{
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer',
                      borderRadius: 20,
                      padding: 16,
                      background: p.dark,
                      color: p.tl,
                      border: `1px solid ${p.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: p.greenDeep,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <FileText size={19} color={p.av2} />
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tsub, marginBottom: 6 }}>
                      {resource.category}
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.1px', marginBottom: 6 }}>{resource.title}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: p.tsub,
                        marginBottom: 16,
                        flex: 1,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {resource.description}
                    </div>
                    <div
                      style={{
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        padding: '10px 0',
                        borderRadius: 12,
                        background: p.lightCard,
                        color: p.td,
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      {isLink ? (
                        <>
                          <ExternalLink size={13} /> Open Link
                        </>
                      ) : (
                        <>
                          <Download size={13} /> Download File
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedResource && (
        <div className="rac-modal-overlay" onClick={() => setSelectedResource(null)}>
          <div
            ref={modalRef}
            tabIndex={-1}
            className="rac-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rac-resource-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: p.dark,
              border: `1px solid ${p.border}`,
              borderRadius: 20,
              padding: 20,
              color: p.tl,
              outline: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: p.greenDeep,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText size={19} color={p.av2} />
              </div>
              <button
                type="button"
                onClick={() => setSelectedResource(null)}
                className="rac-modal-close"
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: p.tmid, cursor: 'pointer', flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: p.tsub, display: 'block', marginBottom: 6 }}>
              {selectedResource.category}
            </span>
            <div id="rac-resource-modal-title" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.2px', marginBottom: 12 }}>
              {selectedResource.title}
            </div>
            <div style={{ fontSize: 13, color: p.tsub, lineHeight: 1.6, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
              {selectedResource.description}
            </div>
            <a
              href={selectedResource.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '12px 0',
                borderRadius: 12,
                background: p.lightCard,
                color: p.td,
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {selectedResource.url?.startsWith('http') && !selectedResource.url.includes('cloudinary') ? (
                <>
                  <ExternalLink size={14} /> Open Link
                </>
              ) : (
                <>
                  <Download size={14} /> Download File
                </>
              )}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
