import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { resolveTenant } from './tenants';

const tenant = resolveTenant();

// Apply static brand colors immediately (avoids flash)
const root = document.documentElement;
root.style.setProperty('--color-primary', tenant.brand.primaryColor);
root.style.setProperty('--color-accent', tenant.brand.accentColor);
root.style.setProperty('--color-hero-start', tenant.brand.heroStart);
root.style.setProperty('--radius-button', '0.5rem');

document.title = tenant.shortName;
const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
if (link) {
  link.href = tenant.brand.faviconPath;
}

// Global Cloudinary Configuration Check
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
if (!cloudName || !uploadPreset || cloudName === 'demo') {
  console.warn(
    '⚠️ CLOUDINARY CONFIGURATION WARNING:\n' +
    'Cloudinary is not correctly configured or is using default "demo" settings.\n' +
    'Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file to enable fully functional image uploads.'
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
