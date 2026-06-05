import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type Role = 'member' | 'admin' | 'master_admin' | null;

interface UserProfile {
  name: string;
  email: string;
  role: Role;
  status: 'pending' | 'active' | 'inactive';
  [key: string]: any;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data as UserProfile | null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    try { sessionStorage.removeItem('lr_no_persist'); } catch {}
  };

  useEffect(() => {
    // If user chose not to remember, clear session on fresh tab/browser open.
    // sessionStorage is cleared when all tabs of the origin close.
    const noP = sessionStorage.getItem('lr_no_persist');
    const rem = localStorage.getItem('lr_remember');
    if (noP === '1' || rem !== '1') {
      // Check if this is a fresh browser session (no sessionStorage continuity)
      const alive = sessionStorage.getItem('lr_tab_alive');
      if (!alive && rem !== '1') {
        // Fresh browser open + not remembered → clear persisted Supabase session
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
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
