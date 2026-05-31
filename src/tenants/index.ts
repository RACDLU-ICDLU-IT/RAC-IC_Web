import { TenantConfig } from './types';
import { icdluConfig } from './icdlu.config';
import { racdluConfig } from './racdlu.config';

export function resolveTenant(): TenantConfig {
  if (typeof window === 'undefined') return icdluConfig;

  const hostname = window.location.hostname;
  
  // Also check query param logic (dev environment support)
  const queryParams = new URLSearchParams(window.location.search);
  const tenantParam = queryParams.get('tenant');

  let resolved: TenantConfig | null = null;

  if (tenantParam === 'racdlu') {
    resolved = racdluConfig;
  } else if (tenantParam === 'icdlu') {
    resolved = icdluConfig;
  } else if (hostname === 'racdlu.org' || hostname === 'www.racdlu.org' || hostname === 'racdlu.localhost') {
    resolved = racdluConfig;
  } else if (hostname === 'icdlu.org' || hostname === 'www.icdlu.org' || hostname === 'icdlu.localhost') {
    resolved = icdluConfig;
  }

  if (resolved) {
    try {
      sessionStorage.setItem('tenant_id', resolved.id);
    } catch (e) {}
    return resolved;
  }

  try {
    const stored = sessionStorage.getItem('tenant_id');
    if (stored === 'racdlu') return racdluConfig;
    if (stored === 'icdlu') return icdluConfig;
  } catch (e) {}

  // Default and fallback
  return icdluConfig;
}

export * from './types';
export * from './icdlu.config';
export * from './racdlu.config';
