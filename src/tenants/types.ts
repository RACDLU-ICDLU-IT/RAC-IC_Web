export interface TenantConfig {
  id: 'icdlu' | 'racdlu';
  hostname: string;
  shortName: string;
  fullName: string;
  tagline: string;
  foundedYear: string;
  district: string;
  parentOrg: string;
  parentOrgUrl?: string;
  seo?: {
    defaultKeywords: string[];
    defaultDescription: string;
  };
  brand: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    textOnPrimary: string;
    heroStart: string;
    heroDark?: string;       // NEW — optional deep variant of hero color
    pageBg?: string;         // NEW — optional page background override
    logoPath: string;
    faviconPath: string;
    ogImagePath: string;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  social: {
    facebook: string;
    instagram: string;
    linkedin: string;
  };
  supabaseSettingsId: string;
}
