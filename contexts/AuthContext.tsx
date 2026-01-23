import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { migrateGuestDataToUser, type MigrationResult } from '@/services/syncService';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  migrationStatus: 'idle' | 'in_progress' | 'complete' | 'failed';
  lastMigrationResult: MigrationResult | null;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    migrationStatus: 'idle',
    lastMigrationResult: null,
  });

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        isLoading: false,
        isAuthenticated: !!session?.user,
        migrationStatus: 'idle',
        lastMigrationResult: null,
      });

      // Trigger migration for existing session (app restart with logged in user)
      if (session?.user) {
        console.log('Existing session found, triggering migration for user:', session.user.id);
        setState((prev) => ({ ...prev, migrationStatus: 'in_progress' }));

        try {
          const result = await migrateGuestDataToUser(session.user.id);
          console.log('Initial migration completed:', result);
          setState((prev) => ({
            ...prev,
            migrationStatus: result.success ? 'complete' : 'failed',
            lastMigrationResult: result,
          }));
        } catch (error) {
          console.error('Initial migration failed:', error);
          setState((prev) => ({
            ...prev,
            migrationStatus: 'failed',
            lastMigrationResult: null,
          }));
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          session,
          isLoading: false,
          isAuthenticated: !!session?.user,
        }));

        // Trigger migration when user signs in
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
          console.log('Auth state changed, triggering migration for user:', session.user.id);
          setState((prev) => ({ ...prev, migrationStatus: 'in_progress' }));

          try {
            const result = await migrateGuestDataToUser(session.user.id);
            console.log('Migration completed:', result);
            setState((prev) => ({
              ...prev,
              migrationStatus: result.success ? 'complete' : 'failed',
              lastMigrationResult: result,
            }));
          } catch (error) {
            console.error('Migration failed:', error);
            setState((prev) => ({
              ...prev,
              migrationStatus: 'failed',
              lastMigrationResult: null,
            }));
          }
        }
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
      migrationStatus: 'idle',
      lastMigrationResult: null,
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

  const deleteAccount = useCallback(async () => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const userId = state.user?.id;
    if (!userId) {
      return { error: new Error('No user logged in') };
    }

    try {
      // Delete user's data from database tables
      // Delete hands first (due to foreign key constraints)
      await supabase.from('hands').delete().eq('user_id', userId);

      // Delete chat sessions
      await supabase.from('chat_sessions').delete().eq('user_id', userId);

      // Delete any other user data here...

      // Sign out the user
      await supabase.auth.signOut();

      // Reset state
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        migrationStatus: 'idle',
        lastMigrationResult: null,
      });

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Account deletion failed';
      return { error: new Error(errorMessage) };
    }
  }, [state.user?.id]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPassword,
        deleteAccount,
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
