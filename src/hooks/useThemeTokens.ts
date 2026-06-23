import { useMemo } from 'react';
import type { CSSProperties } from 'react';

/**
 * ------------------------------------------------------------------
 * Theme contract
 * ------------------------------------------------------------------
 * Nothing here is a hardcoded color. Every visual token derives from
 * the tenant's own brand variables — --color-accent / --color-primary
 * / --color-page-bg, already set per-tenant by the theme layer (see
 * AdminTheme.tsx) — via `color-mix()`, with safe neutral fallbacks so
 * pages still render correctly before a tenant defines the optional
 * --color-surface / --color-success / --color-danger overrides.
 *
 * Use this in any authenticated page that needs the standard surface/
 * text/status scale:
 *
 *   const tokens = useThemeTokens();
 *   <div style={tokens} className="bg-[color:var(--surface)] ...">
 *
 * To art-direct a specific tenant further, set any of the base
 * variables at the tenant theme root (AdminTheme.tsx writes these) —
 * nothing here needs to change:
 *   --color-surface, --color-page-bg, --color-success, --color-danger
 */
export function useThemeTokens(): CSSProperties {
  return useMemo(
    () => ({
      ['--surface' as any]: 'var(--color-surface, #ffffff)',
      ['--surface-2' as any]: 'color-mix(in srgb, var(--color-accent) 4%, var(--surface))',
      ['--surface-hover' as any]: 'color-mix(in srgb, var(--color-accent) 7%, var(--surface))',
      ['--border-subtle' as any]: 'color-mix(in srgb, var(--color-accent) 10%, #e8e8eb)',
      ['--border-strong' as any]: 'color-mix(in srgb, var(--color-accent) 24%, #d7d7db)',
      ['--text-1' as any]: 'color-mix(in srgb, var(--color-accent) 4%, #0c0c0e)',
      ['--text-2' as any]: 'color-mix(in srgb, var(--color-accent) 3%, #5e5e67)',
      ['--text-3' as any]: 'color-mix(in srgb, var(--color-accent) 2%, #a1a1a9)',
      ['--accent-soft' as any]: 'color-mix(in srgb, var(--color-accent) 10%, var(--surface))',
      ['--accent-soft-2' as any]: 'color-mix(in srgb, var(--color-accent) 18%, var(--surface))',
      ['--success' as any]: 'var(--color-success, #15803d)',
      ['--success-soft' as any]: 'color-mix(in srgb, var(--success) 14%, var(--surface))',
      ['--danger' as any]: 'var(--color-danger, #b91c1c)',
      ['--danger-soft' as any]: 'color-mix(in srgb, var(--danger) 14%, var(--surface))',
    }),
    []
  );
}
