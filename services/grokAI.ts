/**
 * Grok AI Service for PokerGPT
 * Uses xAI's Grok API for hand parsing and analysis
 * Designed to match Grok's conversational style
 */

import type { HandData, AnalysisResult } from '@/types/poker';

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_API_KEY = process.env.EXPO_PUBLIC_XAI_API_KEY || '';

// Grok's poker coaching persona
const GROK_POKER_SYSTEM_PROMPT = `You are Grok, an expert poker coach with a sharp wit and direct style. You analyze hands with precision while keeping things engaging and sometimes irreverent. You're knowledgeable about GTO theory, exploitative play, and the mental game.

When analyzing hands:
- Be direct and confident in your recommendations
- Use poker terminology naturally
- Add personality - you can be playful or sarcastic when appropriate
- Focus on actionable insights, not just theory
- Call out mistakes honestly but constructively

You speak like a friend at the poker table who happens to be a pro - knowledgeable but not stuffy.`;

const PARSE_HAND_PROMPT = `Parse this poker hand description and extract the structured data. Be thorough but work with whatever information is provided.

Return a JSON object with these fields (use null for missing data):
{
  "heroHand": "e.g., AcKd or pocket aces",
  "heroPosition": "UTG/UTG+1/MP/CO/BTN/SB/BB",
  "heroStack": number in BB or dollars,
  "villainPosition": "position",
  "villainStack": number,
  "effectiveStack": number (smaller of hero/villain stacks),
  "potSize": number,
  "flop": ["card1", "card2", "card3"] or null,
  "turn": "card" or null,
  "river": "card" or null,
  "action": "what action hero is facing",
  "preflopActions": [{"player": "position", "action": "fold/call/raise/bet", "amount": number}],
  "flopActions": [...],
  "turnActions": [...],
  "riverActions": [...],
  "villainTendencies": "any reads mentioned",
  "isComplete": boolean (true if enough info to analyze),
  "missingFields": ["list of important missing info"]
}

Only return the JSON object, no other text.`;

const ANALYZE_HAND_PROMPT = `Analyze this poker hand and provide strategic advice. Be direct and insightful.

IMPORTANT: Always include math data to help the player learn. Even for made hands, explain the equity calculation.

Return a JSON object:
{
  "recommendedAction": "clear action recommendation (e.g., 'Raise to $45', 'Call', 'Fold')",
  "confidence": number 0-100,
  "reasoning": "2-3 sentence explanation of why",
  "gtoLine": "what GTO theory suggests",
  "exploitLine": "exploitative adjustment if villain tendencies known",
  "hybridLine": "balanced recommendation considering both",
  "villainRange": "estimated villain range based on action",
  "equity": number 0-100 (REQUIRED - estimated equity vs villain range, even rough estimate),
  "potOdds": number (REQUIRED - pot odds ratio if facing a bet, e.g., 3.5 for 3.5:1. Use 0 if not facing a bet),
  "impliedOdds": number (implied odds if applicable, 0 if not relevant),
  "outs": number (REQUIRED - count of outs to improve. For made hands like top pair, count outs to two pair/trips/boat. For draws, count draw outs. Minimum 2 for any live hand),
  "outBreakdown": "REQUIRED - explain the outs calculation. For made hands: 'Top pair has 5 outs to two pair (3 aces + 2 kickers) and 2 outs to trips'. For draws: '9 hearts for flush + 6 straight cards - 2 overlap = 13 outs'",
  "riskLevel": "low/medium/high",
  "reasoningBullets": ["REQUIRED - exactly 3 short bullet points (max 8 words each) explaining key reasons for your recommendation. Focus on: position advantage, hand strength, range analysis, pot odds, implied odds. Example: ['Strong position on button', 'Villain range is capped here', 'Getting great pot odds to call']"],
  "situationSummary": "REQUIRED - 1-2 sentence summary of the hand situation from hero's perspective. Start with 'You...' and describe the key situation. Example: 'You flopped top pair with AK on a dry board. Villain donk-bet into you on the flop.'",
  "alternativeActions": [
    {"action": "alternative play", "reasoning": "why it's viable", "ev": number (relative EV)}
  ],
  "personaAnalysis": {
    "tone": "mariano",
    "narrative": "Grok-style commentary on the hand - be direct, witty, and insightful"
  }
}

Only return the JSON object.`;

