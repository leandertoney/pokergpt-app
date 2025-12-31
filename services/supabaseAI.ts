import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandData, AnalysisResult } from "@/types/poker";

function getEdgeFunctionUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL not configured");
  }
  return `${baseUrl}/functions/v1/ai`;
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
