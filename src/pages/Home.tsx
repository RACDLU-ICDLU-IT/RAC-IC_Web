// v5.0.0 – Complete redesign: glassmorphism, billion-dollar landing page, full mobile fix
// Changes: removed badge/pill before headline, removed SCROLL text, stats no longer overlap ticker,
//          real social icons (Facebook/Instagram/LinkedIn), glassmorphism cards, clean hero layout

import { supabase } from '../supabase';
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';
import MarqueeTicker from '../components/MarqueeTicker';
import { Link } from 'react-router-dom';
import ScrollAnimatedNumber from '../components/ScrollAnimatedNumber';
import FeaturedProjects from '../components/FeaturedProjects';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import imgGallery1 from '../assets/images/regenerated_image_1777783191084.jpg';
import imgGallery2 from '../assets/images/regenerated_image_1777783192770.jpg';
import imgGallery3 from '../assets/images/regenerated_image_1777783183004.jpg';
import imgGallery4 from '../assets/images/regenerated_image_1777783180868.jpg';
import imgGallery5 from '../assets/images/regenerated_image_1777783189156.jpg';
import imgGallery6 from '../assets/images/regenerated_image_1777783187022.jpg';
import generatedImgAbout from '../assets/images/regenerated_image_1777820660503.jpg';
import {
  ZoomIn, X, ChevronLeft, ChevronRight,
  ArrowUpRight, MapPin, Calendar, Users, Globe, Heart,
  Facebook, Instagram, Linkedin,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const defaultPhotos = [
  { id: '1', url: imgGallery1, caption: 'Service Above Self', albumTag: 'Community' },
  { id: '2', url: imgGallery2, caption: 'Rotary Team',        albumTag: 'Team'      },
  { id: '3', url: imgGallery3, caption: 'Giving Back',        albumTag: 'Community' },
  { id: '4', url: imgGallery4, caption: 'Leadership',         albumTag: 'Events'    },
  { id: '5', url: imgGallery5, caption: 'Charity Walk',       albumTag: 'Events'    },
  { id: '6', url: imgGallery6, caption: 'Impact',             albumTag: 'Team'      },
];

/* ─────────────────────────────────────────
   STYLES – injected once, all scoped to .hv5
───────────────────────────────────────── */
const SID = '__hv5__';
if (typeof document !== 'undefined' && !document.getElementById(SID)) {
  const el = document.createElement('style');
  el.id = SID;
  el.textContent = `
/* BASE */
.hv5, .hv5 *, .hv5 *::before, .hv5 *::after {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}
.hv5 { overflow-x: hidden; width: 100%; }

/* ─── HERO ─── */
.hv5-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 120px 0 80px;
  overflow: hidden;
}
.hv5-hero__noise {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.045;
}
.hv5-hero__orb {
  position: absolute; border-radius: 50%;
  filter: blur(90px); pointer-events: none; z-index: 0;
}
.hv5-hero__inner {
  position: relative; z-index: 2;
  max-width: 1100px; margin: 0 auto;
  padding: 0 24px; width: 100%;
}
.hv5-hero__kicker {
  font-size: 10px; font-weight: 800; letter-spacing: .2em;
  text-transform: uppercase; opacity: .5;
  margin-bottom: 22px;
  display: flex; align-items: center; gap: 10px;
}
.hv5-hero__kicker::before {
  content: ''; display: block;
  width: 28px; height: 2px;
  background: currentColor; flex-shrink: 0;
}
.hv5-hero__title {
  font-size: clamp(52px, 13vw, 138px);
  font-weight: 900; line-height: .87;
  letter-spacing: -.04em;
  white-space: pre-line; margin: 0 0 40px;
}
.hv5-hero__divider {
  width: 100%; height: 1px;
  background: rgba(255,255,255,.15);
  margin-bottom: 28px;
}
.hv5-hero__bottom {
  display: flex; flex-direction: column; gap: 18px;
}
@media (min-width: 560px) {
  .hv5-hero__bottom {
    flex-direction: row; align-items: center;
    justify-content: space-between;
  }
}
.hv5-hero__tagline {
  font-size: 11px; font-weight: 700; letter-spacing: .13em;
  text-transform: uppercase; opacity: .4;
}
.hv5-hero__ctas { display: flex; gap: 10px; flex-wrap: wrap; }

/* glassmorphism floating stat – desktop only */
.hv5-hero__glass {
  position: absolute; bottom: 44px; right: 28px; z-index: 3;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px; padding: 20px 24px;
  display: flex; flex-direction: column; gap: 4px;
  min-width: 160px;
}
@media (max-width: 500px) { .hv5-hero__glass { display: none; } }
.hv5-hero__glass-val {
  font-size: 30px; font-weight: 900; line-height: 1;
}
.hv5-hero__glass-lbl {
  font-size: 9px; font-weight: 700; letter-spacing: .18em;
  text-transform: uppercase; opacity: .5;
}

/* ─── STATS ─── */
.hv5-stats {
  max-width: 960px; margin: 56px auto 0;
  padding: 0 16px;
  position: relative; z-index: 1;
}
.hv5-stats__card {
  background: rgba(255,255,255,.65);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255,255,255,.85);
  border-radius: 24px;
  box-shadow: 0 8px 48px rgba(0,0,0,.08);
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
@media (max-width: 500px) {
  .hv5-stats__card { grid-template-columns: 1fr; }
}
.hv5-stat {
  padding: 36px 16px; text-align: center;
  display: flex; flex-direction: column; align-items: center;
  position: relative;
}
@media (min-width: 501px) {
  .hv5-stat + .hv5-stat::before {
    content: ''; position: absolute; left: 0; top: 20%; height: 60%;
    width: 1px; background: rgba(0,0,0,.07);
  }
}
@media (max-width: 500px) {
  .hv5-stat + .hv5-stat::before {
    content: ''; position: absolute; top: 0; left: 15%; width: 70%;
    height: 1px; background: rgba(0,0,0,.07);
  }
}
.hv5-stat__lbl {
  font-size: 8px; font-weight: 800; letter-spacing: .2em;
  text-transform: uppercase; color: #9ca3af; margin-bottom: 10px;
}
.hv5-stat__val {
  font-size: clamp(38px, 8vw, 64px); font-weight: 900; line-height: 1;
}

/* ─── MISSION ─── */
.hv5-mission {
  position: relative; overflow: hidden;
  padding: 96px 24px; margin-top: 80px;
}
.hv5-mission__noise {
  position: absolute; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: .04;
}
.hv5-mission__inner {
  max-width: 860px; margin: 0 auto; position: relative; z-index: 1;
}
.hv5-mission__eye {
  font-size: 9px; font-weight: 800; letter-spacing: .22em;
  text-transform: uppercase; opacity: .45; margin-bottom: 20px;
  display: flex; align-items: center; gap: 10px;
}
.hv5-mission__eye::before {
  content: ''; display: block; width: 24px; height: 2px;
  background: currentColor; opacity: .7;
}
.hv5-mission__text {
  font-size: clamp(22px, 4.5vw, 52px);
  font-weight: 800; line-height: 1.16; letter-spacing: -.025em;
}
.hv5-mission__bgword {
  position: absolute; bottom: -12px; right: -6px; z-index: 0;
  font-size: clamp(100px, 22vw, 260px);
  font-weight: 900; line-height: 1; letter-spacing: -.06em;
  pointer-events: none; user-select: none; white-space: nowrap;
  opacity: .06; max-width: 100%; overflow: hidden;
}

/* ─── ABOUT ─── */
.hv5-about {
  margin-top: 80px;
  display: grid; grid-template-columns: 1fr 1fr;
}
@media (max-width: 700px) { .hv5-about { grid-template-columns: 1fr; } }
.hv5-about__img {
  position: relative; overflow: hidden; min-height: 400px;
}
.hv5-about__img img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; transition: transform .7s ease;
}
.hv5-about__img:hover img { transform: scale(1.04); }
.hv5-about__pill {
  position: absolute; bottom: 20px; left: 20px; z-index: 2;
  background: rgba(0,0,0,.68);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 16px; padding: 14px 18px; color: white;
}
.hv5-about__pill-est {
  font-size: 8px; font-weight: 700; letter-spacing: .2em;
  text-transform: uppercase; opacity: .4; margin-bottom: 3px;
}
.hv5-about__pill-name { font-size: 17px; font-weight: 900; letter-spacing: -.02em; }
.hv5-about__pill-sub  { font-size: 11px; opacity: .4; margin-top: 2px; }
.hv5-about__copy {
  display: flex; flex-direction: column; justify-content: center;
  padding: 60px 48px;
  background: var(--color-page-bg, #fff);
}
@media (max-width: 860px) { .hv5-about__copy { padding: 44px 24px; } }

/* ─── EYEBROW shared ─── */
.hv5-eye {
  font-size: 8px; font-weight: 800; letter-spacing: .22em;
  text-transform: uppercase; color: #9ca3af;
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px;
}
.hv5-eye::before {
  content: ''; display: block; width: 22px; height: 2px;
  background: var(--color-accent, #c2185b);
}

/* ─── SECTION TITLE / BODY ─── */
.hv5-stitle {
  font-size: clamp(26px, 4vw, 42px);
  font-weight: 900; line-height: 1.05; letter-spacing: -.03em;
}
.hv5-sbody {
  font-size: 15px; line-height: 1.78; color: #6b7280; margin-bottom: 32px;
}

/* ─── EVENTS ─── */
.hv5-events {
  padding: 88px 24px;
  max-width: 740px; margin: 0 auto;
}
.hv5-events__hd {
  display: flex; align-items: flex-end;
  justify-content: space-between; flex-wrap: wrap;
  gap: 12px; margin-bottom: 40px;
}
.hv5-textlink {
  font-size: 10px; font-weight: 800; letter-spacing: .12em;
  text-transform: uppercase; color: var(--color-accent);
  text-decoration: none; display: flex; align-items: center; gap: 4px;
  flex-shrink: 0;
}
.hv5-event {
  display: grid; grid-template-columns: 56px 1fr 20px;
  gap: 16px; align-items: center;
  padding: 20px 10px; border-radius: 14px;
  border-bottom: 1px solid rgba(0,0,0,.06);
  text-decoration: none; color: inherit;
  transition: background .15s;
}
.hv5-event:hover { background: rgba(0,0,0,.025); }
.hv5-event__mo {
  font-size: 9px; font-weight: 800; letter-spacing: .15em;
  text-transform: uppercase; margin-bottom: 2px;
}
.hv5-event__d { font-size: 32px; font-weight: 900; line-height: 1; }
.hv5-event__tag {
  display: inline-block; font-size: 8px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px;
  background: rgba(0,0,0,.06); margin-bottom: 5px;
}
.hv5-event__name {
  font-size: 16px; font-weight: 800;
  letter-spacing: -.02em; line-height: 1.2; margin-bottom: 3px;
}
.hv5-event__loc {
  font-size: 12px; color: #9ca3af;
  display: flex; align-items: center; gap: 4px;
}
.hv5-event__arr {
  opacity: 0; transition: opacity .15s, transform .15s;
  color: var(--color-accent);
}
.hv5-event:hover .hv5-event__arr { opacity: 1; transform: translateX(3px); }
.hv5-empty {
  border: 1.5px dashed rgba(0,0,0,.1); border-radius: 16px;
  padding: 48px 20px; text-align: center; color: #9ca3af; font-size: 14px;
}

/* ─── GALLERY ─── */
.hv5-gallery { padding-bottom: 88px; }
.hv5-gallery__hd {
  max-width: 1180px; margin: 0 auto;
  padding: 88px 20px 32px;
  display: flex; align-items: flex-end;
  justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.hv5-gallery__grid {
  max-width: 1180px; margin: 0 auto;
  padding: 0 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
@media (min-width: 700px) {
  .hv5-gallery__grid {
    grid-template-columns: repeat(12, 1fr);
    grid-template-rows: 260px 260px;
  }
  .hv5-gallery__grid > :nth-child(1) { grid-column: span 5; grid-row: span 2; }
  .hv5-gallery__grid > :nth-child(2) { grid-column: span 4; }
  .hv5-gallery__grid > :nth-child(3) { grid-column: span 3; }
  .hv5-gallery__grid > :nth-child(4) { grid-column: span 3; }
  .hv5-gallery__grid > :nth-child(5) { grid-column: span 4; }
  .hv5-gallery__grid > :nth-child(6) { grid-column: span 5; }
}
.hv5-gcell {
  position: relative; overflow: hidden;
  border-radius: 14px; cursor: pointer;
  background: #e5e7eb; height: 172px;
}
@media (min-width: 700px) { .hv5-gcell { height: auto; } }
.hv5-gcell img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover;
  transition: transform .55s cubic-bezier(.4,0,.2,1);
}
.hv5-gcell:hover img { transform: scale(1.07); }
.hv5-gcell__ov {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 60%);
  opacity: 0; transition: opacity .25s;
  display: flex; align-items: flex-end;
  padding: 12px; gap: 4px; flex-wrap: wrap;
}
.hv5-gcell:hover .hv5-gcell__ov { opacity: 1; }
.hv5-gcell__zoom {
  position: absolute; top: 10px; right: 10px;
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.25);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity .25s;
}
.hv5-gcell:hover .hv5-gcell__zoom { opacity: 1; }
.hv5-gallery__foot { text-align: center; margin-top: 28px; }

/* ─── JOIN CTA ─── */
.hv5-join { position: relative; overflow: hidden; }
.hv5-join__wrap {
  display: grid; grid-template-columns: 1fr 1fr;
  min-height: 460px;
}
@media (max-width: 700px) { .hv5-join__wrap { grid-template-columns: 1fr; } }
.hv5-join__left {
  display: flex; flex-direction: column; justify-content: center;
  padding: 80px 56px;
}
@media (max-width: 860px) { .hv5-join__left { padding: 60px 24px; } }
.hv5-join__eye {
  font-size: 8px; font-weight: 800; letter-spacing: .22em;
  text-transform: uppercase; opacity: .4; margin-bottom: 18px;
  display: flex; align-items: center; gap: 10px;
}
.hv5-join__eye::before {
  content: ''; display: block; width: 22px; height: 2px;
  background: rgba(255,255,255,.5);
}
.hv5-join__title {
  font-size: clamp(30px, 5vw, 58px); font-weight: 900;
  line-height: .98; letter-spacing: -.04em; margin-bottom: 18px;
}
.hv5-join__sub {
  font-size: 15px; line-height: 1.7; opacity: .65;
  margin-bottom: 28px; max-width: 380px;
}
.hv5-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
.hv5-chip {
  font-size: 9px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; padding: 6px 13px; border-radius: 999px;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.2);
}
.hv5-join__right {
  display: flex; align-items: center; justify-content: center;
  padding: 40px 28px;
  background: rgba(0,0,0,.12);
  backdrop-filter: blur(8px);
}
@media (max-width: 700px) { .hv5-join__right { display: none; } }
.hv5-cards {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px; width: 100%; max-width: 300px;
}
.hv5-card {
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 18px; padding: 20px;
  backdrop-filter: blur(16px);
}
.hv5-card__icon {
  width: 34px; height: 34px; border-radius: 10px;
  background: rgba(255,255,255,.12);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 10px;
}
.hv5-card__lbl {
  font-size: 8px; font-weight: 700; letter-spacing: .13em;
  text-transform: uppercase; opacity: .45; margin-bottom: 3px;
}
.hv5-card__val { font-size: 20px; font-weight: 900; line-height: 1.1; }

/* ─── SOCIAL STRIP ─── */
.hv5-social {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  padding: 32px 24px;
  background: var(--color-page-bg, #fff);
  border-top: 1px solid rgba(0,0,0,.07);
}
.hv5-social__label {
  font-size: 9px; font-weight: 800; letter-spacing: .2em;
  text-transform: uppercase; color: #9ca3af;
}
.hv5-social__icon {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(0,0,0,.06);
  border: 1px solid rgba(0,0,0,.08);
  display: flex; align-items: center; justify-content: center;
  color: #374151; text-decoration: none;
  transition: background .15s, color .15s, transform .15s;
}
.hv5-social__icon:hover {
  background: var(--color-accent);
  color: white;
  transform: translateY(-2px);
}

/* ─── LIGHTBOX ─── */
.hv5-lb {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.96);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.hv5-lb img {
  max-height: 86vh; max-width: 88vw;
  object-fit: contain; border-radius: 10px;
}
.hv5-lb__x {
  position: fixed; top: 16px; right: 16px;
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: white; transition: background .15s;
}
.hv5-lb__x:hover { background: rgba(255,255,255,.2); }
.hv5-lb__nav {
  position: fixed; top: 50%; transform: translateY(-50%);
  width: 46px; height: 46px; border-radius: 50%;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: white; transition: background .15s;
}
.hv5-lb__nav:hover { background: rgba(255,255,255,.2); }
.hv5-lb__nav:disabled { opacity: .18; pointer-events: none; }
.hv5-lb__cap {
  position: fixed; bottom: 48px; left: 50%; transform: translateX(-50%);
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(10px);
  border-radius: 999px; padding: 6px 16px;
  font-size: 13px; color: rgba(255,255,255,.72);
  white-space: nowrap; max-width: 80vw;
  overflow: hidden; text-overflow: ellipsis;
}
.hv5-lb__ctr {
  position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
  font-size: 10px; font-weight: 800; letter-spacing: .18em;
  color: rgba(255,255,255,.28);
}

/* ─── BUTTONS ─── */
.hv5-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 13px 24px; border-radius: 12px;
  font-size: 11px; font-weight: 800; letter-spacing: .07em;
  text-transform: uppercase; text-decoration: none;
  cursor: pointer; border: none;
  transition: transform .14s, box-shadow .14s, background .14s, color .14s;
  white-space: nowrap; flex-shrink: 0;
}
.hv5-btn:hover { transform: translateY(-2px); }
.hv5-btn--acc {
  background: var(--color-accent); color: white;
  box-shadow: 0 4px 18px rgba(0,0,0,.2);
}
.hv5-btn--acc:hover { box-shadow: 0 10px 28px rgba(0,0,0,.25); }
.hv5-btn--glass {
  background: rgba(255,255,255,.12); color: inherit;
  border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(8px);
}
.hv5-btn--glass:hover { background: rgba(255,255,255,.2); }
.hv5-btn--ol {
  background: transparent; color: var(--color-accent);
  border: 2px solid var(--color-accent);
}
.hv5-btn--ol:hover { background: var(--color-accent); color: white; }
.hv5-btn--wh {
  background: white; color: #111;
  box-shadow: 0 4px 18px rgba(0,0,0,.14);
}
.hv5-btn--wh:hover { box-shadow: 0 12px 32px rgba(0,0,0,.2); }

/* ─── SCROLL REVEAL ─── */
.hv5-rev {
  opacity: 0; transform: translateY(24px);
  transition: opacity .65s cubic-bezier(.4,0,.2,1),
              transform .65s cubic-bezier(.4,0,.2,1);
}
.hv5-rev.in { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(el);
}

/* ─── IntersectionObserver reveal hook ─── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.hv5-rev');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('in');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.08 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}

/* ══════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════ */
export default function Home() {
  const { tenant } = useTenant();
  const headlineRef = useRef<HTMLHeadingElement>(null);

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [galleryPhotos,  setGalleryPhotos]  = useState<any[]>([]);
  const [lightboxIndex,  setLightboxIndex]  = useState<number | null>(null);
  const [content, setContent] = useState<any>({
    homeHeroTitle:    tenant.brand.primaryColor === '#FFFFFF'
                        ? 'Fellowship\nThrough\nService.'
                        : 'Service\nAbove\nSelf.',
    homeMissionText:  tenant.brand.primaryColor === '#FFFFFF'
                        ? 'We are young professionals united by fellowship, leadership, and service. Together, we build communities and create lasting change across Bangladesh and beyond.'
                        : 'We are a generation of action. Bridging continents, uplifting communities, and proving that youth can inspire global change.',
    homeStatMembers:  120,
    homeStatProjects: 45,
    homeStatHours:    1000,
    homeAboutImage:   null,
  });

  const isLight   = tenant.brand.primaryColor === '#FFFFFF';
  const heroColor = tenant.brand.textOnPrimary || '#ffffff';
  const headStyle: React.CSSProperties = isLight
    ? { color: 'var(--color-accent)' }
    : { color: 'var(--color-primary)' };

  useReveal();

  /* headline GSAP split animation */
  useEffect(() => {
    if (!headlineRef.current) return;
    const split = new SplitType(headlineRef.current, { types: 'words,chars' });
    gsap.from(split.chars, {
      y: 80, opacity: 0, rotationZ: 4,
      duration: 1.1, stagger: 0.013,
      ease: 'power4.out', delay: 0.15,
    });
    return () => { split.revert(); };
  }, [content.homeHeroTitle]);

  /* data fetch */
  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data: evSnap } = await supabase.from('events').select('*')
          .eq('tenant_id', tenant.id).eq('isPublic', true)
          .gte('date', today).order('date', { ascending: true }).limit(3);
        setUpcomingEvents(evSnap || []);

        const { data: gSnap } = await supabase.from('gallery').select('*')
          .eq('tenant_id', tenant.id).order('sort_order', { ascending: true });
        const all = gSnap || [];
        if (all.length) {
          const feat = all.filter((p: any) => p.albumTag?.toLowerCase().includes('featured'));
          setGalleryPhotos(feat.length ? feat : all.slice(0, 6));
        } else {
          setGalleryPhotos(defaultPhotos);
        }

        const { data: pc } = await supabase.from('page_content')
          .select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
        if (pc?.data) setContent((p: any) => ({ ...p, ...pc.data }));
      } catch (err) { console.error(err); }
    })();
  }, [tenant.id]);

  /* lightbox keyboard nav */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'ArrowLeft'  && lightboxIndex > 0)                        setLightboxIndex(l => l! - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < galleryPhotos.length - 1) setLightboxIndex(l => l! + 1);
      if (e.key === 'Escape') setLightboxIndex(null);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [lightboxIndex, galleryPhotos.length]);

  const heroTitle = typeof content.homeHeroTitle === 'string'
    ? content.homeHeroTitle.replace(/\\n/g, '\n')
    : content.homeHeroTitle;

  const orgSchema = {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: tenant.fullName,
    alternateName: tenant.id === 'icdlu'
      ? [tenant.shortName, 'ICDL', 'Interact Club Dhaka Luminous']
      : [tenant.shortName, 'Rotaract Dhaka Luminous'],
    url: `https://${tenant.hostname}`,
    logo: `https://${tenant.hostname}${tenant.brand.logoPath}`,
    foundingDate: tenant.foundedYear,
    description: tenant.seo?.defaultDescription || tenant.tagline,
    address: { '@type': 'PostalAddress', addressLocality: 'Dhaka', addressCountry: 'BD' },
    parentOrganization: { '@type': 'Organization', name: tenant.parentOrg },
    sameAs: [tenant.social?.facebook, tenant.social?.instagram, tenant.social?.linkedin].filter(Boolean),
  };

  return (
    <div className="hv5 bg-[var(--color-page-bg)]">
      <SEOHead title="Home" canonicalPath="/" structuredData={orgSchema} />

      {/* ══════════════════════════
          1. HERO
      ══════════════════════════ */}
      <section
        className="hv5-hero"
        style={{
          background: `linear-gradient(145deg, var(--color-hero-start, var(--color-primary)) 0%, ${tenant.brand.heroDark || 'var(--color-primary)'} 100%)`,
          color: heroColor,
        }}
      >
        <div className="hv5-hero__noise" />

        {/* ambient orbs */}
        <div className="hv5-hero__orb" style={{
          width: '70vw', height: '70vw', maxWidth: 640, maxHeight: 640,
          top: '-25%', right: '-20%',
          background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
          opacity: 0.25,
        }} />
        <div className="hv5-hero__orb" style={{
          width: '50vw', height: '50vw', maxWidth: 480, maxHeight: 480,
          bottom: '-15%', left: '-15%',
          background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
          opacity: 0.15,
        }} />

        <div className="hv5-hero__inner">
          {/* kicker – plain text, NO pill/badge/tag */}
          <div className="hv5-hero__kicker" style={{ color: heroColor }}>
            {tenant.shortName} · {tenant.district}
          </div>

          {/* big headline */}
          <h1
            ref={headlineRef}
            className="hv5-hero__title font-heading"
            style={{ color: heroColor }}
          >
            {heroTitle}
          </h1>

          {/* divider + bottom strip */}
          <div className="hv5-hero__divider" />
          <div className="hv5-hero__bottom">
            <p className="hv5-hero__tagline" style={{ color: heroColor }}>
              {tenant.fullName}
            </p>
            <div className="hv5-hero__ctas">
              <Link to="/join" className="hv5-btn hv5-btn--acc">
                Join the Club <ArrowUpRight size={13} />
              </Link>
              <Link to="/about" className="hv5-btn hv5-btn--glass" style={{ color: heroColor }}>
                Our Story
              </Link>
            </div>
          </div>
        </div>

        {/* glassmorphism stat card – desktop only, no overlap with content */}
        <div className="hv5-hero__glass" style={{ color: heroColor }}>
          <span className="hv5-hero__glass-val font-heading" style={{ color: 'var(--color-accent)' }}>
            {content.homeStatMembers}+
          </span>
          <span className="hv5-hero__glass-lbl">Active Members</span>
        </div>
      </section>

      {/* MarqueeTicker – unchanged component */}
      <MarqueeTicker items={['Unite for Good', 'People of Action', 'Create Lasting Impact']} />

      {/* ══════════════════════════
          2. STATS – sits BELOW ticker, no negative margin, no overlap
      ══════════════════════════ */}
      <div className="hv5-stats hv5-rev">
        <div className="hv5-stats__card">
          <div className="hv5-stat">
            <span className="hv5-stat__lbl">Active Members</span>
            <span className="hv5-stat__val font-heading" style={headStyle}>
              <ScrollAnimatedNumber end={content.homeStatMembers} suffix="+" />
            </span>
          </div>
          <div className="hv5-stat">
            <span className="hv5-stat__lbl">Projects Completed</span>
            <span className="hv5-stat__val font-heading" style={headStyle}>
              <ScrollAnimatedNumber end={content.homeStatProjects} suffix="" />
            </span>
          </div>
          <div className="hv5-stat">
            <span className="hv5-stat__lbl">Volunteer Hours</span>
            <span className="hv5-stat__val font-heading" style={headStyle}>
              <ScrollAnimatedNumber end={content.homeStatHours} suffix="+" />
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════
          3. MISSION
      ══════════════════════════ */}
      <section
        className="hv5-mission hv5-rev"
        style={{ background: tenant.brand.secondaryColor, color: tenant.brand.textOnPrimary }}
      >
        <div className="hv5-mission__noise" />
        <div className="hv5-mission__inner">
          <div className="hv5-mission__eye">Our Mission</div>
          <p className="hv5-mission__text font-heading">{content.homeMissionText}</p>
        </div>
        {/* watermark clipped by overflow:hidden */}
        <span
          className="hv5-mission__bgword font-heading"
          style={{ color: tenant.brand.textOnPrimary }}
          aria-hidden="true"
        >
          Service
        </span>
      </section>

      {/* ══════════════════════════
          4. ABOUT
      ══════════════════════════ */}
      <section className="hv5-about hv5-rev">
        <div className="hv5-about__img">
          <img src={content.homeAboutImage || generatedImgAbout} alt="Club in action" />
          <div className="hv5-about__pill">
            <div className="hv5-about__pill-est">Est. {tenant.foundedYear || '2015'}</div>
            <div className="hv5-about__pill-name">{tenant.shortName}</div>
            <div className="hv5-about__pill-sub">{tenant.district}</div>
          </div>
        </div>
        <div className="hv5-about__copy">
          <div className="hv5-eye">Our Story</div>
          <h2 className="hv5-stitle font-heading" style={{ ...headStyle, marginBottom: 16 }}>
            Building leaders through service.
          </h2>
          <p className="hv5-sbody">
            Founded under the guidance of {tenant.district}, our club brings together
            passionate individuals to tackle pressing local and global challenges. By
            joining us, you don't just volunteer — you learn how to lead.
          </p>
          <Link to="/about" className="hv5-btn hv5-btn--ol" style={{ alignSelf: 'flex-start' }}>
            Read Our History <ArrowUpRight size={12} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════
          5. FEATURED PROJECTS – unchanged component
      ══════════════════════════ */}
      <div className="hv5-rev">
        <FeaturedProjects />
      </div>

      {/* ══════════════════════════
          6. EVENTS
      ══════════════════════════ */}
      <section className="hv5-events hv5-rev">
        <div className="hv5-events__hd">
          <div>
            <div className="hv5-eye" style={{ marginBottom: 10 }}>What's Coming</div>
            <h2 className="hv5-stitle font-heading" style={headStyle}>Upcoming Events</h2>
          </div>
          <Link to="/events" className="hv5-textlink">
            Full Calendar <ArrowUpRight size={12} />
          </Link>
        </div>

        {upcomingEvents.length > 0 ? upcomingEvents.map(ev => {
          const d = new Date(ev.date + 'T00:00:00');
          return (
            <Link to="/events" key={ev.id} className="hv5-event">
              <div>
                <div className="hv5-event__mo" style={{ color: 'var(--color-accent)' }}>
                  {d.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="hv5-event__d font-heading" style={headStyle}>
                  {d.getDate()}
                </div>
              </div>
              <div>
                <span className="hv5-event__tag">{ev.type}</span>
                <div className="hv5-event__name">{ev.title}</div>
                <div className="hv5-event__loc"><MapPin size={11} /> {ev.venue || 'TBA'}</div>
              </div>
              <ArrowUpRight size={17} className="hv5-event__arr" />
            </Link>
          );
        }) : (
          <div className="hv5-empty">
            <Calendar size={26} style={{ margin: '0 auto 10px', opacity: .2, display: 'block' }} />
            No upcoming events at the moment. Check back soon!
          </div>
        )}
      </section>

      {/* ══════════════════════════
          7. GALLERY
      ══════════════════════════ */}
      <section className="hv5-gallery hv5-rev" style={{ background: 'rgba(0,0,0,.022)' }}>
        <div className="hv5-gallery__hd">
          <div>
            <div className="hv5-eye" style={{ marginBottom: 10 }}>Gallery</div>
            <h2 className="hv5-stitle font-heading" style={headStyle}>Captured Moments.</h2>
          </div>
          <Link to="/gallery" className="hv5-textlink">
            View All <ArrowUpRight size={12} />
          </Link>
        </div>

        {galleryPhotos.length > 0 ? (
          <>
            <div className="hv5-gallery__grid">
              {galleryPhotos.slice(0, 6).map((p, i) => (
                <div key={p.id || i} className="hv5-gcell" onClick={() => setLightboxIndex(i)}>
                  <img src={p.url} alt={p.caption || 'Gallery'} />
                  <div className="hv5-gcell__ov">
                    {p.albumTag && p.albumTag.split(',').map((t: string) => t.trim()).map((t: string) => (
                      <span key={t} style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: '.12em',
                        textTransform: 'uppercase', color: 'white',
                        background: 'rgba(255,255,255,.15)',
                        padding: '2px 7px', borderRadius: 999,
                      }}>{t}</span>
                    ))}
                  </div>
                  <div className="hv5-gcell__zoom">
                    <ZoomIn size={14} color="white" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hv5-gallery__foot">
              <Link to="/gallery" className="hv5-btn hv5-btn--ol">
                Visit Full Gallery <ArrowUpRight size={12} />
              </Link>
            </div>
          </>
        ) : (
          <p style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: 14 }}>
            No photos yet.
          </p>
        )}
      </section>

      {/* ══════════════════════════
          8. JOIN CTA
      ══════════════════════════ */}
      <section
        className="hv5-join hv5-rev"
        style={{ background: isLight ? 'var(--color-accent)' : '#000251', color: 'white' }}
      >
        <div className="hv5-join__wrap">
          <div className="hv5-join__left">
            <div className="hv5-join__eye">Membership</div>
            <h2 className="hv5-join__title font-heading">
              Ready to make a difference?
            </h2>
            <p className="hv5-join__sub">
              Join a global network of 350,000+ young leaders taking action
              in their communities every single day.
            </p>
            <div className="hv5-chips">
              {['Leadership', 'Fellowship', 'Service', 'Community'].map(c => (
                <span key={c} className="hv5-chip">{c}</span>
              ))}
            </div>
            <Link to="/join" className="hv5-btn hv5-btn--wh" style={{ alignSelf: 'flex-start' }}>
              Apply for Membership <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="hv5-join__right">
            <div className="hv5-cards">
              {[
                { icon: <Users    size={15} color="white" />, label: 'Global Members', val: '350K+' },
                { icon: <Globe    size={15} color="white" />, label: 'Countries',      val: '200+'  },
                { icon: <Heart    size={15} color="white" />, label: 'Projects / yr',  val: '75K+'  },
                { icon: <Calendar size={15} color="white" />, label: 'Est.',           val: String(tenant.foundedYear || '2015') },
              ].map((c, i) => (
                <div key={i} className="hv5-card">
                  <div className="hv5-card__icon">{c.icon}</div>
                  <div className="hv5-card__lbl">{c.label}</div>
                  <div className="hv5-card__val font-heading">{c.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════
          9. SOCIAL STRIP – real icons
      ══════════════════════════ */}
      {(tenant.social?.facebook || tenant.social?.instagram || tenant.social?.linkedin) && (
        <div className="hv5-social hv5-rev">
          <span className="hv5-social__label">Follow us</span>
          {tenant.social?.facebook && (
            <a href={tenant.social.facebook} target="_blank" rel="noopener noreferrer" className="hv5-social__icon">
              <Facebook size={16} />
            </a>
          )}
          {tenant.social?.instagram && (
            <a href={tenant.social.instagram} target="_blank" rel="noopener noreferrer" className="hv5-social__icon">
              <Instagram size={16} />
            </a>
          )}
          {tenant.social?.linkedin && (
            <a href={tenant.social.linkedin} target="_blank" rel="noopener noreferrer" className="hv5-social__icon">
              <Linkedin size={16} />
            </a>
          )}
        </div>
      )}

      {/* ══════════════════════════
          LIGHTBOX
      ══════════════════════════ */}
      {lightboxIndex !== null && (
        <div className="hv5-lb" onClick={() => setLightboxIndex(null)}>
          <button className="hv5-lb__x" onClick={() => setLightboxIndex(null)}>
            <X size={17} />
          </button>
          <button
            className="hv5-lb__nav" style={{ left: 14 }}
            disabled={lightboxIndex === 0}
            onClick={e => { e.stopPropagation(); setLightboxIndex(l => l! - 1); }}
          >
            <ChevronLeft size={20} />
          </button>
          <img
            src={galleryPhotos[lightboxIndex]?.url}
            alt={galleryPhotos[lightboxIndex]?.caption || 'Gallery'}
            onClick={e => e.stopPropagation()}
          />
          <button
            className="hv5-lb__nav" style={{ right: 14 }}
            disabled={lightboxIndex === galleryPhotos.length - 1}
            onClick={e => { e.stopPropagation(); setLightboxIndex(l => l! + 1); }}
          >
            <ChevronRight size={20} />
          </button>
          {galleryPhotos[lightboxIndex]?.caption && (
            <div className="hv5-lb__cap">{galleryPhotos[lightboxIndex].caption}</div>
          )}
          <div className="hv5-lb__ctr">
            {lightboxIndex + 1} / {galleryPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
