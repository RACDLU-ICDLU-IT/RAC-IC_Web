import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';

// ─── Color Variables (light, clean, professional) ──────────────────────────
// No hardcoded colors, all via CSS custom properties.

// ─── Eye toggle SVG ─────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ─── Spinner ────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      style={{ animation: 'spin 0.8s linear infinite', transformOrigin: 'center' }}
    />
  </svg>
);

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [shake, setShake]       = useState(false);
  const navigate                = useNavigate();
  const emailRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
      const role = profile?.role;
      if (role === 'admin' || role === 'master_admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during sign in.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600&display=swap');

        :root {
          --clr-bg: #f9fafb;
          --clr-surface: #ffffff;
          --clr-surface-muted: #f3f4f6;
          --clr-border: #e5e7eb;
          --clr-border-focus: #c41e50;
          --clr-primary: #c41e50;
          --clr-primary-deep: #9a153f;
          --clr-primary-soft: rgba(196, 30, 80, 0.08);
          --clr-primary-glow: rgba(196, 30, 80, 0.2);
          --clr-text: #111827;
          --clr-text-muted: #6b7280;
          --clr-text-faint: #9ca3af;
          --clr-error-bg: #fef2f2;
          --clr-error-border: #fecaca;
          --clr-error-text: #b91c1c;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          --shadow-primary: 0 4px 12px rgba(196, 30, 80, 0.25);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shakeX {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-6px)}
          30%{transform:translateX(6px)}
          45%{transform:translateX(-4px)}
          60%{transform:translateX(4px)}
          75%{transform:translateX(-2px)}
          90%{transform:translateX(2px)}
        }

        .lr * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .lr {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: var(--clr-bg);
          display: flex;
          align-items: stretch;
        }

        /* LEFT PANEL – Brand & value prop */
        .lr-left {
          display: none;
          flex: 1;
          background: var(--clr-surface);
          border-right: 1px solid var(--clr-border);
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
        }
        @media (min-width: 900px) {
          .lr-left { display: flex; }
        }

        .lr-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lr-brand-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-deep));
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: var(--shadow-primary);
        }
        .lr-brand-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--clr-text);
          line-height: 1.3;
        }
        .lr-brand-name span {
          font-weight: 400;
          font-size: 11px;
          color: var(--clr-text-muted);
          letter-spacing: 0.3px;
        }

        .lr-hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 380px;
        }
        .lr-tag {
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--clr-primary);
          margin-bottom: 24px;
        }
        .lr-headline {
          font-size: clamp(32px, 3.2vw, 44px);
          font-weight: 600;
          line-height: 1.2;
          color: var(--clr-text);
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .lr-headline em {
          color: var(--clr-primary);
          font-style: normal;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-deep));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lr-body {
          font-size: 14px;
          line-height: 1.6;
          color: var(--clr-text-muted);
          margin-bottom: 40px;
        }
        .lr-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .lr-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: var(--clr-text-muted);
        }
        .lr-feature-icon {
          width: 32px;
          height: 32px;
          background: var(--clr-primary-soft);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .lr-left-footer {
          font-size: 12px;
          color: var(--clr-text-faint);
          border-top: 1px solid var(--clr-border);
          padding-top: 24px;
          margin-top: auto;
        }

        /* RIGHT PANEL – Login card */
        .lr-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
        }
        .lr-card {
          width: 100%;
          max-width: 440px;
          background: var(--clr-surface);
          border-radius: 32px;
          box-shadow: var(--shadow-lg);
          padding: 40px 36px;
          transition: box-shadow 0.2s ease;
          animation: fadeUp 0.5s ease;
        }
        .lr-card.shake {
          animation: shakeX 0.5s ease;
        }
        .lr-mobile-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }
        @media (min-width: 900px) {
          .lr-mobile-logo { display: none; }
        }
        .lr-mobile-logo-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-deep));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: var(--shadow-primary);
        }
        .lr-card-header {
          margin-bottom: 32px;
        }
        .lr-card-eyebrow {
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: var(--clr-primary);
          margin-bottom: 12px;
        }
        .lr-card-title {
          font-size: 28px;
          font-weight: 600;
          color: var(--clr-text);
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }
        .lr-card-subtitle {
          font-size: 14px;
          color: var(--clr-text-muted);
        }
        .lr-error {
          background: var(--clr-error-bg);
          border: 1px solid var(--clr-error-border);
          border-radius: 16px;
          padding: 12px 16px;
          margin-bottom: 24px;
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
          color: var(--clr-error-text);
        }
        .lr-field {
          margin-bottom: 20px;
        }
        .lr-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--clr-text-muted);
          margin-bottom: 6px;
        }
        .lr-input-wrap {
          position: relative;
        }
        .lr-input {
          width: 100%;
          padding: 12px 44px 12px 16px;
          font-size: 14px;
          font-family: inherit;
          background: var(--clr-surface-muted);
          border: 1px solid var(--clr-border);
          border-radius: 14px;
          outline: none;
          transition: all 0.2s ease;
          color: var(--clr-text);
        }
        .lr-input::placeholder {
          color: var(--clr-text-faint);
        }
        .lr-input:focus {
          border-color: var(--clr-border-focus);
          box-shadow: 0 0 0 3px var(--clr-primary-glow);
          background: var(--clr-surface);
        }
        .lr-input-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--clr-text-faint);
          pointer-events: none;
        }
        .lr-eye-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          color: var(--clr-text-faint);
          border-radius: 8px;
          display: flex;
          transition: all 0.2s;
        }
        .lr-eye-btn:hover {
          color: var(--clr-primary);
          background: var(--clr-primary-soft);
        }
        .lr-btn {
          width: 100%;
          margin-top: 8px;
          padding: 12px 20px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-deep));
          color: white;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-primary);
        }
        .lr-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.05);
          box-shadow: 0 8px 20px rgba(196, 30, 80, 0.3);
        }
        .lr-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .lr-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .lr-divider {
          margin: 28px 0 20px;
          text-align: center;
          font-size: 11px;
          color: var(--clr-text-faint);
          letter-spacing: 0.5px;
          position: relative;
        }
        .lr-divider::before,
        .lr-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: calc(50% - 60px);
          height: 1px;
          background: var(--clr-border);
        }
        .lr-divider::before { left: 0; }
        .lr-divider::after { right: 0; }
        .lr-footer-note {
          text-align: center;
          font-size: 13px;
          color: var(--clr-text-muted);
          margin-top: 16px;
        }
        .lr-footer-note strong {
          color: var(--clr-text);
          font-weight: 500;
        }
        .lr-badge {
          text-align: center;
          font-size: 10px;
          color: var(--clr-text-faint);
          margin-top: 24px;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div className="lr">
        {/* LEFT PANEL – brand story (hidden on mobile) */}
        <div className="lr-left">
          <div className="lr-brand">
            <div className="lr-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" fill="none"/>
              </svg>
            </div>
            <div className="lr-brand-name">
              Rotaract Club of Dhaka Luminous
              <span>District 3281 · Member Portal</span>
            </div>
          </div>

          <div className="lr-hero">
            <div className="lr-tag">Member dashboard</div>
            <h1 className="lr-headline">
              Serve to change <em>lives.</em>
            </h1>
            <p className="lr-body">
              Access project reports, member directory, governance tools, and club communications — all in one place.
            </p>
            <div className="lr-features">
              <div className="lr-feature">
                <div className="lr-feature-icon">📋</div>
                Project management & reporting
              </div>
              <div className="lr-feature">
                <div className="lr-feature-icon">👥</div>
                Member records & attendance
              </div>
              <div className="lr-feature">
                <div className="lr-feature-icon">📄</div>
                Governance & bylaws archive
              </div>
            </div>
          </div>

          <div className="lr-left-footer">
            © {new Date().getFullYear()} Rotaract Club of Dhaka Luminous · Rotary International
          </div>
        </div>

        {/* RIGHT PANEL – Login form */}
        <div className="lr-right">
          <div className={`lr-card${shake ? ' shake' : ''}`}>
            {/* Mobile logo (visible only on small screens) */}
            <div className="lr-mobile-logo">
              <div className="lr-mobile-logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" fill="none"/>
                </svg>
              </div>
            </div>

            <div className="lr-card-header">
              <div className="lr-card-eyebrow">Sign in</div>
              <h2 className="lr-card-title">Welcome back.</h2>
              <p className="lr-card-subtitle">Access your dashboard to manage club activities.</p>
            </div>

            {error && (
              <div className="lr-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn}>
              <div className="lr-field">
                <label className="lr-label" htmlFor="email">Email address</label>
                <div className="lr-input-wrap">
                  <input
                    id="email"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lr-input"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <span className="lr-input-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                </div>
              </div>

              <div className="lr-field">
                <label className="lr-label" htmlFor="password">Password</label>
                <div className="lr-input-wrap">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="lr-input"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="lr-eye-btn"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              <button type="submit" className="lr-btn" disabled={loading}>
                {loading ? (
                  <><Spinner /> Signing in…</>
                ) : (
                  <>Sign In →</>
                )}
              </button>
            </form>

            <div className="lr-divider">Invitation only</div>
            <p className="lr-footer-note">
              Access is by invitation only.<br />
              Contact your <strong>club administrator</strong> to get started.
            </p>
            <div className="lr-badge">
              Rotaract · District 3281 · Bangladesh
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
