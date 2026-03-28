import { generateText } from './supabaseAI';
import { GENERAL_POKER_PROMPT } from '@/constants/prompts';

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
    .map((msg) => `${msg.role === 'user' ? 'User' : 'PokerPro AI'}: ${msg.content}`)
    .join('\n\n');

  const prompt = historyContext
    ? `Previous conversation:\n${historyContext}\n\nUser: ${userMessage}`
    : userMessage;

  const response = await generateText(prompt, GENERAL_POKER_PROMPT);
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
