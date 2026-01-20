import { useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import type { ActiveSession, Stakes, SessionPreferences, Session } from '@/types/session';
import { formatElapsedTime } from '@/types/session';
import {
  getActiveSession,
  startSession as startSessionStorage,
  updateActiveSession,
  endSession as endSessionStorage,
  cancelSession as cancelSessionStorage,
  linkHandToSession as linkHandStorage,
  getSessionPreferences,
  getSessionHistory,
  canUseSessions,
} from '@/services/storageService';

export interface UseSessionReturn {
  // State
  activeSession: ActiveSession | null;
  isLoading: boolean;
  elapsedTime: string;
  elapsedMs: number;
  preferences: SessionPreferences;
  sessionHistory: Session[];

  // Actions
  startSession: () => Promise<boolean>; // Returns false if blocked (Pro feature)
  endSession: (result: number) => Promise<Session | null>;
  cancelSession: () => Promise<void>;
  updateSession: (updates: Partial<ActiveSession>) => Promise<void>;
  linkHand: (handId: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [preferences, setPreferences] = useState<SessionPreferences>({});
  const [sessionHistory, setSessionHistory] = useState<Session[]>([]);

  // Load active session and preferences on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const [session, prefs, history] = await Promise.all([
          getActiveSession(),
          getSessionPreferences(),
          getSessionHistory(),
        ]);
        setActiveSession(session);
        setPreferences(prefs);
        setSessionHistory(history);
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  // Timer effect - updates every second when session is active
  useEffect(() => {
    if (!activeSession) {
      setElapsedMs(0);
      return;
    }

    // Set initial elapsed time
    setElapsedMs(Date.now() - activeSession.startTime);

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - activeSession.startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Format elapsed time for display
  const elapsedTime = formatElapsedTime(elapsedMs);

  // Start a new session (Pro feature only)
  const startSession = useCallback(async (): Promise<boolean> => {
    try {
      // Check if user can use sessions (Pro feature)
      const canUse = await canUseSessions();
      if (!canUse) {
        console.log('Sessions are a Pro feature');
        return false; // Return false to indicate blocked
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const session = await startSessionStorage();
      setActiveSession(session);
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
  }, []);

  // End the current session
  const endSession = useCallback(async (result: number): Promise<Session | null> => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const completedSession = await endSessionStorage(result);
      setActiveSession(null);

      // Refresh history
      const history = await getSessionHistory();
      setSessionHistory(history);

      // Update preferences
      const prefs = await getSessionPreferences();
      setPreferences(prefs);

      return completedSession;
    } catch (error) {
      console.error('Error ending session:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return null;
    }
  }, []);

  // Cancel session without saving
  const cancelSession = useCallback(async () => {
    try {
      await cancelSessionStorage();
      setActiveSession(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error cancelling session:', error);
    }
  }, []);

  // Update session (stakes, buy-in, etc.)
  const updateSession = useCallback(async (updates: Partial<ActiveSession>) => {
    try {
      const updated = await updateActiveSession(updates);
      if (updated) {
        setActiveSession(updated);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }, []);

  // Link a hand to the current session
  const linkHand = useCallback(async (handId: string) => {
    if (!activeSession) return;
    try {
      await linkHandStorage(handId);
      // Update local state
      setActiveSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          handIds: [...prev.handIds, handId],
        };
      });
    } catch (error) {
      console.error('Error linking hand:', error);
    }
  }, [activeSession]);

  // Refresh session history
  const refreshHistory = useCallback(async () => {
    try {
      const history = await getSessionHistory();
      setSessionHistory(history);
    } catch (error) {
      console.error('Error refreshing history:', error);
    }
  }, []);

  return {
    activeSession,
    isLoading,
    elapsedTime,
    elapsedMs,
    preferences,
    sessionHistory,
    startSession,
    endSession,
    cancelSession,
    updateSession,
    linkHand,
    refreshHistory,
  };
}
