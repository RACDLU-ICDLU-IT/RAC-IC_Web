import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface RoleInfo {
  id: string;
  name: string;
  label: string;
  color: string;
  is_system: boolean;
  is_protected: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  role_id: string | null;
  status: 'pending' | 'active' | 'inactive';
  [key: string]: any;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: RoleInfo | null;
  permissions: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean; is_locked: boolean }>;
  isMasterAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, role: null, permissions: {}, isMasterAdmin: false,
  loading: true, signOut: async () => {}, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]             = useState<User | null>(null);
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [role, setRole]             = useState<RoleInfo | null>(null);
  const [permissions, setPermissions] = useState<AuthContextValue['permissions']>({});
  const [loading, setLoading]       = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    setProfile(data as UserProfile | null);

    if (data?.role_id) {
      const { data: roleData } = await supabase.from('roles').select('*').eq('id', data.role_id).single();
      setRole(roleData as RoleInfo | null);

      const { data: permData } = await supabase.from('role_permissions').select('*').eq('role_id', data.role_id);
      const map: AuthContextValue['permissions'] = {};
      (permData || []).forEach((p: any) => {
        map[p.page_key] = { can_view: p.can_view, can_edit: p.can_edit, can_delete: p.can_delete, is_locked: p.is_locked || false };
      });
      setPermissions(map);
    } else {
      setRole(null);
      setPermissions({});
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    try { sessionStorage.removeItem('lr_no_persist'); } catch {}
  };

  useEffect(() => {
    const noP = sessionStorage.getItem('lr_no_persist');
    const rem = localStorage.getItem('lr_remember');
    if (noP === '1' || rem !== '1') {
      const alive = sessionStorage.getItem('lr_tab_alive');
      if (!alive && rem !== '1') {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        sessionStorage.setItem('lr_tab_alive', '1');
        setLoading(false);
        return;
      }
    }
    sessionStorage.setItem('lr_tab_alive', '1');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
        setPermissions({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isMasterAdmin = role?.is_system === true;

  return (
    <AuthContext.Provider value={{ user, profile, role, permissions, isMasterAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Check page permission. Master admin always passes. */
export function usePermission(pageKey: string, action: 'view' | 'edit' | 'delete' = 'view') {
  const { permissions, isMasterAdmin } = useAuth();
  if (isMasterAdmin) return true;
  const p = permissions[pageKey];
  if (!p || p.is_locked) return false;
  if (action === 'edit') return p.can_edit;
  if (action === 'delete') return p.can_delete;
  return p.can_view;
}
