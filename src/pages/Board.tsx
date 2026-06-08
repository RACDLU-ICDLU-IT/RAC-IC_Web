import { supabase } from '../supabase';
import React, { useState, useEffect, useCallback } from 'react';
import { Users, X, Mail, ExternalLink } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

/* ─────────────────────────────────────────
   Hex geometry helpers
   offset-q layout: each hex is a pointy-top hexagon
   We use SVG clip-path via CSS for the shape
───────────────────────────────────────── */
const HEX_CSS = `
  .hex-clip {
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  }
  .hex-clip-border {
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .panel-enter { animation: slideUp 0.38s cubic-bezier(0.22,1,0.36,1) both; }
  .overlay-enter { animation: fadeIn 0.25s ease both; }
  @keyframes hexPop {
    0%   { transform: scale(0.7); opacity: 0; }
    70%  { transform: scale(1.04); }
    100% { transform: scale(1); opacity: 1; }
  }
  .hex-pop { animation: hexPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
`;

export default function Board() {
  const { tenant } = useTenant();
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    supabase
      .from('board')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('sort_order', { ascending: true })
      .then(({ data: snap }) => {
        setBoardMembers(snap || []);
        setLoading(false);
      }, err => { console.error(err); setLoading(false); });
  }, [tenant.id]);

  const close = useCallback(() => setSelected(null), []);

  /* Build rows for honeycomb: [3,4,3,4,...] alternating */
  const rows: any[][] = [];
  let idx = 0;
  let rowIdx = 0;
  while (idx < boardMembers.length) {
    const count = rowIdx % 2 === 0 ? 3 : 4;
    rows.push(boardMembers.slice(idx, idx + count));
    idx += count;
    rowIdx++;
  }

  return (
    <div className="min-h-screen pt-24 pb-40" style={{ backgroundColor: 'var(--color-page-bg)' }}>
      <style>{HEX_CSS}</style>
      <SEOHead
        title="Leadership & Board"
        description={`Meet the leadership team and board members of ${tenant.fullName}.`}
        canonicalPath="/board"
      />

      {/* Heading */}
      <section
        className="py-16 md:py-20 px-6 max-w-5xl mx-auto border-b-2"
        style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)' }}
      >
        <h1
          className="text-7xl md:text-[108px] font-heading font-bold leading-none"
          style={{ color: 'var(--color-accent)' }}
        >
          Our Board.
        </h1>
        <p className="mt-4 text-lg md:text-xl max-w-xl"
          style={{ color: 'color-mix(in srgb, var(--color-primary) 50%, transparent)' }}>
          Meet the dedicated leaders guiding {tenant.shortName} towards service, leadership, and community impact.
        </p>
      </section>

      {/* Grid */}
      <section className="max-w-5xl mx-auto px-4 mt-16">
        {loading ? (
          <Spinner />
        ) : boardMembers.length === 0 ? (
          <EmptyState />
        ) : (
          <HoneycombGrid rows={rows} selected={selected} onSelect={setSelected} />
        )}
      </section>

      {/* Bottom slide-up panel */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            className="overlay-enter fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={close}
          />
          {/* Panel */}
          <div
            className="panel-enter fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-page-bg)',
              boxShadow: '0 -8px 60px rgba(0,0,0,0.18)',
              maxHeight: '88vh',
            }}
          >
            <MemberPanel member={selected} onClose={close} />
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Honeycomb grid
───────────────────────────────────────── */
function HoneycombGrid({
  rows,
  selected,
  onSelect,
}: {
  rows: any[][];
  selected: any | null;
  onSelect: (m: any) => void;
}) {
  /* Hex size: CSS width of each hex cell */
  return (
    <div className="flex flex-col items-center gap-0" style={{ rowGap: 'calc(var(--hex-size, 120px) * -0.26)' }}>
      {rows.map((row, ri) => (
        <div
          key={ri}
          className="flex justify-center"
          style={{
            gap: 'calc(var(--hex-size, 120px) * 0.06)',
            /* odd rows offset by half a hex + gap */
            marginLeft: ri % 2 !== 0 ? 'calc(var(--hex-size, 120px) * 0.53)' : '0',
          }}
        >
          {row.map((member, mi) => (
            <HexCell
              key={member.id}
              member={member}
              isActive={selected?.id === member.id}
              isDimmed={selected !== null && selected?.id !== member.id}
              animDelay={ri * 80 + mi * 60}
              onClick={() => onSelect(member)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   Single hex cell
───────────────────────────────────────── */
function HexCell({
  member,
  isActive,
  isDimmed,
  animDelay,
  onClick,
}: {
  member: any;
  isActive: boolean;
  isDimmed: boolean;
  animDelay: number;
  onClick: () => void;
}) {
  const SIZE = 'clamp(96px, 18vw, 140px)';

  return (
    <div
      className="hex-pop relative cursor-pointer select-none flex-shrink-0"
      style={{
        width: SIZE,
        height: SIZE,
        animationDelay: `${animDelay}ms`,
        opacity: isDimmed ? 0.35 : 1,
        transition: 'opacity 0.35s ease, transform 0.25s ease',
        transform: isActive ? 'scale(1.08)' : 'scale(1)',
      }}
      onClick={onClick}
    >
      {/* Border ring — separate layer behind */}
      <div
        className="hex-clip-border absolute inset-0"
        style={{
          background: isActive
            ? 'var(--color-accent)'
            : 'color-mix(in srgb, var(--color-accent) 0%, transparent)',
          transition: 'background 0.3s ease',
          padding: '3px',
        }}
      />

      {/* Accent border via scale trick */}
      <div
        className="hex-clip absolute"
        style={{
          inset: isActive ? '3px' : '0',
          transition: 'inset 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            className="w-full h-full object-cover"
            style={{
              filter: isActive
                ? 'grayscale(0) brightness(1.04)'
                : 'grayscale(0.7) brightness(0.8)',
              transition: 'filter 0.4s ease',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl font-heading font-bold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, var(--color-page-bg))',
              color: 'var(--color-accent)',
            }}
          >
            {member.name?.[0]}
          </div>
        )}

        {/* Name overlay on active */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-3 px-1"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 60%, transparent)',
            opacity: isActive ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          <span className="text-white text-[10px] font-bold text-center leading-tight line-clamp-1 w-full text-center">
            {member.name}
          </span>
          <span
            className="text-[8px] font-medium uppercase tracking-widest mt-0.5 text-center line-clamp-1 w-full"
            style={{ color: 'color-mix(in srgb, var(--color-accent) 85%, white)' }}
          >
            {member.position}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Bottom panel — member detail
───────────────────────────────────────── */
function MemberPanel({ member, onClose }: { member: any; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
        <div
          className="w-10 h-1 rounded-full"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
        />
      </div>

      {/* Close btn */}
      <div className="flex justify-end px-5 pt-1 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 pb-10 flex flex-col gap-6">
        {/* Top: photo + name */}
        <div className="flex items-center gap-5">
          {/* Hex photo */}
          <div
            className="hex-clip flex-shrink-0 overflow-hidden"
            style={{ width: 80, height: 80 }}
          >
            {member.photo ? (
              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-heading font-bold"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, var(--color-page-bg))',
                  color: 'var(--color-accent)',
                }}
              >
                {member.name?.[0]}
              </div>
            )}
          </div>

          <div>
            <h2
              className="text-2xl font-heading font-bold leading-tight"
              style={{ color: 'var(--color-primary)' }}
            >
              {member.name}
            </h2>
            <span
              className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-[0.22em] px-3 py-1 rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {member.position}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px w-full"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' }}
        />

        {/* Bio */}
        {member.bio ? (
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: 'color-mix(in srgb, var(--color-primary) 65%, transparent)' }}
          >
            {member.bio}
          </p>
        ) : (
          <p
            className="text-sm italic"
            style={{ color: 'color-mix(in srgb, var(--color-primary) 35%, transparent)' }}
          >
            No bio available.
          </p>
        )}

        {/* Contact links if present */}
        {(member.email || member.linkedin || member.profile_url) && (
          <div className="flex flex-wrap gap-3 mt-1">
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  color: 'var(--color-accent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                }}
              >
                <Mail size={13} /> Email
              </a>
            )}
            {(member.linkedin || member.profile_url) && (
              <a
                href={member.linkedin || member.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                  color: 'var(--color-accent)',
                  border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
                }}
              >
                <ExternalLink size={13} /> Profile
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Utility components
───────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="text-center py-24 border rounded-3xl"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 4%, var(--color-page-bg))',
      }}
    >
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
          color: 'color-mix(in srgb, var(--color-accent) 55%, transparent)',
        }}
      >
        <Users size={48} />
      </div>
      <h2 className="text-2xl font-bold font-heading mb-2" style={{ color: 'var(--color-primary)' }}>
        Our board information will be posted soon.
      </h2>
      <p style={{ color: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' }}>
        Check back later for updates on our leadership team.
      </p>
    </div>
  );
}
