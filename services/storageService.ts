import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HandData, AnalysisResult, StoredHand, UserTier, UserIdentity, OnboardingProfile } from '@/types/poker';
import { MAX_FREE_HANDS } from '@/types/poker';
import type { PaywallState, GoalConfirmation } from '@/types/paywall';
import { DEFAULT_PAYWALL_STATE } from '@/types/paywall';
import type { ChatConversation, ChatMessage } from '@/types/chat';

const HANDS_STORAGE_KEY = '@poker_hands';
const USER_TIER_KEY = '@user_tier';
const USER_IDENTITY_KEY = '@user_identity';
const USER_DISPLAY_NAME_KEY = '@user_display_name';
const PAYWALL_STATE_KEY = '@paywall_state';
const GOAL_CONFIRMATION_KEY = '@goal_confirmation';
const CHATS_STORAGE_KEY = '@poker_chats';

export async function storeHand(handData: HandData, analysis: AnalysisResult): Promise<void> {
  try {
    const hands = await getHandHistory();

    const newHand: StoredHand = {
      handData,
      analysis,
      timestamp: Date.now(),
    };

    hands.unshift(newHand);

    // Note: Free tier limit is now enforced BEFORE calling storeHand via canSaveHand()
    // No auto-pruning - if a hand gets here, it's allowed to be saved

    await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(hands));
    console.log('Hand stored successfully');
  } catch (error) {
    console.error('Error storing hand:', error);
  }
}

export async function getHandHistory(): Promise<StoredHand[]> {
  try {
    const stored = await AsyncStorage.getItem(HANDS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting hand history:', error);
    return [];
  }
}

export async function pruneHistory(userTier: UserTier): Promise<void> {
  try {
    if (userTier === 'free') {
      const hands = await getHandHistory();
      if (hands.length > MAX_FREE_HANDS) {
        hands.splice(MAX_FREE_HANDS);
        await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(hands));
      }
    }
  } catch (error) {
    console.error('Error pruning history:', error);
  }
}

export async function getUserTier(): Promise<UserTier> {
  try {
    const tier = await AsyncStorage.getItem(USER_TIER_KEY);
    return (tier as UserTier) || 'free';
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'free';
  }
}

export async function setUserTier(tier: UserTier): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_TIER_KEY, tier);
  } catch (error) {
    console.error('Error setting user tier:', error);
  }
}

// Check if user can save a hand (free tier limit check)
export async function canSaveHand(): Promise<{ allowed: boolean; currentCount: number }> {
  const userTier = await getUserTier();
  if (userTier === 'paid') {
    return { allowed: true, currentCount: 0 };
  }

  const hands = await getHandHistory();
  return {
    allowed: hands.length < MAX_FREE_HANDS,
    currentCount: hands.length,
  };
}

// Check if user can use sessions (Pro-only feature)
export async function canUseSessions(): Promise<boolean> {
  const userTier = await getUserTier();
  return userTier === 'paid';
}

export async function deleteHand(handId: string): Promise<void> {
  try {
    const hands = await getHandHistory();
    const filtered = hands.filter(h => h.handData.id !== handId);
    await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting hand:', error);
  }
}

export async function clearAllHands(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HANDS_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing hands:', error);
  }
}

// Identity-Anchored Conversion Flow™ Storage
export async function getUserIdentity(): Promise<UserIdentity | null> {
  try {
    const stored = await AsyncStorage.getItem(USER_IDENTITY_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error getting user identity:', error);
    return null;
  }
}

export async function setUserIdentity(identity: UserIdentity): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_IDENTITY_KEY, JSON.stringify(identity));
  } catch (error) {
    console.error('Error setting user identity:', error);
  }
}

export async function clearUserIdentity(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_IDENTITY_KEY);
  } catch (error) {
    console.error('Error clearing user identity:', error);
  }
}

// Display Name Storage
export async function getUserDisplayName(): Promise<string | null> {
  try {
    const name = await AsyncStorage.getItem(USER_DISPLAY_NAME_KEY);
    return name;
  } catch (error) {
    console.error('Error getting user display name:', error);
    return null;
  }
}

export async function setUserDisplayName(name: string | null): Promise<void> {
  try {
    if (name) {
      await AsyncStorage.setItem(USER_DISPLAY_NAME_KEY, name);
    } else {
      await AsyncStorage.removeItem(USER_DISPLAY_NAME_KEY);
    }
  } catch (error) {
    console.error('Error setting user display name:', error);
  }
}

