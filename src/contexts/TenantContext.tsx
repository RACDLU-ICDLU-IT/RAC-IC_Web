import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { resolveTenant, TenantConfig } from '../tenants';

export interface Theme {
  primary: string;
  accent: string;
  heroStart: string;
  buttonRadius: string;
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
  }, [theme, tenant]);

  // Set document context
  useEffect(() => {
    document.title = tenant.shortName;
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = tenant.brand.faviconPath;
    }
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, theme, settings, reloadSettings: loadData }}>
      {children}
    </TenantContext.Provider>
  );
}
