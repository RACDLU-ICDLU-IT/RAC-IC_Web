// pages/auth/ForgotPassword.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useTenant } from '../../hooks/useTenant';

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      style={{ animation: 'lr-spin 0.8s linear infinite', transformOrigin: 'center' }}
    />
  </svg>
);
const CheckCircle = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export default function ForgotPassword() {
  const { settings, tenant } = useTenant();
  const clubName = settings.clubName || tenant.fullName;

  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [shake, setShake]         = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const emailRef                  = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap');

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
          --accent:        var(--color-accent, #c41e50);
          --accent-deep:   color-mix(in srgb, var(--accent) 80%, black);
          --accent-glow:   color-mix(in srgb, var(--accent) 25%, transparent);
        }

        @keyframes lr-spin { to { transform: rotate(360deg); } }
        @keyframes lr-fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lr-shake {
          0%,100%{transform:translateX(0)} 15%{transform:translateX(-7px)} 30%{transform:translateX(7px)}
          45%{transform:translateX(-4px)} 60%{transform:translateX(4px)} 75%{transform:translateX(-2px)} 90%{transform:translateX(2px)}
        }

        .lr, .lr * { margin:0; padding:0; box-sizing:border-box; }

        .lr {
          font-family: 'Nunito', var(--font-body, sans-serif);
          min-height: 100vh;
          background: var(--neu-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 100px 20px 40px;
        }

        .lr-card {
          width: 100%;
          max-width: 480px;
          background: var(--neu-bg);
          border-radius: 30px;
          box-shadow: 20px 20px 60px var(--neu-dark), -20px -20px 60px var(--neu-light);
          animation: lr-fadeUp 0.45s ease both;
          transition: box-shadow 0.3s ease;
          overflow: hidden;
        }
        @media (min-width: 900px) {
          .lr-card { max-width: 920px; display: flex; flex-direction: row; }
        }
        .lr-card.shake { animation: lr-shake 0.5s ease; }

        .lr-info { display: none; }
        @media (min-width: 900px) {
          .lr-info {
            display: flex; flex-direction: column; justify-content: space-between; flex: 1;
            padding: 48px 44px;
            background: linear-gradient(160deg, color-mix(in srgb, var(--neu-bg) 97%, var(--accent)), var(--neu-bg));
            border-right: 1px solid color-mix(in srgb, var(--neu-dark) 60%, transparent);
          }
        }

        .lr-brand { display:flex; flex-direction:column; gap:4px; }
        .lr-brand-name { font-family: var(--font-heading, 'Nunito', sans-serif); font-size:15px; font-weight:700; color:var(--accent); line-height:1.3; letter-spacing:-0.01em; }
        .lr-brand-name span { display:block; font-weight:400; font-size:11px; color:var(--neu-muted); letter-spacing:0.3px; }

        .lr-hero { flex:1; display:flex; flex-direction:column; justify-content:center; }
        .lr-tag { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--accent); margin-bottom:20px; }
        .lr-headline { font-family: var(--font-heading, 'Nunito', sans-serif); font-size: clamp(28px, 2.6vw, 38px); font-weight:300; line-height:1.15; color:var(--neu-text); margin-bottom:16px; }
        .lr-headline em { font-style:italic; color:var(--accent); }
        .lr-body { font-size:13.5px; line-height:1.7; color:var(--neu-muted); font-weight:300; margin-bottom:32px; }
        .lr-features { display:flex; flex-direction:column; gap:12px; }
        .lr-feature { display:flex; align-items:center; gap:12px; font-size:13px; color:var(--neu-muted); }
        .lr-feature-icon { width:34px; height:34px; background:var(--neu-bg); border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light); flex-shrink:0; }
        .lr-info-footer { font-size:11px; color:var(--neu-muted); font-weight:300; border-top:1px solid color-mix(in srgb, var(--neu-dark) 50%, transparent); padding-top:20px; margin-top:auto; }

        .lr-form-col { padding: 36px 32px 32px; display: flex; flex-direction: column; }
        @media (min-width: 900px) { .lr-form-col { width: 400px; flex-shrink: 0; padding: 44px 40px; } }

        .lr-logo-circle { display:flex; justify-content:center; margin-bottom:24px; }
        @media (min-width:900px) { .lr-logo-circle { display:none !important; } }
        .lr-logo-outer { width:76px; height:76px; border-radius:50%; background:var(--neu-bg); display:flex; align-items:center; justify-content:center; box-shadow: 8px 8px 20px var(--neu-dark), -8px -8px 20px var(--neu-light); }
        .lr-logo-mask { width:42px; height:42px; -webkit-mask-image: var(--lr-logo-url); mask-image: var(--lr-logo-url); -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-size: contain; mask-size: contain; -webkit-mask-position: center; mask-position: center; background-color: var(--accent); flex-shrink:0; }

        .lr-card-header { text-align:center; margin-bottom:28px; }
        .lr-card-eyebrow { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--accent); margin-bottom:10px; }
        .lr-card-title { font-family: var(--font-heading, 'Nunito', sans-serif); font-size:2rem; font-weight:700; color:var(--neu-text); letter-spacing:-0.02em; margin-bottom:8px; }
        .lr-card-subtitle { font-size:15px; font-weight:400; color:var(--neu-muted); line-height:1.5; }

        .lr-error { background:var(--neu-err-bg); border:1px solid var(--neu-err-bdr); border-radius:14px; padding:12px 16px; margin-bottom:24px; display:flex; gap:10px; align-items:flex-start; font-size:13.5px; color:var(--neu-err); line-height:1.4; }
        .lr-error svg { flex-shrink:0; margin-top:1px; }

        .lr-field { margin-bottom:24px; }
        .lr-neu-input { position:relative; background:var(--neu-bg); border-radius:15px; box-shadow: inset 8px 8px 16px var(--neu-dark), inset -8px -8px 16px var(--neu-light); transition: box-shadow 0.3s ease; }
        .lr-neu-input:focus-within { box-shadow: inset 4px 4px 8px var(--neu-dark), inset -4px -4px 8px var(--neu-light), 0 0 0 2px var(--accent-glow); }
        .lr-neu-input:focus-within .lr-icon-left { color:var(--accent); }
        .lr-input { width:100%; background:transparent; border:none; padding:22px 52px 10px 54px; color:var(--neu-text); font-size:15px; font-weight:500; font-family:'Nunito', var(--font-body, sans-serif); outline:none; transition:all 0.25s ease; }
        .lr-input::placeholder { color:transparent; }
        .lr-float-label { position:absolute; left:54px; top:50%; transform:translateY(-50%); color:var(--neu-muted); font-size:15px; font-weight:400; pointer-events:none; transition:all 0.25s ease; font-family:'Nunito', var(--font-body, sans-serif); white-space:nowrap; }
        .lr-input:focus ~ .lr-float-label, .lr-input:not(:placeholder-shown) ~ .lr-float-label { top:10px; transform:none; font-size:10px; font-weight:700; color:var(--accent); letter-spacing:0.6px; text-transform:uppercase; }
        .lr-icon-left { position:absolute; left:18px; top:50%; transform:translateY(-50%); color:var(--neu-muted); pointer-events:none; display:flex; transition:color 0.25s ease; }

        .lr-btn { width:100%; background:linear-gradient(135deg, var(--accent), var(--accent-deep)); border:none; border-radius:15px; padding:17px 32px; color:#fff; font-size:15px; font-weight:700; font-family:'Nunito', var(--font-body, sans-serif); cursor:pointer; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow: 6px 6px 16px rgba(0,0,0,0.14), -3px -3px 10px var(--neu-light); transition:all 0.25s ease; letter-spacing:0.2px; }
        .lr-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent); transition:left 0.45s ease; }
        .lr-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow: 9px 9px 22px rgba(0,0,0,0.18), -4px -4px 12px var(--neu-light); }
        .lr-btn:hover:not(:disabled)::before { left:100%; }
        .lr-btn:active:not(:disabled) { transform:translateY(0); box-shadow: inset 3px 3px 8px rgba(0,0,0,0.18), inset -2px -2px 5px rgba(255,255,255,0.08); }
        .lr-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .lr-btn-secondary { width:100%; background:transparent; border:2px solid var(--neu-dark); border-radius:15px; padding:15px 32px; color:var(--neu-muted); font-size:14px; font-weight:700; font-family:'Nunito', var(--font-body, sans-serif); cursor:pointer; transition:all 0.2s ease; }
        .lr-btn-secondary:hover { border-color:var(--accent); color:var(--accent); }

        .lr-divider { display:flex; align-items:center; margin:28px 0 20px; gap:14px; }
        .lr-divider-line { flex:1; height:2px; background:linear-gradient(90deg,transparent,var(--neu-dark),transparent); }
        .lr-divider span { color:var(--neu-muted); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; white-space:nowrap; }

        .lr-footer-note { text-align:center; font-size:14px; color:var(--neu-muted); font-weight:400; line-height:1.65; }
        .lr-footer-note a { color:var(--accent); font-weight:700; text-decoration:none; cursor:pointer; }
        .lr-footer-note a:hover { text-decoration:underline; }
        .lr-club-name { text-align:center; font-size:10px; font-weight:800; color:var(--neu-icon); margin-top:22px; text-transform:uppercase; letter-spacing:1.2px; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .lr-badge { text-align:center; font-size:10px; color:var(--neu-muted); margin-top:5px; letter-spacing:1px; text-transform:uppercase; font-weight:600; }

        .lr-success { text-align:center; }
        .lr-success-icon { width:76px; height:76px; border-radius:50%; background:var(--neu-bg); display:flex; align-items:center; justify-content:center; box-shadow: 8px 8px 20px var(--neu-dark), -8px -8px 20px var(--neu-light); color:var(--accent); margin:0 auto 22px; }
        .lr-success .lr-card-title { font-size:1.6rem; }
        .lr-success .lr-card-subtitle strong { color:var(--neu-text); font-weight:700; }

        @media (prefers-reduced-motion:reduce) { .lr, .lr * { animation-duration:0.01ms !important; transition-duration:0.01ms !important; } }
        @media (max-width:480px) { .lr-form-col { padding:28px 20px 24px; } .lr-card-title { font-size:1.75rem; } .lr-success .lr-card-title { font-size:1.4rem; } }
      `}</style>

      <div className="lr">
        <div className={`lr-card${shake ? ' shake' : ''}`}>

          <div className="lr-info">
            <div className="lr-brand">
              <div className="lr-brand-name">
                {clubName}
                <span>District 64 · Member Portal</span>
              </div>
            </div>

            <div className="lr-hero">
              <div className="lr-tag">Account recovery</div>
              <h1 className="lr-headline">Let's get you <em>back in.</em></h1>
              <p className="lr-body">
                Enter the email address on your account and we'll send you a secure link to set a new password.
              </p>
              <div className="lr-features">
                <div className="lr-feature">
                  <div className="lr-feature-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent)'}}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  One-time secure reset link
                </div>
                <div className="lr-feature">
                  <div className="lr-feature-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent)'}}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  Sent only to your verified email
                </div>
                <div className="lr-feature">
                  <div className="lr-feature-icon">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--accent)'}}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  Your current password stays active until reset
                </div>
              </div>
            </div>

            <div className="lr-info-footer">
              © {new Date().getFullYear()} {clubName} · Rotary International
            </div>
          </div>

          <div className="lr-form-col">
            <div className="lr-logo-circle">
              <div className="lr-logo-outer">
                <div className="lr-logo-mask" role="img" aria-label={clubName} />
              </div>
            </div>

            {submitted ? (
              <div className="lr-success">
                <div className="lr-success-icon"><CheckCircle /></div>
                <div className="lr-card-header" style={{marginBottom:20}}>
                  <h2 className="lr-card-title">Check your inbox</h2>
                  <p className="lr-card-subtitle">
                    If an account exists for <strong>{email}</strong>, a password reset link is on its way.
                  </p>
                </div>
                <button
                  className="lr-btn-secondary"
                  onClick={() => { setSubmitted(false); setEmail(''); setError(null); }}
                >
                  Try a different email
                </button>
                <p className="lr-footer-note" style={{marginTop:20}}>
                  <Link to="/login">← Back to sign in</Link>
                </p>
              </div>
            ) : (
              <>
                <div className="lr-card-header">
                  <div className="lr-card-eyebrow">Reset password</div>
                  <h2 className="lr-card-title">Forgot password?</h2>
                  <p className="lr-card-subtitle">No worries — enter your email and we'll send you a reset link.</p>
                </div>

                {error && (
                  <div className="lr-error" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="lr-field">
                    <div className="lr-neu-input">
                      <span className="lr-icon-left"><MailIcon /></span>
                      <input
                        id="fp-email" ref={emailRef} type="email"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className="lr-input" placeholder=" "
                        autoComplete="email" required
                      />
                      <label className="lr-float-label" htmlFor="fp-email">Email address</label>
                    </div>
                  </div>

                  <button type="submit" className="lr-btn" disabled={loading}>
                    {loading ? <><Spinner /> Sending…</> : <>Send Reset Link →</>}
                  </button>
                </form>

                <div className="lr-divider">
                  <div className="lr-divider-line" />
                  <span>or</span>
                  <div className="lr-divider-line" />
                </div>

                <p className="lr-footer-note">
                  Remembered your password? <Link to="/login">Sign in</Link>
                </p>
              </>
            )}

            <div className="lr-club-name">{clubName}</div>
            <div className="lr-badge">Rotary International · District 64 · Bangladesh</div>
          </div>

        </div>
      </div>
    </>
  );
}
