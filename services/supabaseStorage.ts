import { supabase, getVisitorId, getCurrentUserId, isSupabaseConfigured } from "@/lib/supabase";
import type { HandData, AnalysisResult, UserIdentity, StoredHand } from "@/types/poker";
import { MAX_FREE_HANDS } from "@/types/poker";
import type { Session } from "@/types/session";
import type { ChatConversation } from "@/types/chat";
import type { FavoriteItem } from "@/types/favorites";
import type { VoiceSettings } from "@/types/voice";
import type { SessionPreferences } from "@/types/session";
import { storeHand as storeHandLocally, deleteHand as deleteHandLocally } from "@/services/storageService";
import { scheduleHandFollowup } from "@/services/handFollowup";
import { trackAppEvent } from "@/services/appAnalytics";
import { creditReviewForToday } from "@/services/dailyReviewService";

interface User {
  id: string;
  visitor_id: string;
  auth_id: string | null;
  archetype: string | null;
  experience_level: string | null;
  primary_goal: string | null;
  biggest_challenge: string | null;
  tier: "free" | "paid";
  onboarding_complete: boolean;
  expo_push_token: string | null;
  push_token_updated_at: string | null;
  created_at: string;
}

export async function getOrCreateUser(): Promise<User | null> {
  if (!isSupabaseConfigured() || !supabase) {
    // Silent return - app works offline
    return null;
  }

  try {
    // Try to get auth user first
    const authUserId = await getCurrentUserId();

  if (authUserId) {
    // Look up by auth_id first
    const { data: authUser, error: authError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authUserId)
      .single();

    if (authUser && !authError) {
      return authUser as User;
    }

    // Check if there's a visitor record we can link to this auth account
    const visitorId = await getVisitorId();
    const { data: visitorUser } = await supabase
      .from("users")
      .select("*")
      .eq("visitor_id", visitorId)
      .single();

    if (visitorUser) {
      // Link existing visitor account to auth account
      const { data: linkedUser, error: linkError } = await supabase
        .from("users")
        .update({ auth_id: authUserId })
        .eq("id", visitorUser.id)
        .select()
        .single();

      if (linkedUser && !linkError) {
        return linkedUser as User;
      }
    }

    // Create new user with auth_id
    const { data: newAuthUser, error: insertError } = await supabase
      .from("users")
      .insert({ visitor_id: visitorId, auth_id: authUserId })
      .select()
      .single();

    if (insertError) {
      // Silently handle - app works offline
      return null;
    }

    return newAuthUser as User;
  }

  // Fall back to visitor-based user (shouldn't happen with protected routes)
  const visitorId = await getVisitorId();

  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("visitor_id", visitorId)
    .single();

  if (existing && !selectError) {
    return existing as User;
  }

  // Create new visitor user
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert({ visitor_id: visitorId })
    .select()
    .single();

  if (insertError) {
    // Silently handle network errors - app works offline
    return null;
  }

  if (!newUser) {
    return null;
  }

  return newUser as User;
  } catch {
    // Silent catch - app works offline when network unavailable
    return null;
  }
}

export async function updateUserIdentity(identity: UserIdentity): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    const visitorId = await getVisitorId();

    await supabase
      .from("users")
      .update({
        archetype: identity.archetype,
        experience_level: identity.experienceLevel,
        primary_goal: identity.primaryGoal,
        biggest_challenge: identity.biggestChallenge,
        onboarding_complete: true,
      })
      .eq("visitor_id", visitorId);
    // Silent - identity updates can fail gracefully offline
  } catch {
    // Silent catch - works offline
  }
}

export async function getUserIdentity(): Promise<UserIdentity | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const user = await getOrCreateUser();
    if (!user) return null;

    return {
      archetype: user.archetype as UserIdentity["archetype"],
      experienceLevel: user.experience_level as UserIdentity["experienceLevel"],
      primaryGoal: user.primary_goal as UserIdentity["primaryGoal"],
      biggestChallenge: user.biggest_challenge as UserIdentity["biggestChallenge"],
      painPoint: ((user as unknown) as { pain_point?: string }).pain_point as UserIdentity["painPoint"] ?? null,
    };
  } catch {
    return null;
  }
}

