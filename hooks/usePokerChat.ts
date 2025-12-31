import { useState, useCallback } from 'react';
import { sendPokerChatMessage, type ChatMessage } from '@/services/pokerAI';

interface UsePokerChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "How can I help with your poker questions? Ask me about pot odds, equity, hand ranges, or any strategy question.",
  timestamp: new Date(),
};

export function usePokerChat(): UsePokerChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Get AI response
      const response = await sendPokerChatMessage(
        text,
        messages.filter((m) => m.id !== 'welcome') // Don't include welcome message in context
      );

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to get response');
      setError(errorMessage);

      // Add error message to chat
      const errorChat: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: "Sorry, I couldn't process that. Could you try rephrasing your question?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorChat]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
