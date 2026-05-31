import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../hooks/useTenant';
import { Loader2, ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ requireAdmin = false }: { requireAdmin?: boolean }) => {
  const { user, profile, loading } = useAuth();
  const { tenant } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-bg)]">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.status === 'pending') {
    return <Navigate to="/join" replace />;
  }

  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'master_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Cross-tenant protection for members and local administrators
  if (profile && profile.role !== 'master_admin' && profile.tenant_id !== tenant.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">
            Access Restricted
          </h1>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            You are a registered member of <strong className="font-semibold text-gray-900">{profile.tenant_id === 'icdlu' ? 'ICDLU' : 'RACDLU'}</strong>. You cannot access the dashboard or portals for <strong className="font-semibold text-gray-900">{tenant.id === 'icdlu' ? 'ICDLU' : 'RACDLU'}</strong>.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Please make sure you are visiting the correct club website link.
          </p>
          <a
            href={profile.tenant_id === 'icdlu' ? '?tenant=icdlu' : '?tenant=racdlu'}
            className="w-full bg-[var(--color-primary)] text-white font-medium py-3 px-4 rounded-lg hover:bg-opacity-90 transition-all shadow-sm text-sm"
          >
            Switch to {profile.tenant_id === 'icdlu' ? 'ICDLU' : 'RACDLU'}
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
