import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { useDues, LedgerEntry } from '../../hooks/useDues';

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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: '#1c3a2a', text: '#6fcf97' },
  overdue: { bg: '#3a1a14', text: '#e0726a' },
  pending: { bg: '#3a2f14', text: '#e0b96a' },
  waived: { bg: '#1a1e3a', text: '#8a9be0' },
  partial: { bg: '#2a1e3a', text: '#b48ae0' },
};

export default function MemberDues() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { fetchMemberLedger, loading } = useDues();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  const club = tenant.id === 'racdlu' ? 'rotaract' : 'interact';
  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = PALETTE[club][dark ? 'dark' : 'light'];

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const entries = await fetchMemberLedger(user.id);
    setLedger(entries);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(amount);
  };

  let totalCharged = 0;
  let totalPaid = 0;
  let totalWaived = 0;
  let overdueCount = 0;

  ledger.forEach((e) => {
    if (e.status === 'waived') {
      totalWaived += e.amount;
    } else {
      totalCharged += e.amount;
      totalPaid += e.paid_amount || 0;
      if (e.status === 'overdue') overdueCount++;
    }
  });

  const outstanding = totalCharged - totalPaid;
  const paymentRate = totalCharged - totalWaived > 0 ? ((totalPaid / (totalCharged - totalWaived)) * 100).toFixed(1) + '%' : 'N/A';

  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading dues"
        style={{ background: p.bg, padding: 18, borderRadius: 20 }}
        className="p-4 md:p-8 -m-4 md:-m-8"
      >
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div
            style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }}
            className="animate-pulse"
          />
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}
            className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4"
          >
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ height: 90, borderRadius: 20, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rac-dues-page">
      <style>{`
        .rac-dues-page, .rac-dues-page * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .rac-dues-page ::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ background: p.bg, padding: 18, transition: 'background .25s', borderRadius: 20 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* ---------------- page-top ---------------- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, padding: '0 2px', gap: 12 }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0 }}>My Dues &amp; Fees</span>
            <span style={{ fontSize: 11, color: p.pmut, fontWeight: 500 }}>{tenant.settings?.clubName || (club === 'rotaract' ? 'RACDLU' : 'ICDLU')}</span>
          </div>

          {/* ---------------- overdue alert ---------------- */}
          {overdueCount > 0 && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                borderRadius: 16,
                marginBottom: 12,
                background: p.greenDeep,
                border: `1px solid ${p.recBd}`,
                color: p.recTx,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p style={{ fontSize: 11.5, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                {overdueCount} overdue fee{overdueCount > 1 ? 's' : ''} totalling <b style={{ color: p.av2 }}>{formatAmount(outstanding)}</b> — contact an administrator to make a payment.
              </p>
            </div>
          )}

          {/* ---------------- stat grid ---------------- */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }} className="!grid-cols-1 sm:!grid-cols-2 lg:!grid-cols-4">
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ fontSize: 10.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Total Charged</div>
              <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px' }}>{formatAmount(totalCharged)}</div>
            </div>
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ fontSize: 10.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>I Have Paid</div>
              <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px', color: p.green }}>{formatAmount(totalPaid)}</div>
            </div>
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ fontSize: 10.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>I Owe</div>
              <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px', color: outstanding > 0 ? '#e0726a' : p.tl }}>{formatAmount(outstanding)}</div>
            </div>
            <div style={{ borderRadius: 20, padding: 16, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ fontSize: 10.5, color: p.tsub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Payment Rate</div>
              <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-.3px', color: p.av2 }}>{paymentRate}</div>
            </div>
          </div>

          {/* ---------------- fee history ---------------- */}
          <div style={{ borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${p.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Fee History</span>
            </div>
            {ledger.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: p.tsub }}>No fee history yet.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead>
                    <tr>
                      {['Description', 'Amount', 'Paid', 'Status', 'Date'].map((h) => (
                        <th
                          key={h}
                          style={{
                            fontSize: 9.5,
                            color: p.tmid,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '.05em',
                            textAlign: 'left',
                            padding: '10px 16px',
                            borderBottom: `1px solid ${p.border}`,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry, i) => {
                      const statusStyle = STATUS_COLORS[entry.status] || { bg: p.lightCard, text: p.mut };
                      return (
                        <tr key={entry.id || i} style={{ borderBottom: i === ledger.length - 1 ? 'none' : `1px solid ${p.border}` }}>
                          <td style={{ padding: '12px 16px', fontSize: 11.5, fontWeight: 600 }}>{entry.description || entry.type || 'Fee'}</td>
                          <td style={{ padding: '12px 16px', fontSize: 11.5, color: p.tsub }}>{formatAmount(entry.amount)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 11.5, color: p.tsub }}>{formatAmount(entry.paid_amount || 0)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '.04em',
                                padding: '4px 9px',
                                borderRadius: 20,
                                background: statusStyle.bg,
                                color: statusStyle.text,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 10.5, color: p.tmid, whiteSpace: 'nowrap' }}>
                            {entry.due_date ? new Date(entry.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
