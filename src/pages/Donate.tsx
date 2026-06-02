import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import {
  Heart, ArrowUpRight, Users, Globe, BookOpen,
  Droplets, Leaf, ShieldCheck, Copy, CheckCheck,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ─── Injected styles ─────────────────────────────────────────────── */
const INJECTED_ID = '__donate_page_styles__';
if (typeof document !== 'undefined' && !document.getElementById(INJECTED_ID)) {
  const s = document.createElement('style');
  s.id = INJECTED_ID;
  s.textContent = `
    /* ── Hero ── */
    .don-hero {
      position: relative;
      overflow: hidden;
      min-height: 56vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding-bottom: 72px;
    }
    .don-hero__noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      opacity: 0.04; pointer-events: none;
    }
    .don-hero__orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(130px);
      pointer-events: none;
    }
    .don-hero__eyebrow {
      font-size: 9px; font-weight: 800; letter-spacing: 0.25em;
      text-transform: uppercase;
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 24px;
      color: rgba(255,255,255,0.6);
    }
    .don-hero__eyebrow::before {
      content: ''; display: block;
      width: 32px; height: 2px;
      background: rgba(255,255,255,0.5);
    }
    .don-hero__headline {
      font-size: clamp(48px, 9vw, 120px);
      font-weight: 900;
      line-height: 0.9;
      letter-spacing: -0.04em;
      color: white;
      margin-bottom: 28px;
    }
    .don-hero__sub {
      font-size: clamp(15px, 2vw, 18px);
      line-height: 1.7;
      color: rgba(255,255,255,0.72);
      max-width: 520px;
    }

    /* ── Section eyebrow (light bg) ── */
    .don-eyebrow {
      font-size: 9px; font-weight: 800; letter-spacing: 0.25em;
      text-transform: uppercase; color: #9ca3af;
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 20px;
    }
    .don-eyebrow::before {
      content: ''; display: block;
      width: 32px; height: 2px;
      background: var(--color-accent);
    }

    /* ── Reveal ── */
    .don-reveal { opacity: 1; }

    /* ── Impact grid ── */
    .don-impact {
      padding: 100px 0;
      background: var(--color-page-bg);
    }
    .don-impact__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 56px;
    }
    @media (max-width: 900px) {
      .don-impact__grid { grid-template-columns: 1fr; }
    }
    .don-impact__card {
      border: 1px solid rgba(0,0,0,0.07);
      border-radius: 24px;
      padding: 40px 36px;
      background: var(--color-page-bg);
      box-shadow: 0 4px 24px rgba(0,0,0,0.05);
      transition: transform 0.25s, box-shadow 0.25s;
    }
    .don-impact__card:hover {
      transform: translateY(-6px);
      box-shadow: 0 20px 56px rgba(0,0,0,0.1);
    }
    .don-impact__icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      background: var(--color-accent);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 24px;
    }
    .don-impact__title {
      font-size: 20px; font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 10px;
    }
    .don-impact__desc {
      font-size: 14px; line-height: 1.75;
      color: #6b7280;
    }

    /* ── How to donate ── */
    .don-how {
      padding: 100px 0;
      background: rgba(0,0,0,0.02);
    }
    .don-how__layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 80px;
      align-items: start;
      margin-top: 56px;
    }
    @media (max-width: 900px) {
      .don-how__layout { grid-template-columns: 1fr; gap: 48px; }
    }
    .don-how__step {
      display: flex;
      gap: 24px;
      padding: 28px 0;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .don-how__step:first-child { padding-top: 0; }
    .don-how__step-num {
      flex-shrink: 0;
      width: 36px; height: 36px;
      border-radius: 50%;
      background: var(--color-accent);
      color: white;
      font-size: 13px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
    }
    .don-how__step-title {
      font-size: 16px; font-weight: 800;
      letter-spacing: -0.01em;
      margin-bottom: 6px;
    }
    .don-how__step-desc {
      font-size: 14px; color: #6b7280; line-height: 1.65;
    }

    /* ── Bank details card ── */
    .don-bank {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.07);
    }
    .don-bank__header {
      background: var(--color-accent);
      padding: 28px 32px;
      color: white;
    }
    .don-bank__header-label {
      font-size: 9px; font-weight: 800; letter-spacing: 0.2em;
      text-transform: uppercase; opacity: 0.7; margin-bottom: 6px;
    }
    .don-bank__header-title {
      font-size: 20px; font-weight: 900; letter-spacing: -0.02em;
    }
    .don-bank__body {
      background: var(--color-page-bg);
      padding: 28px 32px;
    }
    .don-bank__row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      gap: 16px;
    }
    .don-bank__row:last-child { border-bottom: none; }
    .don-bank__row-label {
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: #9ca3af; flex-shrink: 0;
    }
    .don-bank__row-value {
      font-size: 14px; font-weight: 700;
      text-align: right; word-break: break-all;
    }
    .don-bank__copy-btn {
      flex-shrink: 0;
      background: none; border: none; cursor: pointer;
      color: var(--color-accent);
      display: flex; align-items: center;
      padding: 4px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .don-bank__copy-btn:hover { background: rgba(0,0,0,0.05); }
    .don-bank__note {
      margin-top: 20px;
      padding: 16px 20px;
      background: rgba(0,0,0,0.03);
      border-radius: 12px;
      font-size: 13px; color: #6b7280; line-height: 1.6;
    }

    /* ── FAQ ── */
    .don-faq {
      padding: 100px 0;
      background: var(--color-page-bg);
    }
    .don-faq__list {
      margin-top: 48px;
      max-width: 720px;
    }
    .don-faq__item {
      border-bottom: 1px solid rgba(0,0,0,0.07);
    }
    .don-faq__q {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 0;
      background: none; border: none;
      cursor: pointer;
      text-align: left;
      gap: 16px;
    }
    .don-faq__q-text {
      font-size: 16px; font-weight: 800;
      letter-spacing: -0.01em;
    }
    .don-faq__icon {
      flex-shrink: 0;
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 1.5px solid rgba(0,0,0,0.12);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 300;
      color: var(--color-accent);
      transition: transform 0.25s;
    }
    .don-faq__icon--open { transform: rotate(45deg); }
    .don-faq__a {
      font-size: 14px; color: #6b7280; line-height: 1.75;
      padding-bottom: 24px;
      max-height: 0; overflow: hidden;
      transition: max-height 0.35s ease, padding 0.35s ease;
    }
    .don-faq__a--open {
      max-height: 300px;
    }

    /* ── CTA banner ── */
    .don-cta {
      position: relative; overflow: hidden;
      padding: 80px 0;
      color: white;
    }
    .don-cta__headline {
      font-size: clamp(32px, 5vw, 60px);
      font-weight: 900;
      line-height: 1.0;
      letter-spacing: -0.04em;
      margin-bottom: 20px;
    }
    .don-cta__sub {
      font-size: 17px; opacity: 0.75;
      line-height: 1.7; margin-bottom: 40px;
      max-width: 480px;
    }
    .don-cta__btn {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 18px 44px; border-radius: 14px;
      font-size: 13px; font-weight: 800;
      letter-spacing: 0.06em; text-transform: uppercase;
      background: white; color: #111;
      text-decoration: none; border: none; cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .don-cta__btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 48px rgba(0,0,0,0.28);
    }
  `;
  document.head.appendChild(s);
}

/* ─── Data ────────────────────────────────────────────────────────── */
const IMPACT_ITEMS = [
  {
    icon: <Droplets size={22} color="white" />,
    title: 'Clean Water Access',
    desc: 'Fund clean water installations for underserved communities across rural Bangladesh.',
  },
  {
    icon: <BookOpen size={22} color="white" />,
    title: 'Youth Education',
    desc: 'Sponsor scholarships, school supplies, and literacy programs for children in need.',
  },
  {
    icon: <Users size={22} color="white" />,
    title: 'Community Health',
    desc: 'Provide free medical camps, vaccinations, and health awareness drives.',
  },
  {
    icon: <Leaf size={22} color="white" />,
    title: 'Environmental Action',
    desc: 'Support tree-planting drives, beach cleanups, and sustainability projects.',
  },
  {
    icon: <ShieldCheck size={22} color="white" />,
    title: 'Disaster Relief',
    desc: 'Rapid response kits and support for families affected by floods and cyclones.',
  },
  {
    icon: <Globe size={22} color="white" />,
    title: 'Global Reach',
    desc: 'Contribute to international Rotary initiatives that impact millions worldwide.',
  },
];

const HOW_STEPS = [
  {
    title: 'Choose Your Cause',
    desc: 'Pick the initiative closest to your heart — or donate to our general fund where it\'s needed most.',
  },
  {
    title: 'Transfer Your Donation',
    desc: 'Use the bank details provided to make a direct transfer. Any amount makes a difference.',
  },
  {
    title: 'Send Confirmation',
    desc: 'Email or WhatsApp us your transaction slip so we can acknowledge and record your contribution.',
  },
  {
    title: 'We Put It to Work',
    desc: 'Your donation is allocated within 72 hours to active programs, with full transparency.',
  },
];

const BANK_DETAILS = [
  { label: 'Account Name', value: 'Rotaract Club of Dhaka Luminous' },
  { label: 'Bank', value: 'Dutch-Bangla Bank Limited' },
  { label: 'Account No.', value: '1251-0200-03521-7', copyable: true },
  { label: 'Routing No.', value: '090261251', copyable: true },
  { label: 'Branch', value: 'Gulshan Branch, Dhaka' },
];

const FAQS = [
  {
    q: 'Is my donation tax-deductible?',
    a: 'We are working towards official NGO registration. Currently donations are not tax-deductible, but we provide full receipts for your records. Please consult your tax advisor for guidance.',
  },
  {
    q: 'How will I know my money was used properly?',
    a: 'We publish regular impact reports on our website and send updates to donors. Every project funded through donations is documented with photos, beneficiary counts, and financial breakdowns.',
  },
  {
    q: 'Can I donate in a specific person\'s name or for a specific project?',
    a: 'Absolutely. Include the name or project in your transfer reference, and email us at donations@racdlu.org to ensure correct allocation.',
  },
  {
    q: 'Are international donations accepted?',
    a: 'Yes. For international transfers, please contact us directly so we can provide the appropriate SWIFT/IBAN details and ensure smooth processing.',
  },
  {
    q: 'What is the minimum donation amount?',
    a: 'There is no minimum. Every taka counts. Even the smallest contribution adds up when our community gives together.',
  },
];

/* ─── Component ───────────────────────────────────────────────────── */
export default function Donate() {
  const { tenant } = useTenant();
  const heroRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const headingColorStyle = isLight
    ? { color: 'var(--color-accent)' }
    : { color: 'var(--color-primary)' };

  /* Scroll reveals */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.don-reveal').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          y: 40, opacity: 0, duration: 0.9, ease: 'power3.out',
        });
      });
    });
    return () => ctx.revert();
  }, []);

  /* Hero entrance */
  useEffect(() => {
    if (!heroRef.current) return;
    gsap.from(heroRef.current.querySelectorAll('.don-hero__animate'), {
      y: 60, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'power4.out', delay: 0.2,
    });
  }, []);

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-[var(--color-page-bg)] overflow-x-hidden">
      <SEOHead title="Donate" canonicalPath="/donate" />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="don-hero"
        style={{
          background: `linear-gradient(145deg, var(--color-hero-start) 0%, ${tenant.brand.heroDark || 'var(--color-primary)'} 100%)`,
        }}
      >
        <div className="don-hero__noise" />
        <div
          className="don-hero__orb"
          style={{
            width: '55vw', height: '55vw',
            top: '-20%', right: '-10%',
            background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
            opacity: 0.35,
          }}
        />
        <div
          className="don-hero__orb"
          style={{
            width: '35vw', height: '35vw',
            bottom: '-10%', left: '-8%',
            background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
            opacity: 0.2,
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full" style={{ zIndex: 5 }}>
          <div className="don-hero__eyebrow don-hero__animate">Donate</div>
          <h1 className="don-hero__headline font-heading don-hero__animate">
            Give with<br />purpose.
          </h1>
          <p className="don-hero__sub don-hero__animate">
            Your contribution powers real, measurable change for communities across Bangladesh.
            Every donation — large or small — is a vote for a better tomorrow.
          </p>
        </div>
      </section>

      {/* ── IMPACT GRID ──────────────────────────────────────────── */}
      <section className="don-impact don-reveal">
        <div className="max-w-7xl mx-auto px-6">
          <div className="don-eyebrow">Where Your Money Goes</div>
          <h2 className="font-heading text-4xl md:text-5xl font-black" style={{ ...headingColorStyle, letterSpacing: '-0.03em', maxWidth: 560 }}>
            Six ways your gift creates impact.
          </h2>
          <div className="don-impact__grid">
            {IMPACT_ITEMS.map((item, i) => (
              <div key={i} className="don-impact__card">
                <div className="don-impact__icon">{item.icon}</div>
                <div className="don-impact__title font-heading">{item.title}</div>
                <div className="don-impact__desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO DONATE ─────────────────────────────────────────── */}
      <section className="don-how don-reveal">
        <div className="max-w-7xl mx-auto px-6">
          <div className="don-eyebrow">How It Works</div>
          <h2 className="font-heading text-4xl md:text-5xl font-black" style={{ ...headingColorStyle, letterSpacing: '-0.03em', maxWidth: 480 }}>
            Simple, transparent giving.
          </h2>

          <div className="don-how__layout">
            {/* Steps */}
            <div>
              {HOW_STEPS.map((step, i) => (
                <div key={i} className="don-how__step">
                  <div className="don-how__step-num">{i + 1}</div>
                  <div>
                    <div className="don-how__step-title font-heading">{step.title}</div>
                    <div className="don-how__step-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bank details */}
            <div className="don-bank">
              <div className="don-bank__header">
                <div className="don-bank__header-label">Bank Transfer Details</div>
                <div className="don-bank__header-title font-heading">Direct Donation</div>
              </div>
              <div className="don-bank__body">
                {BANK_DETAILS.map((row, i) => (
                  <div key={i} className="don-bank__row">
                    <span className="don-bank__row-label">{row.label}</span>
                    <span className="don-bank__row-value">{row.value}</span>
                    {row.copyable && (
                      <button
                        className="don-bank__copy-btn"
                        onClick={() => handleCopy(row.value, row.label)}
                        title={`Copy ${row.label}`}
                      >
                        {copied === row.label
                          ? <CheckCheck size={15} />
                          : <Copy size={15} />
                        }
                      </button>
                    )}
                  </div>
                ))}
                <div className="don-bank__note">
                  <strong>After transferring,</strong> please send your transaction receipt to{' '}
                  <strong>donations@racdlu.org</strong> or WhatsApp us at{' '}
                  <strong>+880 1700-000000</strong> with your name and cause.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="don-faq don-reveal">
        <div className="max-w-7xl mx-auto px-6">
          <div className="don-eyebrow">Questions</div>
          <h2 className="font-heading text-4xl md:text-5xl font-black" style={{ ...headingColorStyle, letterSpacing: '-0.03em' }}>
            Frequently asked.
          </h2>
          <div className="don-faq__list">
            {FAQS.map((faq, i) => (
              <div key={i} className="don-faq__item">
                <button className="don-faq__q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="don-faq__q-text">{faq.q}</span>
                  <span className={`don-faq__icon${openFaq === i ? ' don-faq__icon--open' : ''}`}>+</span>
                </button>
                <div className={`don-faq__a${openFaq === i ? ' don-faq__a--open' : ''}`}>
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────────── */}
      <section
        className="don-cta don-reveal"
        style={{
          background: `linear-gradient(145deg, var(--color-hero-start) 0%, ${tenant.brand.heroDark || 'var(--color-primary)'} 100%)`,
        }}
      >
        <div className="don-hero__noise" />
        <div className="max-w-7xl mx-auto px-6 relative" style={{ zIndex: 2 }}>
          <div className="don-hero__eyebrow">Take Action</div>
          <h2 className="don-cta__headline font-heading">
            Ready to give?
          </h2>
          <p className="don-cta__sub">
            Use the bank details above to make your transfer, then reach out so we can
            personally thank you and keep you updated on your impact.
          </p>
          <a href="mailto:donations@racdlu.org" className="don-cta__btn">
            <Heart size={16} fill="#ec4899" color="#ec4899" />
            Contact Us to Donate
            <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </div>
  );
}
