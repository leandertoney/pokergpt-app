// Supabase Edge Function: Claude AI Proxy
// Deploy with: supabase functions deploy ai

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-visitor-id, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

async function callClaude(
  messages: AnthropicMessage[],
  systemPrompt?: string
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.type === "text" ? data.content[0].text : "";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, prompt, systemPrompt, narrative } = await req.json();

    if (action === "generateText") {
      const text = await callClaude(
        [{ role: "user", content: prompt }],
        systemPrompt
      );
      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "parseHand") {
      const systemMessage = `You are an expert poker hand parser. Parse the narrative and extract structured data as JSON.

Understand poker slang:
- "ripped it in" = went all-in
- "peeled" = called
- "bombed" = bet big
- "flatted" = called
- "squeezed" = 3-bet after raise and call
- "cold 4-bet" = 4-bet without previous action

Return a JSON object with these fields:
- heroHand: string (e.g., "AKs", "JJ")
- heroPosition: string (e.g., "BTN", "CO", "UTG")
- villainPosition: string
- heroStack: number (in BBs if possible)
- villainStack: number (in BBs if possible)
- potSize: number (if mentioned)
- streets: array of action descriptions
- isComplete: boolean (true if enough info for analysis)
- missingFields: array of field names still needed

Be thorough but only return valid JSON.`;

      const text = await callClaude(
        [
          { role: "user", content: narrative },
          { role: "assistant", content: "{" },
        ],
        systemMessage
      );

      // Ensure valid JSON
      const jsonText = "{" + text;
      try {
        JSON.parse(jsonText);
        return new Response(jsonText, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(
          JSON.stringify({
            isComplete: false,
            missingFields: ["heroHand", "heroPosition"],
            error: "Failed to parse response",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (action === "analyzeHand") {
      const systemMessage = `You are a GTO poker analyst and coach. Analyze the hand and provide strategic advice.

Return a JSON object with:
- recommendedAction: string (clear action recommendation)
- gtoLine: string (game theory optimal play explanation)
- exploitLine: string (exploitative adjustment if applicable)
- hybridLine: string (balanced recommendation)
- villainRange: string (estimated villain range)
- confidence: number (0-100, how confident in the analysis)
- keyInsights: array of strings (2-3 key takeaways)

Be concise but thorough. Focus on practical advice.`;

      const text = await callClaude(
        [
          { role: "user", content: narrative },
          { role: "assistant", content: "{" },
        ],
        systemMessage
      );

      const jsonText = "{" + text;
      try {
        JSON.parse(jsonText);
        return new Response(jsonText, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(
          JSON.stringify({
            recommendedAction: "Unable to analyze - please provide more details",
            confidence: 0,
            error: "Failed to parse response",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