export async function clearUserDisplayName(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_DISPLAY_NAME_KEY);
  } catch (error) {
    console.error('Error clearing user display name:', error);
  }
}

// Session Tracking Storage
import type { Session, ActiveSession, SessionPreferences, SuggestedSession, CreateSessionPayload, UpdateSessionPayload } from '@/types/session';

const SESSIONS_STORAGE_KEY = '@poker_sessions';
const ACTIVE_SESSION_KEY = '@active_session';
const SESSION_PREFERENCES_KEY = '@session_preferences';
const SUGGESTED_SESSIONS_KEY = '@suggested_sessions';

// Get all completed sessions
export async function getSessionHistory(): Promise<Session[]> {
  try {
    const stored = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting session history:', error);
    return [];
  }
}

// Get the currently active session (if any)
export async function getActiveSession(): Promise<ActiveSession | null> {
  try {
    const stored = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
}

// Start a new session
export async function startSession(): Promise<ActiveSession> {
  const session: ActiveSession = {
    id: `session-${Date.now()}`,
    startTime: Date.now(),
    handIds: [],
    chatIds: [],
  };

  try {
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    console.log('Session started:', session.id);
    return session;
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

// Update active session (e.g., add stakes, buy-in)
export async function updateActiveSession(updates: Partial<ActiveSession>): Promise<ActiveSession | null> {
  try {
    const current = await getActiveSession();
    if (!current) return null;

    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error updating active session:', error);
    return null;
  }
}

// Link a hand to the active session
export async function linkHandToSession(handId: string): Promise<void> {
  try {
    const session = await getActiveSession();
    if (!session) return;

    if (!session.handIds.includes(handId)) {
      session.handIds.push(handId);
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      console.log('Hand linked to session:', handId);
    }
  } catch (error) {
    console.error('Error linking hand to session:', error);
  }
}

// End the active session and save it to history
export async function endSession(result: number): Promise<Session | null> {
  try {
    const active = await getActiveSession();
    if (!active) return null;

    const completedSession: Session = {
      ...active,
      endTime: Date.now(),
      result,
    };

    // Add to session history
    const sessions = await getSessionHistory();
    sessions.unshift(completedSession);
    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));

    // Clear active session
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);

    // Save preferences for next time
    if (active.stakes || active.buyIn) {
      await setSessionPreferences({
        lastStakes: active.stakes,
        lastCustomStakes: active.customStakes,
        lastBuyIn: active.buyIn,
      });
    }

    console.log('Session ended:', completedSession.id, 'Result:', result);
    return completedSession;
  } catch (error) {
    console.error('Error ending session:', error);
    return null;
  }
}

// Cancel active session without saving
export async function cancelSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
    console.log('Session cancelled');
  } catch (error) {
    console.error('Error cancelling session:', error);
  }
}

// Get session preferences (last used stakes, buy-in)
export async function getSessionPreferences(): Promise<SessionPreferences> {
  try {
    const stored = await AsyncStorage.getItem(SESSION_PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error getting session preferences:', error);
    return {};
  }
}

// Save session preferences
export async function setSessionPreferences(prefs: SessionPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Error setting session preferences:', error);
  }
}

// Get a specific session by ID
export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const sessions = await getSessionHistory();
    return sessions.find(s => s.id === sessionId) || null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Delete a session
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const sessions = await getSessionHistory();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting session:', error);
  }
}

// ============================================
// Enhanced Session Management Functions
// ============================================

// Create a new session with metadata
export async function createSessionWithMetadata(payload: CreateSessionPayload): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    id: `session-${now}`,
    name: payload.name,
    startTime: now,
    stakes: payload.stakes,
    customStakes: payload.customStakes,
    buyIn: payload.buyIn,
    location: payload.location,
    tableType: payload.tableType,
    notes: payload.notes,
    handIds: payload.handIds || [],
    chatIds: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const sessions = await getSessionHistory();
    sessions.unshift(session);
    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));

    // Link hands to this session
    if (payload.handIds?.length) {
      await linkHandsToSessionById(payload.handIds, session.id);
    }

    console.log('Session created:', session.id);
    return session;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

