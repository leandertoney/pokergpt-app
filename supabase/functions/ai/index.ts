// Supabase Edge Function: OpenAI Proxy
// Deploy with: supabase functions deploy ai

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-visitor-id, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

async function callOpenAI(
  messages: Message[],
  systemPrompt?: string
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const allMessages: Message[] = [];
  if (systemPrompt) {
    allMessages.push({ role: "system", content: systemPrompt });
  }
  allMessages.push(...messages);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: allMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
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
      const text = await callOpenAI(
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

Return ONLY valid JSON, no other text.`;

      const text = await callOpenAI(
        [{ role: "user", content: narrative }],
        systemMessage
      );

      try {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[0]);
          return new Response(jsonMatch[0], {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("No JSON found");
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
      const systemMessage = `You're chatting with a friend about a poker hand. Talk like a real person, not a robot collecting data.

## YOUR #1 RULE: REACT TO WHAT THEY SAID
When they tell you about their hand, your FIRST response must be a reaction to that specific situation. DO NOT ask clarifying questions first. React, give your take, THEN ask what happened next.

## FORBIDDEN RESPONSES (never say these):
- "What are the effective stack sizes?" - DON'T ask this upfront
- "What position were you in?" - if they already told you
- "What's the board texture?" - too robotic
- "How did you proceed?" - sounds like a form
- Any question that ignores what they just told you

## REQUIRED RESPONSE FORMAT:
1. REACT to their situation ("Oof, three callers with 7s? That's rough multiway")
2. Give your TAKE ("You're basically set mining now")
3. THEN ask what happened next ("What'd the flop bring?")

## Example - User says: "I'm in middle position with pocket sevens, bump it to $20, get three callers"

GOOD response: "Pocket 7s from MP, $20 open - that's fine. But damn, three callers? Your hand just got way worse. Multiway with a medium pair you're basically hoping to flop a set. What came on the flop?"

BAD response: "What are the effective stack sizes?" (WRONG - this ignores everything they said!)

## Poker Terms
- "bump it to X" / "make it X" / "open to X" = raise to X
- "flatted" / "peeled" = called
- UTG/MP/CO/BTN = positions

## Your Vibe
- Talk like a poker buddy, not a coach
- "oof", "damn", "nice", "interesting spot"
- Point out concerns naturally
- Use slang: set mining, backdoor draw, monotone board

## Hand Tracking (internal)
Current data: ${JSON.stringify(currentHandData || {})}

After your conversational response, add on a new line:
---HANDDATA---
{updated JSON with: heroHand, heroPosition, potSize, streets array, isComplete boolean}

Set isComplete:true when there's a clear decision point to analyze.`;

      const formattedMessages: Message[] = chatMessages?.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })) || [];

      const text = await callOpenAI(formattedMessages, systemMessage);

      // Parse out the hand data from the response
      const parts = text.split("---HANDDATA---");
      const conversationalResponse = parts[0].trim();
      let handData = currentHandData || {};

      if (parts[1]) {
        try {
          const jsonStr = parts[1].trim();
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            handData = JSON.parse(jsonMatch[0]);
          }
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

Be concise but thorough. Focus on practical advice. Return ONLY valid JSON.`;

      const text = await callOpenAI(
        [{ role: "user", content: narrative }],
        systemMessage
      );

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[0]);
          return new Response(jsonMatch[0], {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("No JSON found");
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
