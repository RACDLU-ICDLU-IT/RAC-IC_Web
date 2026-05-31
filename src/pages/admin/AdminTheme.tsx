import { supabase } from '../../supabase';
import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Palette, RotateCcw, Check, Loader2 } from 'lucide-react';
import { useAdminTenant } from '../../hooks/useAdminTenant';

const GOOGLE_FONTS = [
  { name: 'Clash Display', value: "'Clash Display', sans-serif", import: 'https://api.fontshare.com/v2/css?f[]=clash-display@700,600,500&display=swap' },
  { name: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif", import: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap' },
  { name: 'Space Grotesk', value: "'Space Grotesk', sans-serif", import: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap' },
  { name: 'DM Sans', value: "'DM Sans', sans-serif", import: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap' },
  { name: 'Inter', value: "'Inter', sans-serif", import: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' },
  { name: 'Syne', value: "'Syne', sans-serif", import: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap' },
];

const DEFAULTS = {
  primary: '#0A0E1A',
  accent: '#00A2E0',
  heroStart: '#05070d',
  buttonRadius: '0.5rem',
  fontHeading: "'Clash Display', sans-serif",
  fontBody: "'Plus Jakarta Sans', sans-serif",
};

const RADIUS_OPTIONS = [
  { label: 'Sharp', value: '0px' },
  { label: 'Rounded', value: '0.5rem' },
  { label: 'Pill', value: '9999px' },
];

export default function AdminTheme() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const [theme, setTheme] = useState({ 
    ...DEFAULTS, 
    primary: tenant.brand.primaryColor,
    accent: tenant.brand.accentColor,
    heroStart: tenant.brand.heroStart || DEFAULTS.heroStart
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('settings').select('data').eq('id', `${tenant.id}-theme`).single().then(({ data }) => {
        if (data && data.data) {
          setTheme({ 
            ...DEFAULTS, 
            primary: tenant.brand.primaryColor,
            accent: tenant.brand.accentColor,
            heroStart: tenant.brand.heroStart || DEFAULTS.heroStart,
            ...data.data 
          });
        } else {
          setTheme({
            ...DEFAULTS, 
            primary: tenant.brand.primaryColor,
            accent: tenant.brand.accentColor,
            heroStart: tenant.brand.heroStart || DEFAULTS.heroStart,
          });
        }
        setLoading(false);
      }, () => setLoading(false));
  }, [tenant.id]);

  // Live preview: inject CSS variables as theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-hero-start', theme.heroStart);
    root.style.setProperty('--radius-button', theme.buttonRadius);
    root.style.setProperty('--font-heading', theme.fontHeading);
    root.style.setProperty('--font-body', theme.fontBody);
  }, [theme]);

  // Load font dynamically when heading font changes
  useEffect(() => {
    const fontObj = GOOGLE_FONTS.find(f => f.value === theme.fontHeading);
    if (fontObj?.import) {
      const existing = document.getElementById('dynamic-font-link');
      if (existing) existing.remove();
      const link = document.createElement('link');
      link.id = 'dynamic-font-link';
      link.rel = 'stylesheet';
      link.href = fontObj.import;
      document.head.appendChild(link);
    }
  }, [theme.fontHeading]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('settings').upsert({ id: `${tenant.id}-theme`, data: theme }, { onConflict: 'id' });
      addToast('Theme saved! Your site is updated.', 'success');
    } catch {
      addToast('Failed to save theme', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTheme({ 
      ...DEFAULTS,
      primary: tenant.brand.primaryColor,
      accent: tenant.brand.accentColor,
      heroStart: tenant.brand.heroStart || DEFAULTS.heroStart,
    });
    addToast('Reset to defaults. Save to apply.', 'success');
  };

  if (loading) return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;

  const ColorPicker = ({ label, themeKey }: { label: string; themeKey: keyof typeof DEFAULTS }) => (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={theme[themeKey]}
            onChange={e => setTheme({ ...theme, [themeKey]: e.target.value })}
            className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-1 bg-white"
          />
        </div>
        <input
          type="text"
          value={theme[themeKey]}
          onChange={e => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setTheme({ ...theme, [themeKey]: val });
          }}
          className="w-32 px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 bg-white"
          maxLength={7}
        />
        <div className="w-8 h-8 rounded-full border border-gray-200 shadow-inner" style={{ background: theme[themeKey] }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
              <Palette className="text-accent" size={24} /> Theme Customizer
            </h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Changes preview live on this page. Save to apply to the whole site.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleReset}>
            <RotateCcw size={16} className="mr-1" /> Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin mr-1" /> : <Check size={16} className="mr-1" />}
            Save Theme
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h3 className="font-heading font-bold text-gray-900 border-b border-gray-100 pb-3">Colors</h3>
            <ColorPicker label="Primary Color (Backgrounds, headings)" themeKey="primary" />
            <ColorPicker label="Accent Color (Buttons, highlights, links)" themeKey="accent" />
            <ColorPicker label="Hero Background Color" themeKey="heroStart" />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h3 className="font-heading font-bold text-gray-900 border-b border-gray-100 pb-3">Button Style</h3>
            <div className="grid grid-cols-3 gap-3">
              {RADIUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme({ ...theme, buttonRadius: opt.value })}
                  className={`p-3 border-2 rounded-xl text-sm font-bold transition-all ${theme.buttonRadius === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  <div
                    className="w-full h-8 bg-primary mb-2 flex items-center justify-center text-white text-xs"
                    style={{ borderRadius: opt.value }}
                  >
                    Button
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-heading font-bold text-gray-900 border-b border-gray-100 pb-3">Typography</h3>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Heading Font</label>
              <div className="grid grid-cols-2 gap-2">
                {GOOGLE_FONTS.map(font => (
                  <button
                    key={font.value}
                    onClick={() => setTheme({ ...theme, fontHeading: font.value })}
                    className={`p-3 border-2 rounded-xl text-left transition-all ${theme.fontHeading === font.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">
                      {theme.fontHeading === font.value && '✓ '}Selected
                    </p>
                    <p className="font-bold text-gray-900 text-sm" style={{ fontFamily: font.value }}>{font.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:sticky lg:top-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</p>
            </div>

            {/* Mini Navbar */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: theme.primary }}>
              <span className="font-bold text-white text-sm" style={{ fontFamily: theme.fontHeading }}>{tenant.shortName}</span>
              <div className="flex gap-4">
                <span className="text-white/60 text-xs">About</span>
                <span className="text-white/60 text-xs">Events</span>
                <span className="text-white/60 text-xs">Join</span>
              </div>
            </div>

            {/* Mini Hero */}
            <div className="px-6 py-10 text-white" style={{ backgroundColor: theme.heroStart }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 text-[10px] tracking-widest uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} /> Rotary International
              </div>
              <h2 className="text-3xl font-bold leading-tight mb-4" style={{ fontFamily: theme.fontHeading }}>
                Service<br />Above Self.
              </h2>
              <div className="flex gap-3 mt-4">
                <div className="px-5 py-2 text-sm font-bold" style={{ backgroundColor: theme.accent, color: theme.primary, borderRadius: theme.buttonRadius }}>
                  Join Our Club
                </div>
                <div className="px-5 py-2 text-sm font-bold border border-white/30 text-white" style={{ borderRadius: theme.buttonRadius }}>
                  Learn More
                </div>
              </div>
            </div>

            {/* Mini Stats */}
            <div className="px-6 py-6 bg-[#F7F5F0] border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                {['120+ Members', '45 Projects', '5000+ Hours'].map(s => (
                  <div key={s}>
                    <p className="font-bold text-base" style={{ fontFamily: theme.fontHeading, color: theme.primary }}>{s.split(' ')[0]}</p>
                    <p className="text-[10px] text-gray-500">{s.split(' ').slice(1).join(' ')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini CTA */}
            <div className="px-6 py-6 text-center text-white" style={{ backgroundColor: theme.primary }}>
              <p className="font-bold text-base mb-3" style={{ fontFamily: theme.fontHeading }}>Ready to make a difference?</p>
              <div className="inline-block px-6 py-2 text-sm font-bold" style={{ backgroundColor: theme.accent, color: theme.primary, borderRadius: theme.buttonRadius }}>
                Apply Now
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