export async function storeHand(
  handData: HandData,
  analysis: AnalysisResult
): Promise<void> {
  // Always save to local storage first (for session management)
  try {
    await storeHandLocally(handData, analysis);
  } catch (localError) {
    console.error('Error saving hand locally:', localError);
  }

  // Hooked here rather than at the two call sites so no save path can miss it.
  // Both are fire-and-forget and must never delay or fail the save itself.
  trackAppEvent('hand_saved', {
    street: handData.river ? 'river' : handData.turn ? 'turn' : handData.flop ? 'flop' : null,
    action: analysis?.recommendedAction ?? null,
  });
  void scheduleHandFollowup(handData, analysis);
  // Working a real spot counts toward the streak wherever it happened,
  // including during onboarding.
  void creditReviewForToday();

  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    const user = await getOrCreateUser();
    if (!user) {
      // Offline - hand already saved locally
      return;
    }

    // Note: Free tier limit is now enforced BEFORE calling storeHand via canSaveHand()
    // No auto-pruning - if a hand gets here, it's allowed to be saved

    await supabase.from("hands").insert({
      user_id: user.id,
      hand_data: handData,
      analysis,
    });
  } catch {
    // Silent catch - hand storage fails gracefully offline
  }
}

export async function getHandHistory(): Promise<
  Array<{ handData: HandData; analysis: AnalysisResult; createdAt: string }>
> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const user = await getOrCreateUser();
    if (!user) return [];

    const { data } = await supabase
      .from("hands")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return (data || []).map((row) => ({
      handData: row.hand_data as HandData,
      analysis: row.analysis as AnalysisResult,
      createdAt: row.created_at,
    }));
  } catch {
    // Silent catch - returns empty array when offline
    return [];
  }
}

export async function deleteHand(handId: string): Promise<boolean> {
  // Always delete from local storage first
  try {
    await deleteHandLocally(handId);
  } catch (localError) {
    console.error('Error deleting hand locally:', localError);
  }

  if (!isSupabaseConfigured() || !supabase) {
    return true; // Local deletion succeeded
  }

  try {
    const user = await getOrCreateUser();
    if (!user) return true; // Local deletion succeeded

    // Find and delete the hand with matching hand_data.id
    const { data: hands } = await supabase
      .from("hands")
      .select("id, hand_data")
      .eq("user_id", user.id);

    const handToDelete = hands?.find(
      (h) => (h.hand_data as HandData)?.id === handId
    );

    if (handToDelete) {
      await supabase.from("hands").delete().eq("id", handToDelete.id);
    }

    return true;
  } catch {
    return true; // Local deletion succeeded even if cloud fails
  }
}

export async function isOnboardingComplete(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const user = await getOrCreateUser();
    return user?.onboarding_complete ?? false;
  } catch {
    return false;
  }
}

export async function getUserTier(): Promise<"free" | "paid"> {
  if (!isSupabaseConfigured() || !supabase) {
    return "free";
  }

  try {
    const user = await getOrCreateUser();
    return user?.tier ?? "free";
  } catch {
    return "free";
  }
}

// ============================================
// Sync Functions for Guest-to-User Migration
// ============================================

export interface UserPreferences {
  voiceSettings?: VoiceSettings;
  dailyReviewState?: {
    currentStreak: number;
    bestStreak: number;
    lastReviewDate: string | null;
    reviewedHandIds: string[];
    totalReviewed: number;
    correctAnswers: number;
  };
  sessionPreferences?: SessionPreferences;
}

/**
 * Upsert a hand with local_id for deduplication
 */
export async function upsertHand(userId: string, hand: StoredHand): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    const localId = hand.handData.id || `hand_${hand.timestamp}`;

    await supabase
      .from("hands")
      .upsert(
        {
          user_id: userId,
          local_id: localId,
          hand_data: hand.handData,
          analysis: hand.analysis,
        },
        {
          onConflict: "user_id,local_id",
        }
      );
  } catch (error) {
    console.error("Error upserting hand:", error);
    throw error;
  }
}

/**
 * Get all hands from cloud for a user
 */
export async function getCloudHands(userId: string): Promise<StoredHand[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("hands")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      handData: row.hand_data as HandData,
      analysis: row.analysis as AnalysisResult,
      timestamp: new Date(row.created_at).getTime(),
    }));
  } catch (error) {
    console.error("Error getting cloud hands:", error);
    return [];
  }
}

