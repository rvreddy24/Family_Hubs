import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured as isSbCfg } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export type AuthRole = 'child' | 'admin' | 'provider';

interface SignInResult {
  error: string | null;
  needsConfirmation?: boolean;
}

interface AuthValue {
  session: Session | null;
  user: User | null;
  accessToken: string | null;
  isReady: boolean;
  signInWithPassword: (email: string, password: string) => Promise<SignInResult>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: AuthRole
  ) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  isSupabaseConfigured: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) {
    return {
      session: null,
      user: null,
      accessToken: null,
      isReady: true,
      signInWithPassword: async () => ({ error: 'AuthProvider not mounted' }),
      signUp: async () => ({ error: 'AuthProvider not mounted' }),
      signOut: async () => {},
      isSupabaseConfigured: isSbCfg(),
    } satisfies AuthValue;
  }
  return c;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(!isSbCfg());

  useEffect(() => {
    if (!supabase) {
      setIsReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      // #region agent log
      fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'baseline',hypothesisId:'H1',location:'src/context/AuthContext.tsx:62',message:'Auth getSession resolved',data:{hasSession:!!data.session,hasAccessToken:!!data.session?.access_token,userId:data.session?.user?.id? '(set)':null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setIsReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // #region agent log
      fetch('/api/__debug/log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'baseline',hypothesisId:'H1',location:'src/context/AuthContext.tsx:70',message:'Auth state change',data:{event:String(_event||''),hasSession:!!next,hasAccessToken:!!next?.access_token,userId:next?.user?.id? '(set)':null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      if (!supabase) {
        return { error: 'Supabase not configured; use local demo login.' };
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? error.message : null };
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      _role: AuthRole
    ): Promise<SignInResult> => {
      if (!supabase) {
        return { error: 'Supabase not configured; use local demo login.' };
      }
      // SECURITY: public sign-up always creates a "child" (family) account. Privileged
      // roles (admin, provider) live in app_metadata, which only the service-role key on
      // the server can write. The `_role` parameter is intentionally ignored here; the
      // caller in <AuthPage> already hard-codes 'child', and even if a malicious client
      // bypassed the form, app_metadata would remain unset → role check would fall
      // through to the default 'child'. Never put `role` in `data` (user_metadata).
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) return { error: error.message };
      const needsConfirmation = !data.session;
      return { error: null, needsConfirmation };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        accessToken: session?.access_token ?? null,
        isReady,
        signInWithPassword,
        signUp,
        signOut,
        isSupabaseConfigured: isSbCfg(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
