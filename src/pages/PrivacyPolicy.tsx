import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import { Shield, Mail, Phone } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ─── Injected styles ─────────────────────────────────────────────── */
const INJECTED_ID = '__privacy_page_styles__';
if (typeof document !== 'undefined' && !document.getElementById(INJECTED_ID)) {
  const s = document.createElement('style');
  s.id = INJECTED_ID;
  s.textContent = `
    .pp-hero {
      position: relative; overflow: hidden;
      min-height: 40vh;
      display: flex; flex-direction: column; justify-content: flex-end;
      padding-bottom: 64px;
    }
    .pp-hero__noise {
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      opacity: 0.04; pointer-events: none;
    }
    .pp-hero__orb {
      position: absolute; border-radius: 50%;
      filter: blur(130px); pointer-events: none;
    }
    .pp-hero__eyebrow {
      font-size: 9px; font-weight: 800; letter-spacing: 0.25em;
      text-transform: uppercase;
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 20px; color: rgba(255,255,255,0.6);
    }
    .pp-hero__eyebrow::before {
      content: ''; display: block;
      width: 32px; height: 2px;
      background: rgba(255,255,255,0.5);
    }
    .pp-hero__headline {
      font-size: clamp(40px, 7vw, 96px);
      font-weight: 900; line-height: 0.92;
      letter-spacing: -0.04em; color: white;
      margin-bottom: 20px;
    }
    .pp-hero__sub {
      font-size: 15px; line-height: 1.7;
      color: rgba(255,255,255,0.65); max-width: 480px;
    }

    /* ── Body layout ── */
    .pp-body {
      max-width: 800px; margin: 0 auto;
      padding: 72px 24px 100px;
    }
    .pp-toc {
      background: rgba(0,0,0,0.03);
      border-left: 3px solid var(--color-accent);
      border-radius: 0 12px 12px 0;
      padding: 24px 28px;
      margin-bottom: 56px;
    }
    .pp-toc__title {
      font-size: 10px; font-weight: 800; letter-spacing: 0.2em;
      text-transform: uppercase; color: #9ca3af;
      margin-bottom: 14px;
    }
    .pp-toc__list {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 8px;
    }
    .pp-toc__list a {
      font-size: 14px; font-weight: 600;
      color: var(--color-accent); text-decoration: none;
      transition: opacity 0.15s;
    }
    .pp-toc__list a:hover { opacity: 0.7; }

    .pp-section { margin-bottom: 56px; scroll-margin-top: 80px; }
    .pp-section__label {
      font-size: 9px; font-weight: 800; letter-spacing: 0.25em;
      text-transform: uppercase; color: var(--color-accent);
      margin-bottom: 10px;
    }
    .pp-section__title {
      font-size: clamp(22px, 3vw, 30px);
      font-weight: 900; letter-spacing: -0.02em;
      margin-bottom: 16px; line-height: 1.1;
    }
    .pp-section__body {
      font-size: 15px; line-height: 1.8; color: #4b5563;
    }
    .pp-section__body p { margin-bottom: 14px; }
    .pp-section__body p:last-child { margin-bottom: 0; }
    .pp-section__body ul {
      padding-left: 20px; margin-bottom: 14px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .pp-section__body li { font-size: 15px; color: #4b5563; line-height: 1.7; }
    .pp-section__body strong { color: #111; font-weight: 700; }

    .pp-divider {
      height: 1px; background: rgba(0,0,0,0.07);
      margin-bottom: 56px;
    }

    .pp-contact-card {
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 20px;
      padding: 36px;
      background: rgba(0,0,0,0.02);
      display: flex; gap: 20px; align-items: flex-start;
    }
    .pp-contact-card__icon {
      width: 48px; height: 48px; flex-shrink: 0;
      border-radius: 14px; background: var(--color-accent);
      display: flex; align-items: center; justify-content: center;
    }
    .pp-contact-card__title {
      font-size: 16px; font-weight: 800;
      letter-spacing: -0.01em; margin-bottom: 10px;
    }
    .pp-contact-card__row {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; color: #6b7280; margin-bottom: 6px;
    }
    .pp-contact-card__row:last-child { margin-bottom: 0; }
    .pp-contact-card__row a {
      color: var(--color-accent); text-decoration: none; font-weight: 600;
    }
    .pp-updated {
      font-size: 12px; color: #9ca3af; margin-top: 56px;
      padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.07);
    }
    .pp-reveal { opacity: 1; }
  `;
  document.head.appendChild(s);
}

