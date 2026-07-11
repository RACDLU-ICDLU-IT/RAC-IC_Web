import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../hooks/useTenant';
import { useTheme } from '../../contexts/ThemeContext';
import { useDues, LedgerEntry } from '../../hooks/useDues';

/* ------------------------------- font loader ------------------------------- */
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

/* ------------------------------- palette ------------------------------- */
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
  unpaid: { bg: '#3a2f14', text: '#e0b96a' },
  pending_verification: { bg: '#2a1e3a', text: '#b48ae0' },
  waived: { bg: '#1a1e3a', text: '#8a9be0' },
  rejected: { bg: '#3a1a14', text: '#e0726a' },
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  overdue: 'Overdue',
  unpaid: 'Unpaid',
  pending_verification: 'Pending Verification',
  waived: 'Waived',
  rejected: 'Rejected',
};

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MemberDues() {
  const { tenant } = useTenant();
  const { user, profile } = useAuth();
  const { fetchMemberLedger, submitPayment, fetchDefaultBkashNumber, loading } = useDues() as any;

  const club = tenant.id === 'racdlu' ? 'rotaract' : 'interact';
  useInterFont();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const p = PALETTE[club][dark ? 'dark' : 'light'];

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [defaultBkash, setDefaultBkash] = useState<string | null>(null);

  const [payEntry, setPayEntry] = useState<LedgerEntry | null>(null);
  const [txnId, setTxnId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [receiptEntry, setReceiptEntry] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user, tenant.id]);

  const loadData = async () => {
    if (!user) return;
    const [entries, bkash] = await Promise.all([
      fetchMemberLedger(user.id),
      fetchDefaultBkashNumber ? fetchDefaultBkashNumber(tenant.id).catch(() => null) : Promise.resolve(null),
    ]);
    setLedger(entries || []);
    setDefaultBkash(bkash);
  };

  // ---- derived groups (no lifetime totals shown) ----
  let totalCharged = 0;
  let totalPaid = 0;
  let totalWaived = 0;

  ledger.forEach((e) => {
    if (e.status === 'waived') {
      totalWaived += e.amount;
    } else if (e.status !== 'rejected') {
      totalCharged += e.amount;
      totalPaid += e.paid_amount || 0;
    }
  });

  const paymentRate = totalCharged - totalWaived > 0 ? Math.min(100, Math.round((totalPaid / (totalCharged - totalWaived)) * 100)) : null;

  const unpaidEntries = ledger.filter((e) => e.status === 'unpaid' || e.status === 'overdue' || e.status === 'rejected');
  const pendingEntries = ledger.filter((e) => e.status === 'pending_verification');
  const overdueCount = ledger.filter((e) => e.status === 'overdue').length;

  const headerStatus: 'current' | 'overdue' | 'pending' =
    overdueCount > 0 ? 'overdue' : pendingEntries.length > 0 ? 'pending' : 'current';

  const headerCopy = {
    current: { label: 'Current', bg: '#1c3a2a', text: '#6fcf97' },
    overdue: { label: `${overdueCount} Overdue`, bg: '#3a1a14', text: '#e0726a' },
    pending: { label: 'Verification Pending', bg: '#2a1e3a', text: '#b48ae0' },
  }[headerStatus];

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(amount);

  const openPay = (entry: LedgerEntry) => {
    setPayEntry(entry);
    setTxnId('');
    setSenderNumber('');
    setSubmitError(null);
  };

  const handleSubmitPayment = async () => {
    if (!payEntry) return;
    if (!txnId.trim() || !senderNumber.trim()) {
      setSubmitError('Both fields are required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (submitPayment) {
        await submitPayment(payEntry.id, txnId.trim(), senderNumber.trim());
      }
      setPayEntry(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.message || "Couldn't submit — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && ledger.length === 0) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading dues" style={{ background: p.bg, padding: 18, borderRadius: 20 }} className="p-4 md:p-8 -m-4 md:-m-8">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ height: 96, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
          <div style={{ height: 140, borderRadius: 20, marginBottom: 12, background: p.dark, border: `1px solid ${p.border}`, opacity: 0.5 }} className="animate-pulse" />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 2px', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 19, fontWeight: 600, color: p.ptxt, letterSpacing: '-.2px', flexShrink: 0 }}>My Dues &amp; Fees</span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                padding: '5px 12px',
                borderRadius: 20,
                background: headerCopy.bg,
                color: headerCopy.text,
              }}
            >
              {headerCopy.label}
            </span>
          </div>

          {/* ---------------- payment rate ---------------- */}
          {paymentRate !== null && (
            <div style={{ borderRadius: 20, padding: 16, marginBottom: 12, background: p.dark, color: p.tl, border: `1px solid ${p.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.tsub }}>Payment Rate</span>
                <span style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.3px', color: p.av2 }}>{paymentRate}%</span>
              </div>
              <div style={{ height: 6, background: p.border, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${paymentRate}%`, background: p.green, borderRadius: 6, transition: 'width .5s ease' }} />
              </div>
            </div>
          )}

          {/* ---------------- unpaid / overdue / rejected ---------------- */}
          {unpaidEntries.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: p.pmut, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 2px 8px' }}>
                Needs Payment
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {unpaidEntries.map((entry) => {
                  const statusStyle = STATUS_COLORS[entry.status] || { bg: p.lightCard, text: p.mut };
                  return (
                    <div key={entry.id} style={{ borderRadius: 16, padding: 14, background: p.dark, border: `1px solid ${p.border}`, color: p.tl }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{entry.label}</div>
                          <div style={{ fontSize: 10.5, color: p.tsub, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {entry.category && <span>{entry.category}</span>}
                            {entry.due_date && <span>Due {fmtDate(entry.due_date)}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.2px' }}>{formatAmount(entry.amount)}</div>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '.04em',
                              padding: '3px 8px',
                              borderRadius: 20,
                              background: statusStyle.bg,
                              color: statusStyle.text,
                              display: 'inline-block',
                              marginTop: 4,
                            }}
                          >
                            {STATUS_LABELS[entry.status]}
                          </span>
                        </div>
                      </div>

                      {entry.status === 'rejected' && entry.rejection_reason && (
                        <div style={{ marginTop: 10, fontSize: 10.5, color: '#e0726a', lineHeight: 1.4 }}>
                          Reason: {entry.rejection_reason}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => openPay(entry)}
                        style={{
                          marginTop: 12,
                          width: '100%',
                          padding: '10px 0',
                          borderRadius: 12,
                          border: 'none',
                          background: p.green,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {entry.status === 'rejected' ? 'Resubmit Payment' : 'Pay Now'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------------- pending verification ---------------- */}
          {pendingEntries.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: p.pmut, textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 2px 8px' }}>
                Awaiting Verification
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingEntries.map((entry) => (
                  <div key={entry.id} style={{ borderRadius: 16, padding: 14, background: p.lightCard, color: p.td }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{entry.label}</div>
                        <div style={{ fontSize: 10.5, color: p.mut }}>Submitted {fmtDateTime(entry.submitted_at)}</div>
                        <div style={{ fontSize: 10.5, color: p.mut, marginTop: 2 }}>Txn ID: {entry.transaction_id}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{formatAmount(entry.amount)}</div>
                    </div>
                    <div style={{ fontSize: 10, color: p.mut, marginTop: 8, fontStyle: 'italic' }}>
                      Treasurer typically verifies within 24 hours.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------------- full history ---------------- */}
          <div style={{ borderRadius: 20, background: p.dark, color: p.tl, border: `1px solid ${p.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${p.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Fee History</span>
            </div>
            {ledger.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, color: p.tsub }}>No fee history yet.</div>
              </div>
            ) : (
              <div>
                {ledger.map((entry, i) => {
                  const statusStyle = STATUS_COLORS[entry.status] || { bg: p.lightCard, text: p.mut };
                  return (
                    <div
                      key={entry.id || i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '13px 16px',
                        borderTop: i === 0 ? 'none' : `1px solid ${p.border}`,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{entry.label}</div>
                        <div style={{ fontSize: 10, color: p.tmid, marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {entry.category && <span>{entry.category}</span>}
                          <span>{fmtDate(entry.due_date)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{formatAmount(entry.amount)}</div>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '.04em',
                            padding: '3px 8px',
                            borderRadius: 20,
                            background: statusStyle.bg,
                            color: statusStyle.text,
                            display: 'inline-block',
                            marginTop: 3,
                          }}
                        >
                          {STATUS_LABELS[entry.status]}
                        </span>
                      </div>
                      {entry.status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => setReceiptEntry(entry)}
                          style={{
                            flexShrink: 0,
                            padding: '7px 12px',
                            borderRadius: 10,
                            border: `1px solid ${p.pillBorder}`,
                            background: 'none',
                            color: p.tmid,
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- pay modal ---------------- */}
      {payEntry && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}
          onClick={() => !submitting && setPayEntry(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: p.dark, color: p.tl, borderRadius: '20px 20px 0 0', padding: 20, width: '100%', maxWidth: 480, border: `1px solid ${p.border}`, borderBottom: 'none' }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Pay {payEntry.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: p.av2, marginBottom: 16 }}>{formatAmount(payEntry.amount)}</div>

            <div style={{ borderRadius: 14, padding: 14, background: p.lightCard, color: p.td, marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, color: p.mut, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                Send to bKash (Send Money)
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '.03em' }}>{payEntry.bkash_number || defaultBkash || 'Contact treasurer'}</div>
            </div>

            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              Your bKash Number
            </label>
            <input
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${p.border}`, background: 'none', color: p.tl, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: p.tsub, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              Transaction ID
            </label>
            <input
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="e.g. DFT9TSEI91"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${p.border}`, background: 'none', color: p.tl, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
            />

            {submitError && <div style={{ fontSize: 11, color: '#e0726a', marginBottom: 8 }}>{submitError}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setPayEntry(null)}
                disabled={submitting}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: `1px solid ${p.pillBorder}`, background: 'none', color: p.tmid, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPayment}
                disabled={submitting}
                style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: p.green, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Submitting…' : 'Submit for Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- receipt modal ---------------- */}
      {receiptEntry && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
          onClick={() => setReceiptEntry(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: p.dark, color: p.tl, borderRadius: 20, width: '100%', maxWidth: 420, border: `1px solid ${p.border}`, overflow: 'hidden' }}
          >
            <div style={{ background: p.green, padding: '16px 20px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff' }}>Official Payment Receipt</span>
            </div>
            <div style={{ padding: 20 }}>
              {[
                ['Receipt No.', receiptEntry.receipt_no || '—'],
                ['Payer Name', profile?.name || '—'],
                ['Payment Method', 'bKash (Send Money)'],
                ['Transaction ID', receiptEntry.transaction_id || '—'],
                ['Sender bKash Number', receiptEntry.sender_bkash_number || '—'],
                ['Payment Date', fmtDateTime(receiptEntry.verified_at)],
                ['Purpose', receiptEntry.label],
                ['Status', '✓ Verified'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `1px solid ${p.border}`, fontSize: 11.5 }}>
                  <span style={{ color: p.tsub }}>{k}</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: p.lightCard, color: p.td, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>Amount Paid</span>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{formatAmount(receiptEntry.amount)}</span>
              </div>
              <button
                type="button"
                onClick={() => setReceiptEntry(null)}
                style={{ width: '100%', marginTop: 16, padding: '12px 0', borderRadius: 12, border: 'none', background: p.lightCard, color: p.td, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
