import { generateText } from './supabaseAI';

export type VoiceIntent = 'search' | 'chat' | 'hand_entry' | 'stats';

export interface RouteResult {
  intent: VoiceIntent;
  query: string;
  route: string;
  confidence: number;
}

const INTENT_SYSTEM_PROMPT = `You are an intent classifier for a poker app. Analyze the user's voice input and determine what they want to do.

## Intent Categories

1. **SEARCH** - User wants to find/filter their hand history
   - "Show me hands with AK"
   - "What hands did I fold today"
   - "Find my pocket aces hands"
   - "Hands where I raised preflop"
   - "My losing hands this week"

2. **CHAT** - User wants poker advice or to ask a question
   - "How do I play AK from UTG?"
   - "Should I have called that river bet with top pair?"
   - "What's a good 3-bet range?"
   - "Was that a good bluff spot?"
   - "Explain pot odds to me"

3. **HAND_ENTRY** - User is describing a specific hand they played (for analysis)
   - "I had pocket kings on the button..."
   - "So I was in the big blind with ace queen..."
   - "UTG raised, I had jacks in the cutoff..."
   - Contains specific cards AND position/action details

4. **STATS** - User wants to see statistics or performance data
   - "What's my win rate?"
   - "How am I doing this month?"
   - "Show my stats"
   - "Am I profitable?"

## Response Format
Respond with ONLY a JSON object, no other text:
{
  "intent": "search" | "chat" | "hand_entry" | "stats",
  "query": "cleaned up version of what they said",
  "confidence": 0.0-1.0
}

## Examples

Input: "show me hands where I had ace king"
{"intent": "search", "query": "hands with AK", "confidence": 0.95}

Input: "how should I play pocket jacks"
{"intent": "chat", "query": "how should I play pocket jacks", "confidence": 0.9}

Input: "I'm on the button with ace queen suited and UTG raises to 3x"
{"intent": "hand_entry", "query": "Button with AQs, UTG raises 3x", "confidence": 0.85}

Input: "what's my win rate this month"
{"intent": "stats", "query": "win rate this month", "confidence": 0.9}`;

/**
 * Analyzes voice input and determines the user's intent
 */
export async function routeVoiceIntent(transcript: string): Promise<RouteResult> {
  if (!transcript || transcript.trim().length === 0) {
    return {
      intent: 'chat',
      query: '',
      route: '/poker-chat',
      confidence: 0,
    };
  }

  try {
    const response = await generateText(
      `Classify this user input: "${transcript}"`,
      INTENT_SYSTEM_PROMPT
    );

    // Parse the JSON response
    const parsed = parseIntentResponse(response);

    // Map intent to route
    const route = getRouteForIntent(parsed.intent);

    return {
      intent: parsed.intent,
      query: parsed.query || transcript,
      route,
      confidence: parsed.confidence,
    };
  } catch (error) {
    console.error('[IntentRouter] Error classifying intent:', error);

    // Fallback: Use simple keyword matching
    return fallbackClassification(transcript);
  }
}

/**
 * Parse the AI's JSON response
 */
function parseIntentResponse(response: string): {
  intent: VoiceIntent;
  query: string;
  confidence: number;
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: validateIntent(parsed.intent),
        query: parsed.query || '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    }
  } catch {
    // JSON parsing failed
  }

  // Default to chat if parsing fails
  return {
    intent: 'chat',
    query: response,
    confidence: 0.3,
  };
}

/**
 * Validate and normalize intent string
 */
function validateIntent(intent: string): VoiceIntent {
  const normalized = intent?.toLowerCase?.() || '';
  if (['search', 'chat', 'hand_entry', 'stats'].includes(normalized)) {
    return normalized as VoiceIntent;
  }
  return 'chat'; // Default
}

/**
 * Get the app route for a given intent
 */
function getRouteForIntent(intent: VoiceIntent): string {
  switch (intent) {
    case 'search':
      return '/'; // Home with search active
    case 'chat':
      return '/poker-chat';
    case 'hand_entry':
      return '/chat';
    case 'stats':
      return '/'; // Home (stats view future)
    default:
      return '/poker-chat';
  }
}

/**
 * Fallback classification using keyword matching
 */
function fallbackClassification(transcript: string): RouteResult {
  const lower = transcript.toLowerCase();

  // Search patterns
  const searchPatterns = [
    'show me', 'find', 'search', 'look for', 'hands with', 'hands where',
    'my hands', 'filter', 'list'
  ];

  // Hand entry patterns (describing a specific hand)
  const handEntryPatterns = [
    'i had', 'i have', "i'm on the", 'i was in', 'utg raises',
    'villain', 'on the button', 'in the blinds', 'pocket'
  ];

  // Stats patterns
  const statsPatterns = [
    'win rate', 'stats', 'statistics', 'how am i doing',
    'profitable', 'results', 'performance'
  ];

  // Check for hand entry first (most specific)
  if (handEntryPatterns.some(p => lower.includes(p)) &&
      (lower.includes('with') || lower.includes('had') || lower.includes('have'))) {
    return {
      intent: 'hand_entry',
      query: transcript,
      route: '/chat',
      confidence: 0.7,
    };
  }

  // Check for search
  if (searchPatterns.some(p => lower.includes(p))) {
    return {
      intent: 'search',
      query: transcript,
      route: '/',
      confidence: 0.7,
    };
  }

  // Check for stats
  if (statsPatterns.some(p => lower.includes(p))) {
    return {
      intent: 'stats',
      query: transcript,
      route: '/',
      confidence: 0.7,
    };
  }

  // Default to chat (questions, advice, etc.)
  return {
    intent: 'chat',
    query: transcript,
    route: '/poker-chat',
    confidence: 0.6,
  };
}
