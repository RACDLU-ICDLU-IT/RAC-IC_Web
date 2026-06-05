import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useTenant } from '../../hooks/useTenant';

const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      style={{ animation: 'lr-spin 0.8s linear infinite', transformOrigin: 'center' }}
    />
  </svg>
);
const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const LOGO_URL = 'https://res.cloudinary.com/dpaeapdp6/image/upload/i7kkght9us3vc59fwmz5.svg';

export default function Login() {
  const { settings, tenant } = useTenant();
  const clubName = settings.clubName || tenant.fullName;

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
        @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&display=swap');

        /* All colors use CSS variables from tenant/theme — zero hardcoded colors */
        .lr-page {
          --neu-bg:         #e0e5ec;
          --neu-dark:       #bec3cf;
          --neu-light:      #ffffff;
          --neu-text:       #3d4468;
          --neu-muted:      #9499b7;
          --neu-icon:       #6c7293;
          --neu-err:        #ff3b5c;
          --neu-err-bg:     #fef2f2;
          --neu-err-bdr:    #fecaca;
          /* Primary colors from tenant brand */
          --primary:        var(--color-primary, #c41e50);
          --primary-deep:   var(--color-accent,  #9a153f);
        }

        @keyframes lr-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes lr-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lr-shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-6px)}
          30%{transform:translateX(6px)}
          45%{transform:translateX(-4px)}
          60%{transform:translateX(4px)}
          75%{transform:translateX(-2px)}
          90%{transform:translateX(2px)}
        }

        .lr-page * { margin:0; padding:0; box-sizing:border-box; }

        .lr-page {
          font-family: 'Nunito', var(--font-body, sans-serif);
          min-height: 100vh;
          background: var(--neu-bg);
          display: flex;
          align-items: stretch;
        }

        /* ── LEFT PANEL ── */
        .lr-left {
          display: none;
          flex: 1;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
          background: var(--neu-bg);
          border-right: 1px solid rgba(255,255,255,0.55);
        }
        @media (min-width: 900px) { .lr-left { display: flex; } }

        .lr-brand { display: flex; align-items: center; gap: 14px; }
        .lr-brand-logo {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, var(--primary), var(--primary-deep));
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 4px 4px 12px rgba(0,0,0,0.15), -2px -2px 8px var(--neu-light);
          overflow: hidden; flex-shrink: 0;
        }
        .lr-brand-logo img {
          width: 28px; height: 28px; object-fit: contain;
          filter: brightness(0) invert(1);
        }
        .lr-brand-name { font-size: 14px; font-weight: 600; color: var(--neu-text); line-height: 1.4; }
        .lr-brand-name span { display:block; font-weight:300; font-size:11px; color:var(--neu-muted); }

        .lr-hero { flex:1; display:flex; flex-direction:column; justify-content:center; max-width:380px; }
        .lr-tag {
          font-size:11px; font-weight:700; text-transform:uppercase;
          letter-spacing:2px; color:var(--primary); margin-bottom:24px;
        }
        .lr-headline {
          font-family: var(--font-heading, 'Nunito', sans-serif);
          font-size: clamp(32px,3.2vw,44px);
          font-weight: 300; line-height: 1.15;
          color: var(--neu-text); margin-bottom: 20px;
        }
        .lr-headline em { font-style:italic; color:var(--primary); }
        .lr-body { font-size:14px; line-height:1.7; color:var(--neu-muted); font-weight:300; margin-bottom:40px; }
        .lr-features { display:flex; flex-direction:column; gap:16px; }
        .lr-feature { display:flex; align-items:center; gap:14px; font-size:13.5px; color:var(--neu-muted); font-weight:400; }
        .lr-feature-icon {
          width:36px; height:36px; background:var(--neu-bg);
          border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px;
          box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light);
          flex-shrink:0;
        }
        .lr-left-footer {
          font-size:12px; color:var(--neu-muted); font-weight:300;
          border-top:1px solid rgba(255,255,255,0.5); padding-top:24px; margin-top:auto;
        }

        /* ── RIGHT PANEL ── */
        .lr-right {
          flex:1; display:flex; align-items:center; justify-content:center; padding:32px 24px;
        }

        .lr-card {
          width:100%; max-width:440px;
          background: var(--neu-bg);
          border-radius: 30px;
          padding: 50px 40px;
          box-shadow: 20px 20px 60px var(--neu-dark), -20px -20px 60px var(--neu-light);
          animation: lr-fadeUp 0.5s ease;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .lr-card:hover {
          transform: translateY(-4px);
          box-shadow: 24px 24px 70px var(--neu-dark), -24px -24px 70px var(--neu-light);
        }
        .lr-card.shake { animation: lr-shake 0.5s ease; }

        /* Mobile logo */
        .lr-mobile-logo { display:flex; justify-content:center; margin-bottom:32px; }
        @media (min-width:900px) { .lr-mobile-logo { display:none; } }
        .lr-mobile-logo-outer {
          width:80px; height:80px;
          background:var(--neu-bg); border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          box-shadow: 8px 8px 20px var(--neu-dark), -8px -8px 20px var(--neu-light);
        }
        .lr-mobile-logo-inner {
          width:52px; height:52px;
          background: linear-gradient(135deg, var(--primary), var(--primary-deep));
          border-radius:16px;
          display:flex; align-items:center; justify-content:center;
          box-shadow: 4px 4px 12px rgba(0,0,0,0.15), -2px -2px 6px var(--neu-light);
        }
        .lr-mobile-logo-inner img {
          width: 30px; height: 30px; object-fit: contain;
          filter: brightness(0) invert(1);
        }

        /* Header */
        .lr-card-header { text-align:center; margin-bottom:36px; }
        .lr-card-eyebrow {
          font-size:11px; font-weight:700; text-transform:uppercase;
          letter-spacing:2px; color:var(--primary); margin-bottom:10px;
        }
        .lr-card-title {
          font-family: var(--font-heading, 'Nunito', sans-serif);
          font-size:2rem; font-weight:700; color:var(--neu-text);
          margin-bottom:8px; letter-spacing:-0.02em;
        }
        .lr-card-subtitle { font-size:15px; font-weight:400; color:var(--neu-muted); }

        /* Error */
        .lr-error {
          background:var(--neu-err-bg); border:1px solid var(--neu-err-bdr);
          border-radius:14px; padding:12px 16px; margin-bottom:24px;
          display:flex; gap:10px; align-items:center;
          font-size:13px; color:var(--neu-err);
        }

        /* Fields */
        .lr-field { margin-bottom:28px; position:relative; }

        .lr-neu-input {
          position:relative;
          background:var(--neu-bg);
          border-radius:15px;
          box-shadow: inset 8px 8px 16px var(--neu-dark), inset -8px -8px 16px var(--neu-light);
          transition: box-shadow 0.3s ease;
        }
        .lr-neu-input:focus-within {
          box-shadow: inset 4px 4px 8px var(--neu-dark), inset -4px -4px 8px var(--neu-light);
        }
        .lr-neu-input:focus-within .lr-input-icon-left { color: var(--neu-icon); }

        .lr-input {
          width:100%;
          background:transparent;
          border:none;
          padding:20px 50px 20px 55px;
          color:var(--neu-text);
          font-size:16px; font-weight:500;
          font-family:'Nunito', var(--font-body, sans-serif);
          outline:none;
          transition:all 0.3s ease;
        }
        .lr-input::placeholder { color:transparent; }

        /* Floating label */
        .lr-float-label {
          position:absolute;
          left:55px; top:50%;
          transform:translateY(-50%);
          color:var(--neu-muted);
          font-size:16px; font-weight:400;
          pointer-events:none;
          transition:all 0.3s ease;
          font-family:'Nunito', var(--font-body, sans-serif);
        }
        .lr-input:focus ~ .lr-float-label,
        .lr-input:not(:placeholder-shown) ~ .lr-float-label {
          top:8px; font-size:11px;
          color:var(--neu-icon);
          transform:translateY(0);
          font-weight:700; letter-spacing:0.5px; text-transform:uppercase;
        }

        .lr-input-icon-left {
          position:absolute; left:18px; top:50%;
          transform:translateY(-50%);
          color:var(--neu-muted);
          pointer-events:none; display:flex;
          transition:color 0.3s ease;
        }

        /* Eye toggle */
        .lr-eye-btn {
          position:absolute; right:12px; top:50%;
          transform:translateY(-50%);
          background:var(--neu-bg); border:none; cursor:pointer;
          padding:8px; color:var(--neu-muted); border-radius:10px;
          display:flex;
          box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light);
          transition:all 0.3s ease;
        }
        .lr-eye-btn:hover { color:var(--neu-icon); }
        .lr-eye-btn:active {
          box-shadow: inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light);
        }
        .lr-input-pass { padding-right:52px; }

        /* Submit button */
        .lr-btn {
          width:100%; margin-top:4px;
          background:linear-gradient(135deg, var(--primary), var(--primary-deep));
          border:none; border-radius:15px;
          padding:18px 32px;
          color:#fff; font-size:16px; font-weight:700;
          font-family:'Nunito', var(--font-body, sans-serif);
          cursor:pointer; position:relative; overflow:hidden;
          display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow: 6px 6px 16px rgba(0,0,0,0.15), -3px -3px 10px var(--neu-light);
          transition:all 0.3s ease;
        }
        .lr-btn::before {
          content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);
          transition:left 0.5s ease;
        }
        .lr-btn:hover:not(:disabled) {
          transform:translateY(-2px);
          box-shadow: 8px 8px 20px rgba(0,0,0,0.18), -4px -4px 12px var(--neu-light);
        }
        .lr-btn:hover:not(:disabled)::before { left:100%; }
        .lr-btn:active:not(:disabled) {
          transform:translateY(0);
          box-shadow: inset 3px 3px 8px rgba(0,0,0,0.2), inset -2px -2px 5px rgba(255,255,255,0.1);
        }
        .lr-btn:disabled { opacity:0.7; cursor:not-allowed; }

        /* Divider */
        .lr-divider {
          display:flex; align-items:center; margin:30px 0 22px; gap:16px;
        }
        .lr-divider-line {
          flex:1; height:2px;
          background:linear-gradient(90deg,transparent,var(--neu-dark),transparent);
        }
        .lr-divider span {
          color:var(--neu-muted); font-size:12px; font-weight:600;
          text-transform:uppercase; letter-spacing:1px; white-space:nowrap;
        }

        /* Footer note */
        .lr-footer-note {
          text-align:center; font-size:14px; color:var(--neu-muted);
          font-weight:400; line-height:1.6;
        }
        .lr-footer-note strong { color:var(--primary); font-weight:700; cursor:pointer; }
        .lr-club-name {
          text-align:center; font-size:12px; font-weight:700;
          color:var(--neu-icon); margin-top:20px;
          text-transform:uppercase; letter-spacing:1.5px;
        }
        .lr-badge {
          text-align:center; font-size:10px; color:var(--neu-muted);
          margin-top:6px; letter-spacing:1px; text-transform:uppercase; font-weight:600;
        }

        @media (prefers-reduced-motion:reduce) {
          *,*::before,*::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
        }
        @media (max-width:480px) {
          .lr-card { padding:35px 25px; border-radius:20px; }
        }
      `}</style>

      <div className="lr-page">
        {/* LEFT PANEL */}
        <div className="lr-left">
          <div className="lr-brand">
            <div className="lr-brand-logo">
              <img src={LOGO_URL} alt={clubName} />
            </div>
            <div className="lr-brand-name">
              {clubName}
              <span>District · Member Portal</span>
            </div>
          </div>

          <div className="lr-hero">
            <div className="lr-tag">Member dashboard</div>
            <h1 className="lr-headline">Serve to change <em>lives.</em></h1>
            <p className="lr-body">
              Access project reports, member directory, governance tools, and club communications — all in one place.
            </p>
            <div className="lr-features">
              <div className="lr-feature"><div className="lr-feature-icon">📋</div>Project management & reporting</div>
              <div className="lr-feature"><div className="lr-feature-icon">👥</div>Member records & attendance</div>
              <div className="lr-feature"><div className="lr-feature-icon">📄</div>Governance & bylaws archive</div>
            </div>
          </div>

          <div className="lr-left-footer">
            © {new Date().getFullYear()} {clubName} · Rotary International
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lr-right">
          <div className={`lr-card${shake ? ' shake' : ''}`}>

            {/* Mobile logo */}
            <div className="lr-mobile-logo">
              <div className="lr-mobile-logo-outer">
                <div className="lr-mobile-logo-inner">
                  <img src={LOGO_URL} alt={clubName} />
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
                <div className="lr-neu-input">
                  <span className="lr-input-icon-left"><MailIcon /></span>
                  <input
                    id="email" ref={emailRef} type="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="lr-input" placeholder=" "
                    autoComplete="email" required
                  />
                  <label className="lr-float-label" htmlFor="email">Email address</label>
                </div>
              </div>

              <div className="lr-field">
                <div className="lr-neu-input">
                  <span className="lr-input-icon-left"><LockIcon /></span>
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="lr-input lr-input-pass" placeholder=" "
                    autoComplete="current-password" required
                  />
                  <label className="lr-float-label" htmlFor="password">Password</label>
                  <button
                    type="button" className="lr-eye-btn"
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

            <div className="lr-divider">
              <div className="lr-divider-line" />
              <span>Invitation only</span>
              <div className="lr-divider-line" />
            </div>

            <p className="lr-footer-note">
              Access is by invitation only.<br />
              Contact your <strong>club administrator</strong> to get started.
            </p>
            <div className="lr-club-name">{clubName}</div>
            <div className="lr-badge">Rotaract · District 3281 · Bangladesh</div>
          </div>
        </div>
      </div>
    </>
  );
}
