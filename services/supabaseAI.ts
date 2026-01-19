import { isSupabaseConfigured } from "@/lib/supabase";
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

  try {
    const response = await fetch(getEdgeFunctionUrl(), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ action: "parseHand", narrative }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return {
      ...data,
      originalNarrative: narrative,
    };
  } catch (error) {
    console.error("Error parsing hand:", error);
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

  try {
    const response = await fetch(getEdgeFunctionUrl(), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ action: "analyzeHand", narrative }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error analyzing hand:", error);
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

  try {
    const response = await fetch(getEdgeFunctionUrl(), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        action: "conversationalChat",
        messages,
        currentHandData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return {
      response: data.response || "Tell me more about the hand.",
      handData: data.handData || currentHandData,
    };
  } catch (error) {
    console.error("Error in conversational chat:", error);
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

  try {
    const response = await fetch(getEdgeFunctionUrl(), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ action: "generateText", prompt, systemPrompt }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || "Could you tell me more?";
  } catch (error) {
    console.error("Error generating text:", error);
    return "Could you tell me a bit more about the hand?";
  }
}
