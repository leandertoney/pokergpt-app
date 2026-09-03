/**
 * Hand parsing and analysis, shared.
 *
 * Lifted out of app/voice.tsx so onboarding can run the same analysis the rest
 * of the app runs. There is deliberately one copy: an onboarding that produced
 * a different verdict than the real screen would be worse than no onboarding
 * demo at all.
 *
 * Nothing here is gated by entitlement. The first analysis a player ever sees
 * happens before the paywall, on their own hand, which is the entire point of
 * the try-it step.
 */

import type { HandData, AnalysisResult } from '@/types/poker';
import { withTimeout } from '@/utils/withTimeout';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

const SYSTEM_PROMPT = `You are a poker hand analyzer. Extract hand data and provide strategic analysis from the conversation.

Return JSON only with this structure:
{
  "handData": {
    "heroHand": "cards like A♠ K♠ or pocket tens",
    "heroPosition": "UTG/MP/CO/BTN/SB/BB",
    "villainPosition": "position or null",
    "effectiveStack": number or null,
    "potSize": number or null,
    "flop": ["card1", "card2", "card3"] or null,
    "turn": "card" or null,
    "river": "card" or null,
    "action": "what action hero faces"
  },
  "analysis": {
    "recommendedAction": "ONE action, already decided, with a real number: \"Call\", \"Fold\", \"Raise to $60\". Never a placeholder, never \"or\".",
    "confidence": number 60-95,
    "reasoning": "2-3 sentence explanation",
    "gtoLine": "what GTO theory suggests",
    "exploitLine": "exploitative adjustment based on situation",
    "equity": number 0-100 or null,
    "potOdds": number like 2.5 for 2.5:1 or null,
    "riskLevel": "low" | "medium" | "high"
  }
}

RULES
- recommendedAction must name ONE action you have already decided on, sized in
  real dollars when it is a bet or raise. "Call or Raise to $X" is not an
  answer -- it copies this schema's example instead of reading the hand, and it
  is the first thing a new player ever sees the coach say.
- When the hand is short on detail, still commit, and carry the assumption in
  reasoning ("assuming he opens wide from there"). Hedging reads as no answer.`;

export type ParsedHand = {
  handData: Partial<HandData>;
  analysis: Partial<AnalysisResult>;
};

/**
 * Parse a spoken or written hand narrative into structured data plus a verdict.
 *
 * @param transcript What the player said.
 * @param stakesHint Optional plain-language stakes ("1/2 or 1/3"). The same
 *   spot is a different decision at different stakes, so when onboarding has
 *   asked, the answer is passed through rather than left to the model to guess.
 */
export async function parseAndAnalyzeHand(
  transcript: string,
  stakesHint?: string | null
): Promise<ParsedHand> {
  const userContent = stakesHint
    ? `Stakes: ${stakesHint}\n\n${transcript}`
    : transcript;

  try {
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          temperature: 0.4,
          max_tokens: 800,
        }),
      }),
      20000,
      'Hand analysis'
    );

    if (!response.ok) {
      console.error('[handAnalysis] parse error:', response.status);
      return { handData: {}, analysis: {} };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return {
      handData: parsed.handData || {},
      analysis: parsed.analysis || {},
    };
  } catch (e) {
    // Callers treat an empty result as "could not read that", never as an
    // error screen. Onboarding in particular must keep moving.
    console.warn('[handAnalysis] failed:', (e as any)?.message);
    return { handData: {}, analysis: {} };
  }
}

/**
 * True when the model actually found a hand. An empty object comes back both
 * from a network failure and from someone who said something that was not
 * poker, and onboarding treats those the same way: skip ahead quietly.
 */
export function isReadableHand(parsed: ParsedHand): boolean {
  return Boolean(parsed.analysis?.recommendedAction);
}
