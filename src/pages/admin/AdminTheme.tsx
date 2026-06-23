import { supabase } from '../../supabase';
import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { Palette, RotateCcw, Check, Loader2 } from 'lucide-react';
import { useAdminTenant } from '../../hooks/useAdminTenant';
import { useThemeTokens } from '../../hooks/useThemeTokens';

const GOOGLE_FONTS = [
  { name: 'Clash Display', value: "'Clash Display', sans-serif", import: 'https://api.fontshare.com/v2/css?f[]=clash-display@700,600,500&display=swap' },
  { name: 'Plus Jakarta Sans', value: "'Plus Jakarta Sans', sans-serif", import: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap' },
  { name: 'Space Grotesk', value: "'Space Grotesk', sans-serif", import: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap' },
  { name: 'DM Sans', value: "'DM Sans', sans-serif", import: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap' },
  { name: 'Inter', value: "'Inter', sans-serif", import: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' },
  { name: 'Syne', value: "'Syne', sans-serif", import: 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap' },
];

// NOTE: surface / pageBg / success / danger are new tokens. They live only inside
// this jsonb `theme` blob — no SQL migration needed for them (see theme_schema.sql
// for the *unrelated* structural additions: RLS, tenant_id column, defaults backfill).
const DEFAULTS = {
  primary: '#0A0E1A',
  accent: '#00A2E0',
  heroStart: '#05070d',
  surface: '#FFFFFF',
  pageBg: '#F7F5F0',
  success: '#15803D',
  danger: '#B91C1C',
  buttonRadius: '0.5rem',
  fontHeading: "'Clash Display', sans-serif",
  fontBody: "'Plus Jakarta Sans', sans-serif",
};

const RADIUS_OPTIONS = [
  { label: 'Sharp', value: '0px' },
  { label: 'Rounded', value: '0.5rem' },
  { label: 'Pill', value: '9999px' },
];

function brandSeed(tenant: any) {
  return {
    ...DEFAULTS,
    primary: tenant.brand.primaryColor,
    accent: tenant.brand.accentColor,
    heroStart: tenant.brand.heroStart || DEFAULTS.heroStart,
    surface: tenant.brand.surfaceColor || DEFAULTS.surface,
    pageBg: tenant.brand.pageBgColor || DEFAULTS.pageBg,
    success: tenant.brand.successColor || DEFAULTS.success,
    danger: tenant.brand.dangerColor || DEFAULTS.danger,
  };
}

export default function AdminTheme() {
  const { adminTenant: tenant } = useAdminTenant();
  const { addToast } = useToast();
  const tokens = useThemeTokens();
  const [theme, setTheme] = useState(brandSeed(tenant));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('settings').select('data').eq('id', `${tenant.id}-theme`).single().then(({ data }) => {
        if (data && data.data) {
          setTheme({ ...brandSeed(tenant), ...data.data });
        } else {
          setTheme(brandSeed(tenant));
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
    root.style.setProperty('--color-surface', theme.surface);
    root.style.setProperty('--color-page-bg', theme.pageBg);
    root.style.setProperty('--color-success', theme.success);
    root.style.setProperty('--color-danger', theme.danger);
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
    setTheme(brandSeed(tenant));
    addToast('Reset to defaults. Save to apply.', 'success');
  };

  if (loading) {
    return (
      <div style={tokens} className="p-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ColorPicker = ({
    label,
    hint,
    themeKey,
  }: {
    label: string;
    hint?: string;
    themeKey: keyof typeof DEFAULTS;
  }) => (
    <div>
      <label className="block text-sm font-bold text-[color:var(--text-1)]">{label}</label>
      {hint && <p className="text-xs text-[color:var(--text-3)] mb-2">{hint}</p>}
      <div className={`flex items-center gap-3 ${hint ? '' : 'mt-2'}`}>
        <input
          type="color"
          value={theme[themeKey]}
          onChange={e => setTheme({ ...theme, [themeKey]: e.target.value })}
          className="w-12 h-12 rounded-xl border border-[color:var(--border-subtle)] cursor-pointer p-1 bg-[color:var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
        />
        <input
          type="text"
          value={theme[themeKey]}
          onChange={e => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setTheme({ ...theme, [themeKey]: val });
          }}
          className="w-32 px-3 py-2 text-sm font-mono border border-[color:var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 bg-[color:var(--surface)] text-[color:var(--text-1)]"
          maxLength={7}
        />
        <div
          className="w-8 h-8 rounded-full border border-[color:var(--border-subtle)] shadow-inner shrink-0"
          style={{ background: theme[themeKey] }}
        />
      </div>
    </div>
  );

  return (
    <div style={tokens} className="space-y-8 pb-12 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-heading font-bold text-[color:var(--text-1)] flex items-center gap-2">
              <Palette className="text-accent" size={24} /> Theme Customizer
            </h1>
            <span className="bg-[color:var(--surface-2)] text-[color:var(--text-2)] text-xs px-2.5 py-1 rounded-full font-bold border border-[color:var(--border-subtle)] uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-[color:var(--text-2)] text-sm mt-1">
            Changes preview live on this page. Save to apply to the whole site.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
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
          <div className="bg-[color:var(--surface)] rounded-3xl border border-[color:var(--border-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 space-y-6">
            <h3 className="font-heading font-bold text-[color:var(--text-1)] border-b border-[color:var(--border-subtle)] pb-3">
              Colors
            </h3>

            <div className="space-y-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-3)]">Brand</p>
              <ColorPicker label="Primary" hint="Backgrounds, headings" themeKey="primary" />
              <ColorPicker label="Accent" hint="Buttons, highlights, links" themeKey="accent" />
              <ColorPicker label="Hero Background" themeKey="heroStart" />
            </div>

            <div className="space-y-5 pt-5 border-t border-[color:var(--border-subtle)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-3)]">Surfaces</p>
              <ColorPicker label="Surface" hint="Cards & panels" themeKey="surface" />
              <ColorPicker label="Page Background" hint="Section backgrounds" themeKey="pageBg" />
            </div>

            <div className="space-y-5 pt-5 border-t border-[color:var(--border-subtle)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--text-3)]">Status</p>
              <ColorPicker label="Success" hint="Active, confirmed states" themeKey="success" />
              <ColorPicker label="Danger" hint="Errors, overdue states" themeKey="danger" />
            </div>
          </div>

          <div className="bg-[color:var(--surface)] rounded-3xl border border-[color:var(--border-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 space-y-6">
            <h3 className="font-heading font-bold text-[color:var(--text-1)] border-b border-[color:var(--border-subtle)] pb-3">
              Button Style
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {RADIUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme({ ...theme, buttonRadius: opt.value })}
                  className={`p-3 border-2 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] ${
                    theme.buttonRadius === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-[color:var(--border-subtle)] text-[color:var(--text-2)] hover:border-[color:var(--border-strong)]'
                  }`}
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

          <div className="bg-[color:var(--surface)] rounded-3xl border border-[color:var(--border-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 space-y-4">
            <h3 className="font-heading font-bold text-[color:var(--text-1)] border-b border-[color:var(--border-subtle)] pb-3">
              Typography
            </h3>
            <div>
              <label className="block text-sm font-bold text-[color:var(--text-1)] mb-2">Heading Font</label>
              <div className="grid grid-cols-2 gap-2">
                {GOOGLE_FONTS.map(font => (
                  <button
                    key={font.value}
                    onClick={() => setTheme({ ...theme, fontHeading: font.value })}
                    className={`p-3 border-2 rounded-xl text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] ${
                      theme.fontHeading === font.value
                        ? 'border-primary bg-primary/5'
                        : 'border-[color:var(--border-subtle)] hover:border-[color:var(--border-strong)]'
                    }`}
                  >
                    <p className="text-[10px] text-[color:var(--text-3)] uppercase tracking-widest mb-1">
                      {theme.fontHeading === font.value && '✓ '}Selected
                    </p>
                    <p className="font-bold text-[color:var(--text-1)] text-sm" style={{ fontFamily: font.value }}>
                      {font.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:sticky lg:top-8">
          <div className="bg-[color:var(--surface)] rounded-3xl border border-[color:var(--border-subtle)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="p-4 border-b border-[color:var(--border-subtle)]">
              <p className="text-xs font-bold text-[color:var(--text-3)] uppercase tracking-widest">Live Preview</p>
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
            <div className="px-6 py-6 border-t border-white/5" style={{ backgroundColor: theme.pageBg }}>
              <div className="grid grid-cols-3 gap-4 text-center">
                {['120+ Members', '45 Projects', '5000+ Hours'].map(s => (
                  <div key={s}>
                    <p className="font-bold text-base" style={{ fontFamily: theme.fontHeading, color: theme.primary }}>{s.split(' ')[0]}</p>
                    <p className="text-[10px]" style={{ color: theme.primary, opacity: 0.55 }}>{s.split(' ').slice(1).join(' ')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Dashboard Card — shows Surface / Success / Danger in context */}
            <div className="px-6 py-6" style={{ backgroundColor: theme.pageBg }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: theme.primary, opacity: 0.5 }}>
                Member Dashboard
              </p>
              <div
                className="rounded-2xl p-4 flex items-center justify-between gap-3"
                style={{ backgroundColor: theme.surface, border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div>
                  <p className="text-[10px]" style={{ color: theme.primary, opacity: 0.5 }}>Membership</p>
                  <p className="font-bold text-sm" style={{ fontFamily: theme.fontHeading, color: theme.primary }}>Status</p>
                </div>
                <div className="flex gap-2">
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${theme.success}1A`, color: theme.success }}
                  >
                    Active
                  </span>
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${theme.danger}1A`, color: theme.danger }}
                  >
                    Overdue
                  </span>
                </div>
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
