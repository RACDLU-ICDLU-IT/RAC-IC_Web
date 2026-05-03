import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface Theme {
  primary: string;
  accent: string;
  heroStart: string;
  buttonRadius: string;
}

const defaultTheme: Theme = {
  primary: '#0A0E1A',
  accent: '#F4A928',
  heroStart: '#05070d',
  buttonRadius: '0.5rem',
};

const ThemeContext = createContext<{ theme: Theme; refreshTheme: () => void }>({ theme: defaultTheme, refreshTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'theme'), (doc) => {
      if (doc.exists()) {
        setTheme({ ...defaultTheme, ...doc.data() });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Inject CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-hero-start', theme.heroStart);
    root.style.setProperty('--radius-button', theme.buttonRadius);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, refreshTheme: () => {} }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
