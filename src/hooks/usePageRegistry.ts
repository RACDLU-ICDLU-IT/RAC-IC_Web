import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { COMPONENT_MAP, ICON_MAP, PageRegistryRow } from '../routes/dashboardRoutes';
import { LucideIcon } from 'lucide-react';

export interface ResolvedPage {
  mode: 'admin' | 'member';
  path: string;
  pageKey: string;
  label: string;
  icon: LucideIcon;
  section: string | null;
  element: React.ComponentType<any>;
  exact: boolean;
  sortOrder: number;
}

/** Fetches page_registry for the given tenant and resolves component_key/icon strings into real refs. */
export function usePageRegistry(tenantId: string | undefined) {
  const [pages, setPages] = useState<ResolvedPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    setLoading(true);

    supabase.from('page_registry').select('*').eq('tenant_id', tenantId).order('mode').order('sort_order')
      .then(({ data }) => {
        if (cancelled) return;
        const resolved: ResolvedPage[] = ((data || []) as PageRegistryRow[])
          .map(r => {
            const element = COMPONENT_MAP[r.component_key];
            const icon = ICON_MAP[r.icon];
            if (!element) {
              console.warn(`page_registry: unknown component_key "${r.component_key}" for page "${r.label}" — skipped`);
              return null;
            }
            return {
              mode: r.mode,
              path: r.path,
              pageKey: r.page_key,
              label: r.label,
              icon: icon || ICON_MAP['FileText'],
              section: r.section,
              element,
              exact: r.path === '',
              sortOrder: r.sort_order,
            } as ResolvedPage;
          })
          .filter((r): r is ResolvedPage => r !== null);
        setPages(resolved);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tenantId]);

  return { pages, loading };
}