// Update an existing session
export async function updateSessionMetadata(
  sessionId: string,
  updates: UpdateSessionPayload
): Promise<Session | null> {
  try {
    const sessions = await getSessionHistory();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index === -1) return null;

    sessions[index] = {
      ...sessions[index],
      ...updates,
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    console.log('Session updated:', sessionId);
    return sessions[index];
  } catch (error) {
    console.error('Error updating session:', error);
    return null;
  }
}

// Add hands to a session (with exclusivity check)
export async function addHandsToSession(
  sessionId: string,
  handIds: string[]
): Promise<{ success: boolean; conflicts: string[] }> {
  try {
    const sessions = await getSessionHistory();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return { success: false, conflicts: [] };

    // Check for conflicts (hands already in other sessions)
    const conflicts: string[] = [];
    for (const handId of handIds) {
      const existingSession = sessions.find(
        s => s.id !== sessionId && s.handIds.includes(handId)
      );
      if (existingSession) {
        conflicts.push(handId);
      }
    }

    if (conflicts.length > 0) {
      return { success: false, conflicts };
    }

    // Add hands to session
    const newHandIds = [...new Set([...session.handIds, ...handIds])];
    await updateSessionMetadata(sessionId, { handIds: newHandIds });

    // Update hand records with sessionId
    await linkHandsToSessionById(handIds, sessionId);

    console.log('Hands added to session:', sessionId, handIds);
    return { success: true, conflicts: [] };
  } catch (error) {
    console.error('Error adding hands to session:', error);
    return { success: false, conflicts: [] };
  }
}

// Remove hands from a session
export async function removeHandsFromSession(
  sessionId: string,
  handIds: string[]
): Promise<void> {
  try {
    const sessions = await getSessionHistory();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const filteredHandIds = session.handIds.filter(id => !handIds.includes(id));
    await updateSessionMetadata(sessionId, { handIds: filteredHandIds });

    // Clear sessionId from hand records
    await unlinkHandsFromSession(handIds);
    console.log('Hands removed from session:', sessionId, handIds);
  } catch (error) {
    console.error('Error removing hands from session:', error);
  }
}

// Get hands not assigned to any session
export async function getOrphanedHands(): Promise<StoredHand[]> {
  try {
    const [allHands, sessions] = await Promise.all([
      getHandHistory(),
      getSessionHistory(),
    ]);

    const assignedHandIds = new Set(sessions.flatMap(s => s.handIds));

    return allHands.filter(h => h.handData.id && !assignedHandIds.has(h.handData.id));
  } catch (error) {
    console.error('Error getting orphaned hands:', error);
    return [];
  }
}

// Link hands to session (update hand records with sessionId)
async function linkHandsToSessionById(handIds: string[], sessionId: string): Promise<void> {
  try {
    const hands = await getHandHistory();
    const updated = hands.map(h => {
      if (h.handData.id && handIds.includes(h.handData.id)) {
        return { ...h, handData: { ...h.handData, sessionId } };
      }
      return h;
    });
    await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error linking hands to session:', error);
  }
}

// Unlink hands from session (remove sessionId from hand records)
async function unlinkHandsFromSession(handIds: string[]): Promise<void> {
  try {
    const hands = await getHandHistory();
    const updated = hands.map(h => {
      if (h.handData.id && handIds.includes(h.handData.id)) {
        const { sessionId, ...restHandData } = h.handData;
        return { ...h, handData: restHandData };
      }
      return h;
    });
    await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error unlinking hands from session:', error);
  }
}

// ============================================
// Session Suggestion Functions
// ============================================

// Get all suggested sessions
export async function getSuggestedSessions(): Promise<SuggestedSession[]> {
  try {
    const stored = await AsyncStorage.getItem(SUGGESTED_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting suggested sessions:', error);
    return [];
  }
}

// Save suggested sessions
export async function saveSuggestedSessions(suggestions: SuggestedSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SUGGESTED_SESSIONS_KEY, JSON.stringify(suggestions));
  } catch (error) {
    console.error('Error saving suggested sessions:', error);
  }
}

// Dismiss a suggestion
export async function dismissSuggestion(suggestionId: string): Promise<void> {
  try {
    const suggestions = await getSuggestedSessions();
    const updated = suggestions.map(s =>
      s.id === suggestionId ? { ...s, dismissed: true } : s
    );
    await saveSuggestedSessions(updated);
    console.log('Suggestion dismissed:', suggestionId);
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
  }
}

