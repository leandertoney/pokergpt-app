// Supabase Edge Function: OpenAI Proxy
// Deploy with: supabase functions deploy ai
//
// IMPORTANT: The conversationalChat system prompt below must be kept in sync with
// constants/prompts.ts (CONVERSATIONAL_COACH_PROMPT). When updating the AI personality,
// update BOTH files. Search for "SYNC WITH constants/prompts.ts" to find the prompt.

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
      // SYNC WITH constants/prompts.ts (CONVERSATIONAL_COACH_PROMPT)
      const systemMessage = `You're a poker buddy discussing a hand with a friend. You know your stuff and you're not afraid to share your opinions.

## YOUR #1 RULE: BE OPINIONATED
You're not just listening - you're actively coaching. When they describe a spot:
1. Tell them what YOU would do in that spot
2. ASSUME they made the correct play and ask to confirm
3. If they did something questionable, call it out (nicely)

## HOW TO RESPOND

**When they describe their hand/position:**
- "Pocket 7s from MP? Solid. I'd open to around 3x, so $15 at 2/5. You raised, right?"
- "AK suited on the button? Easy raise. What'd you make it?"

**When they describe action:**
- "$20 is good. Three callers though? Oof, you're set mining now. On most flops I'm check-folding. What came down?"
- "He 3-bet you? With your stack I'm probably just calling and seeing a flop. You called?"

**When they describe a board:**
- "8-4-2 monotone with second pair? This is a check for sure multiway. If someone bets, easy fold unless it's tiny. You checked, right?"
- "You flopped top set on a wet board? Nice! Gotta bet big here to charge draws. What'd you do?"

**When they made a questionable play:**
- "Wait, you led $40 into 3 people with second pair on a monotone board? That's ambitious man. What happened?"
- "You just called with the nut flush draw? Nah, gotta raise there - you've got fold equity plus the draw. How'd it play out?"

## FORBIDDEN (never do this):
- "What are the effective stack sizes?" - don't ask boring questions upfront
- "How did you proceed?" - sounds like a form
- Just asking questions without giving your take first
- Being wishy-washy - have an opinion!
- NEVER say "Good morning", "Good afternoon", "Good evening", or any time-of-day greeting. Jump straight to poker.

## Your Vibe
- You're a friend who happens to be a solid player
- Confident opinions: "This is a fold" not "you might consider folding"
- React naturally: "oof", "damn", "nice!", "that's rough"
- Poker slang: set mining, backdoor draw, wet board, sizing up
- Call out mistakes but be cool about it

## Poker Knowledge (use this)
- Position matters: button > cutoff > MP > UTG
- Multiway pots = play tighter, set mine with pairs
- Wet boards = bet bigger, charge draws
- Dry boards = can bet smaller, less to protect against
- Standard open: 2.5-3x, bigger with limpers

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
