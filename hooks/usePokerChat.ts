import { useState, useCallback, useEffect } from 'react';
import { type ChatMessage } from '@/services/pokerAI';
import { conversationalChat } from '@/services/supabaseAI';
import {
  createChat,
  updateChat,
  getChat,
  linkChatToSession,
  getActiveSession,
} from '@/services/storageService';

interface UsePokerChatOptions {
  chatId?: string; // If provided, load existing conversation
}

interface UsePokerChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  chatId: string | null;
  isInitialized: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "What's up? Tell me about the hand or ask me anything about poker.",
  timestamp: new Date(),
};

export function usePokerChat(options?: UsePokerChatOptions): UsePokerChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [chatId, setChatId] = useState<string | null>(options?.chatId || null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load existing conversation if chatId provided
  useEffect(() => {
    if (options?.chatId && !isInitialized) {
      loadExistingChat(options.chatId);
    } else if (!options?.chatId) {
      setIsInitialized(true);
    }
  }, [options?.chatId, isInitialized]);

  const loadExistingChat = async (id: string) => {
    try {
      const chat = await getChat(id);
      if (chat) {
        // Convert stored messages (timestamps may be strings from JSON)
        const loadedMessages = chat.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(loadedMessages);
        setChatId(id);
      }
    } catch (err) {
      console.error('Error loading chat:', err);
    } finally {
      setIsInitialized(true);
    }
  };

  // Persist messages to storage
  const persistMessages = useCallback(
    async (userMsg: ChatMessage, assistantMsg: ChatMessage) => {
      try {
        if (chatId) {
          // Update existing chat
          await updateChat(chatId, [userMsg, assistantMsg]);
        } else {
          // Create new chat
          const activeSession = await getActiveSession();
          const newChat = await createChat(userMsg, activeSession?.id);
          setChatId(newChat.id);

          // Add assistant message to the new chat
          await updateChat(newChat.id, [assistantMsg]);

          // Link to session if active
          if (activeSession) {
            await linkChatToSession(newChat.id);
          }
        }
      } catch (err) {
        console.error('Error persisting chat:', err);
      }
    },
    [chatId]
  );

  const sendMessage = useCallback(
    async (text: string) => {
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
        // Format messages for the conversational API
        const formattedMessages = messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }));
        formattedMessages.push({ role: 'user' as const, content: text.trim() });

        // Get AI response using conversational chat
        const { response } = await conversationalChat(formattedMessages, {});

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Persist the conversation (don't await to avoid blocking UI)
        persistMessages(userMessage, assistantMessage);
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
    },
    [messages, isLoading, persistMessages]
  );

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setChatId(null);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    chatId,
    isInitialized,
    sendMessage,
    clearChat,
  };
}
