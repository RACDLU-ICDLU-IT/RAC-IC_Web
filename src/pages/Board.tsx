import { supabase } from '../supabase';
import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

export default function Board() {
  const { tenant } = useTenant();
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('board')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('sort_order', { ascending: true })
      .then(({ data: snap }) => {
        setBoardMembers(snap || []);
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [tenant.id]);

  const activeMember = boardMembers.find(m => m.id === activeId) ?? null;

  const col1 = boardMembers.filter((_, i) => i % 3 === 0);
  const col2 = boardMembers.filter((_, i) => i % 3 === 1);
  const col3 = boardMembers.filter((_, i) => i % 3 === 2);

  return (
    <div
      className="min-h-screen pt-24 pb-32"
      style={{ backgroundColor: 'var(--color-page-bg)' }}
    >
      <SEOHead
        title="Leadership & Board"
        description={`Meet the leadership team and board members of ${tenant.fullName}.`}
        canonicalPath="/board"
      />

      {/* ── Hero heading ── */}
      <section
        className="py-16 md:py-24 px-6 max-w-7xl mx-auto border-b-2"
        style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)' }}
      >
        <h1
          className="text-7xl md:text-[120px] font-heading font-bold leading-none"
          style={{ color: 'var(--color-accent)' }}
        >
          Our Board.
        </h1>
        <p className="mt-4 text-xl max-w-2xl" style={{ color: 'color-mix(in srgb, var(--color-primary) 55%, transparent)' }}>
          Meet the dedicated leaders guiding {tenant.shortName} towards service, leadership, and community impact.
        </p>
      </section>

      {/* ── Body ── */}
      <section className="max-w-7xl mx-auto px-6 mt-16">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div
              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : boardMembers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">

            {/* ── Photo grid ── */}
            <div
              className="flex gap-2 md:gap-3 flex-shrink-0 select-none"
              /* deactivate on click-away */
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-member-card]')) return;
                setActiveId(null);
              }}
            >
              <PhotoCol members={col1} activeId={activeId} setActiveId={setActiveId}
                sizeClass="w-[100px] h-[115px] sm:w-[120px] sm:h-[135px] md:w-[148px] md:h-[165px]" />
              <PhotoCol members={col2} activeId={activeId} setActiveId={setActiveId}
                sizeClass="w-[112px] h-[128px] sm:w-[134px] sm:h-[150px] md:w-[164px] md:h-[180px]"
                offsetClass="mt-[44px] sm:mt-[52px] md:mt-[64px]" />
              <PhotoCol members={col3} activeId={activeId} setActiveId={setActiveId}
                sizeClass="w-[105px] h-[120px] sm:w-[126px] sm:h-[142px] md:w-[154px] md:h-[168px]"
                offsetClass="mt-[20px] sm:mt-[24px] md:mt-[30px]" />
            </div>

            {/* ── Right panel: name list + detail ── */}
            <div className="flex-1 w-full space-y-1 pt-0 lg:pt-2">
              {boardMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  activeId={activeId}
                  setActiveId={setActiveId}
                />
              ))}

              {/* Detail card — slides in when active */}
              <div
                className="overflow-hidden transition-all duration-500 ease-in-out"
                style={{ maxHeight: activeMember ? '400px' : '0px', opacity: activeMember ? 1 : 0 }}
              >
                {activeMember && (
                  <DetailCard member={activeMember} />
                )}
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────
   Photo column
───────────────────────────────────────── */
function PhotoCol({
  members,
  activeId,
  setActiveId,
  sizeClass,
  offsetClass = '',
}: {
  members: any[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  sizeClass: string;
  offsetClass?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 md:gap-3 ${offsetClass}`}>
      {members.map((member) => {
        const isActive = activeId === member.id;
        const isDimmed = activeId !== null && !isActive;
        return (
          <div
            key={member.id}
            data-member-card
            className={`overflow-hidden rounded-2xl cursor-pointer flex-shrink-0 transition-all duration-400 ${sizeClass}`}
            style={{
              opacity: isDimmed ? 0.45 : 1,
              outline: isActive ? '2.5px solid var(--color-accent)' : '2.5px solid transparent',
              outlineOffset: '2px',
            }}
            onClick={() => setActiveId(isActive ? null : member.id)}
          >
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover transition-[filter] duration-500"
                style={{
                  filter: isActive
                    ? 'grayscale(0) brightness(1)'
                    : 'grayscale(0.85) brightness(0.78)',
                }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl font-heading font-bold"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-page-bg))',
                  color: 'var(--color-accent)',
                }}
              >
                {member.name?.[0]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────
   Member name row
───────────────────────────────────────── */
function MemberRow({
  member,
  activeId,
  setActiveId,
}: {
  member: any;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}) {
  const isActive = activeId === member.id;
  const isDimmed = activeId !== null && !isActive;

  return (
    <div
      className="cursor-pointer py-2 transition-opacity duration-300 border-b"
      style={{
        opacity: isDimmed ? 0.38 : 1,
        borderColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
      }}
      onClick={() => setActiveId(isActive ? null : member.id)}
    >
      <div className="flex items-center gap-3">
        {/* Pill indicator */}
        <span
          className="h-2.5 rounded-full flex-shrink-0 transition-all duration-300"
          style={{
            width: isActive ? '20px' : '10px',
            backgroundColor: isActive
              ? 'var(--color-accent)'
              : 'color-mix(in srgb, var(--color-accent) 28%, transparent)',
          }}
        />
        <span
          className="text-lg md:text-xl font-heading font-semibold leading-none tracking-tight transition-colors duration-300"
          style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-primary)' }}
        >
          {member.name}
        </span>
      </div>
      <p
        className="mt-1 pl-[26px] text-[9px] md:text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' }}
      >
        {member.position}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────
   Detail card (expands below list)
───────────────────────────────────────── */
function DetailCard({ member }: { member: any }) {
  return (
    <div
      className="mt-4 rounded-2xl p-6 flex gap-5 items-start border"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 7%, var(--color-page-bg))',
        borderColor: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
      }}
    >
      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2"
        style={{ borderColor: 'color-mix(in srgb, var(--color-accent) 35%, transparent)' }}
      >
        {member.photo ? (
          <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-xl font-heading font-bold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, var(--color-page-bg))',
              color: 'var(--color-accent)',
            }}
          >
            {member.name?.[0]}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3
            className="font-heading font-bold text-lg leading-none"
            style={{ color: 'var(--color-accent)' }}
          >
            {member.name}
          </h3>
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            {member.position}
          </span>
        </div>
        {member.bio && (
          <p
            className="text-sm leading-relaxed line-clamp-4"
            style={{ color: 'color-mix(in srgb, var(--color-primary) 60%, transparent)' }}
          >
            {member.bio}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Empty state
───────────────────────────────────────── */
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
      <h2
        className="text-2xl font-bold font-heading mb-2"
        style={{ color: 'var(--color-primary)' }}
      >
        Our board information will be posted soon.
      </h2>
      <p style={{ color: 'color-mix(in srgb, var(--color-primary) 45%, transparent)' }}>
        Check back later for updates on our leadership team.
      </p>
    </div>
  );
}
