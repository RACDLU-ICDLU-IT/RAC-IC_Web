import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';

// ─── Eye Icons ────────────────────────────────────────────────────────────────
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

// ─── Animated Orb ─────────────────────────────────────────────────────────────
const Orb = ({ style }: { style: React.CSSProperties }) => (
  <div style={{ position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', ...style }} />
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [mounted, setMounted]   = useState(false);
  const [shake, setShake]       = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const navigate                = useNavigate();
  const emailRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
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
      setError('Password must be at least 8 characters.');
      triggerShake();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const { data: profile } = await supabase
        .from('users').select('role').eq('id', data.user.id).single();
      const role = profile?.role;
      if (role === 'admin' || role === 'master_admin') navigate('/admin');
      else navigate('/dashboard');
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
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(60px, -40px) scale(1.05); }
          66%       { transform: translate(-30px, 50px) scale(0.97); }
        }
        @keyframes drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%       { transform: translate(-70px, 30px) scale(1.08); }
          70%       { transform: translate(40px, -60px) scale(0.95); }
        }
        @keyframes drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(50px, 50px) scale(1.04); }
        }
        @keyframes grid-pan {
          from { transform: translateY(0); }
          to   { transform: translateY(60px); }
        }
        @keyframes mount {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-7px); }
          30%     { transform: translateX(7px); }
          45%     { transform: translateX(-5px); }
          60%     { transform: translateX(5px); }
          75%     { transform: translateX(-2px); }
          90%     { transform: translateX(2px); }
        }
        @keyframes spinner {
          to { transform: rotate(360deg); }
        }
        @keyframes error-in {
          from { opacity: 0; transform: translateY(-6px); max-height: 0; }
          to   { opacity: 1; transform: translateY(0); max-height: 80px; }
        }
        @keyframes label-float {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress-bar {
          from { width: 0%; }
          to   { width: 40%; }
        }

        .gl-root {
          font-family: 'Sora', -apple-system, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #04050f;
          position: relative;
          overflow: hidden;
        }

        /* ── MESH BACKGROUND ── */
        .gl-canvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        /* ── GRID OVERLAY ── */
        .gl-grid {
          position: fixed;
          inset: -60px;
          pointer-events: none;
          z-index: 1;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: grid-pan 8s linear infinite;
          mask-image: radial-gradient(ellipse at 50% 50%, black 20%, transparent 80%);
        }

        /* ── VIGNETTE ── */
        .gl-vignette {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2;
          background: radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(4,5,15,0.9) 100%);
        }

        /* ── MAIN LAYOUT ── */
        .gl-layout {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1160px;
          margin: 0 auto;
          padding: 24px;
          display: grid;
          grid-template-columns: 1fr 480px;
          gap: 48px;
          align-items: center;
          min-height: 100vh;
        }

        @media (max-width: 860px) {
          .gl-layout {
            grid-template-columns: 1fr;
            max-width: 480px;
            min-height: auto;
            padding: 40px 20px;
          }
          .gl-left { display: none; }
        }

        /* ── LEFT PANEL ── */
        .gl-left {
          display: flex;
          flex-direction: column;
          gap: 0;
          opacity: ${mounted ? 1 : 0};
          animation: ${mounted ? 'mount 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both' : 'none'};
        }

        .gl-wordmark {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 72px;
        }
        .gl-wordmark-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(220,80,130,0.9), rgba(120,60,200,0.9));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(200,80,140,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .gl-wordmark-text {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.02em;
          line-height: 1.3;
        }
        .gl-wordmark-text span {
          display: block;
          font-size: 10px;
          font-weight: 400;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 1px;
        }

        .gl-hero-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(210,120,180,0.8);
          margin-bottom: 20px;
        }
        .gl-hero-tag::before {
          content: '';
          width: 20px;
          height: 1px;
          background: currentColor;
          display: block;
        }

        .gl-headline {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: clamp(44px, 5vw, 64px);
          font-weight: 400;
          line-height: 1.08;
          color: rgba(255,255,255,0.95);
          margin-bottom: 28px;
          letter-spacing: -0.02em;
        }
        .gl-headline em {
          font-style: italic;
          background: linear-gradient(135deg, #f093b0 0%, #c084fc 50%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .gl-subtext {
          font-size: 15px;
          line-height: 1.75;
          color: rgba(255,255,255,0.38);
          max-width: 380px;
          margin-bottom: 52px;
          font-weight: 300;
        }

        .gl-features {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .gl-feature {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          cursor: default;
          transition: background 0.2s ease;
        }
        .gl-feature:first-child { border-top: 1px solid rgba(255,255,255,0.06); }
        .gl-feature-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .gl-feature-body { flex: 1; }
        .gl-feature-title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.75);
          margin-bottom: 2px;
          letter-spacing: 0.01em;
        }
        .gl-feature-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.28);
          line-height: 1.5;
          font-weight: 300;
        }

        .gl-bottom-badge {
          margin-top: 40px;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* ── GLASS CARD ── */
        .gl-card {
          position: relative;
          border-radius: 28px;
          padding: 48px 44px 44px;
          background: rgba(255,255,255,0.045);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow:
            0 0 0 0.5px rgba(255,255,255,0.06),
            0 40px 80px rgba(0,0,0,0.6),
            0 0 100px rgba(180,80,160,0.06),
            inset 0 1px 0 rgba(255,255,255,0.12),
            inset 0 -1px 0 rgba(0,0,0,0.3);
          opacity: ${mounted ? 1 : 0};
          animation: ${mounted ? 'mount 0.85s cubic-bezier(0.16,1,0.3,1) 0.2s both' : 'none'};
        }
        .gl-card.shake {
          animation: shake 0.55s ease !important;
        }

        /* Shine reflection */
        .gl-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%, rgba(255,255,255,0.02) 100%);
          pointer-events: none;
        }

        /* Inner glow border on top */
        .gl-card::after {
          content: '';
          position: absolute;
          top: 0; left: 12%; right: 12%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          border-radius: 50%;
          pointer-events: none;
        }

        /* ── CARD HEADER ── */
        .gl-card-logo {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 36px;
        }
        .gl-card-logo-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: linear-gradient(135deg, rgba(220,80,130,0.85), rgba(120,60,200,0.85));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 28px rgba(200,80,140,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .gl-card-step {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          font-weight: 500;
          letter-spacing: 0.08em;
        }

        .gl-card-title {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: 34px;
          font-weight: 400;
          color: rgba(255,255,255,0.95);
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin-bottom: 6px;
        }
        .gl-card-sub {
          font-size: 13.5px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 36px;
          font-weight: 300;
          line-height: 1.5;
        }

        /* ── ERROR ── */
        .gl-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(240, 60, 80, 0.1);
          border: 1px solid rgba(240, 60, 80, 0.2);
          color: rgba(255, 140, 150, 0.9);
          font-size: 13px;
          margin-bottom: 24px;
          line-height: 1.5;
          font-weight: 400;
          animation: error-in 0.3s ease both;
          overflow: hidden;
        }
        .gl-error svg { flex-shrink: 0; margin-top: 1px; opacity: 0.8; }

        /* ── FIELDS ── */
        .gl-field {
          margin-bottom: 16px;
          position: relative;
        }

        .gl-field-label {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 8px;
          display: block;
          transition: color 0.2s ease;
          animation: label-float 0.3s ease both;
        }
        .gl-field:focus-within .gl-field-label {
          color: rgba(210,120,190,0.9);
        }

        .gl-input-wrap { position: relative; }

        .gl-input {
          width: 100%;
          padding: 15px 46px 15px 18px;
          font-family: 'Sora', sans-serif;
          font-size: 14.5px;
          font-weight: 400;
          color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          outline: none;
          transition: all 0.2s ease;
          caret-color: #d078c0;
          -webkit-text-fill-color: rgba(255,255,255,0.9);
        }
        .gl-input::placeholder {
          color: rgba(255,255,255,0.2);
          -webkit-text-fill-color: rgba(255,255,255,0.2);
        }
        .gl-input:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.16);
        }
        .gl-input:focus {
          background: rgba(255,255,255,0.07);
          border-color: rgba(200,100,180,0.55);
          box-shadow:
            0 0 0 3px rgba(180,80,160,0.12),
            inset 0 1px 0 rgba(255,255,255,0.06);
        }
        /* Autofill fix */
        .gl-input:-webkit-autofill,
        .gl-input:-webkit-autofill:hover,
        .gl-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 100px #0d0e1e inset;
          -webkit-text-fill-color: rgba(255,255,255,0.9);
          transition: background-color 5000s ease-in-out 0s;
        }

        .gl-input-suffix {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.25);
          pointer-events: none;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
        }
        .gl-input-wrap:focus-within .gl-input-suffix { color: rgba(200,100,180,0.7); }

        .gl-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
          color: rgba(255,255,255,0.28);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease, background 0.15s ease;
        }
        .gl-eye-btn:hover {
          color: rgba(200,100,180,0.9);
          background: rgba(200,100,180,0.1);
        }

        /* ── FORGOT LINK ── */
        .gl-forgot {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
          margin-top: -8px;
        }
        .gl-forgot a {
          font-size: 12px;
          color: rgba(200,100,180,0.65);
          text-decoration: none;
          letter-spacing: 0.02em;
          transition: color 0.2s ease;
        }
        .gl-forgot a:hover { color: rgba(220,130,200,0.9); }

        /* ── SUBMIT ── */
        .gl-submit {
          width: 100%;
          padding: 15.5px 24px;
          font-family: 'Sora', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: #fff;
          background: linear-gradient(135deg, #d050a0 0%, #8050d0 100%);
          border: none;
          border-radius: 14px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
          box-shadow: 0 8px 32px rgba(180,60,180,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
          margin-bottom: 20px;
        }
        .gl-submit::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          border-radius: inherit;
          pointer-events: none;
        }
        .gl-submit:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 14px 40px rgba(180,60,200,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
          filter: brightness(1.08);
        }
        .gl-submit:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 4px 16px rgba(180,60,200,0.25);
        }
        .gl-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .gl-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spinner 0.75s linear infinite;
        }

        /* Loading progress bar */
        .gl-progress {
          height: 2px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          margin-bottom: 24px;
          overflow: hidden;
          position: relative;
        }
        .gl-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #d050a0, #8050d0);
          border-radius: 2px;
          width: 0%;
          animation: progress-bar 1.5s ease-out forwards;
        }

        /* ── DIVIDER ── */
        .gl-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }
        .gl-divider::before, .gl-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }
        .gl-divider-label {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.08em;
          white-space: nowrap;
        }

        /* ── FOOTER NOTE ── */
        .gl-footer-note {
          text-align: center;
          font-size: 12.5px;
          color: rgba(255,255,255,0.22);
          line-height: 1.65;
        }
        .gl-footer-note strong {
          color: rgba(200,130,200,0.7);
          font-weight: 500;
        }

        /* ── DISTRICT PILL ── */
        .gl-district-pill {
          display: flex;
          justify-content: center;
          margin-top: 22px;
        }
        .gl-district-pill span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.18);
          padding: 6px 14px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 100px;
          background: rgba(255,255,255,0.03);
        }
        .gl-district-pill span::before, .gl-district-pill span::after {
          content: '·';
          opacity: 0.5;
        }
      `}</style>

      <div className="gl-root">

        {/* ── MESH ORBS ── */}
        <div className="gl-canvas">
          <Orb style={{
            width: 700, height: 700,
            top: '-15%', left: '-10%',
            background: 'radial-gradient(circle, rgba(160,40,200,0.18) 0%, rgba(100,20,180,0.08) 50%, transparent 70%)',
            animation: 'drift-1 18s ease-in-out infinite',
          }} />
          <Orb style={{
            width: 600, height: 600,
            bottom: '-20%', right: '-5%',
            background: 'radial-gradient(circle, rgba(220,60,140,0.15) 0%, rgba(180,40,120,0.06) 50%, transparent 70%)',
            animation: 'drift-2 22s ease-in-out infinite',
          }} />
          <Orb style={{
            width: 400, height: 400,
            top: '40%', right: '30%',
            background: 'radial-gradient(circle, rgba(80,120,240,0.1) 0%, transparent 70%)',
            animation: 'drift-3 28s ease-in-out infinite',
          }} />
          <Orb style={{
            width: 300, height: 300,
            top: '10%', right: '20%',
            background: 'radial-gradient(circle, rgba(240,160,80,0.06) 0%, transparent 70%)',
            animation: 'drift-1 32s ease-in-out infinite reverse',
          }} />
        </div>

        {/* ── GRID ── */}
        <div className="gl-grid" />
        <div className="gl-vignette" />

        {/* ── LAYOUT ── */}
        <div className="gl-layout">

          {/* ══ LEFT PANEL ══ */}
          <div className="gl-left">

            <div className="gl-wordmark">
              <div className="gl-wordmark-icon">
                <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
                  <path d="M43.3 5.7l-2.8 8.6a35 35 0 0 0-8.7 3.6L23 14.6l-9.1 9 3.3 8.7a35 35 0 0 0-3.6 8.7L5 43.3v12.9l8.6 2.8a35 35 0 0 0 3.6 8.7L14 76.5l9 9 8.7-3.3a35 35 0 0 0 8.7 3.6l2.8 8.6h12.9l2.8-8.6a35 35 0 0 0 8.7-3.6l8.7 3.3 9-9-3.3-8.7a35 35 0 0 0 3.6-8.7L95 56.6V43.7l-8.6-2.8a35 35 0 0 0-3.6-8.7l3.3-8.7-9-9-8.7 3.3a35 35 0 0 0-8.7-3.6L56.7 5.7H43.3zM50 35a15 15 0 1 1 0 30 15 15 0 0 1 0-30z" fill="white"/>
                </svg>
              </div>
              <div className="gl-wordmark-text">
                Rotaract Club of Dhaka Luminous
                <span>Member Portal · District 3281</span>
              </div>
            </div>

            <div className="gl-hero-tag">Member Dashboard</div>

            <h1 className="gl-headline">
              Where service<br />meets <em>purpose.</em>
            </h1>

            <p className="gl-subtext">
              Access your club's administration, project records, member directory,
              and governance archive — built for the people who show up.
            </p>

            <div className="gl-features">
              {[
                {
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  ),
                  bg: 'rgba(220,80,160,0.2)',
                  title: 'Member Records & Attendance',
                  desc: 'Full directory with role-based access and meeting logs',
                },
                {
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  ),
                  bg: 'rgba(120,80,240,0.2)',
                  title: 'Project Management',
                  desc: 'Track initiatives, budgets, and outcomes in one view',
                },
                {
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  ),
                  bg: 'rgba(60,140,240,0.2)',
                  title: 'Governance & Bylaws Archive',
                  desc: 'Constitution, compendium, and RI-compliant documents',
                },
                {
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 15a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 4.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 11a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2z"/>
                    </svg>
                  ),
                  bg: 'rgba(240,160,60,0.15)',
                  title: 'Club Communications',
                  desc: 'Announcements, updates, and event coordination hub',
                },
              ].map(({ icon, bg, title, desc }) => (
                <div key={title} className="gl-feature">
                  <div className="gl-feature-icon" style={{ background: bg }}>
                    {icon}
                  </div>
                  <div className="gl-feature-body">
                    <div className="gl-feature-title">{title}</div>
                    <div className="gl-feature-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="gl-bottom-badge">
              © {new Date().getFullYear()} RACDLU · Rotary International District 3281
            </div>
          </div>

          {/* ══ GLASS CARD ══ */}
          <div className={`gl-card${shake ? ' shake' : ''}`}>

            {/* Card header */}
            <div className="gl-card-logo">
              <div className="gl-card-logo-icon">
                <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                  <path d="M43.3 5.7l-2.8 8.6a35 35 0 0 0-8.7 3.6L23 14.6l-9.1 9 3.3 8.7a35 35 0 0 0-3.6 8.7L5 43.3v12.9l8.6 2.8a35 35 0 0 0 3.6 8.7L14 76.5l9 9 8.7-3.3a35 35 0 0 0 8.7 3.6l2.8 8.6h12.9l2.8-8.6a35 35 0 0 0 8.7-3.6l8.7 3.3 9-9-3.3-8.7a35 35 0 0 0 3.6-8.7L95 56.6V43.7l-8.6-2.8a35 35 0 0 0-3.6-8.7l3.3-8.7-9-9-8.7 3.3a35 35 0 0 0-8.7-3.6L56.7 5.7H43.3zM50 35a15 15 0 1 1 0 30 15 15 0 0 1 0-30z" fill="white"/>
                </svg>
              </div>
              <div className="gl-card-step">Portal Access</div>
            </div>

            <h2 className="gl-card-title">Welcome back.</h2>
            <p className="gl-card-sub">Sign in to your member account to continue.</p>

            {/* Error */}
            {error && (
              <div className="gl-error" role="alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Loading progress */}
            {loading && (
              <div className="gl-progress">
                <div className="gl-progress-fill" />
              </div>
            )}

            <form onSubmit={handleSignIn}>

              {/* Email */}
              <div className="gl-field">
                <label className="gl-field-label" htmlFor="gl-email">Email address</label>
                <div className="gl-input-wrap">
                  <input
                    id="gl-email"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    className="gl-input"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    spellCheck={false}
                  />
                  <span className="gl-input-suffix">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                </div>
              </div>

              {/* Password */}
              <div className="gl-field">
                <label className="gl-field-label" htmlFor="gl-password">Password</label>
                <div className="gl-input-wrap">
                  <input
                    id="gl-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    className="gl-input"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="gl-eye-btn"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="gl-forgot">
                <a href="#" onClick={e => e.preventDefault()}>Forgot password?</a>
              </div>

              {/* Submit */}
              <button type="submit" className="gl-submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="gl-spinner" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to Portal
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="gl-divider">
              <span className="gl-divider-label">Invitation only</span>
            </div>

            <p className="gl-footer-note">
              Access is by invitation only.<br />
              Contact your <strong>club administrator</strong> to get an account.
            </p>

            <div className="gl-district-pill">
              <span>Rotaract · District 3281 · Bangladesh</span>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
