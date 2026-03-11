import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../db/supabase';
import * as api from '../db/api';
import type { Profile, UserRole } from '../db/types';
import { getPasswordResetRedirectUrl } from './passwordReset';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: string | null }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: string | null }>;
  requestPasswordReset: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    for (const delayMs of [0, 250, 500, 1000]) {
      if (delayMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }

      const nextProfile = await api.getCurrentProfile();
      if (nextProfile) {
        setProfile(nextProfile);
        return;
      }
    }

    setProfile(null);
  }, []);

  useEffect(() => {
    let active = true;

    const syncSession = async (nextSession: Session | null) => {
      if (!active) return;

      setLoading(true);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      try {
        await loadProfile(nextSession?.user ?? null);
      } catch (error) {
        console.error('Failed to load profile:', error);
        if (active) {
          setProfile(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      void syncSession(s);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      void syncSession(s);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    return { error: error?.message ?? null };
  };

  const sendPasswordResetEmail = async (email: string) => {
    const redirectTo =
      typeof window !== 'undefined' ? getPasswordResetRedirectUrl(window.location.origin) : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined
    );

    return { error: error?.message ?? null };
  };

  const requestPasswordReset = async () => {
    if (!user?.email) {
      return { error: 'No email found for this account.' };
    }

    return sendPasswordResetEmail(user.email);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const role = profile?.role ?? null;
  const isAdmin = role === 'Admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin,
        loading,
        signIn,
        signUp,
        sendPasswordResetEmail,
        requestPasswordReset,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
