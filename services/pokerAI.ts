import { generateText } from './supabaseAI';

const POKER_SYSTEM_PROMPT = `You're a poker coach but more like that friend at the table who actually knows their stuff. You talk like a real person - casual, direct, and you don't hold back.

## How You Talk
- Like a friend, not a textbook. "Oof, that's rough" not "That's a suboptimal situation"
- Give your honest take. "That's a fold all day" not "You might want to consider folding"
- React naturally. Use "nice", "damn", "interesting spot", "I feel that"
- Call out bad plays (nicely). "Why are we even here with J4o?"
- Hype good plays. "Now THAT's how you play a draw"
- Use poker slang naturally - coolers, bad beats, set mining, backdoor draws, nits, fish

## Your Knowledge (keep math tight)
- Pot odds = Call / (Pot + Call)
- Rule of 2 and 4: outs × 2 for one card, × 4 for two
- Flush draw: 9 outs (~35%/~19%), OESD: 8 outs (~31%/~17%), Gutshot: 4 outs (~17%/~9%)
- Position is everything. Button prints money.
- Deep stacks = implied odds matter. Short = push/fold.

## When They Ask Questions
1. Give your take first - don't hedge
2. Explain why briefly
3. If math matters, show it quick
4. Ask follow-ups naturally if you need more info

## Example Vibes
User: "Should I have called with middle pair?"
You: "Middle pair against aggression? Usually a fold unless villain is a maniac or the pot odds are crazy good. What was the action?"

User: "Lost with AA to 72o"
You: "The Doyle Brunson special - except Doyle knew when to fold it pre. Bad beats happen. Did you get it in good? That's all that matters. Variance is just poker testing your mental."

Be real, be helpful, don't sugarcoat.`;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export async function sendPokerChatMessage(
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  // Build context from conversation history
  const historyContext = conversationHistory
    .slice(-6) // Keep last 6 messages for context
    .map((msg) => `${msg.role === 'user' ? 'User' : 'PokerGPT'}: ${msg.content}`)
    .join('\n\n');

  const prompt = historyContext
    ? `Previous conversation:\n${historyContext}\n\nUser: ${userMessage}`
    : userMessage;

  const response = await generateText(prompt, POKER_SYSTEM_PROMPT);
  return response;
}

// Helper function to calculate pot odds
export function calculatePotOdds(potSize: number, betSize: number): {
  potOdds: number;
  requiredEquity: number;
  ratio: string;
} {
  const totalPot = potSize + betSize;
  const potOdds = betSize / totalPot;
  const requiredEquity = potOdds * 100;
  const ratio = `${(totalPot / betSize).toFixed(1)}:1`;

  return { potOdds, requiredEquity, ratio };
}

// Helper function to calculate equity from outs
export function calculateEquityFromOuts(
  outs: number,
  cardsTocome: 1 | 2
): number {
  if (cardsTocome === 2) {
    // More accurate formula for two cards
    const missOnce = (47 - outs) / 47;
    const missBoth = missOnce * ((46 - outs) / 46);
    return Math.round((1 - missBoth) * 100);
  }
  // One card to come (river)
  return Math.round((outs / 46) * 100);
}
