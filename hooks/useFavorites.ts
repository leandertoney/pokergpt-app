import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from '@/services/storageService';
import type { FavoriteItem } from '@/types/favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from storage
  const loadFavorites = useCallback(async () => {
    try {
      const stored = await getFavorites();
      setFavorites(stored);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  // Check if an item is favorited
  const isFavorite = useCallback(
    (id: string, type: 'hand' | 'chat'): boolean => {
      return favorites.some(f => f.id === id && f.type === type);
    },
    [favorites]
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (id: string, type: 'hand' | 'chat'): Promise<void> => {
      const currentlyFavorited = isFavorite(id, type);

      // Optimistic update
      if (currentlyFavorited) {
        setFavorites(prev => prev.filter(f => !(f.id === id && f.type === type)));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        const newFavorite: FavoriteItem = {
          id,
          type,
          favoritedAt: Date.now(),
        };
        setFavorites(prev => [newFavorite, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Persist to storage
      try {
        if (currentlyFavorited) {
          await removeFavorite(id, type);
        } else {
          await addFavorite(id, type);
        }
      } catch (error) {
        // Revert optimistic update on error
        console.error('Error toggling favorite:', error);
        await loadFavorites();
      }
    },
    [isFavorite, loadFavorites]
  );

  // Get IDs of favorited hands
  const getFavoriteHandIds = useCallback((): Set<string> => {
    return new Set(
      favorites.filter(f => f.type === 'hand').map(f => f.id)
    );
  }, [favorites]);

  // Get IDs of favorited chats
  const getFavoriteChatIds = useCallback((): Set<string> => {
    return new Set(
      favorites.filter(f => f.type === 'chat').map(f => f.id)
    );
  }, [favorites]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    getFavoriteHandIds,
    getFavoriteChatIds,
    refresh: loadFavorites,
  };
}
