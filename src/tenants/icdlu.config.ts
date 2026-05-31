import { TenantConfig } from './types';

export const icdluConfig: TenantConfig = {
  id: 'icdlu',
  hostname: 'icdlu.org',
  shortName: 'ICDLU',
  fullName: 'Interact Club of Dhaka Luminous',
  tagline: 'Service Above Self',
  foundedYear: '2023',
  district: 'Rotary International D64',
  parentOrg: 'Rotary Club of Dhaka Luminous',
  parentOrgUrl: 'https://rcdlu.org/',
  seo: {
    defaultKeywords: ["ICDLU", "ICDL", "icdlu.org", "Interact Club of Dhaka Luminous", "Interact Club Dhaka", "Interact Club Bangladesh", "Rotary Interact Dhaka", "youth club Dhaka", "service club for students Dhaka", "student leadership Bangladesh"],
    defaultDescription: "ICDLU is the Interact Club of Dhaka Luminous. We are passionate youth dedicated to community service, leadership, and making a lasting impact in Dhaka, Bangladesh."
  },
  brand: {
    primaryColor: '#0A0E1A',
    secondaryColor: '#1A2033',
    accentColor: '#00A2E0',
    textOnPrimary: '#FFFFFF',
    heroStart: '#1A2033',
    heroDark: '#001245',
    pageBg: '#F7F5F0',
    logoPath: '/assets/tenants/icdlu/logo.svg',
    faviconPath: '/assets/tenants/icdlu/favicon.ico',
    ogImagePath: '/assets/tenants/icdlu/og-image.jpg',
  },
  contact: {
    email: 'info@icdlu.org',
    phone: '+880 1234 567890',
    address: 'Dhaka, Bangladesh',
  },
  social: {
    facebook: 'https://facebook.com/icdlu',
    instagram: 'https://instagram.com/icdlu',
    linkedin: 'https://linkedin.com/company/icdlu',
  },
  supabaseSettingsId: 'icdlu',
};
