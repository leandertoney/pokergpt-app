import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session?.user,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          isLoading: false,
          isAuthenticated: !!session?.user,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      // Check for network errors
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      if (errorMessage.includes('Network request failed')) {
        return { error: new Error('Unable to connect. Please check your internet connection and try again.') };
      }
      return { error: new Error(errorMessage) };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      // Check for network errors
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      if (errorMessage.includes('Network request failed')) {
        return { error: new Error('Unable to connect. Please check your internet connection and try again.') };
      }
      return { error: new Error(errorMessage) };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Password reset failed') };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
