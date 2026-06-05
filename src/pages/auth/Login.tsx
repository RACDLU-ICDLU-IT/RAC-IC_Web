import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';

// ─── Animated Gear SVG ────────────────────────────────────────────────────────
const GearIcon = ({ size = 80, opacity = 0.15, speed = 20, reverse = false, className = '' }: {
  size?: number; opacity?: number; speed?: number; reverse?: boolean; className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    className={className}
    style={{
      opacity,
      animation: `${reverse ? 'spin-reverse' : 'spin'} ${speed}s linear infinite`,
    }}
  >
    <path
      d="M43.3 5.7l-2.8 8.6a35 35 0 0 0-8.7 3.6L23 14.6l-9.1 9 3.3 8.7a35 35 0 0 0-3.6 8.7L5 43.3v12.9l8.6 2.8a35 35 0 0 0 3.6 8.7L14 76.5l9 9 8.7-3.3a35 35 0 0 0 8.7 3.6l2.8 8.6h12.9l2.8-8.6a35 35 0 0 0 8.7-3.6l8.7 3.3 9-9-3.3-8.7a35 35 0 0 0 3.6-8.7L95 56.6V43.7l-8.6-2.8a35 35 0 0 0-3.6-8.7l3.3-8.7-9-9-8.7 3.3a35 35 0 0 0-8.7-3.6L56.7 5.7H43.3zM50 35a15 15 0 1 1 0 30 15 15 0 0 1 0-30z"
      fill="currentColor"
    />
  </svg>
);

// ─── Floating Particle ────────────────────────────────────────────────────────
const Particle = ({ delay, duration, x, y, size }: {
  delay: number; duration: number; x: number; y: number; size: number;
}) => (
  <div
    style={{
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.25)',
      animation: `float ${duration}s ease-in-out ${delay}s infinite alternate`,
      pointerEvents: 'none',
    }}
  />
);

