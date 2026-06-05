import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';

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
const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      style={{ animation: 'spin 0.8s linear infinite', transformOrigin: 'center' }}
    />
  </svg>
);
const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const LayersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" fill="none"/>
  </svg>
);

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [shake, setShake]       = useState(false);
  const navigate                = useNavigate();
  const emailRef                = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

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
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        :root {
          --clr-bg: #e8e8f0;
          --clr-surface: #e8e8f0;
          --clr-primary: #c41e50;
          --clr-primary-deep: #9a153f;
          --clr-primary-soft: rgba(196, 30, 80, 0.10);
          --clr-primary-glow: rgba(196, 30, 80, 0.18);
          --clr-text: #3a3a4c;
          --clr-text-muted: #7a7a96;
          --clr-text-faint: #a0a0b8;
          --clr-error-bg: #fef2f2;
          --clr-error-border: #fecaca;
          --clr-error-text: #b91c1c;

          /* Neumorphic shadows */
          --neu-shadow-out: 6px 6px 14px #c8c8d0, -6px -6px 14px #ffffff;
          --neu-shadow-in:  inset 4px 4px 10px #c8c8d0, inset -4px -4px 10px #ffffff;
          --neu-shadow-out-lg: 10px 10px 28px #c0c0ca, -10px -10px 28px #ffffff;
          --neu-shadow-btn: 4px 4px 10px #c0c0ca, -2px -2px 8px #ffffff;
          --neu-shadow-btn-press: inset 3px 3px 8px #c0c0ca, inset -2px -2px 6px #ffffff;
          --neu-shadow-primary: 4px 4px 12px rgba(196,30,80,0.35), -2px -2px 8px rgba(255,255,255,0.6);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
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

        .lr * { margin:0; padding:0; box-sizing:border-box; }

        .lr {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: var(--clr-bg);
          display: flex;
          align-items: stretch;
        }

        /* LEFT PANEL */
        .lr-left {
          display: none;
          flex: 1;
          background: var(--clr-bg);
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
          border-right: 1px solid rgba(255,255,255,0.6);
        }
        @media (min-width: 900px) { .lr-left { display: flex; } }

        .lr-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .lr-brand-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-deep));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--neu-shadow-primary);
        }
        .lr-brand-name {
          font-weight: 500;
          font-size: 14px;
          color: var(--clr-text);
          line-height: 1.4;
        }
        .lr-brand-name span {
          display: block;
          font-weight: 300;
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
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--clr-primary);
          margin-bottom: 24px;
        }
        .lr-headline {
          font-family: 'Crimson Pro', serif;
          font-size: clamp(34px, 3.4vw, 48px);
          font-weight: 300;
          line-height: 1.15;
          color: var(--clr-text);
          margin-bottom: 20px;
          letter-spacing: -0.01em;
        }
        .lr-headline em {
          font-style: italic;
          color: var(--clr-primary);
        }
        .lr-body {
          font-size: 14px;
          line-height: 1.7;
          color: var(--clr-text-muted);
          font-weight: 300;
          margin-bottom: 40px;
        }
        .lr-features { display: flex; flex-direction: column; gap: 16px; }
        .lr-feature {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 13.5px;
          color: var(--clr-text-muted);
          font-weight: 300;
        }
        .lr-feature-icon {
          width: 36px;
          height: 36px;
          background: var(--clr-bg);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: var(--neu-shadow-out);
          flex-shrink: 0;
        }
        .lr-left-footer {
          font-size: 12px;
          color: var(--clr-text-faint);
          font-weight: 300;
          border-top: 1px solid rgba(255,255,255,0.5);
          padding-top: 24px;
          margin-top: auto;
        }

        /* RIGHT PANEL */
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
          box-shadow: var(--neu-shadow-out-lg);
          padding: 44px 40px;
          animation: fadeUp 0.5s ease;
        }
        .lr-card.shake {
          animation: shakeX 0.5s ease;
        }

        /* Mobile logo */
        .lr-mobile-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 32px;
        }
        @media (min-width: 900px) { .lr-mobile-logo { display: none; } }
        .lr-mobile-logo-icon {
          width: 64px;
          height: 64px;
          background: var(--clr-bg);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--neu-shadow-out);
        }
        .lr-mobile-logo-inner {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-deep));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--neu-shadow-primary);
        }

        /* Card header */
        .lr-card-header { margin-bottom: 32px; }
        .lr-card-eyebrow {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--clr-primary);
          margin-bottom: 10px;
        }
        .lr-card-title {
          font-family: 'Crimson Pro', serif;
          font-size: 32px;
          font-weight: 400;
          font-style: italic;
          color: var(--clr-text);
          letter-spacing: -0.01em;
          margin-bottom: 8px;
        }
        .lr-card-subtitle {
          font-size: 13.5px;
          color: var(--clr-text-muted);
          font-weight: 300;
          line-height: 1.5;
        }

        /* Error */
        .lr-error {
          background: var(--clr-error-bg);
          border: 1px solid var(--clr-error-border);
          border-radius: 14px;
          padding: 12px 16px;
          margin-bottom: 24px;
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 13px;
          color: var(--clr-error-text);
        }

        /* Fields */
        .lr-field { margin-bottom: 20px; }
        .lr-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--clr-text-muted);
          margin-bottom: 8px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
        .lr-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .lr-input-icon-left {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--clr-text-faint);
          pointer-events: none;
          display: flex;
        }
        .lr-input {
          width: 100%;
          padding: 13px 44px 13px 44px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 300;
          background: var(--clr-bg);
          border: none;
          border-radius: 14px;
          outline: none;
          box-shadow: var(--neu-shadow-in);
          transition: box-shadow 0.2s ease;
          color: var(--clr-text);
        }
        .lr-input::placeholder { color: var(--clr-text-faint); }
        .lr-input:focus {
          box-shadow: var(--neu-shadow-in), 0 0 0 2px var(--clr-primary-glow);
        }
        .lr-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--clr-bg);
          border: none;
          cursor: pointer;
          padding: 7px;
          color: var(--clr-text-faint);
          border-radius: 10px;
          display: flex;
          box-shadow: var(--neu-shadow-out);
          transition: all 0.2s;
        }
        .lr-eye-btn:hover {
          color: var(--clr-primary);
          box-shadow: var(--neu-shadow-btn-press);
        }
        .lr-eye-btn:active {
          box-shadow: var(--neu-shadow-btn-press);
        }

        /* Button */
        .lr-btn {
          width: 100%;
          margin-top: 10px;
          padding: 14px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.3px;
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
          box-shadow: var(--neu-shadow-primary);
        }
        .lr-btn:hover:not(:disabled) {
          filter: brightness(1.07);
          box-shadow: 6px 6px 16px rgba(196,30,80,0.4), -2px -2px 8px rgba(255,255,255,0.5);
          transform: translateY(-1px);
        }
        .lr-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: inset 2px 2px 6px rgba(0,0,0,0.2), inset -1px -1px 4px rgba(255,255,255,0.1);
        }
        .lr-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Divider */
        .lr-divider {
          margin: 28px 0 20px;
          text-align: center;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--clr-text-faint);
          position: relative;
        }
        .lr-divider::before, .lr-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: calc(50% - 64px);
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(0,0,0,0.08));
        }
        .lr-divider::before { left: 0; background: linear-gradient(to right, transparent, rgba(0,0,0,0.08)); }
        .lr-divider::after  { right: 0; background: linear-gradient(to left, transparent, rgba(0,0,0,0.08)); }

        /* Footer */
        .lr-footer-note {
          text-align: center;
          font-size: 13px;
          color: var(--clr-text-muted);
          font-weight: 300;
          line-height: 1.6;
        }
        .lr-footer-note strong {
          color: var(--clr-primary);
          font-weight: 500;
          cursor: pointer;
        }
        .lr-badge {
          text-align: center;
          font-size: 10px;
          color: var(--clr-text-faint);
          margin-top: 24px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-weight: 300;
        }
      `}</style>

      <div className="lr">
        {/* LEFT PANEL */}
        <div className="lr-left">
          <div className="lr-brand">
            <div className="lr-brand-icon">
              <LayersIcon />
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

        {/* RIGHT PANEL */}
        <div className="lr-right">
          <div className={`lr-card${shake ? ' shake' : ''}`}>

            <div className="lr-mobile-logo">
              <div className="lr-mobile-logo-icon">
                <div className="lr-mobile-logo-inner">
                  <LayersIcon />
                </div>
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
                  <span className="lr-input-icon-left"><MailIcon /></span>
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
                </div>
              </div>

              <div className="lr-field">
                <label className="lr-label" htmlFor="password">Password</label>
                <div className="lr-input-wrap">
                  <span className="lr-input-icon-left"><LockIcon /></span>
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
                {loading ? <><Spinner /> Signing in…</> : <>Sign In →</>}
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
