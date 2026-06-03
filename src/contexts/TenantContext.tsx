import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { resolveTenant, TenantConfig } from '../tenants';

export interface Theme {
  primary: string;
  accent: string;
  heroStart: string;
  buttonRadius: string;
  fontHeading: string;
  fontBody: string;
}

// Map of font CSS value → Google/Fontshare import URL (must match AdminTheme.tsx)
const FONT_IMPORT_MAP: Record<string, string> = {
  "'Clash Display', sans-serif": 'https://api.fontshare.com/v2/css?f[]=clash-display@700,600,500&display=swap',
  "'Plus Jakarta Sans', sans-serif": 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap',
  "'Space Grotesk', sans-serif": 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap',
  "'DM Sans', sans-serif": 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap',
  "'Inter', sans-serif": 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  "'Syne', sans-serif": 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap',
};

function injectFontLink(fontValue: string, linkId: string) {
  const importUrl = FONT_IMPORT_MAP[fontValue];
  if (!importUrl) return;
  const existing = document.getElementById(linkId);
  if (existing) existing.remove();
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = importUrl;
  document.head.appendChild(link);
}

export interface GlobalSettings {
  clubName: string;
  tagline: string;
  contactEmail: string;
  phone: string;
  address: string;
  logoUrl?: string;
  rotaryYear?: string;
  meetingVenue?: string;
  meetingSchedule?: string;
  googleMapsEmbedUrl?: string;
  brand?: any;
}

export interface TenantContextType {
  tenant: TenantConfig;
  theme: Theme;
  settings: GlobalSettings;
  reloadSettings: () => void;
}

const initialTenant = resolveTenant();

const defaultTheme: Theme = {
  primary: initialTenant.brand.primaryColor,
  accent: initialTenant.brand.accentColor,
  heroStart: initialTenant.brand.heroStart,
  buttonRadius: '0.5rem',
  fontHeading: "'Clash Display', sans-serif",
  fontBody: "'Plus Jakarta Sans', sans-serif",
};

const defaultSettings: GlobalSettings = {
  clubName: initialTenant.fullName,
  tagline: initialTenant.tagline,
  contactEmail: initialTenant.contact.email,
  phone: initialTenant.contact.phone,
  address: initialTenant.contact.address,
  logoUrl: initialTenant.brand.logoPath,
};

export const TenantContext = createContext<TenantContextType>({
  tenant: initialTenant,
  theme: defaultTheme,
  settings: defaultSettings,
  reloadSettings: () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant] = useState<TenantConfig>(initialTenant);
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);

  const loadData = async () => {
    try {
      const [themeRes, settingsRes] = await Promise.all([
        supabase.from('settings').select('data').eq('id', `${tenant.supabaseSettingsId}-theme`).single(),
        supabase.from('settings').select('data').eq('id', `${tenant.supabaseSettingsId}-global`).single()
      ]);

      if (themeRes.data?.data) {
        setTheme({ ...defaultTheme, ...themeRes.data.data });
      }
      if (settingsRes.data?.data) {
        const mergedSettings = { ...defaultSettings, ...settingsRes.data.data };
        if (!mergedSettings.logoUrl || mergedSettings.logoUrl.trim() === '') {
          mergedSettings.logoUrl = tenant.brand.logoPath;
        }
        setSettings(mergedSettings);
      }
    } catch (err) {
      console.error('Error fetching tenant data:', err);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`tenant-settings-${tenant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'settings',
        filter: `id=in.(${tenant.supabaseSettingsId}-theme,${tenant.supabaseSettingsId}-global)`
      }, () => {
        loadData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenant]);

  useEffect(() => {
    // Inject CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-hero-start', theme.heroStart);
    root.style.setProperty('--color-page-bg', tenant.brand.pageBg || '#F7F5F0');
    root.style.setProperty('--radius-button', theme.buttonRadius);
    root.style.setProperty('--font-heading', theme.fontHeading);
    root.style.setProperty('--font-body', theme.fontBody);

    // Dynamically load font files so the browser can actually render them
    injectFontLink(theme.fontHeading, 'tenant-font-heading');
    injectFontLink(theme.fontBody, 'tenant-font-body');
  }, [theme, tenant]);

  // Set document context
  useEffect(() => {
    document.title = tenant.fullName;
    const faviconHref = settings.logoUrl || tenant.brand.faviconPath;
    ['icon', 'shortcut icon', 'apple-touch-icon'].forEach(rel => {
      let link = document.querySelector(`link[rel~='${rel}']`) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = faviconHref;
    });
  }, [tenant, settings.logoUrl]);

  return (
    <TenantContext.Provider value={{ tenant, theme, settings, reloadSettings: loadData }}>
      {children}
    </TenantContext.Provider>
  );
}
