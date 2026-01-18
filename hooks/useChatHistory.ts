import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getChatHistory, deleteChat } from '@/services/storageService';
import type { ChatConversation } from '@/types/chat';

export function useChatHistory() {
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<ChatConversation[]>([]);

  // Load chats from storage
  const loadChats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const history = await getChatHistory();
      setChats(history);
      setFilteredChats(history);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load chat history'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Manual refresh (pull-to-refresh)
  const handleRefresh = useCallback(() => {
    loadChats(true);
  }, [loadChats]);

  // Load on initial mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats])
  );

  // Simple text search for chats
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setFilteredChats(chats);
        return;
      }

      const lowerQuery = query.toLowerCase();
      const filtered = chats.filter(
        (c) =>
          c.title.toLowerCase().includes(lowerQuery) ||
          c.preview.toLowerCase().includes(lowerQuery) ||
          c.messages.some((m) => m.content.toLowerCase().includes(lowerQuery))
      );
      setFilteredChats(filtered);
    },
    [chats]
  );

  // Delete a chat
  const handleDelete = useCallback(
    async (chatId: string) => {
      await deleteChat(chatId);
      await loadChats(true);
    },
    [loadChats]
  );

  return {
    chats: filteredChats,
    allChats: chats,
    isLoading,
    isRefreshing,
    error,
    searchQuery,
    setSearchQuery: handleSearch,
    refresh: handleRefresh,
    deleteChat: handleDelete,
  };
}
