import { TenantConfig } from './types';

export const racdluConfig: TenantConfig = {
  id: 'racdlu',
  hostname: 'racdlu.org',
  shortName: 'RACDLU',
  fullName: 'Rotaract Club of Dhaka Luminous',
  tagline: 'Fellowship Through Service',
  foundedYear: '2019',
  district: 'Rotary International D64',
  parentOrg: 'Rotary Club of Dhaka Luminous',
  parentOrgUrl: 'https://rcdlu.org/',
  seo: {
    defaultKeywords: ["RACDLU", "racdlu.org", "Rotaract Club of Dhaka Luminous", "Rotaract Club Dhaka", "Rotaract Bangladesh", "Rotaract Dhaka youth", "young professionals service club Dhaka", "service club Bangladesh"],
    defaultDescription: "RACDLU is the Rotaract Club of Dhaka Luminous. A community of young professionals and students in Dhaka dedicated to fellowship and service."
  },
  brand: {
    primaryColor: '#FFFFFF',
    secondaryColor: '#FDF0F5',
    accentColor: '#D41367',
    textOnPrimary: '#1A0A10',
    heroStart: '#D41367',
    heroDark: '#8C0040',
    pageBg: '#FAFAFA',
    logoPath: '/assets/tenants/racdlu/logo.svg',
    faviconPath: '/assets/tenants/racdlu/favicon.ico',
    ogImagePath: '/assets/tenants/racdlu/og-image.jpg',
  },
  contact: {
    email: 'info@racdlu.org',
    phone: '+880 1XXX XXXXXX',   // TODO: replace with real number
    address: 'Dhaka, Bangladesh',
  },
  social: {
    facebook: 'https://facebook.com/racdlu',    // TODO: replace with real handle
    instagram: 'https://instagram.com/racdlu',  // TODO: replace with real handle
    linkedin: 'https://linkedin.com/company/racdlu', // TODO: replace
  },
  supabaseSettingsId: 'racdlu',
};
