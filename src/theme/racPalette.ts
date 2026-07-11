/**
 * ------------------------------------------------------------------
 * Single source of truth for the RACDLU/ICDLU dashboard color system.
 * Pixel-matched to dashboard-combined.html's four CSS blocks
 * (:root, dark, data-club=interact, dark+interact).
 *
 * Both DashboardHome.tsx and DashboardLayout.tsx import THIS module —
 * neither defines its own copy of these hex values. That's the fix
 * for the header/sidebar-vs-page color mismatch: previously
 * DashboardLayout had its own separate `clubAccent` object that only
 * shared a couple of hex values with DashboardHome's PALETTE by
 * coincidence, so header title text, header background, and page
 * background could each independently drift out of sync. Import
 * from here instead of re-declaring, and that can't happen again.
 *
 * Club is resolved from tenant.id ('racdlu' → Rotaract, 'icdlu' →
 * Interact) — see resolveClub() below, used identically in both files.
 * ------------------------------------------------------------------
 */

export type ClubKey = 'rotaract' | 'interact';
export type ThemeMode = 'light' | 'dark';

export interface ClubPalette {
  bg: string; navLink: string; navActive: string; ptxt: string; pmut: string;
  dark: string; tl: string; lightCard: string; td: string; mut: string;
  border: string; pillBorder: string; bar: string; dots: string; tmid: string;
  tsub: string; tblBg: string; tblText: string; weekBg: string; weekText: string;
  green: string; greenDeep: string; av2: string; gcA: string; gcB: string; gcBd: string;
  recBd: string; recTx: string; ilA: string; ilB: string; ilC: string; ilD: string;
  tdH: string; tlC: string;
}

export const PALETTE: Record<ClubKey, Record<ThemeMode, ClubPalette>> = {
  rotaract: {
    light: {
      bg: '#dcd3d6', navLink: '#4f4a4c', navActive: '#121011', ptxt: '#161616', pmut: '#8a8f89',
      dark: '#211c1e', tl: '#eee', lightCard: '#ead9df', td: '#161616', mut: '#7c6c72',
      border: '#292929', pillBorder: '#3a3a3a', bar: 'rgba(255,255,255,.92)', dots: '#7a7a7a', tmid: '#9a9a9a',
      tsub: '#8f8f8f', tblBg: '#292929', tblText: '#c9c9c9', weekBg: '#262626', weekText: '#cfcfcf',
      green: '#d85283', greenDeep: '#270612', av2: '#db618e', gcA: '#3d0a1c', gcB: '#140309', gcBd: '#3f1223',
      recBd: '#3d1322', recTx: '#b5617f', ilA: '#691634', ilB: '#8d1743', ilC: '#380b1b', ilD: '#b4295c',
      tdH: '#beb4b8', tlC: '#cac0c4',
    },
    dark: {
      bg: '#0a0a0a', navLink: '#a09a9c', navActive: '#f2eff0', ptxt: '#f2eff0', pmut: '#897e82',
      dark: '#161616', tl: '#eee', lightCard: '#22181c', td: '#e9dfe3', mut: '#95888d',
      border: '#262626', pillBorder: '#333', bar: 'rgba(255,255,255,.92)', dots: '#7a7a7a', tmid: '#9a9a9a',
      tsub: '#8f8f8f', tblBg: '#292929', tblText: '#c9c9c9', weekBg: '#262626', weekText: '#cfcfcf',
      green: '#d85283', greenDeep: '#270612', av2: '#db618e', gcA: '#3d0a1c', gcB: '#140309', gcBd: '#3f1223',
      recBd: '#3d1322', recTx: '#b5617f', ilA: '#691634', ilB: '#8d1743', ilC: '#380b1b', ilD: '#b4295c',
      tdH: '#beb4b8', tlC: '#cac0c4',
    },
  },
  interact: {
    light: {
      bg: '#d3d9dc', navLink: '#4a4e4f', navActive: '#101212', ptxt: '#161616', pmut: '#8a8f89',
      dark: '#1c2021', tl: '#eee', lightCard: '#d9e5ea', td: '#161616', mut: '#6c787c',
      border: '#292929', pillBorder: '#3a3a3a', bar: 'rgba(255,255,255,.92)', dots: '#7a7a7a', tmid: '#9a9a9a',
      tsub: '#8f8f8f', tblBg: '#292929', tblText: '#c9c9c9', weekBg: '#262626', weekText: '#cfcfcf',
      green: '#52b3d8', greenDeep: '#0d1b20', av2: '#61b9db', gcA: '#122b35', gcB: '#050f12', gcBd: '#17313b',
      recBd: '#172f39', recTx: '#6999ac', ilA: '#224c5c', ilB: '#2b647a', ilC: '#0f2933', ilD: '#298db4',
      tdH: '#b4bbbe', tlC: '#c0c7ca',
    },
    dark: {
      bg: '#0a0a0a', navLink: '#9a9fa0', navActive: '#eff1f2', ptxt: '#eff1f2', pmut: '#7e8689',
      dark: '#161616', tl: '#eee', lightCard: '#181f22', td: '#dfe6e9', mut: '#889195',
      border: '#262626', pillBorder: '#333', bar: 'rgba(255,255,255,.92)', dots: '#7a7a7a', tmid: '#9a9a9a',
      tsub: '#8f8f8f', tblBg: '#292929', tblText: '#c9c9c9', weekBg: '#262626', weekText: '#cfcfcf',
      green: '#52b3d8', greenDeep: '#0d1b20', av2: '#61b9db', gcA: '#122b35', gcB: '#050f12', gcBd: '#17313b',
      recBd: '#172f39', recTx: '#6999ac', ilA: '#224c5c', ilB: '#2b647a', ilC: '#0f2933', ilD: '#298db4',
      tdH: '#b4bbbe', tlC: '#c0c7ca',
    },
  },
};

/** 'racdlu' → Rotaract pink, anything else (incl. 'icdlu') → Interact blue. */
export function resolveClub(tenantId: string | undefined): ClubKey {
  return tenantId === 'racdlu' ? 'rotaract' : 'interact';
}

export function getClubPalette(tenantId: string | undefined, mode: ThemeMode): ClubPalette {
  return PALETTE[resolveClub(tenantId)][mode];
}