/**
 * Upsert a session to cloud
 */
export async function upsertSession(userId: string, session: Session): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    await supabase
      .from("sessions")
      .upsert(
        {
          user_id: userId,
          local_id: session.id,
          name: session.name,
          start_time: session.startTime,
          end_time: session.endTime,
          stakes: session.stakes,
          custom_stakes: session.customStakes,
          buy_in: session.buyIn,
          cash_out: session.cashOut,
          result: session.result,
          location: session.location,
          table_type: session.tableType,
          notes: session.notes,
          hand_ids: session.handIds,
          chat_ids: session.chatIds,
          is_auto_suggested: session.isAutoSuggested,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
        },
        {
          onConflict: "user_id,local_id",
        }
      );
  } catch (error) {
    console.error("Error upserting session:", error);
    throw error;
  }
}

/**
 * Get all sessions from cloud for a user
 */
export async function getCloudSessions(userId: string): Promise<Session[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("start_time", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.local_id,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time,
      stakes: row.stakes,
      customStakes: row.custom_stakes,
      buyIn: row.buy_in,
      cashOut: row.cash_out,
      result: row.result,
      location: row.location,
      tableType: row.table_type,
      notes: row.notes,
      handIds: row.hand_ids || [],
      chatIds: row.chat_ids || [],
      isAutoSuggested: row.is_auto_suggested,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("Error getting cloud sessions:", error);
    return [];
  }
}

/**
 * Upsert a chat to cloud
 */
export async function upsertChat(userId: string, chat: ChatConversation): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    await supabase
      .from("chats")
      .upsert(
        {
          user_id: userId,
          local_id: chat.id,
          session_id: chat.sessionId,
          title: chat.title,
          messages: chat.messages,
          message_count: chat.messageCount,
          preview: chat.preview,
          created_at: chat.createdAt,
          updated_at: chat.updatedAt,
        },
        {
          onConflict: "user_id,local_id",
        }
      );
  } catch (error) {
    console.error("Error upserting chat:", error);
    throw error;
  }
}

/**
 * Get all chats from cloud for a user
 */
export async function getCloudChats(userId: string): Promise<ChatConversation[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.local_id,
      sessionId: row.session_id,
      title: row.title,
      messages: row.messages || [],
      messageCount: row.message_count,
      preview: row.preview,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("Error getting cloud chats:", error);
    return [];
  }
}

/**
 * Upsert a favorite to cloud
 */
export async function upsertFavorite(userId: string, favorite: FavoriteItem): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    await supabase
      .from("favorites")
      .upsert(
        {
          user_id: userId,
          item_id: favorite.id,
          item_type: favorite.type,
          favorited_at: favorite.favoritedAt,
        },
        {
          onConflict: "user_id,item_id,item_type",
        }
      );
  } catch (error) {
    console.error("Error upserting favorite:", error);
    throw error;
  }
}

/**
 * Get all favorites from cloud for a user
 */
export async function getCloudFavorites(userId: string): Promise<FavoriteItem[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", userId)
      .order("favorited_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.item_id,
      type: row.item_type as "hand" | "chat",
      favoritedAt: row.favorited_at,
    }));
  } catch (error) {
    console.error("Error getting cloud favorites:", error);
    return [];
  }
}

/**
 * Upsert user preferences to cloud
 */
export async function upsertPreferences(userId: string, prefs: UserPreferences): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          voice_settings: prefs.voiceSettings || {},
          daily_review_state: prefs.dailyReviewState || {},
          session_preferences: prefs.sessionPreferences || {},
          updated_at: Date.now(),
        },
        {
          onConflict: "user_id",
        }
      );
  } catch (error) {
    console.error("Error upserting preferences:", error);
    throw error;
  }
}

/**
 * Get user preferences from cloud
 */
export async function getCloudPreferences(userId: string): Promise<UserPreferences | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return {
      voiceSettings: data.voice_settings as VoiceSettings,
      dailyReviewState: data.daily_review_state,
      sessionPreferences: data.session_preferences as SessionPreferences,
    };
  } catch (error) {
    console.error("Error getting cloud preferences:", error);
    return null;
  }
}
