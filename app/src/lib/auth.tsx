import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from './supabase';

type AuthState = {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(!isSupabaseConfigured);
  // Kết quả kiểm tra quyền admin, gắn với user id đã kiểm tra.
  const [adminCheck, setAdminCheck] = useState<{ uid: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured || !uid) return;
    let cancelled = false;
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAdminCheck({ uid, isAdmin: Boolean(data) });
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const isDemo = !isSupabaseConfigured;
  // Chế độ demo: đăng nhập bằng email/mật khẩu bất kỳ đều thành admin.
  const isAdmin = isDemo ? Boolean(session) : Boolean(uid && adminCheck?.uid === uid && adminCheck.isAdmin);
  const loading = isDemo ? false : !sessionLoaded || Boolean(uid && adminCheck?.uid !== uid);

  const signIn = async (email: string, password: string) => {
    if (isDemo) {
      setSession({ user: { id: 'demo-admin', email: email.trim() } } as Session);
      return null;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? 'Sai email hoặc mật khẩu.' : null;
  };

  const signOut = async () => {
    if (isDemo) return setSession(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
