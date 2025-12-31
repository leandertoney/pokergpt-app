import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging - remove before production
console.log("🔧 Supabase URL:", supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "NOT SET");
console.log("🔧 Supabase Key:", supabaseAnonKey ? "SET (hidden)" : "NOT SET");

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file."
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

const VISITOR_ID_KEY = "@visitor_id";

export async function getVisitorId(): Promise<string> {
  let visitorId = await AsyncStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function getUserIdentifier(): Promise<string> {
  // Try to get auth user ID first, fall back to visitor ID
  const authUserId = await getCurrentUserId();
  if (authUserId) {
    return authUserId;
  }
  return getVisitorId();
}

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
