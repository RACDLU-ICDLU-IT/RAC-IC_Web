import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const CheckCircle = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

export default function ResetPassword() {
  const { settings, tenant } = useTenant();
  const clubName = settings.clubName || tenant.fullName;
  const navigate = useNavigate();

  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw]             = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [shake, setShake]                     = useState(false);
  const [done, setDone]                       = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);

  // The reset link lands here with a recovery token in the URL hash
  // fragment (#access_token=...&type=recovery). The supabase-js client
  // auto-parses this on load (detectSessionInUrl: true), but that parse
  // is async and can race ahead of a naive one-shot getSession() call —
  // which is what caused this page to hang on "Verifying...". Listening
  // to onAuthStateChange instead catches the PASSWORD_RECOVERY event
  // the moment the client finishes exchanging the hash token, with a
  // getSession() fallback + short delay for any other startup event.
  useEffect(() => {
    let settled = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (event === 'PASSWORD_RECOVERY' || (session && event !== 'SIGNED_OUT')) {
        settled = true;
        setValidSession(true);
        setCheckingSession(false);
      }
    });

    // Fallback: if no auth event fires within a short window (e.g. the
    // hash was already invalid/expired so there's nothing to exchange),
    // fall back to a direct session check before giving up.
    const fallback = setTimeout(() => {
      if (settled) return;
      supabase.auth.getSession().then(({ data }) => {
        if (settled) return;
        settled = true;
        setValidSession(!!data.session);
        setCheckingSession(false);
      });
    }, 1500);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => { if (validSession) pwRef.current?.focus(); }, [validSession]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      triggerShake(); return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      triggerShake(); return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
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
        .lr-card.shake { animation: lr-shake 0.5s ease; }

        .lr-form-col { padding: 36px 32px 32px; display: flex; flex-direction: column; }
        @media (min-width: 900px) { .lr-form-col { padding: 44px 40px; } }

        .lr-logo-circle { display:flex; justify-content:center; margin-bottom:24px; }
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
        .lr-eye-btn { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:var(--neu-bg); border:none; cursor:pointer; padding:8px; color:var(--neu-muted); border-radius:10px; display:flex; box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light); transition:all 0.2s ease; }
        .lr-eye-btn:hover { color:var(--accent); }
        .lr-eye-btn:active { box-shadow: inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light); }
        .lr-input-pass { padding-right:52px; }

        .lr-btn { width:100%; background:linear-gradient(135deg, var(--accent), var(--accent-deep)); border:none; border-radius:15px; padding:17px 32px; color:#fff; font-size:15px; font-weight:700; font-family:'Nunito', var(--font-body, sans-serif); cursor:pointer; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow: 6px 6px 16px rgba(0,0,0,0.14), -3px -3px 10px var(--neu-light); transition:all 0.25s ease; letter-spacing:0.2px; }
        .lr-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent); transition:left 0.45s ease; }
        .lr-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow: 9px 9px 22px rgba(0,0,0,0.18), -4px -4px 12px var(--neu-light); }
        .lr-btn:hover:not(:disabled)::before { left:100%; }
        .lr-btn:active:not(:disabled) { transform:translateY(0); box-shadow: inset 3px 3px 8px rgba(0,0,0,0.18), inset -2px -2px 5px rgba(255,255,255,0.08); }
        .lr-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .lr-footer-note { text-align:center; font-size:14px; color:var(--neu-muted); font-weight:400; line-height:1.65; margin-top:20px; }
        .lr-footer-note a { color:var(--accent); font-weight:700; text-decoration:none; }
        .lr-footer-note a:hover { text-decoration:underline; }

        .lr-success { text-align:center; }
        .lr-success-icon { width:76px; height:76px; border-radius:50%; background:var(--neu-bg); display:flex; align-items:center; justify-content:center; box-shadow: 8px 8px 20px var(--neu-dark), -8px -8px 20px var(--neu-light); color:var(--accent); margin:0 auto 22px; }
        .lr-success .lr-card-title { font-size:1.6rem; }

        @media (prefers-reduced-motion:reduce) { .lr, .lr * { animation-duration:0.01ms !important; transition-duration:0.01ms !important; } }
        @media (max-width:480px) { .lr-form-col { padding:28px 20px 24px; } .lr-card-title { font-size:1.75rem; } .lr-success .lr-card-title { font-size:1.4rem; } }
      `}</style>

      <div className="lr">
        <div className={`lr-card${shake ? ' shake' : ''}`}>
          <div className="lr-form-col">
            <div className="lr-logo-circle">
              <div className="lr-logo-outer">
                <div className="lr-logo-mask" role="img" aria-label={clubName} />
              </div>
            </div>

            {checkingSession ? (
              <div className="lr-card-header">
                <Spinner />
                <p className="lr-card-subtitle" style={{ marginTop: 12 }}>Verifying your reset link…</p>
              </div>
            ) : !validSession ? (
              <div className="lr-success">
                <div className="lr-card-header">
                  <h2 className="lr-card-title">Link expired</h2>
                  <p className="lr-card-subtitle">
                    This password reset link is invalid or has expired. Please request a new one.
                  </p>
                </div>
                <Link to="/forgot-password" className="lr-btn" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                  Request New Link →
                </Link>
              </div>
            ) : done ? (
              <div className="lr-success">
                <div className="lr-success-icon"><CheckCircle /></div>
                <div className="lr-card-header" style={{ marginBottom: 0 }}>
                  <h2 className="lr-card-title">Password updated</h2>
                  <p className="lr-card-subtitle">Redirecting you to sign in…</p>
                </div>
              </div>
            ) : (
              <>
                <div className="lr-card-header">
                  <div className="lr-card-eyebrow">Reset password</div>
                  <h2 className="lr-card-title">Set a new password</h2>
                  <p className="lr-card-subtitle">Choose a strong password for your account.</p>
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
                      <span className="lr-icon-left"><LockIcon /></span>
                      <input
                        id="rp-password" ref={pwRef}
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        className="lr-input lr-input-pass" placeholder=" "
                        autoComplete="new-password" required
                      />
                      <label className="lr-float-label" htmlFor="rp-password">New password</label>
                      <button
                        type="button" className="lr-eye-btn"
                        onClick={() => setShowNewPw(v => !v)}
                        aria-label={showNewPw ? 'Hide password' : 'Show password'}
                      >
                        {showNewPw ? <EyeClosed /> : <EyeOpen />}
                      </button>
                    </div>
                  </div>

                  <div className="lr-field">
                    <div className="lr-neu-input">
                      <span className="lr-icon-left"><LockIcon /></span>
                      <input
                        id="rp-confirm"
                        type={showNewPw ? 'text' : 'password'}
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="lr-input" placeholder=" "
                        autoComplete="new-password" required
                      />
                      <label className="lr-float-label" htmlFor="rp-confirm">Confirm password</label>
                    </div>
                  </div>

                  <button type="submit" className="lr-btn" disabled={loading}>
                    {loading ? <><Spinner /> Updating…</> : <>Update Password →</>}
                  </button>
                </form>
              </>
            )}

            {!checkingSession && !done && (
              <p className="lr-footer-note">
                <Link to="/login">← Back to sign in</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