/* ─── Sections data ──────────────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'information-we-collect',
    label: '01',
    title: 'Information We Collect',
    content: (
      <>
        <p>When you interact with our Facebook Page or Messenger bot, we may collect the following information:</p>
        <ul>
          <li><strong>Facebook Profile Data:</strong> Your public name and profile picture as provided by Facebook.</li>
          <li><strong>Messenger ID (PSID):</strong> A unique identifier assigned by Facebook to facilitate our bot conversations.</li>
          <li><strong>Message Content:</strong> Text messages you send to our Page via Messenger, stored to provide context-aware responses.</li>
          <li><strong>Page Interaction Data:</strong> Which of our Pages (ICDLU or RACDLU) you interact with.</li>
        </ul>
        <p>We do not collect sensitive personal data such as financial information, government IDs, or passwords through our Messenger bot.</p>
      </>
    ),
  },
  {
    id: 'how-we-use-information',
    label: '02',
    title: 'How We Use Your Information',
    content: (
      <>
        <p>Information collected through our services is used solely for the following purposes:</p>
        <ul>
          <li><strong>Conversational Context:</strong> To remember your previous messages and provide coherent, context-aware responses.</li>
          <li><strong>Service Improvement:</strong> To understand how members interact with our bot and improve its responses.</li>
          <li><strong>Club Operations:</strong> To assist with membership inquiries, event information, and club communications.</li>
          <li><strong>AI Processing:</strong> Your messages are sent to third-party AI providers (Google Gemini and Groq) solely to generate responses. These providers operate under their own privacy policies.</li>
        </ul>
        <p>We do not use your information for advertising, profiling, or any commercial purpose.</p>
      </>
    ),
  },
  {
    id: 'data-storage',
    label: '03',
    title: 'Data Storage & Security',
    content: (
      <>
        <p>Your conversation history is stored securely in our database (Supabase) hosted on infrastructure with industry-standard encryption at rest and in transit.</p>
        <ul>
          <li><strong>Retention Period:</strong> Conversation data is retained for up to 12 months, after which it is automatically deleted.</li>
          <li><strong>Access Control:</strong> Only authorized club administrators can access stored data, and only for operational purposes.</li>
          <li><strong>Security Measures:</strong> We use role-based access control, secure API keys, and HTTPS-only communication to protect your data.</li>
        </ul>
        <p>While we take reasonable precautions, no digital transmission is 100% secure. By using our Messenger bot, you acknowledge this inherent limitation.</p>
      </>
    ),
  },
  {
    id: 'third-party',
    label: '04',
    title: 'Third-Party Services',
    content: (
      <>
        <p>Our Messenger bot integrates with the following third-party services. Each operates under its own privacy policy:</p>
        <ul>
          <li><strong>Meta (Facebook):</strong> Our bot operates through the Facebook Messenger Platform. Meta's data practices are governed by the <strong>Meta Privacy Policy</strong>.</li>
          <li><strong>Google Gemini:</strong> Used for AI-powered responses. Governed by Google's Privacy Policy and AI terms.</li>
          <li><strong>Groq:</strong> Used as a fallback AI provider. Governed by Groq's Privacy Policy.</li>
          <li><strong>Supabase:</strong> Used for secure data storage. Governed by Supabase's Privacy Policy.</li>
        </ul>
        <p>We do not sell, trade, or rent your personal information to third parties for marketing or commercial purposes.</p>
      </>
    ),
  },
  {
    id: 'your-rights',
    label: '05',
    title: 'Your Rights',
    content: (
      <>
        <p>You have the following rights regarding your personal data:</p>
        <ul>
          <li><strong>Right to Access:</strong> You may request a copy of the data we hold about you.</li>
          <li><strong>Right to Deletion:</strong> You may request that we delete your conversation history and associated data at any time.</li>
          <li><strong>Right to Restriction:</strong> You may request that we stop processing your data while retaining it.</li>
          <li><strong>Right to Object:</strong> You may object to our processing of your data for any reason.</li>
          <li><strong>Opt-Out:</strong> You can stop using our Messenger bot at any time. Simply stop messaging the Page.</li>
        </ul>
        <p>To exercise any of these rights, please contact us using the details provided at the bottom of this page. We will respond within 30 days.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    label: '06',
    title: 'Cookies & Tracking',
    content: (
      <>
        <p>Our website uses minimal cookies necessary for functionality:</p>
        <ul>
          <li><strong>Essential Cookies:</strong> Required for the website to function correctly (authentication, session management).</li>
          <li><strong>No Tracking Cookies:</strong> We do not use advertising trackers, analytics pixels, or behavioral tracking cookies.</li>
        </ul>
        <p>Our Messenger bot does not use cookies. Interaction data is stored server-side, not in your browser.</p>
      </>
    ),
  },
  {
    id: 'childrens-privacy',
    label: '07',
    title: "Children's Privacy",
    content: (
      <>
        <p>Our services are intended for individuals aged 13 and above, consistent with Facebook's Terms of Service. Interact Club membership is open to school students; however, our digital services do not knowingly collect data from children under 13.</p>
        <p>If you believe a child under 13 has provided us with personal information, please contact us immediately and we will delete it promptly.</p>
      </>
    ),
  },
  {
    id: 'changes',
    label: '08',
    title: 'Changes to This Policy',
    content: (
      <>
        <p>We may update this Privacy Policy from time to time. When we do, we will revise the "Last Updated" date at the bottom of this page. Continued use of our services after changes constitutes acceptance of the updated policy.</p>
        <p>For significant changes, we will notify users via our Facebook Pages or direct Messenger message where feasible.</p>
      </>
    ),
  },
];

const TOC_ITEMS = SECTIONS.map(s => ({ id: s.id, title: s.title }));

/* ─── Component ───────────────────────────────────────────────────── */
export default function PrivacyPolicy() {
  const { tenant } = useTenant();
  const heroRef = useRef<HTMLDivElement>(null);

  const isLight = tenant.brand.primaryColor === '#FFFFFF';
  const headingColor = isLight ? 'var(--color-accent)' : 'var(--color-primary)';

  useEffect(() => {
    if (!heroRef.current) return;
    gsap.from(heroRef.current.querySelectorAll('.pp-hero__animate'), {
      y: 50, opacity: 0, duration: 1.0, stagger: 0.1, ease: 'power4.out', delay: 0.15,
    });
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.pp-reveal').forEach(el => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          y: 30, opacity: 0, duration: 0.8, ease: 'power3.out',
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-[var(--color-page-bg)] overflow-x-hidden">
      <SEOHead title="Privacy Policy" canonicalPath="/privacy-policy" />

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="pp-hero"
        style={{
          background: `linear-gradient(145deg, var(--color-hero-start) 0%, ${tenant.brand.heroDark || 'var(--color-primary)'} 100%)`,
        }}
      >
        <div className="pp-hero__noise" />
        <div className="pp-hero__orb" style={{
          width: '45vw', height: '45vw', top: '-15%', right: '-8%',
          background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
          opacity: 0.3,
        }} />
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 w-full" style={{ zIndex: 5 }}>
          <div className="pp-hero__eyebrow pp-hero__animate">Legal</div>
          <h1 className="pp-hero__headline font-heading pp-hero__animate">
            Privacy<br />Policy.
          </h1>
          <p className="pp-hero__sub pp-hero__animate">
            We believe privacy is a right. This policy explains exactly what data we collect,
            why we collect it, and how you can control it.
          </p>
        </div>
      </section>

      {/* ── BODY ── */}
      <div className="pp-body">

        {/* Table of Contents */}
        <div className="pp-toc pp-reveal">
          <div className="pp-toc__title">Contents</div>
          <ul className="pp-toc__list">
            {TOC_ITEMS.map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.title}</a>
              </li>
            ))}
            <li><a href="#contact">Contact Us</a></li>
          </ul>
        </div>

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <div key={section.id} id={section.id} className="pp-reveal">
            <div className="pp-section">
              <div className="pp-section__label">{section.label}</div>
              <div className="pp-section__title font-heading" style={{ color: headingColor }}>
                {section.title}
              </div>
              <div className="pp-section__body">{section.content}</div>
            </div>
            {i < SECTIONS.length - 1 && <div className="pp-divider" />}
          </div>
        ))}

        {/* Contact */}
        <div id="contact" className="pp-reveal" style={{ marginTop: 56 }}>
          <div className="pp-divider" />
          <div className="pp-section__label">09</div>
          <div className="pp-section__title font-heading" style={{ color: headingColor }}>
            Contact Us
          </div>
          <div className="pp-section__body" style={{ marginBottom: 24 }}>
            <p>For any privacy-related requests, questions, or concerns, please reach out to us directly. We are committed to responding within 30 days.</p>
          </div>
          <div className="pp-contact-card">
            <div className="pp-contact-card__icon">
              <Shield size={22} color="white" />
            </div>
            <div>
              <div className="pp-contact-card__title font-heading">Data Controller</div>
              <div className="pp-contact-card__row">
                <Mail size={14} />
                <span>Email: <a href="mailto:privacy@racdlu.org">privacy@racdlu.org</a></span>
              </div>
              <div className="pp-contact-card__row">
                <Phone size={14} />
                <span>WhatsApp: <a href="https://wa.me/8801700000000">+880 1700-000000</a></span>
              </div>
              <div className="pp-contact-card__row">
                <Mail size={14} />
                <span>Rotaract Club of Dhaka Luminous — Rotary International District 3281, Bangladesh</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pp-updated pp-reveal">
          Last updated: June 23, 2026 &nbsp;·&nbsp; Effective immediately upon publication.
        </div>
      </div>
    </div>
  );
}
