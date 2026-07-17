import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePoints, PointLedgerEntry, LevelConfig } from '../../hooks/usePoints';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { Zap, Star, Trophy, TrendingUp, HandCoins, CheckSquare, CreditCard, Wand2 } from 'lucide-react';

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

const SOURCE_ICONS: Record<string, React.ElementType> = {
  due_payment: CreditCard,
  attendance: CheckSquare,
  donation: HandCoins,
  manual: Wand2,
};

const SOURCE_LABELS: Record<string, string> = {
  due_payment: 'Due Payment',
  attendance: 'Event Attendance',
  donation: 'Donation',
  manual: 'Manual Award',
};

export default function MemberPoints() {
  const { user, profile } = useAuth();
  const { tenant } = useTenant();
  const { fetchMemberPoints, fetchMemberPointLedger, fetchLevelConfigs } = usePoints();

  const club = tenant.id === 'racdlu' ? 'rotaract' : 'interact';
  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = PALETTE[club][dark ? 'dark' : 'light'];

  const [points, setPoints] = useState({ xp: 0, fp: 0, level: 0 });
  const [ledger, setLedger] = useState<PointLedgerEntry[]>([]);
  const [levelConfigs, setLevelConfigs] = useState<LevelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetchMemberPoints(user.id),
      fetchMemberPointLedger(user.id),
      fetchLevelConfigs(),
    ]).then(([pts, led, lvls]) => {
      // fetchMemberPoints() reads a `member_points` table that doesn't exist
      // in this schema yet (see usePoints.ts comments) — it unconditionally
      // resolves to { xp:0, fp:0, level:0 } for every member, regardless of
      // their real balance. point_ledger is the confirmed-live source of
      // truth (attendance writes go through award_points_sourced into it),
      // so derive the running totals from it directly rather than trusting
      // fetchMemberPoints()'s xp/fp. `level` is kept from fetchMemberPoints()
      // since it isn't ledger-derivable and may be maintained elsewhere
      // (e.g. a users.level column) — once member_points is backed by a
      // real migration, this derivation can be removed and pts.xp/pts.fp
      // used directly again.
      //
      // Caveat: fetchMemberPointLedger caps at the most recent 100 rows
      // (.limit(100) in usePoints.ts). For a member with >100 lifetime
      // ledger entries, this sum will under-count older activity that
      // fell off the window. Fine for now since real balances are 0 for
      // everyone either way, but flag this if/when member_points ships.
      const derivedXp = led.reduce((sum, entry) => sum + (entry.xp_delta || 0), 0);
      const derivedFp = led.reduce((sum, entry) => sum + (entry.fp_delta || 0), 0);

      setPoints({
        xp: derivedXp,
        fp: derivedFp,
        level: pts.level,
      });
      setLedger(led);
      setLevelConfigs(lvls);
      setLoading(false);
    });
  }, [user?.id, tenant.id]);

  const currentLevelConfig = levelConfigs.find((c) => c.level === points.level);
  const nextLevel = levelConfigs.find((c) => c.level === points.level + 1);
  const currentLevelXP = currentLevelConfig?.xp_required || 0;
  const nextLevelXP = nextLevel?.xp_required || currentLevelXP;
  const xpIntoCurrentLevel = Math.max(0, points.xp - currentLevelXP);
  const xpNeededForNextLevel = Math.max(1, nextLevelXP - currentLevelXP);
  const progressPct = nextLevel ? Math.min(100, Math.round((xpIntoCurrentLevel / xpNeededForNextLevel) * 100)) : 100;

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading points"
        style={{ background: p.bg, padding: 18, borderRadius: 20 }}
        className="p-4 md:p-8 -m-4 md:-m-8"
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div
            style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
            className="!grid-cols-1 sm:!grid-cols-2"
          >
            {[0, 1].map((i) => (
              <div key={i} style={{ height: 140, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rac-points-page">
      <style>{`
        .rac-points-page, .rac-points-page * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-points-page ::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s', borderRadius: 20 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* ---------------- page-top ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0 }}>My Points</span>
            <span style={{ fontSize: 11, color: p.pmut, fontWeight: 500 }}>{tenant.settings?.clubName || (club === 'rotaract' ? 'RACDLU' : 'ICDLU')}</span>
          </div>

          {/* ---------------- XP / FP badge row ---------------- */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }} className="!grid-cols-1 sm:!grid-cols-2">
            <div style={{ borderRadius: 20, padding: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: p.greenDeep, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={22} color={p.av2} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.4px' }}>{points.xp.toLocaleString()}</div>
                <div style={{ fontSize: 10.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Experience Points</div>
              </div>
            </div>
            <div style={{ borderRadius: 20, padding: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: p.gcA, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={22} color={p.green} />
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.4px' }}>{points.fp.toLocaleString()}</div>
                <div style={{ fontSize: 10.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Foundation Points</div>
              </div>
            </div>
          </div>

          {/* ---------------- level + progress ---------------- */}
          <div style={{ borderRadius: 20, padding: 16, marginBottom: 12, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${p.av2}, ${p.green})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={24} color="#1b0c12" />
                </div>
                <span style={{ position: 'absolute', top: -6, right: -6, background: p.green, color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 20 }}>
                  Lv {points.level}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Current Level</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.2px' }}>{currentLevelConfig?.label || `Level ${points.level}`}</div>
                {nextLevel ? (
                  <div style={{ fontSize: 10.5, color: p.tsub, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={11} />
                    Next: <b style={{ color: p.tl, fontWeight: 600 }}>{nextLevel.label || `Level ${nextLevel.level}`}</b> at {nextLevel.xp_required.toLocaleString()} XP
                  </div>
                ) : points.level > 0 ? (
                  <div style={{ fontSize: 10.5, color: p.green, fontWeight: 700, marginTop: 3 }}>Max level reached</div>
                ) : null}
              </div>
            </div>

            {nextLevel && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${p.border}`, paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 10.5 }}>
                  <span style={{ color: p.tsub, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Zap size={12} color={p.av2} /> Progress to Level {nextLevel.level}
                  </span>
                  <span style={{ color: p.tsub, fontWeight: 600 }}>
                    {xpIntoCurrentLevel.toLocaleString()} / {xpNeededForNextLevel.toLocaleString()} XP
                  </span>
                </div>
                <div style={{ height: 6, background: p.border, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: p.green, borderRadius: 6, transition: 'width .7s ease' }} />
                </div>
                <div style={{ fontSize: 9.5, color: p.tsub, marginTop: 6 }}>{progressPct}% to next level</div>
              </div>
            )}
          </div>

          {/* ---------------- FP info ---------------- */}
          <div style={{ borderRadius: 20, padding: 16, marginBottom: 12, background: p.lightCard, color: p.td, fontSize: 11.5, lineHeight: 1.55 }}>
            <b style={{ display: 'block', fontSize: 12.5, marginBottom: 3 }}>What are Foundation Points?</b>
            <span style={{ color: p.mut }}>
              FP are backed by the club's Endowment Fund and can be redeemed for Paul Harris Fellow (PHF) recognition
              and other Rotary Foundation purposes. Unlike XP, FP carry real monetary backing in the club's endowment reserve.
            </span>
          </div>

          {/* ---------------- history ---------------- */}
          <div style={{ borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${p.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Point History</span>
            </div>
            {ledger.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <Zap size={28} color={p.tmid} style={{ opacity: 0.35, margin: '0 auto 10px' }} />
                <div style={{ fontSize: 11.5, color: p.tsub }}>No point history yet. Attend events and pay dues to earn points.</div>
              </div>
            ) : (
              <div>
                {ledger.map((entry, i) => {
                  const Icon = SOURCE_ICONS[entry.source_type] || Wand2;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '13px 16px',
                        borderTop: i === 0 ? 'none' : `1px solid ${p.border}`,
                      }}
                    >
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: p.lightCard, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} color={p.mut} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{SOURCE_LABELS[entry.source_type] || entry.source_type}</div>
                        {entry.note && (
                          <div style={{ fontSize: 10.5, color: p.tsub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.note}</div>
                        )}
                        <div style={{ fontSize: 9.5, color: p.tmid, marginTop: 2 }}>{new Date(entry.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {entry.xp_delta !== 0 && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: entry.xp_delta > 0 ? p.av2 : '#e0726a', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                            <Zap size={11} /> {entry.xp_delta > 0 ? '+' : ''}{entry.xp_delta} XP
                          </div>
                        )}
                        {entry.fp_delta !== 0 && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: entry.fp_delta > 0 ? p.green : '#e0726a', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                            <Star size={11} /> {entry.fp_delta > 0 ? '+' : ''}{entry.fp_delta} FP
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
