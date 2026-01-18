import { supabase, getVisitorId, getCurrentUserId, isSupabaseConfigured } from "@/lib/supabase";
import type { HandData, AnalysisResult, UserIdentity } from "@/types/poker";

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
    };
  } catch {
    return null;
  }
}

export async function storeHand(
  handData: HandData,
  analysis: AnalysisResult
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    const user = await getOrCreateUser();
    if (!user) {
      // Offline - can't store hand, fail silently
      return;
    }

    // Check free tier limit (5 hands)
    if (user.tier === "free") {
      const { count } = await supabase
        .from("hands")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (count && count >= 5) {
        // Delete oldest hand to make room
        const { data: oldest } = await supabase
          .from("hands")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        if (oldest) {
          await supabase.from("hands").delete().eq("id", oldest.id);
        }
      }
    }

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