async function callGrok(messages: Array<{ role: string; content: string }>, parseJson = true): Promise<any> {
  if (!XAI_API_KEY) {
    throw new Error('xAI API key not configured');
  }

  console.log('[Grok] Calling API...');

  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Grok] API error:', response.status, errorText);
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('[Grok] Response received');

  const content = data.choices?.[0]?.message?.content || '';

  if (parseJson) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      const jsonStr = jsonMatch[1] || content;
      return JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('[Grok] JSON parse error:', e);
      console.log('[Grok] Raw content:', content);
      throw new Error('Failed to parse Grok response');
    }
  }

  return content;
}

export async function parseHandWithGrok(narrative: string): Promise<Partial<HandData>> {
  console.log('[Grok] Parsing hand:', narrative.substring(0, 50) + '...');

  try {
    const result = await callGrok([
      { role: 'system', content: GROK_POKER_SYSTEM_PROMPT },
      { role: 'user', content: `${PARSE_HAND_PROMPT}\n\nHand description:\n${narrative}` },
    ]);

    return {
      heroHand: result.heroHand,
      heroPosition: result.heroPosition,
      heroStack: result.heroStack,
      villainPosition: result.villainPosition,
      villainStack: result.villainStack,
      effectiveStack: result.effectiveStack,
      potSize: result.potSize,
      flop: result.flop,
      turn: result.turn,
      river: result.river,
      action: result.action,
      preflopActions: result.preflopActions,
      flopActions: result.flopActions,
      turnActions: result.turnActions,
      riverActions: result.riverActions,
      villainTendencies: result.villainTendencies,
      isComplete: result.isComplete,
      missingFields: result.missingFields,
      originalNarrative: narrative,
    };
  } catch (error) {
    console.error('[Grok] Parse error:', error);
    return {
      isComplete: false,
      missingFields: ['Failed to parse - try rephrasing'],
      originalNarrative: narrative,
    };
  }
}

export async function analyzeHandWithGrok(narrative: string): Promise<Partial<AnalysisResult>> {
  console.log('[Grok] Analyzing hand...');

  try {
    const result = await callGrok([
      { role: 'system', content: GROK_POKER_SYSTEM_PROMPT },
      { role: 'user', content: `${ANALYZE_HAND_PROMPT}\n\nHand to analyze:\n${narrative}` },
    ]);

    // Ensure math fields have fallback values for education section
    const equity = result.equity ?? 50; // Default to 50% if not provided
    const potOdds = result.potOdds ?? 2; // Default to 2:1 if not provided
    const outs = result.outs ?? 5; // Default to 5 outs if not provided
    const outBreakdown = result.outBreakdown ||
      'Outs to improve your hand (exact count depends on board texture and villain range)';

    return {
      recommendedAction: result.recommendedAction || 'Check/Call',
      confidence: result.confidence || 50,
      reasoning: result.reasoning,
      gtoLine: result.gtoLine,
      exploitLine: result.exploitLine,
      hybridLine: result.hybridLine,
      villainRange: result.villainRange,
      equity,
      potOdds,
      impliedOdds: result.impliedOdds,
      outs,
      outBreakdown,
      riskLevel: result.riskLevel,
      reasoningBullets: result.reasoningBullets || [],
      situationSummary: result.situationSummary,
      alternativeActions: result.alternativeActions,
      personaAnalysis: result.personaAnalysis || {
        tone: 'mariano',
        narrative: result.reasoning || 'Let me break this down for you.',
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[Grok] Analysis error:', error);
    throw new Error('Failed to analyze hand with Grok');
  }
}

export async function chatWithGrok(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  console.log('[Grok] Chat message:', message.substring(0, 50) + '...');

  try {
    const messages = [
      { role: 'system', content: GROK_POKER_SYSTEM_PROMPT },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const response = await callGrok(messages, false);
    return response;
  } catch (error) {
    console.error('[Grok] Chat error:', error);
    return "I'm having trouble connecting right now. Try again in a moment.";
  }
}

// Quick analysis for voice mode - faster, less structured
export async function quickAnalyzeWithGrok(narrative: string): Promise<string> {
  console.log('[Grok] Quick analysis...');

  try {
    const response = await callGrok([
      { role: 'system', content: `${GROK_POKER_SYSTEM_PROMPT}

For voice responses, be concise but complete. Give your recommendation first, then a brief explanation. Keep it under 3-4 sentences. Be conversational like you're talking at the table.` },
      { role: 'user', content: `Quick analysis needed: ${narrative}` },
    ], false);

    return response;
  } catch (error) {
    console.error('[Grok] Quick analysis error:', error);
    return "Hmm, I need a bit more info to give you solid advice. What's the pot size and what action are you facing?";
  }
}
