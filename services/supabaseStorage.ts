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
    console.warn("Supabase not configured");
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
      console.error("Error creating auth user:", insertError);
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
    console.error("Error creating user:", insertError);
    return null;
  }

  return newUser as User;
  } catch (error) {
    console.error("Network error in getOrCreateUser:", error);
    // Return null to allow app to continue in offline mode
    return null;
  }
}

export async function updateUserIdentity(identity: UserIdentity): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn("Supabase not configured");
    return;
  }

  const visitorId = await getVisitorId();

  const { error } = await supabase
    .from("users")
    .update({
      archetype: identity.archetype,
      experience_level: identity.experienceLevel,
      primary_goal: identity.primaryGoal,
      biggest_challenge: identity.biggestChallenge,
      onboarding_complete: true,
    })
    .eq("visitor_id", visitorId);

  if (error) {
    console.error("Error updating identity:", error);
    throw error;
  }
}

export async function getUserIdentity(): Promise<UserIdentity | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const user = await getOrCreateUser();
  if (!user) return null;

  return {
    archetype: user.archetype as UserIdentity["archetype"],
    experienceLevel: user.experience_level as UserIdentity["experienceLevel"],
    primaryGoal: user.primary_goal as UserIdentity["primaryGoal"],
    biggestChallenge: user.biggest_challenge as UserIdentity["biggestChallenge"],
  };
}

export async function storeHand(
  handData: HandData,
  analysis: AnalysisResult
): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn("Supabase not configured. Hand not stored.");
    return;
  }

  const user = await getOrCreateUser();
  if (!user) {
    throw new Error("Could not get or create user");
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

  const { error } = await supabase.from("hands").insert({
    user_id: user.id,
    hand_data: handData,
    analysis,
  });

  if (error) {
    console.error("Error storing hand:", error);
    throw error;
  }
}

export async function getHandHistory(): Promise<
  Array<{ handData: HandData; analysis: AnalysisResult; createdAt: string }>
> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  const user = await getOrCreateUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("hands")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching hand history:", error);
    return [];
  }

  return (data || []).map((row) => ({
    handData: row.hand_data as HandData,
    analysis: row.analysis as AnalysisResult,
    createdAt: row.created_at,
  }));
}

export async function isOnboardingComplete(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  const user = await getOrCreateUser();
  return user?.onboarding_complete ?? false;
}

export async function getUserTier(): Promise<"free" | "paid"> {
  if (!isSupabaseConfigured() || !supabase) {
    return "free";
  }

  const user = await getOrCreateUser();
  return user?.tier ?? "free";
}
