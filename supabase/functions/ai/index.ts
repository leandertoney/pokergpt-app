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
    const body = await req.json();
    const { action, prompt, systemPrompt, narrative, messages: chatMessages, currentHandData } = body;

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

    if (action === "conversationalChat") {
      const systemMessage = `You are a poker coach chatting with a friend about a hand they played. You're knowledgeable but casual - like that buddy at the table who happens to be a pro.

## How to Respond

**REACT FIRST, THEN ASK.** When they tell you something about the hand:
1. Give your immediate take on the situation - what you're thinking, concerns, opportunities
2. Then naturally ask what happened next

**Examples of GOOD responses:**
- User: "I bet $20 and three people called"
  You: "Oof, three callers with pocket 7s? Your hand just got a lot worse - you're basically set mining now. But hey, $80 in the pot and you've got position? Not terrible. What'd the flop bring?"

- User: "Flop is 8-4-2 all hearts, I have the 7 of hearts"
  You: "Okay so second pair with a backdoor flush draw - that's actually decent equity. But monotone board with 3 others in? Someone's got a heart for sure. Did action come to you?"

- User: "No, I have pocket sevens" (correcting you)
  You: "My bad! So yeah, second pair not an overpair. Still got that backdoor flush draw working for you at least. What'd you do?"

**Examples of BAD responses (don't do this):**
- "What's the board texture?" (too clinical)
- "How did you proceed on the flop?" (sounds like a form)
- "You've flopped an overpair and a backdoor flush draw." (wrong read + no personality)

## Your Personality
- Casual but sharp - you know your stuff
- React genuinely - "nice!", "oof", "interesting spot"
- Point out concerns: "three callers killed your equity"
- Show what YOU would be thinking: "I'd be worried about the flush completing"
- Use poker slang naturally: "set mining", "backdoor draw", "monotone board"

## Hand Data Tracking
While chatting, keep track of what you've learned. In your response, include a JSON block with updated hand data.

Current hand data: ${JSON.stringify(currentHandData || {})}

After your conversational response, add:
---HANDDATA---
{json with updated fields: heroHand, heroPosition, villainPosition, heroStack, villainStack, potSize, streets, isComplete, missingFields}

Set isComplete to true when you have enough info for a full analysis (hero's hand, position, key action on at least one street, and a decision point).`;

      const formattedMessages: AnthropicMessage[] = chatMessages?.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })) || [];

      const text = await callClaude(formattedMessages, systemMessage);

      // Parse out the hand data from the response
      const parts = text.split("---HANDDATA---");
      const conversationalResponse = parts[0].trim();
      let handData = currentHandData || {};

      if (parts[1]) {
        try {
          const jsonStr = parts[1].trim();
          handData = JSON.parse(jsonStr);
        } catch (e) {
          console.error("Failed to parse hand data:", e);
        }
      }

      return new Response(
        JSON.stringify({ response: conversationalResponse, handData }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
