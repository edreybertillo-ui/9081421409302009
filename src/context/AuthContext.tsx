import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchUserProfile, updateLastLogin, logAuditEvent, isInstitutionalEmail } from '../lib/auth';
import type { UserProfile, UserRole } from '../types';

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const p = await fetchUserProfile(session.user.id);
    setProfile(p);
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        if (session?.user?.id) {
          const p = await fetchUserProfile(session.user.id);
          setProfile(p);
          if (p) {
            await updateLastLogin(session.user.id);
            await logAuditEvent(p.email, 'Successful login', 'login', { method: 'sso' });
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isInstitutionalEmail(email)) {
      return { error: 'Only institutional email addresses (@institution.edu) are authorized to access this system.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await logAuditEvent(email, `Login failed - ${error.message}`, 'login_failed', { reason: error.message });
      return { error: error.message };
    }

    if (data.user) {
      const p = await fetchUserProfile(data.user.id);
      if (!p) {
        return { error: 'Profile not found. Please contact your administrator.' };
      }
      if (!p.active) {
        await logAuditEvent(email, 'Login failed - account disabled', 'login_failed', { reason: 'account_disabled' });
        await supabase.auth.signOut();
        return { error: 'Your account has been disabled. Please contact your administrator.' };
      }
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (profile?.email) {
      await logAuditEvent(profile.email, 'User signed out', 'logout', {});
    }
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, [profile]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRole(): UserRole | undefined {
  return useAuth().profile?.role;
}
