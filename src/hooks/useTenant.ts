import { useContext } from 'react';
import { TenantContext } from '../contexts/TenantContext';

export function useTenant() {
  return useContext(TenantContext);
}
