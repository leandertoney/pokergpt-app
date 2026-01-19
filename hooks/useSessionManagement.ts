import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { Session, SuggestedSession, CreateSessionPayload, UpdateSessionPayload } from '@/types/session';
import type { StoredHand } from '@/types/poker';
import {
  getSessionHistory,
  createSessionWithMetadata,
  updateSessionMetadata,
  deleteSession as deleteSessionStorage,
  addHandsToSession as addHandsStorage,
  removeHandsFromSession as removeHandsStorage,
  getOrphanedHands as getOrphanedHandsStorage,
  getSuggestedSessions,
  saveSuggestedSessions,
  dismissSuggestion as dismissSuggestionStorage,
  getHandHistory,
} from '@/services/storageService';

// Time threshold for auto-detection (4 hours in milliseconds)
const SESSION_TIME_THRESHOLD = 4 * 60 * 60 * 1000;
// Maximum session duration (12 hours)
const MAX_SESSION_DURATION = 12 * 60 * 60 * 1000;

export interface UseSessionManagementReturn {
  // State
  sessions: Session[];
  isLoading: boolean;
  suggestedSessions: SuggestedSession[];
  orphanedHands: StoredHand[];
  allHands: StoredHand[];

  // Actions
  createSession: (payload: CreateSessionPayload) => Promise<Session | null>;
  updateSession: (sessionId: string, updates: UpdateSessionPayload) => Promise<boolean>;
  deleteSession: (sessionId: string) => Promise<void>;
  addHandsToSession: (sessionId: string, handIds: string[]) => Promise<{ success: boolean; conflicts: string[] }>;
  removeHandsFromSession: (sessionId: string, handIds: string[]) => Promise<void>;

  // Auto-suggestion actions
  detectSessions: () => Promise<void>;
  createFromSuggestion: (suggestionId: string) => Promise<Session | null>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;

  // Utilities
  refresh: () => Promise<void>;
  getHandsForSession: (sessionId: string) => StoredHand[];
  getSessionById: (sessionId: string) => Session | undefined;
}