// ─── Eye toggle SVG ───────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      style={{ animation: 'spin 1s linear infinite', transformOrigin: 'center' }}
    />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [focused, setFocused]       = useState<'email' | 'password' | null>(null);
  const [mounted, setMounted]       = useState(false);
  const [shake, setShake]           = useState(false);
  const navigate                    = useNavigate();
  const emailRef                    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mounted) emailRef.current?.focus();
  }, [mounted]);

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

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 0.4,
    duration: 3 + (i % 4),
    x: (i * 31 + 7) % 90,
    y: (i * 17 + 11) % 85,
    size: 3 + (i % 5),
  }));

  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes spin          { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes spin-reverse  { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
        @keyframes float         { from { transform: translateY(0px); } to { transform: translateY(-14px); } }
        @keyframes fadeSlideUp   { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeSlideLeft { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn        { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shakeX {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-8px); }
          30%     { transform: translateX(8px); }
          45%     { transform: translateX(-6px); }
          60%     { transform: translateX(6px); }
          75%     { transform: translateX(-3px); }
          90%     { transform: translateX(3px); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(196,30,80,0.35); }
          70%  { box-shadow: 0 0 0 10px rgba(196,30,80,0); }
          100% { box-shadow: 0 0 0 0 rgba(196,30,80,0); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 200%; }
        }

        .login-root * { box-sizing: border-box; }

        .login-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          background: #0f0507;
        }

        /* ── LEFT PANEL ── */
        .lp-left {
          display: none;
          position: relative;
          width: 48%;
          flex-shrink: 0;
          overflow: hidden;
          background: linear-gradient(135deg, #1a020a 0%, #3d0718 40%, #c41e50 100%);
          background-size: 200% 200%;
          animation: gradientShift 12s ease infinite;
        }
        @media (min-width: 900px) { .lp-left { display: flex; flex-direction: column; } }

        .lp-left-noise {
          position: absolute; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        .lp-left-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .lp-brand {
          position: relative; z-index: 2;
          padding: 48px 48px 0;
          animation: fadeSlideLeft 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s both;
        }
        .lp-brand-logo {
          display: flex; align-items: center; gap: 14px;
        }
        .lp-brand-logo img {
          width: 48px; height: 48px; filter: brightness(0) invert(1);
        }
        .lp-brand-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px; font-weight: 600;
          color: rgba(255,255,255,0.9);
          line-height: 1.3; letter-spacing: 0.01em;
        }
        .lp-brand-name span { display: block; font-size: 11px; font-weight: 400; opacity: 0.6; letter-spacing: 0.1em; text-transform: uppercase; }

        .lp-hero {
          position: relative; z-index: 2;
          flex: 1;
          display: flex; flex-direction: column; justify-content: center;
          padding: 0 48px 32px;
          animation: fadeSlideLeft 0.9s cubic-bezier(0.22,1,0.36,1) 0.35s both;
        }

        .lp-eyebrow {
          font-size: 11px; font-weight: 500; letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-bottom: 20px;
          display: flex; align-items: center; gap: 10px;
        }
        .lp-eyebrow::before {
          content: ''; display: block;
          width: 32px; height: 1px; background: rgba(255,255,255,0.3);
        }

        .lp-headline {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(36px, 3.5vw, 52px);
          font-weight: 700; line-height: 1.12;
          color: #fff;
          margin: 0 0 24px;
          letter-spacing: -0.01em;
        }
        .lp-headline em { font-style: italic; color: rgba(255,200,210,0.9); }

        .lp-body {
          font-size: 14px; line-height: 1.75;
          color: rgba(255,255,255,0.5);
          max-width: 340px;
          margin-bottom: 48px;
        }

        .lp-pillars {
          display: flex; flex-direction: column; gap: 16px;
        }
        .lp-pillar {
          display: flex; align-items: center; gap: 14px;
          font-size: 13px; color: rgba(255,255,255,0.7);
        }
        .lp-pillar-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(255,160,180,0.7); flex-shrink: 0;
        }

        .lp-footer {
          position: relative; z-index: 2;
          padding: 24px 48px;
          border-top: 1px solid rgba(255,255,255,0.08);
          font-size: 11px; color: rgba(255,255,255,0.3);
          letter-spacing: 0.04em;
          animation: fadeIn 1.2s ease 0.8s both;
        }

        /* Gears */
        .lp-gears {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
          color: rgba(255,255,255,1);
        }
        .lp-gear-1 { position: absolute; bottom: -40px; right: -40px; }
        .lp-gear-2 { position: absolute; top: 60px;  right: 20px; }
        .lp-gear-3 { position: absolute; top: 180px; right: 80px; }

        /* ── RIGHT PANEL ── */
        .lp-right {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          background: #faf8f8;
          padding: 40px 24px;
          position: relative;
          overflow: hidden;
        }

        .lp-right-bg {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 70% 20%, rgba(196,30,80,0.06) 0%, transparent 60%),
                      radial-gradient(ellipse at 20% 80%, rgba(196,30,80,0.04) 0%, transparent 50%);
          pointer-events: none;
        }

        /* ── FORM CARD ── */
        .lp-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 420px;
          animation: fadeSlideUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.15s both;
        }
        .lp-card.shake { animation: shakeX 0.55s ease; }

        .lp-mobile-logo {
          display: flex; justify-content: center; margin-bottom: 36px;
        }
        @media (min-width: 900px) { .lp-mobile-logo { display: none; } }

        .lp-card-eyebrow {
          font-size: 10.5px; font-weight: 500; letter-spacing: 0.18em;
          text-transform: uppercase; color: #c41e50;
          margin-bottom: 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .lp-card-eyebrow::before {
          content: ''; display: block;
          width: 24px; height: 1.5px; background: currentColor; border-radius: 2px;
        }

        .lp-card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(30px, 5vw, 40px);
          font-weight: 700; line-height: 1.1;
          color: #1a020a;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
        }
        .lp-card-subtitle {
          font-size: 14px; color: #9a8a8f;
          margin-bottom: 36px; line-height: 1.6;
        }

        /* ── ERROR ── */
        .lp-error {
          display: flex; align-items: flex-start; gap: 10px;
          background: #fff0f3; border: 1px solid #fcc;
          border-left: 3px solid #c41e50;
          color: #a01535;
          padding: 12px 14px; border-radius: 10px;
          font-size: 13px; margin-bottom: 24px;
          animation: fadeSlideUp 0.35s ease;
        }
        .lp-error svg { flex-shrink: 0; margin-top: 1px; }

        /* ── FIELDS ── */
        .lp-field { margin-bottom: 20px; }

        .lp-label {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 12px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: #5c3040; margin-bottom: 8px;
        }

        .lp-input-wrap {
          position: relative;
        }
        .lp-input {
          width: 100%;
          padding: 14px 48px 14px 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; color: #1a020a;
          background: #fff;
          border: 1.5px solid #e8dde0;
          border-radius: 12px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .lp-input::placeholder { color: #c9b8be; }
        .lp-input:hover { border-color: #d4a8b5; }
        .lp-input:focus {
          border-color: #c41e50;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(196,30,80,0.1);
        }
        .lp-input.has-value:not(:focus) {
          border-color: #d4b0bc;
          background: #fdf8f9;
        }

        .lp-input-icon {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          color: #b09098; pointer-events: none;
          transition: color 0.2s ease;
        }
        .lp-input-wrap:focus-within .lp-input-icon { color: #c41e50; }

        .lp-eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: #b09098; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.2s ease, background 0.15s ease;
        }
        .lp-eye-btn:hover { color: #c41e50; background: rgba(196,30,80,0.07); }

        /* ── SUBMIT BUTTON ── */
        .lp-btn {
          width: 100%; margin-top: 8px;
          padding: 15px 24px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14.5px; font-weight: 600; letter-spacing: 0.04em;
          color: #fff;
          background: linear-gradient(135deg, #c41e50 0%, #9a0f35 100%);
          border: none; border-radius: 12px;
          cursor: pointer;
          position: relative; overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .lp-btn::before {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: none;
        }
        .lp-btn:hover:not(:disabled)::before { animation: shimmer 0.6s ease forwards; }
        .lp-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(196,30,80,0.35);
          filter: brightness(1.05);
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 3px 10px rgba(196,30,80,0.2); }
        .lp-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .lp-btn.pulse { animation: pulseRing 1.2s ease; }

        /* ── DIVIDER & FOOTER ── */
        .lp-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 28px 0 0;
        }
        .lp-divider::before, .lp-divider::after {
          content: ''; flex: 1; height: 1px; background: #eddde2;
        }
        .lp-divider-text {
          font-size: 11.5px; color: #c0a8b0; white-space: nowrap;
        }

        .lp-footer-note {
          margin-top: 20px;
          text-align: center;
          font-size: 13px; color: #9a8a8f;
          line-height: 1.6;
        }
        .lp-footer-note strong { color: #5c3040; font-weight: 600; }

        .lp-district-badge {
          display: inline-flex; align-items: center; gap: 5px;
          margin-top: 24px;
          font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
          color: #c0a8b0;
        }
        .lp-district-badge::before, .lp-district-badge::after {
          content: ''; display: block;
          width: 16px; height: 1px; background: #e0d0d5;
        }
      `}</style>

      <div className="login-root">

        {/* ══════════════════ LEFT PANEL ══════════════════ */}
        <div className="lp-left">
          <div className="lp-left-noise" />
          <div className="lp-left-grid" />

          {/* Gears */}
          <div className="lp-gears">
            <div className="lp-gear-1">
              <GearIcon size={260} opacity={0.08} speed={35} />
            </div>
            <div className="lp-gear-2">
              <GearIcon size={88} opacity={0.12} speed={18} reverse />
            </div>
            <div className="lp-gear-3">
              <GearIcon size={44} opacity={0.1} speed={10} />
            </div>
          </div>

          {/* Particles */}
          {particles.map(p => (
            <Particle key={p.id} {...p} />
          ))}

          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-brand-logo">
              {/* Inline SVG gear as fallback logo */}
              <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
                <path d="M43.3 5.7l-2.8 8.6a35 35 0 0 0-8.7 3.6L23 14.6l-9.1 9 3.3 8.7a35 35 0 0 0-3.6 8.7L5 43.3v12.9l8.6 2.8a35 35 0 0 0 3.6 8.7L14 76.5l9 9 8.7-3.3a35 35 0 0 0 8.7 3.6l2.8 8.6h12.9l2.8-8.6a35 35 0 0 0 8.7-3.6l8.7 3.3 9-9-3.3-8.7a35 35 0 0 0 3.6-8.7L95 56.6V43.7l-8.6-2.8a35 35 0 0 0-3.6-8.7l3.3-8.7-9-9-8.7 3.3a35 35 0 0 0-8.7-3.6L56.7 5.7H43.3zM50 35a15 15 0 1 1 0 30 15 15 0 0 1 0-30z" fill="white" fillOpacity="0.9"/>
              </svg>
              <div className="lp-brand-name">
                Rotaract Club of Dhaka Luminous
                <span>Member Portal · District 3281</span>
              </div>
            </div>
          </div>

          {/* Hero content */}
          <div className="lp-hero">
            <div className="lp-eyebrow">Member Dashboard</div>

            <h1 className="lp-headline">
              Serve to Change<br />
              <em>Lives.</em>
            </h1>

            <p className="lp-body">
              Access your club's administrative tools, project records, member directory, and governance documents — all in one place.
            </p>

            <div className="lp-pillars">
              {['Project management & reporting', 'Member records & attendance', 'Governance & bylaws archive', 'Club communications hub'].map(p => (
                <div key={p} className="lp-pillar">
                  <div className="lp-pillar-dot" />
                  {p}
                </div>
              ))}
            </div>
          </div>

          <div className="lp-footer">
            © {new Date().getFullYear()} Rotaract Club of Dhaka Luminous · Rotary International District 3281
          </div>
        </div>

        {/* ══════════════════ RIGHT PANEL ══════════════════ */}
        <div className="lp-right">
          <div className="lp-right-bg" />

          <div className={`lp-card${shake ? ' shake' : ''}`}>

            {/* Mobile logo */}
            <div className="lp-mobile-logo">
              <svg width="52" height="52" viewBox="0 0 100 100" fill="none">
                <path d="M43.3 5.7l-2.8 8.6a35 35 0 0 0-8.7 3.6L23 14.6l-9.1 9 3.3 8.7a35 35 0 0 0-3.6 8.7L5 43.3v12.9l8.6 2.8a35 35 0 0 0 3.6 8.7L14 76.5l9 9 8.7-3.3a35 35 0 0 0 8.7 3.6l2.8 8.6h12.9l2.8-8.6a35 35 0 0 0 8.7-3.6l8.7 3.3 9-9-3.3-8.7a35 35 0 0 0 3.6-8.7L95 56.6V43.7l-8.6-2.8a35 35 0 0 0-3.6-8.7l3.3-8.7-9-9-8.7 3.3a35 35 0 0 0-8.7-3.6L56.7 5.7H43.3zM50 35a15 15 0 1 1 0 30 15 15 0 0 1 0-30z" fill="#c41e50"/>
              </svg>
            </div>

            {/* Heading */}
            <div className="lp-card-eyebrow">Sign In</div>
            <h2 className="lp-card-title">Welcome back.</h2>
            <p className="lp-card-subtitle">Access your dashboard to manage club activities and records.</p>

            {/* Error message */}
            {error && (
              <div className="lp-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSignIn}>

              {/* Email */}
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-email">Email address</label>
                <div className="lp-input-wrap">
                  <input
                    id="lp-email"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    className={`lp-input${email ? ' has-value' : ''}`}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <span className="lp-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                </div>
              </div>

              {/* Password */}
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-password">
                  Password
                </label>
                <div className="lp-input-wrap">
                  <input
                    id="lp-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className={`lp-input${password ? ' has-value' : ''}`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="lp-eye-btn"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="lp-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="lp-divider">
              <span className="lp-divider-text">No account needed</span>
            </div>

            <p className="lp-footer-note">
              Access is by invitation only.<br />
              Contact your <strong>club administrator</strong> to get started.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="lp-district-badge">
                Rotaract · District 3281 · Bangladesh
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
