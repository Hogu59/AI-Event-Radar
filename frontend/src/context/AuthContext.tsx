'use client';

import * as React from 'react';
import { getBrowserSupabase } from '@/lib/supabase';

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const supa = getBrowserSupabase();
    if (!supa) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void supa.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? undefined,
          name: (data.user.user_metadata?.name as string | undefined) ?? undefined,
        });
      }
      setLoading(false);
    });
    const { data: sub } = supa.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
          name: (session.user.user_metadata?.name as string | undefined) ?? undefined,
        });
      } else {
        setUser(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    const supa = getBrowserSupabase();
    if (supa) await supa.auth.signOut();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