export function useSessionManagement(): UseSessionManagementReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [suggestedSessions, setSuggestedSessions] = useState<SuggestedSession[]>([]);
  const [orphanedHands, setOrphanedHands] = useState<StoredHand[]>([]);
  const [allHands, setAllHands] = useState<StoredHand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sessionsData, suggestionsData, handsData, orphanedData] = await Promise.all([
        getSessionHistory(),
        getSuggestedSessions(),
        getHandHistory(),
        getOrphanedHandsStorage(),
      ]);
      setSessions(sessionsData);
      setSuggestedSessions(suggestionsData.filter(s => !s.dismissed));
      setAllHands(handsData);
      setOrphanedHands(orphanedData);
    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount and focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Create a new session
  const createSession = useCallback(async (payload: CreateSessionPayload): Promise<Session | null> => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const session = await createSessionWithMetadata(payload);
      await loadData();
      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return null;
    }
  }, [loadData]);

  // Update a session
  const updateSession = useCallback(async (
    sessionId: string,
    updates: UpdateSessionPayload
  ): Promise<boolean> => {
    try {
      const result = await updateSessionMetadata(sessionId, updates);
      if (result) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadData();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating session:', error);
      return false;
    }
  }, [loadData]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      // First, get the session to unlink hands
      const session = sessions.find(s => s.id === sessionId);
      if (session?.handIds.length) {
        await removeHandsStorage(sessionId, session.handIds);
      }
      await deleteSessionStorage(sessionId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }, [sessions, loadData]);

  // Add hands to session
  const addHandsToSession = useCallback(async (
    sessionId: string,
    handIds: string[]
  ): Promise<{ success: boolean; conflicts: string[] }> => {
    const result = await addHandsStorage(sessionId, handIds);
    if (result.success) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loadData();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    return result;
  }, [loadData]);

  // Remove hands from session
  const removeHandsFromSession = useCallback(async (
    sessionId: string,
    handIds: string[]
  ): Promise<void> => {
    await removeHandsStorage(sessionId, handIds);
    await loadData();
  }, [loadData]);

  // Auto-detect sessions from orphaned hands
  const detectSessions = useCallback(async (): Promise<void> => {
    if (orphanedHands.length < 2) return;

    // Sort hands by timestamp
    const sortedHands = [...orphanedHands].sort((a, b) => {
      const timeA = a.handData.timestamp || a.timestamp;
      const timeB = b.handData.timestamp || b.timestamp;
      return timeA - timeB;
    });

    const suggestions: SuggestedSession[] = [];
    let currentGroup: StoredHand[] = [];
    let groupStartTime = 0;

    for (const hand of sortedHands) {
      const handTime = hand.handData.timestamp || hand.timestamp;

      if (currentGroup.length === 0) {
        currentGroup.push(hand);
        groupStartTime = handTime;
      } else {
        const timeSinceGroupStart = handTime - groupStartTime;
        const lastHandTime = currentGroup[currentGroup.length - 1].handData.timestamp ||
          currentGroup[currentGroup.length - 1].timestamp;
        const timeSinceLastHand = handTime - lastHandTime;

        // If within 4 hours of last hand AND total group is under 12 hours
        if (timeSinceLastHand <= SESSION_TIME_THRESHOLD && timeSinceGroupStart <= MAX_SESSION_DURATION) {
          currentGroup.push(hand);
        } else {
          // Save current group if it has 2+ hands
          if (currentGroup.length >= 2) {
            const handIds = currentGroup
              .map(h => h.handData.id)
              .filter((id): id is string => !!id);

            const firstTime = currentGroup[0].handData.timestamp || currentGroup[0].timestamp;
            const lastTime = currentGroup[currentGroup.length - 1].handData.timestamp ||
              currentGroup[currentGroup.length - 1].timestamp;

            suggestions.push({
              id: `suggestion-${Date.now()}-${suggestions.length}`,
              handIds,
              estimatedStartTime: firstTime,
              estimatedEndTime: lastTime,
              dismissed: false,
            });
          }
          // Start new group
          currentGroup = [hand];
          groupStartTime = handTime;
        }
      }
    }

    // Don't forget the last group
    if (currentGroup.length >= 2) {
      const handIds = currentGroup
        .map(h => h.handData.id)
        .filter((id): id is string => !!id);

      const firstTime = currentGroup[0].handData.timestamp || currentGroup[0].timestamp;
      const lastTime = currentGroup[currentGroup.length - 1].handData.timestamp ||
        currentGroup[currentGroup.length - 1].timestamp;

      suggestions.push({
        id: `suggestion-${Date.now()}-${suggestions.length}`,
        handIds,
        estimatedStartTime: firstTime,
        estimatedEndTime: lastTime,
        dismissed: false,
      });
    }

    // Merge with existing suggestions, avoiding duplicates
    const existingSuggestions = await getSuggestedSessions();
    const existingHandSets = existingSuggestions.map(s => new Set(s.handIds));

    const newSuggestions = suggestions.filter(s => {
      const handSet = new Set(s.handIds);
      return !existingHandSets.some(existing =>
        s.handIds.every(id => existing.has(id)) && s.handIds.length === existing.size
      );
    });

    if (newSuggestions.length > 0) {
      await saveSuggestedSessions([...existingSuggestions, ...newSuggestions]);
      setSuggestedSessions(prev => [...prev, ...newSuggestions]);
    }
  }, [orphanedHands]);

  // Create session from suggestion
  const createFromSuggestion = useCallback(async (suggestionId: string): Promise<Session | null> => {
    const suggestion = suggestedSessions.find(s => s.id === suggestionId);
    if (!suggestion) return null;

    const session = await createSession({
      handIds: suggestion.handIds,
      isAutoSuggested: true,
    } as CreateSessionPayload);

    if (session) {
      // Mark suggestion as converted
      const suggestions = await getSuggestedSessions();
      const updated = suggestions.map(s =>
        s.id === suggestionId ? { ...s, createdAsSessionId: session.id, dismissed: true } : s
      );
      await saveSuggestedSessions(updated);
      setSuggestedSessions(prev => prev.filter(s => s.id !== suggestionId));
    }

    return session;
  }, [suggestedSessions, createSession]);

  // Dismiss suggestion
  const dismissSuggestion = useCallback(async (suggestionId: string): Promise<void> => {
    await dismissSuggestionStorage(suggestionId);
    setSuggestedSessions(prev => prev.filter(s => s.id !== suggestionId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Get hands for a specific session (from cached data)
  const getHandsForSession = useCallback((sessionId: string): StoredHand[] => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return [];

    return allHands.filter(h => h.handData.id && session.handIds.includes(h.handData.id));
  }, [sessions, allHands]);

  // Get session by ID
  const getSessionById = useCallback((sessionId: string): Session | undefined => {
    return sessions.find(s => s.id === sessionId);
  }, [sessions]);

  return {
    sessions,
    isLoading,
    suggestedSessions,
    orphanedHands,
    allHands,
    createSession,
    updateSession,
    deleteSession,
    addHandsToSession,
    removeHandsFromSession,
    detectSessions,
    createFromSuggestion,
    dismissSuggestion,
    refresh: loadData,
    getHandsForSession,
    getSessionById,
  };
}
