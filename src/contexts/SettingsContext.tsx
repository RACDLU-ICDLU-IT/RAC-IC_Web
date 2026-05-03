import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface GlobalSettings {
  clubName: string;
  tagline: string;
  contactEmail: string;
  phone: string;
  address: string;
  logoUrl?: string;
  rotaryYear?: string;
  [key: string]: any;
}

const defaultSettings: GlobalSettings = {
  clubName: 'Interact Club',
  tagline: 'Service Above Self',
  contactEmail: 'contact@example.com',
  phone: '+1 234 567 8900',
  address: '123 Service Road, City, Country',
};

const SettingsContext = createContext<{ settings: GlobalSettings }>({ settings: defaultSettings });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings({ ...defaultSettings, ...doc.data() });
      }
    });
    return unsub;
  }, []);

  return <SettingsContext.Provider value={{ settings }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