// Clear all suggestions
export async function clearSuggestedSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SUGGESTED_SESSIONS_KEY);
    console.log('All suggestions cleared');
  } catch (error) {
    console.error('Error clearing suggestions:', error);
  }
}

// Paywall State Storage
export async function getPaywallState(): Promise<PaywallState> {
  try {
    const stored = await AsyncStorage.getItem(PAYWALL_STATE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PAYWALL_STATE;
  } catch (error) {
    console.error('Error getting paywall state:', error);
    return DEFAULT_PAYWALL_STATE;
  }
}

export async function setPaywallState(updates: Partial<PaywallState>): Promise<void> {
  try {
    const current = await getPaywallState();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(PAYWALL_STATE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error setting paywall state:', error);
  }
}

export async function resetPaywallState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PAYWALL_STATE_KEY);
  } catch (error) {
    console.error('Error resetting paywall state:', error);
  }
}

// Goal Confirmation Storage
export async function getGoalConfirmation(): Promise<GoalConfirmation | null> {
  try {
    const stored = await AsyncStorage.getItem(GOAL_CONFIRMATION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error getting goal confirmation:', error);
    return null;
  }
}

export async function setGoalConfirmation(confirmation: GoalConfirmation): Promise<void> {
  try {
    await AsyncStorage.setItem(GOAL_CONFIRMATION_KEY, JSON.stringify(confirmation));
    await setPaywallState({ goalConfirmedAt: confirmation.timestamp });
  } catch (error) {
    console.error('Error setting goal confirmation:', error);
  }
}

// Helper to check if special offer should be shown
export async function shouldShowSpecialOffer(): Promise<boolean> {
  try {
    const state = await getPaywallState();
    return state.hasSkippedPaywall && !state.specialOfferShown;
  } catch (error) {
    console.error('Error checking special offer:', error);
    return false;
  }
}

// Mark special offer as shown
export async function markSpecialOfferShown(): Promise<void> {
  try {
    await setPaywallState({ specialOfferShown: true });
  } catch (error) {
    console.error('Error marking special offer shown:', error);
  }
}

// ============================================
// Chat Persistence Storage
// ============================================

// Generate a title from the first user message
function generateChatTitle(content: string): string {
  // Remove common filler words to get the essence
  const cleaned = content
    .replace(/^(I |I'm |I'm |I've |I've |I had |I was |I have |So |Well |Okay |Um |Uh |Hey |Hi )/i, '')
    .trim();

  // Truncate to ~40 chars at word boundary
  if (cleaned.length <= 40) return cleaned;

  const truncated = cleaned.slice(0, 40);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

// Get all chat conversations
export async function getChatHistory(): Promise<ChatConversation[]> {
  try {
    const stored = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
}

// Get a single chat by ID
export async function getChat(chatId: string): Promise<ChatConversation | null> {
  try {
    const chats = await getChatHistory();
    return chats.find((c) => c.id === chatId) || null;
  } catch (error) {
    console.error('Error getting chat:', error);
    return null;
  }
}

// Create a new chat conversation
export async function createChat(
  initialMessage: ChatMessage,
  sessionId?: string
): Promise<ChatConversation> {
  const chat: ChatConversation = {
    id: `chat-${Date.now()}`,
    sessionId,
    title: generateChatTitle(initialMessage.content),
    messages: [initialMessage],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 1,
    preview: initialMessage.content.slice(0, 100),
  };

  try {
    const chats = await getChatHistory();
    chats.unshift(chat);
    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    console.log('Chat created:', chat.id);
    return chat;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

// Update an existing chat (add messages)
export async function updateChat(
  chatId: string,
  newMessages: ChatMessage[]
): Promise<ChatConversation | null> {
  try {
    const chats = await getChatHistory();
    const index = chats.findIndex((c) => c.id === chatId);
    if (index === -1) return null;

    chats[index].messages.push(...newMessages);
    chats[index].updatedAt = Date.now();
    chats[index].messageCount = chats[index].messages.length;

    // Update title if it was auto-generated placeholder and we have user content
    if (chats[index].title === 'New Chat' && newMessages.length > 0) {
      const firstUserMsg = chats[index].messages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        chats[index].title = generateChatTitle(firstUserMsg.content);
        chats[index].preview = firstUserMsg.content.slice(0, 100);
      }
    }

    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
    return chats[index];
  } catch (error) {
    console.error('Error updating chat:', error);
    return null;
  }
}

// Delete a chat
export async function deleteChat(chatId: string): Promise<void> {
  try {
    const chats = await getChatHistory();
    const filtered = chats.filter((c) => c.id !== chatId);
    await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(filtered));
    console.log('Chat deleted:', chatId);
  } catch (error) {
    console.error('Error deleting chat:', error);
  }
}

// Link a chat to the active session
export async function linkChatToSession(chatId: string): Promise<void> {
  try {
    const session = await getActiveSession();
    if (!session) return;

    // Handle migration: ensure chatIds exists
    if (!session.chatIds) {
      session.chatIds = [];
    }

    if (!session.chatIds.includes(chatId)) {
      session.chatIds.push(chatId);
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      console.log('Chat linked to session:', chatId);
    }
  } catch (error) {
    console.error('Error linking chat to session:', error);
  }
}

// Clear all chats (for testing/reset)
export async function clearAllChats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHATS_STORAGE_KEY);
    console.log('All chats cleared');
  } catch (error) {
    console.error('Error clearing chats:', error);
  }
}

