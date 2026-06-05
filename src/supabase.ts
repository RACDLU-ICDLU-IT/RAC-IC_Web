import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,         // save session to localStorage
      storageKey: 'sb-session',     // explicit key
      autoRefreshToken: true,       // refresh before expiry
      detectSessionInUrl: true,     // handle magic link / OAuth redirects
    },
  }
);
