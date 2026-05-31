import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenant } from './useTenant';

// Module-level cache keyed by `tenantId_pageId`
const contentCache: Record<string, any> = {};

export function usePageContent(pageId: string, defaultData: any, tenantIdOverride?: string) {
  const { tenant } = useTenant();
  // Allow admin pages to pass their active adminTenant.id as an override
  const activeTenantId = tenantIdOverride || tenant.id;
  const cacheKey = `${activeTenantId}_${pageId}`;

  const [content, setContent] = useState(defaultData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (contentCache[cacheKey]) {
      setContent({ ...defaultData, ...contentCache[cacheKey] });
      setLoading(false);
      return;
    }

    setLoading(true);

    supabase
      .from('page_content')
      .select('data')
      .eq('id', pageId)
      .eq('tenant_id', activeTenantId)
      .single()
      .then(({ data }) => {
        if (isMounted) {
          const merged = data ? { ...defaultData, ...data.data } : defaultData;
          contentCache[cacheKey] = data?.data ?? {};
          setContent(merged);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [pageId, activeTenantId]);

  // Utility to invalidate this entry (e.g., after an admin save)
  const invalidateCache = () => {
    delete contentCache[cacheKey];
  };

  return { content, loading, invalidateCache };
}
