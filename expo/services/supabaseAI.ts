import { isSupabaseConfigured } from "@/lib/supabase";
import { withTimeout } from "@/utils/withTimeout";
import type { HandData, AnalysisResult } from "@/types/poker";

function getEdgeFunctionUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL not configured");
  }
  return `${baseUrl}/functions/v1/ai`;
}

function getHeaders(): Record<string, string> {
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return {
    "Content-Type": "application/json",
    ...(anonKey && {
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
    }),
  };
}

export async function parseHandWithAI(narrative: string): Promise<Partial<HandData>> {
  if (!isSupabaseConfigured()) {
    // Fallback for development without Supabase
    console.warn("Supabase not configured. Using fallback parsing.");
    return {
      isComplete: false,
      missingFields: ["heroHand", "heroPosition", "villainPosition"],
      originalNarrative: narrative,
    };
  }

  const startTime = Date.now();
  try {
    const response = await withTimeout(
      fetch(getEdgeFunctionUrl(), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "parseHand", narrative }),
      }),
      15000, // 15 second timeout for hand parsing
      "Hand parsing"
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log(`[PERF] parseHandWithAI completed in ${duration}ms`);

    return {
      ...data,
      originalNarrative: narrative,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PERF] parseHandWithAI failed after ${duration}ms:`, error);
    return {
      isComplete: false,
      missingFields: [],
      originalNarrative: narrative,
    };
  }
}

export async function analyzeHand(narrative: string): Promise<Partial<AnalysisResult>> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured. Cannot analyze hand.");
  }

  const startTime = Date.now();
  try {
    const response = await withTimeout(
      fetch(getEdgeFunctionUrl(), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "analyzeHand", narrative }),
      }),
      20000, // 20 second timeout for hand analysis (more complex)
      "Hand analysis"
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    const duration = Date.now() - startTime;
    console.log(`[PERF] analyzeHand completed in ${duration}ms`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PERF] analyzeHand failed after ${duration}ms:`, error);
    throw new Error("Failed to analyze hand");
  }
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function conversationalChat(
  messages: ConversationMessage[],
  currentHandData: Partial<HandData>
): Promise<{ response: string; handData: Partial<HandData> }> {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase not configured. Using fallback response.");
    return {
      response: "Tell me more about the hand - what position were you in?",
      handData: currentHandData,
    };
  }

  const startTime = Date.now();
  try {
    const response = await withTimeout(
      fetch(getEdgeFunctionUrl(), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "conversationalChat",
          messages,
          currentHandData,
        }),
      }),
      18000, // 18 second timeout for chat responses
      "Conversational chat"
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log(`[PERF] conversationalChat completed in ${duration}ms`);

    return {
      response: data.response || "Tell me more about the hand.",
      handData: data.handData || currentHandData,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PERF] conversationalChat failed after ${duration}ms:`, error);
    return {
      response: "Could you tell me a bit more about that spot?",
      handData: currentHandData,
    };
  }
}

export async function generateText(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  if (!isSupabaseConfigured()) {
    // Fallback for development
    console.warn("Supabase not configured. Using fallback response.");
    return "Tell me more about the hand.";
  }

  const startTime = Date.now();
  try {
    const response = await withTimeout(
      fetch(getEdgeFunctionUrl(), {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "generateText", prompt, systemPrompt }),
      }),
      18000, // 18 second timeout for text generation
      "Text generation"
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log(`[PERF] generateText completed in ${duration}ms`);

    return data.text || "Could you tell me more?";
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PERF] generateText failed after ${duration}ms:`, error);
    return "Could you tell me a bit more about the hand?";
  }
}
