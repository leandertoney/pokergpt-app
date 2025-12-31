import { generateText } from './supabaseAI';

const POKER_SYSTEM_PROMPT = `You are PokerGPT, an expert poker coach and statistics analyst. You specialize in:

1. **Pot Odds & Equity Calculations**
   - Pot odds: Amount to call / (Pot + Amount to call)
   - Equity: Your chance of winning the hand
   - Required equity to call = Pot odds as a percentage

2. **Outs & Drawing Odds**
   - River (1 card): outs × 2 ≈ %
   - Flop to river (2 cards): outs × 4 ≈ %
   - Common draws:
     • Flush draw: 9 outs (~35% with 2 cards, ~19% with 1 card)
     • Open-ended straight: 8 outs (~31% with 2 cards, ~17% with 1 card)
     • Gutshot: 4 outs (~17% with 2 cards, ~9% with 1 card)
     • Two overcards: 6 outs (~24% with 2 cards, ~13% with 1 card)

3. **Implied Odds**
   - Factor in potential future bets when you hit
   - Strong when: deep stacks, hidden draws, loose opponents
   - Weak when: obvious draws, short stacks, tight opponents

4. **Position Strategy**
   - Early position: Play tighter (premium hands)
   - Late position: Play wider (more speculative hands)
   - Button is the most profitable position

5. **Stack Size Considerations**
   - Short stack (<20BB): Push/fold strategy
   - Medium stack (20-50BB): Standard play
   - Deep stack (100BB+): Implied odds become important

When answering questions:
- Always show your math clearly
- Give a clear recommendation (call, fold, raise)
- Keep explanations concise but complete
- Use poker terminology appropriately

Be conversational but precise. Help users understand the "why" behind optimal plays.`;

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
