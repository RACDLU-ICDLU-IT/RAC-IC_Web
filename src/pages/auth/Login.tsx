import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useTenant } from '../../hooks/useTenant';

/* ── SVG Icons ─────────────────────────────────────────────────────────── */
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
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ── Remember Me: controls whether session survives browser close ─────── */
const REMEMBER_KEY = 'lr_remember';
const getRemembered = () => { try { return localStorage.getItem(REMEMBER_KEY) === '1'; } catch { return false; } };
const setRemembered = (v: boolean) => { try { v ? localStorage.setItem(REMEMBER_KEY, '1') : localStorage.removeItem(REMEMBER_KEY); } catch {} };

/* ═══════════════════════════════════════════════════════════════════════ */
export default function Login() {
  const { settings, tenant } = useTenant();
  const clubName = settings.clubName || tenant.fullName;

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [rememberMe, setRememberMe] = useState(getRemembered);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [shake, setShake]           = useState(false);
  const navigate                    = useNavigate();
  const emailRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      triggerShake(); return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      triggerShake(); return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;

      // Persist remember-me preference
      setRemembered(rememberMe);
      // If not remember me, sign out session on tab close via sessionStorage flag
      if (!rememberMe) {
        try { sessionStorage.setItem('lr_no_persist', '1'); } catch {}
      } else {
        try { sessionStorage.removeItem('lr_no_persist'); } catch {}
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();
      const role = profile?.role;
      navigate(role === 'admin' || role === 'master_admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap');

        /* ── Neumorphic palette — zero hardcoded brand colors ── */
        .lr {
          --lr-logo-url: url('https://res.cloudinary.com/dpaeapdp6/image/upload/i7kkght9us3vc59fwmz5.svg');
          --neu-bg:        #e8eaf0;
          --neu-dark:      #c8cad4;
          --neu-light:     #ffffff;
          --neu-text:      #3d4468;
          --neu-muted:     #9499b7;
          --neu-icon:      #6c7293;
          --neu-err:       #e53e3e;
          --neu-err-bg:    #fff5f5;
          --neu-err-bdr:   #fed7d7;
          /* Brand: accent only, never primary */
          --accent:        var(--color-accent, #c41e50);
          --accent-deep:   color-mix(in srgb, var(--accent) 80%, black);
          --accent-glow:   color-mix(in srgb, var(--accent) 25%, transparent);
        }

        @keyframes lr-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes lr-fadeUp {
          from { opacity:0; transform:translateY(18px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes lr-shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-7px)}
          30%{transform:translateX(7px)}
          45%{transform:translateX(-4px)}
          60%{transform:translateX(4px)}
          75%{transform:translateX(-2px)}
          90%{transform:translateX(2px)}
        }

        .lr, .lr * { margin:0; padding:0; box-sizing:border-box; }

        .lr {
          font-family: 'Nunito', var(--font-body, sans-serif);
          min-height: 100vh;
          background: var(--neu-bg);
          display: flex;
          align-items: stretch;
          padding-top: 72px; /* fixed navbar height */
        }

        /* ════ LEFT PANEL (desktop only) ════ */
        .lr-left {
          display: none;
          flex: 1;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 56px;
          background: var(--neu-bg);
          border-right: 1px solid rgba(255,255,255,0.6);
        }
        @media (min-width: 900px) { .lr-left { display: flex; } }

        .lr-brand { display:flex; flex-direction:column; gap:4px; }
        .lr-brand-name {
          font-family: var(--font-heading, 'Nunito', sans-serif);
          font-size:16px; font-weight:700; color:var(--accent); line-height:1.3;
          letter-spacing:-0.01em;
        }
        .lr-brand-name span { display:block; font-weight:400; font-size:11px; color:var(--neu-muted); letter-spacing:0.3px; }

        .lr-hero { flex:1; display:flex; flex-direction:column; justify-content:center; max-width:380px; }
        .lr-tag {
          font-size:11px; font-weight:700; text-transform:uppercase;
          letter-spacing:2px; color:var(--accent); margin-bottom:24px;
        }
        .lr-headline {
          font-family: var(--font-heading, 'Nunito', sans-serif);
          font-size: clamp(30px, 3vw, 42px);
          font-weight:300; line-height:1.15;
          color:var(--neu-text); margin-bottom:20px;
        }
        .lr-headline em { font-style:italic; color:var(--accent); }
        .lr-body { font-size:14px; line-height:1.7; color:var(--neu-muted); font-weight:300; margin-bottom:40px; }
        .lr-features { display:flex; flex-direction:column; gap:14px; }
        .lr-feature { display:flex; align-items:center; gap:14px; font-size:13.5px; color:var(--neu-muted); }
        .lr-feature-icon {
          width:36px; height:36px; background:var(--neu-bg); border-radius:10px;
          display:flex; align-items:center; justify-content:center; font-size:16px;
          box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light);
          flex-shrink:0;
        }
        .lr-left-footer {
          font-size:12px; color:var(--neu-muted); font-weight:300;
          border-top:1px solid rgba(255,255,255,0.5); padding-top:24px; margin-top:auto;
        }

        /* ════ RIGHT PANEL ════ */
        .lr-right {
          flex:1; display:flex; align-items:center; justify-content:center;
          padding:40px 24px;
        }

        .lr-card {
          width:100%; max-width:440px;
          background:var(--neu-bg);
          border-radius:30px;
          padding:36px 36px 36px;
          box-shadow: 20px 20px 60px var(--neu-dark), -20px -20px 60px var(--neu-light);
          animation: lr-fadeUp 0.45s ease both;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .lr-card:hover {
          transform:translateY(-3px);
          box-shadow: 24px 24px 70px var(--neu-dark), -24px -24px 70px var(--neu-light);
        }
        .lr-card.shake { animation: lr-shake 0.5s ease; }

        /* ── Mobile logo circle — hidden on desktop ── */
        .lr-logo-circle {
          display:flex; justify-content:center; margin-bottom:28px;
        }
        @media (min-width:900px) { .lr-logo-circle { display:none !important; } }
        .lr-logo-outer {
          width:80px; height:80px; border-radius:50%;
          background:var(--neu-bg);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 8px 8px 20px var(--neu-dark), -8px -8px 20px var(--neu-light);
        }
        .lr-logo-mask {
          width:44px; height:44px;
          -webkit-mask-image: var(--lr-logo-url);
          mask-image: var(--lr-logo-url);
          -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
          -webkit-mask-size: contain; mask-size: contain;
          -webkit-mask-position: center; mask-position: center;
          background-color: var(--accent);
          flex-shrink:0;
        }

        /* ── Card header ── */
        .lr-card-header { text-align:center; margin-bottom:32px; }
        .lr-card-eyebrow {
          font-size:11px; font-weight:700; text-transform:uppercase;
          letter-spacing:2px; color:var(--accent); margin-bottom:10px;
        }
        .lr-card-title {
          font-family: var(--font-heading, 'Nunito', sans-serif);
          font-size:2rem; font-weight:700;
          color:var(--neu-text); letter-spacing:-0.02em; margin-bottom:8px;
        }
        .lr-card-subtitle { font-size:15px; font-weight:400; color:var(--neu-muted); line-height:1.5; }

        /* ── Error banner ── */
        .lr-error {
          background:var(--neu-err-bg); border:1px solid var(--neu-err-bdr);
          border-radius:14px; padding:12px 16px; margin-bottom:24px;
          display:flex; gap:10px; align-items:flex-start;
          font-size:13.5px; color:var(--neu-err); line-height:1.4;
        }
        .lr-error svg { flex-shrink:0; margin-top:1px; }

        /* ── Input fields ── */
        .lr-field { margin-bottom:24px; }

        .lr-neu-input {
          position:relative; background:var(--neu-bg); border-radius:15px;
          box-shadow: inset 8px 8px 16px var(--neu-dark), inset -8px -8px 16px var(--neu-light);
          transition: box-shadow 0.3s ease;
        }
        .lr-neu-input:focus-within {
          box-shadow:
            inset 4px 4px 8px var(--neu-dark),
            inset -4px -4px 8px var(--neu-light),
            0 0 0 2px var(--accent-glow);
        }
        .lr-neu-input:focus-within .lr-icon-left { color:var(--accent); }

        .lr-input {
          width:100%; background:transparent; border:none;
          padding:22px 52px 10px 54px;
          color:var(--neu-text); font-size:15px; font-weight:500;
          font-family:'Nunito', var(--font-body, sans-serif);
          outline:none; transition:all 0.25s ease;
        }
        .lr-input::placeholder { color:transparent; }

        /* Floating label */
        .lr-float-label {
          position:absolute; left:54px; top:50%; transform:translateY(-50%);
          color:var(--neu-muted); font-size:15px; font-weight:400;
          pointer-events:none;
          transition:all 0.25s ease;
          font-family:'Nunito', var(--font-body, sans-serif);
          white-space:nowrap;
        }
        .lr-input:focus ~ .lr-float-label,
        .lr-input:not(:placeholder-shown) ~ .lr-float-label {
          top:10px; transform:none;
          font-size:10px; font-weight:700;
          color:var(--accent);
          letter-spacing:0.6px; text-transform:uppercase;
        }

        .lr-icon-left {
          position:absolute; left:18px; top:50%; transform:translateY(-50%);
          color:var(--neu-muted); pointer-events:none; display:flex;
          transition:color 0.25s ease;
        }
        /* Shift icon up when label floats */
        .lr-neu-input:focus-within .lr-icon-left,
        .lr-input:not(:placeholder-shown) ~ .lr-icon-left { transform:translateY(-4px); }
        /* Can't do sibling-select above input in CSS — keep icon centered always */
        .lr-icon-left { transform:translateY(-50%); }

        .lr-eye-btn {
          position:absolute; right:12px; top:50%; transform:translateY(-50%);
          background:var(--neu-bg); border:none; cursor:pointer;
          padding:8px; color:var(--neu-muted); border-radius:10px; display:flex;
          box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light);
          transition:all 0.2s ease;
        }
        .lr-eye-btn:hover { color:var(--accent); }
        .lr-eye-btn:active {
          box-shadow: inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light);
        }
        /* Extra right padding for password input */
        .lr-input-pass { padding-right:52px; }

        /* ── Remember me row ── */
        .lr-options {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:24px; gap:12px;
        }
        .lr-remember {
          display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none;
        }
        .lr-remember input[type="checkbox"] { display:none; }
        .lr-checkbox {
          width:22px; height:22px; border-radius:7px;
          background:var(--neu-bg);
          display:flex; align-items:center; justify-content:center;
          box-shadow: 3px 3px 8px var(--neu-dark), -3px -3px 8px var(--neu-light);
          transition:all 0.2s ease; flex-shrink:0;
          color:transparent;
        }
        .lr-remember input[type="checkbox"]:checked + .lr-checkbox {
          box-shadow: inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light);
          color:var(--accent);
        }
        .lr-remember-label {
          font-size:13px; font-weight:600; color:var(--neu-muted);
          font-family:'Nunito', var(--font-body, sans-serif);
        }

        /* ── Submit button ── */
        .lr-btn {
          width:100%;
          background:linear-gradient(135deg, var(--accent), var(--accent-deep));
          border:none; border-radius:15px; padding:17px 32px;
          color:#fff; font-size:15px; font-weight:700;
          font-family:'Nunito', var(--font-body, sans-serif);
          cursor:pointer; position:relative; overflow:hidden;
          display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow: 6px 6px 16px rgba(0,0,0,0.14), -3px -3px 10px var(--neu-light);
          transition:all 0.25s ease; letter-spacing:0.2px;
        }
        .lr-btn::before {
          content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);
          transition:left 0.45s ease;
        }
        .lr-btn:hover:not(:disabled) {
          transform:translateY(-2px);
          box-shadow: 9px 9px 22px rgba(0,0,0,0.18), -4px -4px 12px var(--neu-light);
        }
        .lr-btn:hover:not(:disabled)::before { left:100%; }
        .lr-btn:active:not(:disabled) {
          transform:translateY(0);
          box-shadow: inset 3px 3px 8px rgba(0,0,0,0.18), inset -2px -2px 5px rgba(255,255,255,0.08);
        }
        .lr-btn:disabled { opacity:0.65; cursor:not-allowed; }

        /* ── Divider ── */
        .lr-divider {
          display:flex; align-items:center; margin:28px 0 20px; gap:14px;
        }
        .lr-divider-line {
          flex:1; height:2px;
          background:linear-gradient(90deg,transparent,var(--neu-dark),transparent);
        }
        .lr-divider span {
          color:var(--neu-muted); font-size:11px; font-weight:700;
          text-transform:uppercase; letter-spacing:1.2px; white-space:nowrap;
        }

        /* ── Footer note ── */
        .lr-footer-note {
          text-align:center; font-size:14px; color:var(--neu-muted);
          font-weight:400; line-height:1.65;
        }
        .lr-footer-note strong { color:var(--accent); font-weight:700; cursor:pointer; }
        .lr-club-name {
          text-align:center; font-size:10px; font-weight:800;
          color:var(--neu-icon); margin-top:22px;
          text-transform:uppercase; letter-spacing:1.2px; line-height:1.4;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .lr-badge {
          text-align:center; font-size:10px; color:var(--neu-muted);
          margin-top:5px; letter-spacing:1px; text-transform:uppercase; font-weight:600;
        }

        @media (prefers-reduced-motion:reduce) {
          .lr, .lr * { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
        }
        @media (max-width:480px) {
          .lr-card { padding:36px 24px 32px; border-radius:24px; }
          .lr-card-title { font-size:1.75rem; }
        }
      `}</style>

      <div className="lr">
        {/* ════ LEFT PANEL ════ */}
        <div className="lr-left">
          <div className="lr-brand">
            <div className="lr-brand-name">
              {clubName}
              <span>District 64 · Member Portal</span>
            </div>
          </div>

          <div className="lr-hero">
            <div className="lr-tag">Member dashboard</div>
            <h1 className="lr-headline">Serve to change <em>lives.</em></h1>
            <p className="lr-body">
              Access project reports, member directory, governance tools, and club communications — all in one place.
            </p>
            <div className="lr-features">
              <div className="lr-feature">
                <div className="lr-feature-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent)'}}>
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
                  </svg>
                </div>
                Project management & reporting
              </div>
              <div className="lr-feature">
                <div className="lr-feature-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent)'}}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                Member records & attendance
              </div>
              <div className="lr-feature">
                <div className="lr-feature-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent)'}}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                Governance & bylaws archive
              </div>
            </div>
          </div>

          <div className="lr-left-footer">
            © {new Date().getFullYear()} {clubName} · Rotary International
          </div>
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div className="lr-right">
          <div className={`lr-card${shake ? ' shake' : ''}`}>

            {/* Mobile logo — neumorphic circle, logo masked to accent color */}
            <div className="lr-logo-circle">
              <div className="lr-logo-outer">
                <div className="lr-logo-mask" role="img" aria-label={clubName} />
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
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} noValidate>
              {/* Email */}
              <div className="lr-field">
                <div className="lr-neu-input">
                  <span className="lr-icon-left"><MailIcon /></span>
                  <input
                    id="lr-email" ref={emailRef} type="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="lr-input" placeholder=" "
                    autoComplete="email" required
                  />
                  <label className="lr-float-label" htmlFor="lr-email">Email address</label>
                </div>
              </div>

              {/* Password */}
              <div className="lr-field">
                <div className="lr-neu-input">
                  <span className="lr-icon-left"><LockIcon /></span>
                  <input
                    id="lr-password"
                    type={showPass ? 'text' : 'password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="lr-input lr-input-pass" placeholder=" "
                    autoComplete="current-password" required
                  />
                  <label className="lr-float-label" htmlFor="lr-password">Password</label>
                  <button
                    type="button" className="lr-eye-btn"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="lr-options">
                <label className="lr-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span className="lr-checkbox"><CheckIcon /></span>
                  <span className="lr-remember-label">Remember me</span>
                </label>
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
            <div className="lr-badge">Rotary International · District 64 · Bangladesh</div>
          </div>
        </div>
      </div>
    </>
  );
}
