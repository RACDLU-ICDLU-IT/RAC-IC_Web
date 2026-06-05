import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Button } from '../../components/ui/Button';

// ─── Color Variables ──────────────────────────────────────────────────────────
// --clr-primary: #c41e50
// --clr-primary-deep: #9a0f35
// --clr-bg: #0f0507
// --clr-bg-mid: #1a020a
// --clr-bg-rich: #3d0718

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

// ─── Eye toggle SVG ───────────────────────────────────────────────────────────
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

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      style={{ animation: 'spin 0.8s linear infinite', transformOrigin: 'center' }}
    />
  </svg>
);

// ─── Floating Orb ─────────────────────────────────────────────────────────────
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
  const [focused, setFocused]   = useState<'email' | 'password' | null>(null);
  const [mounted, setMounted]   = useState(false);
  const [shake, setShake]       = useState(false);
  const navigate                = useNavigate();
  const emailRef                = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&display=swap');

        :root {
          --clr-primary: #c41e50;
          --clr-primary-deep: #9a0f35;
          --clr-primary-glow: rgba(196,30,80,0.25);
          --clr-primary-soft: rgba(196,30,80,0.08);
          --clr-bg: #0f0507;
          --clr-bg-mid: #1a020a;
          --clr-bg-rich: #3d0718;
          --clr-surface: rgba(255,255,255,0.04);
          --clr-surface-hover: rgba(255,255,255,0.07);
          --clr-border: rgba(255,255,255,0.09);
          --clr-border-focus: rgba(196,30,80,0.6);
          --clr-text: rgba(255,255,255,0.95);
          --clr-text-muted: rgba(255,255,255,0.45);
          --clr-text-faint: rgba(255,255,255,0.25);
        }

        @keyframes spin          { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spin-reverse  { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes fadeUp        { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn        { from{opacity:0} to{opacity:1} }
        @keyframes shakeX {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-7px)}
          30%{transform:translateX(7px)}
          45%{transform:translateX(-5px)}
          60%{transform:translateX(5px)}
          75%{transform:translateX(-2px)}
          90%{transform:translateX(2px)}
        }
        @keyframes shimmer {
          0%{left:-100%} 100%{left:200%}
        }
        @keyframes orbFloat {
          0%,100%{transform:translateY(0) scale(1)}
          50%{transform:translateY(-30px) scale(1.05)}
        }
        @keyframes orbFloat2 {
          0%,100%{transform:translateY(0) scale(1)}
          50%{transform:translateY(20px) scale(0.97)}
        }
        @keyframes borderGlow {
          0%,100%{opacity:0.6} 50%{opacity:1}
        }
        @keyframes scanline {
          0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)}
        }

        .lr * { box-sizing: border-box; margin: 0; padding: 0; }

        .lr {
          font-family: 'Geist', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: stretch;
          background: var(--clr-bg);
          overflow: hidden;
          position: relative;
        }

        /* ── AMBIENT BACKGROUND ── */
        .lr-ambient {
          position: fixed; inset: 0;
          pointer-events: none; z-index: 0;
          overflow: hidden;
        }
        .lr-ambient-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%);
        }
        .lr-scanline {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(196,30,80,0.06), transparent);
          animation: scanline 8s linear infinite;
          opacity: 0.5;
        }

        /* ── LEFT PANEL ── */
        .lr-left {
          display: none;
          position: relative;
          width: 46%;
          flex-shrink: 0;
          flex-direction: column;
          z-index: 1;
          padding: 0;
          overflow: hidden;
        }
        @media (min-width: 900px) { .lr-left { display: flex; } }

        .lr-left-glass {
          position: absolute; inset: 0;
          background: linear-gradient(135deg,
            rgba(61,7,24,0.85) 0%,
            rgba(26,2,10,0.9) 50%,
            rgba(15,5,7,0.95) 100%);
          backdrop-filter: blur(0px);
        }
        .lr-left-border {
          position: absolute;
          top: 0; bottom: 0; right: 0;
          width: 1px;
          background: linear-gradient(180deg,
            transparent 0%,
            rgba(196,30,80,0.3) 20%,
            rgba(196,30,80,0.5) 50%,
            rgba(196,30,80,0.3) 80%,
            transparent 100%);
          animation: borderGlow 4s ease-in-out infinite;
        }

        .lr-left-inner {
          position: relative; z-index: 2;
          display: flex; flex-direction: column;
          height: 100%; padding: 48px 52px;
        }

        /* Gears overlay */
        .lr-gears {
          position: absolute; inset: 0;
          pointer-events: none; z-index: 1;
          color: rgba(196,30,80,0.6);
          overflow: hidden;
        }
        .lr-gear-1 { position: absolute; bottom: -60px; right: -60px; }
        .lr-gear-2 { position: absolute; top: 40px; right: 10px; }
        .lr-gear-3 { position: absolute; top: 160px; right: 90px; }

        /* Orbs */
        .lr-orb-1 {
          position: absolute;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(196,30,80,0.18) 0%, transparent 70%);
          top: -100px; left: -100px;
          animation: orbFloat 12s ease-in-out infinite;
          pointer-events: none;
        }
        .lr-orb-2 {
          position: absolute;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(196,30,80,0.12) 0%, transparent 70%);
          bottom: 0; right: 0;
          animation: orbFloat2 10s ease-in-out infinite;
          pointer-events: none;
        }

        .lr-brand {
          display: flex; align-items: center; gap: 12px;
          animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .lr-brand-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-deep));
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(196,30,80,0.4);
        }
        .lr-brand-name {
          font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.8);
          letter-spacing: 0.01em;
          line-height: 1.4;
        }
        .lr-brand-name span {
          display: block;
          font-size: 10px; font-weight: 400;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 1px;
        }

        .lr-hero {
          flex: 1;
          display: flex; flex-direction: column; justify-content: center;
          animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s both;
        }

        .lr-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 500;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--clr-primary);
          margin-bottom: 24px;
        }
        .lr-tag-dot {
          width: 4px; height: 4px; border-radius: 50%;
          background: var(--clr-primary);
          box-shadow: 0 0 6px var(--clr-primary);
          animation: fadeIn 1s ease 1s both;
        }
        .lr-tag::before {
          content: '';
          display: block; width: 24px; height: 1px;
          background: currentColor; opacity: 0.5;
        }

        .lr-headline {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(38px, 3.4vw, 54px);
          font-weight: 400;
          line-height: 1.08;
          color: var(--clr-text);
          margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .lr-headline em {
          font-style: italic;
          color: rgba(255,160,180,0.85);
          background: linear-gradient(135deg, rgba(255,180,200,0.9), rgba(196,30,80,0.8));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lr-body {
          font-size: 13.5px; line-height: 1.75;
          color: var(--clr-text-muted);
          max-width: 320px;
          margin-bottom: 44px;
          font-weight: 300;
        }

        .lr-pillars { display: flex; flex-direction: column; gap: 12px; }
        .lr-pillar {
          display: flex; align-items: center; gap: 12px;
          font-size: 13px; color: rgba(255,255,255,0.55);
          font-weight: 300;
        }
        .lr-pillar-icon {
          width: 28px; height: 28px; flex-shrink: 0;
          border-radius: 8px;
          background: rgba(196,30,80,0.1);
          border: 1px solid rgba(196,30,80,0.2);
          display: flex; align-items: center; justify-content: center;
        }

        .lr-left-footer {
          font-size: 10.5px; color: var(--clr-text-faint);
          letter-spacing: 0.04em;
          padding-top: 28px;
          border-top: 1px solid rgba(255,255,255,0.06);
          animation: fadeIn 1.2s ease 0.6s both;
        }

        /* ── RIGHT PANEL ── */
        .lr-right {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 24px;
          position: relative;
          z-index: 1;
        }

        /* Right panel orbs */
        .lr-right-orb1 {
          position: absolute;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(196,30,80,0.07) 0%, transparent 65%);
          top: -200px; right: -200px;
          pointer-events: none;
          animation: orbFloat 14s ease-in-out infinite;
        }
        .lr-right-orb2 {
          position: absolute;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(196,30,80,0.05) 0%, transparent 65%);
          bottom: -150px; left: -100px;
          pointer-events: none;
          animation: orbFloat2 11s ease-in-out infinite;
        }

        /* ── GLASS CARD ── */
        .lr-card {
          position: relative; z-index: 2;
          width: 100%; max-width: 400px;
          animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .lr-card.shake { animation: shakeX 0.55s ease; }

        .lr-card-glass {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 40px 36px;
          box-shadow:
            0 0 0 1px rgba(196,30,80,0.06),
            0 1px 1px rgba(0,0,0,0.3),
            0 4px 8px rgba(0,0,0,0.2),
            0 24px 48px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.07);
          position: relative;
          overflow: hidden;
        }
        /* Card top shimmer line */
        .lr-card-glass::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg,
            transparent,
            rgba(255,255,255,0.18),
            rgba(196,30,80,0.3),
            rgba(255,255,255,0.18),
            transparent);
        }
        /* Card inner glow */
        .lr-card-glass::after {
          content: '';
          position: absolute;
          top: -80px; left: 50%; transform: translateX(-50%);
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(196,30,80,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Mobile logo */
        .lr-mobile-logo {
          display: flex; align-items: center; gap: 10px;
          justify-content: center;
          margin-bottom: 32px;
        }
        @media (min-width: 900px) { .lr-mobile-logo { display: none; } }
        .lr-mobile-logo-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-deep));
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(196,30,80,0.35);
        }

        .lr-card-header { margin-bottom: 28px; }

        .lr-card-eyebrow {
          display: flex; align-items: center; gap: 7px;
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--clr-primary);
          margin-bottom: 12px;
        }
        .lr-card-eyebrow-line {
          width: 20px; height: 1.5px;
          background: var(--clr-primary); border-radius: 2px;
          opacity: 0.7;
        }

        .lr-card-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(28px, 5vw, 36px);
          font-weight: 400;
          line-height: 1.1;
          color: var(--clr-text);
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }
        .lr-card-subtitle {
          font-size: 13px; color: var(--clr-text-muted);
          line-height: 1.6; font-weight: 300;
        }

        /* ── ERROR ── */
        .lr-error {
          display: flex; align-items: flex-start; gap: 9px;
          background: rgba(196,30,80,0.08);
          border: 1px solid rgba(196,30,80,0.2);
          border-left: 2px solid var(--clr-primary);
          color: rgba(255,160,175,0.9);
          padding: 11px 13px; border-radius: 12px;
          font-size: 12.5px; margin-bottom: 22px;
          animation: fadeUp 0.3s ease;
          backdrop-filter: blur(8px);
        }
        .lr-error svg { flex-shrink: 0; margin-top: 1px; opacity: 0.8; }

        /* ── FIELDS ── */
        .lr-field { margin-bottom: 16px; }

        .lr-label {
          display: block;
          font-size: 11.5px; font-weight: 500;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin-bottom: 7px;
        }

        .lr-input-wrap { position: relative; }

        .lr-input {
          width: 100%;
          padding: 13px 44px 13px 14px;
          font-family: 'Geist', sans-serif;
          font-size: 14px; font-weight: 300;
          color: var(--clr-text);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          -webkit-font-smoothing: antialiased;
        }
        .lr-input::placeholder { color: rgba(255,255,255,0.2); }
        .lr-input:hover:not(:focus) {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.055);
        }
        .lr-input:focus {
          border-color: rgba(196,30,80,0.5);
          background: rgba(196,30,80,0.04);
          box-shadow:
            0 0 0 3px rgba(196,30,80,0.1),
            0 1px 3px rgba(0,0,0,0.3);
        }
        .lr-input.has-value:not(:focus) {
          border-color: rgba(255,255,255,0.11);
          background: rgba(255,255,255,0.05);
        }
        /* Chrome autofill fix */
        .lr-input:-webkit-autofill,
        .lr-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 100px rgba(26,2,10,0.95) inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.95) !important;
          border-color: rgba(255,255,255,0.11) !important;
        }

        .lr-input-icon {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.2); pointer-events: none;
          transition: color 0.2s ease;
        }
        .lr-input-wrap:focus-within .lr-input-icon { color: rgba(196,30,80,0.6); }

        .lr-eye-btn {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 5px;
          color: rgba(255,255,255,0.25); border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.2s ease, background 0.15s ease;
        }
        .lr-eye-btn:hover {
          color: rgba(196,30,80,0.8);
          background: rgba(196,30,80,0.1);
        }

        /* ── SUBMIT ── */
        .lr-btn {
          width: 100%; margin-top: 8px;
          padding: 14px 24px;
          font-family: 'Geist', sans-serif;
          font-size: 14px; font-weight: 500;
          letter-spacing: 0.02em;
          color: #fff;
          background: linear-gradient(135deg, var(--clr-primary) 0%, var(--clr-primary-deep) 100%);
          border: none; border-radius: 12px;
          cursor: pointer;
          position: relative; overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.3),
            0 4px 12px rgba(196,30,80,0.3),
            inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .lr-btn::before {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        }
        .lr-btn:hover:not(:disabled)::before { animation: shimmer 0.55s ease forwards; }
        .lr-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 2px 4px rgba(0,0,0,0.3),
            0 8px 24px rgba(196,30,80,0.4),
            inset 0 1px 0 rgba(255,255,255,0.12);
          filter: brightness(1.08);
        }
        .lr-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(196,30,80,0.2);
        }
        .lr-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── DIVIDER ── */
        .lr-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 24px 0 0;
        }
        .lr-divider::before, .lr-divider::after {
          content: ''; flex: 1; height: 1px;
          background: rgba(255,255,255,0.07);
        }
        .lr-divider-text {
          font-size: 11px; color: rgba(255,255,255,0.2);
          white-space: nowrap; letter-spacing: 0.06em;
        }

        .lr-footer-note {
          margin-top: 18px;
          text-align: center;
          font-size: 12.5px; color: rgba(255,255,255,0.3);
          line-height: 1.65; font-weight: 300;
        }
        .lr-footer-note strong {
          color: rgba(255,255,255,0.55); font-weight: 500;
        }

        .lr-badge {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-top: 20px;
          font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.18);
        }
        .lr-badge-dot {
          width: 3px; height: 3px; border-radius: 50%;
          background: rgba(196,30,80,0.5);
        }
      `}</style>

      <div className="lr">

        {/* ── AMBIENT ── */}
        <div className="lr-ambient">
          <div className="lr-ambient-grid" />
          <div className="lr-scanline" />
        </div>

        {/* ══════════ LEFT PANEL ══════════ */}
        <div className="lr-left">
          <div className="lr-left-glass" />
          <div className="lr-left-border" />
          <div className="lr-orb-1" />
          <div className="lr-orb-2" />

          <div className="lr-gears">
            <div className="lr-gear-1"><GearIcon size={280} opacity={0.055} speed={40} /></div>
            <div className="lr-gear-2"><GearIcon size={90} opacity={0.09} speed={20} reverse /></div>
            <div className="lr-gear-3"><GearIcon size={44} opacity={0.07} speed={12} /></div>
          </div>

          <div className="lr-left-inner">
            {/* Brand */}
            <div className="lr-brand">
              <div className="lr-brand-icon">
                <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
                  <path d="M43.3 5.7l-2.8 8.6a35 35 0 0 0-8.7 3.6L23 14.6l-9.1 9 3.3 8.7a35 35 0 0 0-3.6 8.7L5 43.3v12.9l8.6 2.8a35 35 0 0 0 3.6 8.7L14 76.5l9 9 8.7-3.3a35 35 0 0 0 8.7 3.6l2.8 8.6h12.9l2.8-8.6a35 35 0 0 0 8.7-3.6l8.7 3.3 9-9-3.3-8.7a35 35 0 0 0 3.6-8.7L95 56.6V43.7l-8.6-2.8a35 35 0 0 0-3.6-8.7l3.3-8.7-9-9-8.7 3.3a35 35 0 0 0-8.7-3.6L56.7 5.7H43.3zM50 35a15 15 0 1 1 0 30 15 15 0 0 1 0-30z" fill="white"/>
                </svg>
              </div>
              <div className="lr-brand-name">
                Rotaract Club of Dhaka Luminous
                <span>Member Portal · District 3281</span>
              </div>
            </div>

            {/* Hero */}
            <div className="lr-hero">
              <div className="lr-tag">
                <div className="lr-tag-dot" />
                Member Dashboard
              </div>

              <h1 className="lr-headline">
                Serve to Change<br />
                <em>Lives.</em>
              </h1>

              <p className="lr-body">
                Access your club's administrative tools, project records, member directory, and governance documents — all in one place.
              </p>

              <div className="lr-pillars">
                {[
                  { icon: '📋', text: 'Project management & reporting' },
                  { icon: '👥', text: 'Member records & attendance' },
                  { icon: '📄', text: 'Governance & bylaws archive' },
                  { icon: '💬', text: 'Club communications hub' },
                ].map(({ icon, text }) => (
                  <div key={text} className="lr-pillar">
                    <div className="lr-pillar-icon">
                      <span style={{ fontSize: 13 }}>{icon}</span>
                    </div>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="lr-left-footer">
              © {new Date().getFullYear()} Rotaract Club of Dhaka Luminous · Rotary International District 3281
            </div>
          </div>
        </div>

        {/* ══════════ RIGHT PANEL ══════════ */}
        <div className="lr-right">
          <div className="lr-right-orb1" />
          <div className="lr-right-orb2" />

          <div className={`lr-card${shake ? ' shake' : ''}`}>
            <div className="lr-card-glass">

              {/* Mobile logo */}
              <div className="lr-mobile-logo">
                <div className="lr-mobile-logo-icon">
                  <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                    <path d="M43.3 5.7l-2.8 8.6a35 35 0 0 0-8.7 3.6L23 14.6l-9.1 9 3.3 8.7a35 35 0 0 0-3.6 8.7L5 43.3v12.9l8.6 2.8a35 35 0 0 0 3.6 8.7L14 76.5l9 9 8.7-3.3a35 35 0 0 0 8.7 3.6l2.8 8.6h12.9l2.8-8.6a35 35 0 0 0 8.7-3.6l8.7 3.3 9-9-3.3-8.7a35 35 0 0 0 3.6-8.7L95 56.6V43.7l-8.6-2.8a35 35 0 0 0-3.6-8.7l3.3-8.7-9-9-8.7 3.3a35 35 0 0 0-8.7-3.6L56.7 5.7H43.3zM50 35a15 15 0 1 1 0 30 15 15 0 0 1 0-30z" fill="white"/>
                  </svg>
                </div>
              </div>

              {/* Header */}
              <div className="lr-card-header">
                <div className="lr-card-eyebrow">
                  <div className="lr-card-eyebrow-line" />
                  Sign In
                </div>
                <h2 className="lr-card-title">Welcome back.</h2>
                <p className="lr-card-subtitle">Access your dashboard to manage club activities.</p>
              </div>

              {/* Error */}
              {error && (
                <div className="lr-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSignIn}>
                {/* Email */}
                <div className="lr-field">
                  <label className="lr-label" htmlFor="lr-email">Email address</label>
                  <div className="lr-input-wrap">
                    <input
                      id="lr-email"
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                      className={`lr-input${email ? ' has-value' : ''}`}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                    <span className="lr-input-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Password */}
                <div className="lr-field">
                  <label className="lr-label" htmlFor="lr-password">Password</label>
                  <div className="lr-input-wrap">
                    <input
                      id="lr-password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      className={`lr-input${password ? ' has-value' : ''}`}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="lr-eye-btn"
                      onClick={() => setShowPass(v => !v)}
                      tabIndex={-1}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeClosed /> : <EyeOpen />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" className="lr-btn" disabled={loading}>
                  {loading ? (
                    <><Spinner />Signing in…</>
                  ) : (
                    <>
                      Sign In
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="lr-divider">
                <span className="lr-divider-text">Invitation only</span>
              </div>

              <p className="lr-footer-note">
                Access is by invitation only.<br />
                Contact your <strong>club administrator</strong> to get started.
              </p>

              <div className="lr-badge">
                <div className="lr-badge-dot" />
                Rotaract · District 3281 · Bangladesh
                <div className="lr-badge-dot" />
              </div>

            </div>
          </div>
        </div>

      </div>
    </>
  );
}