// ============================================
// Favorites Storage
// ============================================

import type { FavoriteItem } from '@/types/favorites';
import type { VoiceSettings } from '@/types/voice';
import { DEFAULT_VOICE_SETTINGS } from '@/types/voice';

const FAVORITES_STORAGE_KEY = '@poker_favorites';
const VOICE_SETTINGS_KEY = '@voice_settings';
const ONBOARDING_PROFILE_KEY = '@onboarding_profile';

// Get all favorites
export async function getFavorites(): Promise<FavoriteItem[]> {
  try {
    const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

// Add a favorite
export async function addFavorite(id: string, type: 'hand' | 'chat'): Promise<void> {
  try {
    const favorites = await getFavorites();

    // Check if already favorited
    const exists = favorites.some(f => f.id === id && f.type === type);
    if (exists) return;

    const newFavorite: FavoriteItem = {
      id,
      type,
      favoritedAt: Date.now(),
    };

    favorites.unshift(newFavorite);
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    console.log('Favorite added:', id, type);
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
}

// Remove a favorite
export async function removeFavorite(id: string, type: 'hand' | 'chat'): Promise<void> {
  try {
    const favorites = await getFavorites();
    const filtered = favorites.filter(f => !(f.id === id && f.type === type));
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(filtered));
    console.log('Favorite removed:', id, type);
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
}

// Check if item is favorited
export async function isFavorited(id: string, type: 'hand' | 'chat'): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    return favorites.some(f => f.id === id && f.type === type);
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
}

// Clear all favorites
export async function clearAllFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FAVORITES_STORAGE_KEY);
    console.log('All favorites cleared');
  } catch (error) {
    console.error('Error clearing favorites:', error);
  }
}

// ============================================
// Voice Settings Storage
// ============================================

// Get voice settings
export async function getVoiceSettings(): Promise<VoiceSettings> {
  try {
    const stored = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
    return stored ? { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) } : DEFAULT_VOICE_SETTINGS;
  } catch (error) {
    console.error('Error getting voice settings:', error);
    return DEFAULT_VOICE_SETTINGS;
  }
}

// Set voice settings (partial updates supported)
export async function setVoiceSettings(updates: Partial<VoiceSettings>): Promise<void> {
  try {
    const current = await getVoiceSettings();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(updated));
    console.log('Voice settings saved');
  } catch (error) {
    console.error('Error setting voice settings:', error);
  }
}

// Clear voice settings (reset to defaults)
export async function clearVoiceSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(VOICE_SETTINGS_KEY);
    console.log('Voice settings cleared');
  } catch (error) {
    console.error('Error clearing voice settings:', error);
  }
}

// ============================================
// Onboarding Profile Storage
// ============================================

export async function getOnboardingProfile(): Promise<OnboardingProfile | null> {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error getting onboarding profile:', error);
    return null;
  }
}

export async function setOnboardingProfile(profile: OnboardingProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error setting onboarding profile:', error);
  }
}
