import { useContext } from 'react';
import { AdminTenantContext } from '../contexts/AdminTenantContext';

export function useAdminTenant() {
  return useContext(AdminTenantContext);
}
