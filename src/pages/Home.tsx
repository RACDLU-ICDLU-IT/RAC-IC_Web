// v6.0.0 – Removed kicker text above headline entirely, fixed hero top gap,
//           glassmorphism visible on mobile, proper button contrast, clean layout

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

/* ─── inject styles once ─── */
const SID = '__hv6__';
if (typeof document !== 'undefined' && !document.getElementById(SID)) {
  const el = document.createElement('style');
  el.id = SID;
  el.textContent = `
.hv6, .hv6 *, .hv6 *::before, .hv6 *::after {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}
.hv6 { overflow-x: hidden; width: 100%; }

/* ════════════════════════════════════
   HERO
════════════════════════════════════ */
.hv6-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: flex-end;        /* content pinned to bottom */
  padding-bottom: 60px;
  overflow: hidden;
}
.hv6-hero__noise {
  position: absolute; inset: 0;
  pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.05;
}
.hv6-hero__orb {
  position: absolute; border-radius: 50%;
  pointer-events: none; z-index: 0;
}
.hv6-hero__inner {
  position: relative; z-index: 2;
  width: 100%; max-width: 1100px;
  margin: 0 auto; padding: 0 20px;
}
.hv6-hero__title {
  font-size: clamp(56px, 15vw, 144px);
  font-weight: 900;
  line-height: .87;
  letter-spacing: -.04em;
  white-space: pre-line;
  margin: 0 0 36px;
}
.hv6-hero__bar {
  border-top: 1px solid rgba(255,255,255,.18);
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (min-width: 540px) {
  .hv6-hero__bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.hv6-hero__org {
  font-size: 10px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
  opacity: .45; line-height: 1.5;
}
.hv6-hero__ctas { display: flex; gap: 10px; flex-wrap: wrap; }

/* ── glassmorphism stat cards row – visible on ALL screens ── */
.hv6-glass-row {
  display: flex; gap: 12px;
  padding: 0 20px;
  max-width: 1100px; margin: 0 auto;
  position: relative; z-index: 3;
  /* overlaps the bottom of the hero */
  margin-top: -44px;
  padding-bottom: 0;
}
.hv6-glass-card {
  flex: 1;
  background: rgba(255,255,255,.18);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,.35);
  border-radius: 18px;
  padding: 18px 14px;
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  /* white shadow so it pops on any bg */
  box-shadow: 0 8px 32px rgba(0,0,0,.15);
}
.hv6-glass-card__val {
  font-size: clamp(22px, 5vw, 36px);
  font-weight: 900; line-height: 1;
  margin-bottom: 4px;
}
.hv6-glass-card__lbl {
  font-size: 8px; font-weight: 800;
  letter-spacing: .16em; text-transform: uppercase;
  opacity: .65;
}

/* ════════════════════════════════════
   STATS (below ticker, proper glass)
════════════════════════════════════ */
.hv6-stats {
  max-width: 960px; margin: 48px auto 0;
  padding: 0 16px;
}
.hv6-stats__card {
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255,255,255,.9);
  border-radius: 22px;
  box-shadow: 0 8px 40px rgba(0,0,0,.08);
  overflow: hidden;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
@media (max-width: 480px) {
  .hv6-stats__card { grid-template-columns: 1fr; }
}
.hv6-stat {
  padding: 34px 16px; text-align: center;
  display: flex; flex-direction: column; align-items: center;
  position: relative;
}
@media (min-width: 481px) {
  .hv6-stat + .hv6-stat::before {
    content: ''; position: absolute; left: 0; top: 20%; height: 60%;
    width: 1px; background: rgba(0,0,0,.07);
  }
}
@media (max-width: 480px) {
  .hv6-stat + .hv6-stat::before {
    content: ''; position: absolute; top: 0; left: 15%; width: 70%;
    height: 1px; background: rgba(0,0,0,.07);
  }
}
.hv6-stat__lbl {
  font-size: 8px; font-weight: 800; letter-spacing: .2em;
  text-transform: uppercase; color: #9ca3af; margin-bottom: 10px;
}
.hv6-stat__val {
  font-size: clamp(36px, 8vw, 60px); font-weight: 900; line-height: 1;
}

/* ════════════════════════════════════
   MISSION
════════════════════════════════════ */
.hv6-mission {
  position: relative; overflow: hidden;
  padding: 96px 24px; margin-top: 80px;
}
.hv6-mission__noise {
  position: absolute; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: .04;
}
.hv6-mission__inner {
  max-width: 860px; margin: 0 auto; position: relative; z-index: 1;
}
.hv6-eye {
  font-size: 8px; font-weight: 800; letter-spacing: .22em;
  text-transform: uppercase; opacity: .45; margin-bottom: 18px;
  display: flex; align-items: center; gap: 10px;
}
.hv6-eye::before {
  content: ''; display: block; width: 22px; height: 2px;
  background: currentColor; opacity: .7;
}
.hv6-mission__text {
  font-size: clamp(22px, 4.5vw, 52px);
  font-weight: 800; line-height: 1.16; letter-spacing: -.025em;
}
.hv6-mission__bgword {
  position: absolute; bottom: -10px; right: -4px; z-index: 0;
  font-size: clamp(90px, 22vw, 250px);
  font-weight: 900; line-height: 1; letter-spacing: -.06em;
  pointer-events: none; user-select: none; white-space: nowrap;
  opacity: .06; max-width: 100%; overflow: hidden;
}

/* ════════════════════════════════════
   ABOUT
════════════════════════════════════ */
.hv6-about {
  margin-top: 80px;
  display: grid; grid-template-columns: 1fr 1fr;
}
@media (max-width: 700px) { .hv6-about { grid-template-columns: 1fr; } }
.hv6-about__img {
  position: relative; overflow: hidden; min-height: 380px;
}
.hv6-about__img img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; transition: transform .7s ease;
}
.hv6-about__img:hover img { transform: scale(1.04); }
.hv6-about__pill {
  position: absolute; bottom: 18px; left: 18px; z-index: 2;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 14px; padding: 13px 17px; color: white;
}
.hv6-about__pill-est {
  font-size: 8px; font-weight: 700; letter-spacing: .2em;
  text-transform: uppercase; opacity: .4; margin-bottom: 2px;
}
.hv6-about__pill-name { font-size: 16px; font-weight: 900; letter-spacing: -.02em; }
.hv6-about__pill-sub  { font-size: 11px; opacity: .4; margin-top: 1px; }
.hv6-about__copy {
  display: flex; flex-direction: column; justify-content: center;
  padding: 56px 44px;
  background: var(--color-page-bg, #fff);
}
@media (max-width: 860px) { .hv6-about__copy { padding: 44px 22px; } }

/* ════════════════════════════════════
   SHARED EYEBROW
════════════════════════════════════ */
.hv6-section-eye {
  font-size: 8px; font-weight: 800; letter-spacing: .22em;
  text-transform: uppercase; color: #9ca3af;
  display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
}
.hv6-section-eye::before {
  content: ''; display: block; width: 22px; height: 2px;
  background: var(--color-accent, #c2185b);
}
.hv6-section-title {
  font-size: clamp(24px, 4vw, 40px);
  font-weight: 900; line-height: 1.05; letter-spacing: -.03em;
}
.hv6-section-body {
  font-size: 15px; line-height: 1.78; color: #6b7280; margin-bottom: 30px;
}

/* ════════════════════════════════════
   EVENTS
════════════════════════════════════ */
.hv6-events {
  padding: 88px 20px;
  max-width: 740px; margin: 0 auto;
}
.hv6-events__hd {
  display: flex; align-items: flex-end;
  justify-content: space-between; flex-wrap: wrap;
  gap: 12px; margin-bottom: 36px;
}
.hv6-textlink {
  font-size: 10px; font-weight: 800; letter-spacing: .12em;
  text-transform: uppercase; color: var(--color-accent);
  text-decoration: none; display: flex; align-items: center; gap: 4px;
  flex-shrink: 0;
}
.hv6-event {
  display: grid; grid-template-columns: 54px 1fr 20px;
  gap: 14px; align-items: center;
  padding: 18px 10px; border-radius: 12px;
  border-bottom: 1px solid rgba(0,0,0,.06);
  text-decoration: none; color: inherit;
  transition: background .15s;
}
.hv6-event:hover { background: rgba(0,0,0,.025); }
.hv6-event__mo {
  font-size: 9px; font-weight: 800; letter-spacing: .14em;
  text-transform: uppercase; margin-bottom: 1px;
}
.hv6-event__d { font-size: 30px; font-weight: 900; line-height: 1; }
.hv6-event__tag {
  display: inline-block; font-size: 8px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: rgba(0,0,0,.06); margin-bottom: 4px;
}
.hv6-event__name {
  font-size: 15px; font-weight: 800;
  letter-spacing: -.02em; line-height: 1.2; margin-bottom: 3px;
}
.hv6-event__loc {
  font-size: 12px; color: #9ca3af;
  display: flex; align-items: center; gap: 4px;
}
.hv6-event__arr {
  opacity: 0; transition: opacity .15s, transform .15s;
  color: var(--color-accent);
}
.hv6-event:hover .hv6-event__arr { opacity: 1; transform: translateX(3px); }
.hv6-empty {
  border: 1.5px dashed rgba(0,0,0,.1); border-radius: 14px;
  padding: 44px 20px; text-align: center; color: #9ca3af; font-size: 14px;
}

/* ════════════════════════════════════
   GALLERY
════════════════════════════════════ */
.hv6-gallery { padding-bottom: 88px; }
.hv6-gallery__hd {
  max-width: 1180px; margin: 0 auto;
  padding: 88px 20px 28px;
  display: flex; align-items: flex-end;
  justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.hv6-gallery__grid {
  max-width: 1180px; margin: 0 auto;
  padding: 0 14px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
@media (min-width: 700px) {
  .hv6-gallery__grid {
    grid-template-columns: repeat(12, 1fr);
    grid-template-rows: 260px 260px;
  }
  .hv6-gallery__grid > :nth-child(1) { grid-column: span 5; grid-row: span 2; }
  .hv6-gallery__grid > :nth-child(2) { grid-column: span 4; }
  .hv6-gallery__grid > :nth-child(3) { grid-column: span 3; }
  .hv6-gallery__grid > :nth-child(4) { grid-column: span 3; }
  .hv6-gallery__grid > :nth-child(5) { grid-column: span 4; }
  .hv6-gallery__grid > :nth-child(6) { grid-column: span 5; }
}
.hv6-gcell {
  position: relative; overflow: hidden;
  border-radius: 12px; cursor: pointer;
  background: #e5e7eb; height: 170px;
}
@media (min-width: 700px) { .hv6-gcell { height: auto; } }
.hv6-gcell img {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover;
  transition: transform .55s cubic-bezier(.4,0,.2,1);
}
.hv6-gcell:hover img { transform: scale(1.07); }
.hv6-gcell__ov {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 60%);
  opacity: 0; transition: opacity .25s;
  display: flex; align-items: flex-end;
  padding: 12px; gap: 4px; flex-wrap: wrap;
}
.hv6-gcell:hover .hv6-gcell__ov { opacity: 1; }
.hv6-gcell__zoom {
  position: absolute; top: 10px; right: 10px;
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,.15);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.25);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity .25s;
}
.hv6-gcell:hover .hv6-gcell__zoom { opacity: 1; }
.hv6-gallery__foot { text-align: center; margin-top: 26px; }

/* ════════════════════════════════════
   JOIN CTA
════════════════════════════════════ */
.hv6-join { position: relative; overflow: hidden; }
.hv6-join__wrap {
  display: grid; grid-template-columns: 1fr 1fr;
  min-height: 460px;
}
@media (max-width: 700px) { .hv6-join__wrap { grid-template-columns: 1fr; } }
.hv6-join__left {
  display: flex; flex-direction: column; justify-content: center;
  padding: 80px 52px;
}
@media (max-width: 860px) { .hv6-join__left { padding: 60px 22px; } }
.hv6-join__eye {
  font-size: 8px; font-weight: 800; letter-spacing: .22em;
  text-transform: uppercase; opacity: .4; margin-bottom: 16px;
  display: flex; align-items: center; gap: 10px;
}
.hv6-join__eye::before {
  content: ''; display: block; width: 22px; height: 2px;
  background: rgba(255,255,255,.5);
}
.hv6-join__title {
  font-size: clamp(28px, 5vw, 56px); font-weight: 900;
  line-height: .98; letter-spacing: -.04em; margin-bottom: 16px;
}
.hv6-join__sub {
  font-size: 15px; line-height: 1.7; opacity: .65;
  margin-bottom: 26px; max-width: 380px;
}
.hv6-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 30px; }
.hv6-chip {
  font-size: 9px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; padding: 5px 12px; border-radius: 999px;
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.2);
}
.hv6-join__right {
  display: flex; align-items: center; justify-content: center;
  padding: 40px 24px;
  background: rgba(0,0,0,.12);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
@media (max-width: 700px) { .hv6-join__right { display: none; } }
.hv6-cards {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px; width: 100%; max-width: 300px;
}
.hv6-card {
  background: rgba(255,255,255,.1);
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 16px; padding: 18px;
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}
.hv6-card__icon {
  width: 32px; height: 32px; border-radius: 9px;
  background: rgba(255,255,255,.12);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 9px;
}
.hv6-card__lbl {
  font-size: 8px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; opacity: .45; margin-bottom: 2px;
}
.hv6-card__val { font-size: 19px; font-weight: 900; line-height: 1.1; }

/* ════════════════════════════════════
   SOCIAL STRIP
════════════════════════════════════ */
.hv6-social {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  padding: 30px 24px;
  background: var(--color-page-bg, #fff);
  border-top: 1px solid rgba(0,0,0,.07);
}
.hv6-social__lbl {
  font-size: 9px; font-weight: 800; letter-spacing: .2em;
  text-transform: uppercase; color: #9ca3af;
}
.hv6-social__icon {
  width: 40px; height: 40px; border-radius: 50%;
  background: rgba(0,0,0,.06);
  border: 1px solid rgba(0,0,0,.08);
  display: flex; align-items: center; justify-content: center;
  color: #374151; text-decoration: none;
  transition: background .15s, color .15s, transform .15s;
}
.hv6-social__icon:hover {
  background: var(--color-accent); color: white;
  transform: translateY(-2px);
}

/* ════════════════════════════════════
   LIGHTBOX
════════════════════════════════════ */
.hv6-lb {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.96);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.hv6-lb img {
  max-height: 86vh; max-width: 88vw;
  object-fit: contain; border-radius: 10px;
}
.hv6-lb__x {
  position: fixed; top: 16px; right: 16px;
  width: 42px; height: 42px; border-radius: 50%;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: white; transition: background .15s;
}
.hv6-lb__x:hover { background: rgba(255,255,255,.2); }
.hv6-lb__nav {
  position: fixed; top: 50%; transform: translateY(-50%);
  width: 46px; height: 46px; border-radius: 50%;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: white; transition: background .15s;
}
.hv6-lb__nav:hover { background: rgba(255,255,255,.2); }
.hv6-lb__nav:disabled { opacity: .2; pointer-events: none; }
.hv6-lb__cap {
  position: fixed; bottom: 48px; left: 50%; transform: translateX(-50%);
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(10px);
  border-radius: 999px; padding: 6px 16px;
  font-size: 13px; color: rgba(255,255,255,.72);
  white-space: nowrap; max-width: 80vw;
  overflow: hidden; text-overflow: ellipsis;
}
.hv6-lb__ctr {
  position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
  font-size: 10px; font-weight: 800; letter-spacing: .18em;
  color: rgba(255,255,255,.28);
}

/* ════════════════════════════════════
   BUTTONS
════════════════════════════════════ */
.hv6-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 13px 22px; border-radius: 12px;
  font-size: 11px; font-weight: 800; letter-spacing: .07em;
  text-transform: uppercase; text-decoration: none;
  cursor: pointer; border: none;
  transition: transform .14s, box-shadow .14s, background .14s, color .14s;
  white-space: nowrap; flex-shrink: 0;
}
.hv6-btn:hover { transform: translateY(-2px); }
.hv6-btn--acc {
  background: var(--color-accent); color: white;
  box-shadow: 0 4px 18px rgba(0,0,0,.2);
}
.hv6-btn--acc:hover { box-shadow: 0 10px 28px rgba(0,0,0,.25); }
/* ghost button – always white border + white text, visible on any hero */
.hv6-btn--ghost {
  background: rgba(255,255,255,.15);
  color: white !important;
  border: 1.5px solid rgba(255,255,255,.55);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.hv6-btn--ghost:hover { background: rgba(255,255,255,.25); }
.hv6-btn--ol {
  background: transparent; color: var(--color-accent);
  border: 2px solid var(--color-accent);
}
.hv6-btn--ol:hover { background: var(--color-accent); color: white; }
.hv6-btn--wh {
  background: white; color: #111;
  box-shadow: 0 4px 18px rgba(0,0,0,.14);
}
.hv6-btn--wh:hover { box-shadow: 0 12px 32px rgba(0,0,0,.2); }

/* ════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════ */
.hv6-rev {
  opacity: 0; transform: translateY(22px);
  transition: opacity .6s cubic-bezier(.4,0,.2,1),
              transform .6s cubic-bezier(.4,0,.2,1);
}
.hv6-rev.in { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(el);
}

/* ─── reveal hook ─── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.hv6-rev');
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

  useEffect(() => {
    if (!headlineRef.current) return;
    const split = new SplitType(headlineRef.current, { types: 'words,chars' });
    gsap.from(split.chars, {
      y: 80, opacity: 0, rotationZ: 4,
      duration: 1.1, stagger: 0.013,
      ease: 'power4.out', delay: 0.1,
    });
    return () => { split.revert(); };
  }, [content.homeHeroTitle]);

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

  const heroBg = `linear-gradient(145deg, var(--color-hero-start, var(--color-primary)) 0%, ${tenant.brand.heroDark || 'var(--color-primary)'} 100%)`;

  return (
    <div className="hv6 bg-[var(--color-page-bg)]">
      <SEOHead title="Home" canonicalPath="/" structuredData={orgSchema} />

      {/* ══════════════════════════════
          HERO — headline pinned to bottom,
          NO kicker text above it
      ══════════════════════════════ */}
      <section
        className="hv6-hero"
        style={{ background: heroBg, color: heroColor }}
      >
        <div className="hv6-hero__noise" />

        {/* orbs */}
        <div className="hv6-hero__orb" style={{
          width: '65vw', height: '65vw', maxWidth: 600, maxHeight: 600,
          top: '-20%', right: '-18%',
          background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
          filter: 'blur(90px)', opacity: 0.28,
        }} />
        <div className="hv6-hero__orb" style={{
          width: '50vw', height: '50vw', maxWidth: 450, maxHeight: 450,
          bottom: '-15%', left: '-14%',
          background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
          filter: 'blur(80px)', opacity: 0.18,
        }} />

        <div className="hv6-hero__inner">
          {/* ── Headline – nothing above it ── */}
          <h1
            ref={headlineRef}
            className="hv6-hero__title font-heading"
            style={{ color: heroColor }}
          >
            {heroTitle}
          </h1>

          {/* bottom bar: org name + CTAs */}
          <div className="hv6-hero__bar">
            <p className="hv6-hero__org" style={{ color: heroColor }}>
              {tenant.fullName}
            </p>
            <div className="hv6-hero__ctas">
              <Link to="/join" className="hv6-btn hv6-btn--acc">
                Join the Club <ArrowUpRight size={13} />
              </Link>
              <Link to="/about" className="hv6-btn hv6-btn--ghost">
                Our Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          GLASSMORPHISM STAT CARDS
          — overlaps bottom of hero,
            visible on ALL screen sizes
      ══════════════════════════════ */}
      <div
        className="hv6-glass-row hv6-rev"
        style={{ color: heroColor }}
      >
        {[
          { val: `${content.homeStatMembers}+`, lbl: 'Members' },
          { val: `${content.homeStatProjects}`,  lbl: 'Projects' },
          { val: `${content.homeStatHours}+`,   lbl: 'Vol. Hours' },
        ].map((s, i) => (
          <div key={i} className="hv6-glass-card">
            <span className="hv6-glass-card__val font-heading" style={{ color: 'white' }}>
              {s.val}
            </span>
            <span className="hv6-glass-card__lbl" style={{ color: 'rgba(255,255,255,.75)' }}>
              {s.lbl}
            </span>
          </div>
        ))}
      </div>

      {/* Marquee */}
      <div style={{ marginTop: 44 }}>
        <MarqueeTicker items={['Unite for Good', 'People of Action', 'Create Lasting Impact']} />
      </div>

      {/* ══════════════════════════════
          STATS CARD (animated numbers)
      ══════════════════════════════ */}
      <div className="hv6-stats hv6-rev">
        <div className="hv6-stats__card">
          <div className="hv6-stat">
            <span className="hv6-stat__lbl">Active Members</span>
            <span className="hv6-stat__val font-heading" style={headStyle}>
              <ScrollAnimatedNumber end={content.homeStatMembers} suffix="+" />
            </span>
          </div>
          <div className="hv6-stat">
            <span className="hv6-stat__lbl">Projects Completed</span>
            <span className="hv6-stat__val font-heading" style={headStyle}>
              <ScrollAnimatedNumber end={content.homeStatProjects} suffix="" />
            </span>
          </div>
          <div className="hv6-stat">
            <span className="hv6-stat__lbl">Volunteer Hours</span>
            <span className="hv6-stat__val font-heading" style={headStyle}>
              <ScrollAnimatedNumber end={content.homeStatHours} suffix="+" />
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          MISSION
      ══════════════════════════════ */}
      <section
        className="hv6-mission hv6-rev"
        style={{ background: tenant.brand.secondaryColor, color: tenant.brand.textOnPrimary }}
      >
        <div className="hv6-mission__noise" />
        <div className="hv6-mission__inner">
          <div className="hv6-eye">Our Mission</div>
          <p className="hv6-mission__text font-heading">{content.homeMissionText}</p>
        </div>
        <span
          className="hv6-mission__bgword font-heading"
          style={{ color: tenant.brand.textOnPrimary }}
          aria-hidden="true"
        >
          Service
        </span>
      </section>

      {/* ══════════════════════════════
          ABOUT
      ══════════════════════════════ */}
      <section className="hv6-about hv6-rev">
        <div className="hv6-about__img">
          <img src={content.homeAboutImage || generatedImgAbout} alt="Club in action" />
          <div className="hv6-about__pill">
            <div className="hv6-about__pill-est">Est. {tenant.foundedYear || '2015'}</div>
            <div className="hv6-about__pill-name">{tenant.shortName}</div>
            <div className="hv6-about__pill-sub">{tenant.district}</div>
          </div>
        </div>
        <div className="hv6-about__copy">
          <div className="hv6-section-eye">Our Story</div>
          <h2 className="hv6-section-title font-heading" style={{ ...headStyle, marginBottom: 14 }}>
            Building leaders through service.
          </h2>
          <p className="hv6-section-body">
            Founded under the guidance of {tenant.district}, our club brings together
            passionate individuals to tackle pressing local and global challenges. By
            joining us, you don't just volunteer — you learn how to lead.
          </p>
          <Link to="/about" className="hv6-btn hv6-btn--ol" style={{ alignSelf: 'flex-start' }}>
            Read Our History <ArrowUpRight size={12} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════
          FEATURED PROJECTS
      ══════════════════════════════ */}
      <div className="hv6-rev">
        <FeaturedProjects />
      </div>

      {/* ══════════════════════════════
          EVENTS
      ══════════════════════════════ */}
      <section className="hv6-events hv6-rev">
        <div className="hv6-events__hd">
          <div>
            <div className="hv6-section-eye" style={{ marginBottom: 8 }}>What's Coming</div>
            <h2 className="hv6-section-title font-heading" style={headStyle}>Upcoming Events</h2>
          </div>
          <Link to="/events" className="hv6-textlink">
            Full Calendar <ArrowUpRight size={12} />
          </Link>
        </div>

        {upcomingEvents.length > 0 ? upcomingEvents.map(ev => {
          const d = new Date(ev.date + 'T00:00:00');
          return (
            <Link to="/events" key={ev.id} className="hv6-event">
              <div>
                <div className="hv6-event__mo" style={{ color: 'var(--color-accent)' }}>
                  {d.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="hv6-event__d font-heading" style={headStyle}>
                  {d.getDate()}
                </div>
              </div>
              <div>
                <span className="hv6-event__tag">{ev.type}</span>
                <div className="hv6-event__name">{ev.title}</div>
                <div className="hv6-event__loc"><MapPin size={11} /> {ev.venue || 'TBA'}</div>
              </div>
              <ArrowUpRight size={16} className="hv6-event__arr" />
            </Link>
          );
        }) : (
          <div className="hv6-empty">
            <Calendar size={24} style={{ margin: '0 auto 10px', opacity: .2, display: 'block' }} />
            No upcoming events at the moment. Check back soon!
          </div>
        )}
      </section>

      {/* ══════════════════════════════
          GALLERY
      ══════════════════════════════ */}
      <section className="hv6-gallery hv6-rev" style={{ background: 'rgba(0,0,0,.022)' }}>
        <div className="hv6-gallery__hd">
          <div>
            <div className="hv6-section-eye" style={{ marginBottom: 8 }}>Gallery</div>
            <h2 className="hv6-section-title font-heading" style={headStyle}>Captured Moments.</h2>
          </div>
          <Link to="/gallery" className="hv6-textlink">View All <ArrowUpRight size={12} /></Link>
        </div>

        {galleryPhotos.length > 0 ? (
          <>
            <div className="hv6-gallery__grid">
              {galleryPhotos.slice(0, 6).map((p, i) => (
                <div key={p.id || i} className="hv6-gcell" onClick={() => setLightboxIndex(i)}>
                  <img src={p.url} alt={p.caption || 'Gallery'} />
                  <div className="hv6-gcell__ov">
                    {p.albumTag && p.albumTag.split(',').map((t: string) => t.trim()).map((t: string) => (
                      <span key={t} style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: '.1em',
                        textTransform: 'uppercase', color: 'white',
                        background: 'rgba(255,255,255,.15)',
                        padding: '2px 6px', borderRadius: 999,
                      }}>{t}</span>
                    ))}
                  </div>
                  <div className="hv6-gcell__zoom">
                    <ZoomIn size={14} color="white" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hv6-gallery__foot">
              <Link to="/gallery" className="hv6-btn hv6-btn--ol">
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

      {/* ══════════════════════════════
          JOIN CTA
      ══════════════════════════════ */}
      <section
        className="hv6-join hv6-rev"
        style={{ background: isLight ? 'var(--color-accent)' : '#000251', color: 'white' }}
      >
        <div className="hv6-join__wrap">
          <div className="hv6-join__left">
            <div className="hv6-join__eye">Membership</div>
            <h2 className="hv6-join__title font-heading">Ready to make a difference?</h2>
            <p className="hv6-join__sub">
              Join a global network of 350,000+ young leaders taking action
              in their communities every single day.
            </p>
            <div className="hv6-chips">
              {['Leadership', 'Fellowship', 'Service', 'Community'].map(c => (
                <span key={c} className="hv6-chip">{c}</span>
              ))}
            </div>
            <Link to="/join" className="hv6-btn hv6-btn--wh" style={{ alignSelf: 'flex-start' }}>
              Apply for Membership <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="hv6-join__right">
            <div className="hv6-cards">
              {[
                { icon: <Users    size={14} color="white" />, label: 'Global Members', val: '350K+' },
                { icon: <Globe    size={14} color="white" />, label: 'Countries',      val: '200+'  },
                { icon: <Heart    size={14} color="white" />, label: 'Projects / yr',  val: '75K+'  },
                { icon: <Calendar size={14} color="white" />, label: 'Est.',           val: String(tenant.foundedYear || '2015') },
              ].map((c, i) => (
                <div key={i} className="hv6-card">
                  <div className="hv6-card__icon">{c.icon}</div>
                  <div className="hv6-card__lbl">{c.label}</div>
                  <div className="hv6-card__val font-heading">{c.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          SOCIAL STRIP — real icons
      ══════════════════════════════ */}
      {(tenant.social?.facebook || tenant.social?.instagram || tenant.social?.linkedin) && (
        <div className="hv6-social hv6-rev">
          <span className="hv6-social__lbl">Follow us</span>
          {tenant.social?.facebook && (
            <a href={tenant.social.facebook} target="_blank" rel="noopener noreferrer" className="hv6-social__icon">
              <Facebook size={16} />
            </a>
          )}
          {tenant.social?.instagram && (
            <a href={tenant.social.instagram} target="_blank" rel="noopener noreferrer" className="hv6-social__icon">
              <Instagram size={16} />
            </a>
          )}
          {tenant.social?.linkedin && (
            <a href={tenant.social.linkedin} target="_blank" rel="noopener noreferrer" className="hv6-social__icon">
              <Linkedin size={16} />
            </a>
          )}
        </div>
      )}

      {/* ══════════════════════════════
          LIGHTBOX
      ══════════════════════════════ */}
      {lightboxIndex !== null && (
        <div className="hv6-lb" onClick={() => setLightboxIndex(null)}>
          <button className="hv6-lb__x" onClick={() => setLightboxIndex(null)}>
            <X size={17} />
          </button>
          <button
            className="hv6-lb__nav" style={{ left: 14 }}
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
            className="hv6-lb__nav" style={{ right: 14 }}
            disabled={lightboxIndex === galleryPhotos.length - 1}
            onClick={e => { e.stopPropagation(); setLightboxIndex(l => l! + 1); }}
          >
            <ChevronRight size={20} />
          </button>
          {galleryPhotos[lightboxIndex]?.caption && (
            <div className="hv6-lb__cap">{galleryPhotos[lightboxIndex].caption}</div>
          )}
          <div className="hv6-lb__ctr">
            {lightboxIndex + 1} / {galleryPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
