import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HandData, AnalysisResult, StoredHand, UserTier, UserIdentity } from '@/types/poker';
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
    const userTier = await getUserTier();
    
    const newHand: StoredHand = {
      handData,
      analysis,
      timestamp: Date.now(),
    };
    
    hands.unshift(newHand);
    
    if (userTier === 'free' && hands.length > MAX_FREE_HANDS) {
      hands.splice(MAX_FREE_HANDS);
    }
    
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
import type { Session, ActiveSession, SessionPreferences } from '@/types/session';

const SESSIONS_STORAGE_KEY = '@poker_sessions';
const ACTIVE_SESSION_KEY = '@active_session';
const SESSION_PREFERENCES_KEY = '@session_preferences';

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

const FAVORITES_STORAGE_KEY = '@poker_favorites';

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
