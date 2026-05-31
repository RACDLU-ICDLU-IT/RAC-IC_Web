import React, { createContext, useContext, useState, useEffect } from 'react';
import { TenantConfig } from '../tenants/types';
import { resolveTenant } from '../tenants';
import { icdluConfig } from '../tenants/icdlu.config';
import { racdluConfig } from '../tenants/racdlu.config';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'admin_active_tenant';

export const AdminTenantContext = createContext<{
  adminTenant: TenantConfig;
  setAdminTenant: (id: 'icdlu' | 'racdlu') => void;
}>({
  adminTenant: resolveTenant(),
  setAdminTenant: () => {},
});

export function AdminTenantProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  
  const getInitial = (): TenantConfig => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'racdlu') return racdluConfig;
    if (stored === 'icdlu') return icdluConfig;
    return resolveTenant();
  };

  const [adminTenant, setAdminTenantState] = useState<TenantConfig>(getInitial);

  // When profile loads or changes, ensuring state is correct and regular admins are strictly restricted to their club
  useEffect(() => {
    if (profile) {
      if (profile.role === 'admin') {
        const forcedTenant = profile.tenant_id === 'racdlu' ? racdluConfig : icdluConfig;
        setAdminTenantState(forcedTenant);
      } else {
        setAdminTenantState(getInitial());
      }
    } else {
      setAdminTenantState(getInitial());
    }
  }, [profile]);

  const setAdminTenant = (id: 'icdlu' | 'racdlu') => {
    if (profile?.role !== 'master_admin') return;
    sessionStorage.setItem(STORAGE_KEY, id);
    setAdminTenantState(id === 'racdlu' ? racdluConfig : icdluConfig);
  };

  return (
    <AdminTenantContext.Provider value={{ adminTenant, setAdminTenant }}>
      {children}
    </AdminTenantContext.Provider>
  );
}

// In case hooks from contexts format is requested
export function useAdminTenantContext() {
  return useContext(AdminTenantContext);
}
