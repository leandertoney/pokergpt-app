/**
 * Sync Service - Handles guest-to-user data migration and cloud sync orchestration
 *
 * This service ensures:
 * 1. All local data is migrated when a guest user creates an account
 * 2. Data syncs to cloud when online
 * 3. App works offline with local fallback
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storageService from './storageService';
import * as supabaseStorage from './supabaseStorage';
import { supabase, isSupabaseConfigured, getCurrentUserId } from '@/lib/supabase';

const SYNC_STATUS_KEY = '@sync_status';
const MIGRATION_STATUS_KEY = '@migration_status';

export interface MigrationResult {
  success: boolean;
  handsMigrated: number;
  sessionsMigrated: number;
  chatsMigrated: number;
  favoritesMigrated: number;
  preferencesMigrated: boolean;
  errors: string[];
  migratedAt: number;
}

export interface SyncStatus {
  lastSyncedAt: number | null;
  lastMigrationAt: number | null;
  pendingSync: boolean;
  isOnline: boolean;
}

/**
 * Get the current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const stored = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting sync status:', error);
  }

  return {
    lastSyncedAt: null,
    lastMigrationAt: null,
    pendingSync: false,
    isOnline: true,
  };
}

/**
 * Update sync status
 */
async function updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
  try {
    const current = await getSyncStatus();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating sync status:', error);
  }
}

/**
 * Check if migration has already been performed for this user
 */
async function hasMigrationCompleted(authId: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(MIGRATION_STATUS_KEY);
    if (stored) {
      const status = JSON.parse(stored);
      return status.authId === authId && status.completed === true;
    }
  } catch (error) {
    console.error('Error checking migration status:', error);
  }
  return false;
}

/**
 * Mark migration as completed for a user
 */
async function markMigrationCompleted(authId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify({
      authId,
      completed: true,
      completedAt: Date.now(),
    }));
  } catch (error) {
    console.error('Error marking migration completed:', error);
  }
}

/**
 * Migrate all guest data to the authenticated user's account
 * This is called when a guest user signs up or signs in
 */
export async function migrateGuestDataToUser(authId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    handsMigrated: 0,
    sessionsMigrated: 0,
    chatsMigrated: 0,
    favoritesMigrated: 0,
    preferencesMigrated: false,
    errors: [],
    migratedAt: Date.now(),
  };

  // Check if Supabase is configured
  if (!isSupabaseConfigured() || !supabase) {
    result.errors.push('Supabase not configured');
    return result;
  }

  // Check if migration already completed for this user
  const alreadyMigrated = await hasMigrationCompleted(authId);
  if (alreadyMigrated) {
    console.log('Migration already completed for user:', authId);
    result.success = true;
    return result;
  }

  console.log('Starting migration for user:', authId);

  try {
    // Get or create the user record (this links visitor_id to auth_id)
    const user = await supabaseStorage.getOrCreateUser();
    if (!user) {
      result.errors.push('Failed to get or create user record');
      return result;
    }

    // 1. Migrate hands
    try {
      const localHands = await storageService.getHandHistory();
      console.log(`Migrating ${localHands.length} hands...`);

      for (const hand of localHands) {
        try {
          await supabaseStorage.upsertHand(user.id, hand);
          result.handsMigrated++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`Hand ${hand.handData.id}: ${errorMsg}`);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Hands migration failed: ${errorMsg}`);
    }

    // 2. Migrate sessions
    try {
      const localSessions = await storageService.getSessionHistory();
      console.log(`Migrating ${localSessions.length} sessions...`);

      for (const session of localSessions) {
        try {
          await supabaseStorage.upsertSession(user.id, session);
          result.sessionsMigrated++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`Session ${session.id}: ${errorMsg}`);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Sessions migration failed: ${errorMsg}`);
    }

    // 3. Migrate chats
    try {
      const localChats = await storageService.getChatHistory();
      console.log(`Migrating ${localChats.length} chats...`);

      for (const chat of localChats) {
        try {
          await supabaseStorage.upsertChat(user.id, chat);
          result.chatsMigrated++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`Chat ${chat.id}: ${errorMsg}`);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Chats migration failed: ${errorMsg}`);
    }

    // 4. Migrate favorites
    try {
      const localFavorites = await storageService.getFavorites();
      console.log(`Migrating ${localFavorites.length} favorites...`);

      for (const fav of localFavorites) {
        try {
          await supabaseStorage.upsertFavorite(user.id, fav);
          result.favoritesMigrated++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          result.errors.push(`Favorite ${fav.id}: ${errorMsg}`);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Favorites migration failed: ${errorMsg}`);
    }

    // 5. Migrate preferences (voice settings, daily review state, session preferences)
    try {
      const [voiceSettings, sessionPrefs] = await Promise.all([
        storageService.getVoiceSettings(),
        storageService.getSessionPreferences(),
      ]);

      // Import daily review state
      const { getDailyReviewState } = await import('./dailyReviewService');
      const dailyReviewState = await getDailyReviewState();

      await supabaseStorage.upsertPreferences(user.id, {
        voiceSettings,
        dailyReviewState,
        sessionPreferences: sessionPrefs,
      });
      result.preferencesMigrated = true;
      console.log('Preferences migrated');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Preferences migration failed: ${errorMsg}`);
    }

    // Mark migration as completed
    await markMigrationCompleted(authId);
    await updateSyncStatus({ lastMigrationAt: Date.now() });

    result.success = result.errors.length === 0;
    console.log('Migration completed:', result);

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(`Migration failed: ${errorMsg}`);
    console.error('Migration error:', err);
    return result;
  }
}

/**
 * Sync local data to cloud (call periodically or on app foreground)
 */
export async function syncToCloud(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, errors: ['Supabase not configured'] };
  }

  const authId = await getCurrentUserId();
  if (!authId) {
    // User not authenticated, skip sync
    return { success: true, errors: [] };
  }

  try {
    const user = await supabaseStorage.getOrCreateUser();
    if (!user) {
      return { success: false, errors: ['Failed to get user record'] };
    }

    // Sync hands
    const hands = await storageService.getHandHistory();
    for (const hand of hands) {
      try {
        await supabaseStorage.upsertHand(user.id, hand);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Hand sync failed: ${errorMsg}`);
      }
    }

    // Sync sessions
    const sessions = await storageService.getSessionHistory();
    for (const session of sessions) {
      try {
        await supabaseStorage.upsertSession(user.id, session);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Session sync failed: ${errorMsg}`);
      }
    }

    // Sync chats
    const chats = await storageService.getChatHistory();
    for (const chat of chats) {
      try {
        await supabaseStorage.upsertChat(user.id, chat);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Chat sync failed: ${errorMsg}`);
      }
    }

    // Sync favorites
    const favorites = await storageService.getFavorites();
    for (const fav of favorites) {
      try {
        await supabaseStorage.upsertFavorite(user.id, fav);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Favorite sync failed: ${errorMsg}`);
      }
    }

    await updateSyncStatus({ lastSyncedAt: Date.now(), pendingSync: false });

    return { success: errors.length === 0, errors };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    errors.push(`Sync failed: ${errorMsg}`);
    return { success: false, errors };
  }
}

/**
 * Pull data from cloud to local storage (for restoring on new device)
 */
export async function pullFromCloud(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, errors: ['Supabase not configured'] };
  }

  const authId = await getCurrentUserId();
  if (!authId) {
    return { success: false, errors: ['User not authenticated'] };
  }

  try {
    const user = await supabaseStorage.getOrCreateUser();
    if (!user) {
      return { success: false, errors: ['Failed to get user record'] };
    }

    // Pull and merge hands
    try {
      const cloudHands = await supabaseStorage.getCloudHands(user.id);
      const localHands = await storageService.getHandHistory();

      // Merge: add cloud hands that don't exist locally
      const localHandIds = new Set(localHands.map(h => h.handData.id));
      for (const cloudHand of cloudHands) {
        if (!localHandIds.has(cloudHand.handData.id)) {
          localHands.push(cloudHand);
        }
      }

      // Sort by timestamp descending
      localHands.sort((a, b) => b.timestamp - a.timestamp);

      // Save merged hands
      await AsyncStorage.setItem('@poker_hands', JSON.stringify(localHands));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Hands pull failed: ${errorMsg}`);
    }

    // Pull and merge sessions
    try {
      const cloudSessions = await supabaseStorage.getCloudSessions(user.id);
      const localSessions = await storageService.getSessionHistory();

      const localSessionIds = new Set(localSessions.map(s => s.id));
      for (const cloudSession of cloudSessions) {
        if (!localSessionIds.has(cloudSession.id)) {
          localSessions.push(cloudSession);
        }
      }

      localSessions.sort((a, b) => b.startTime - a.startTime);
      await AsyncStorage.setItem('@poker_sessions', JSON.stringify(localSessions));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Sessions pull failed: ${errorMsg}`);
    }

    // Pull and merge chats
    try {
      const cloudChats = await supabaseStorage.getCloudChats(user.id);
      const localChats = await storageService.getChatHistory();

      const localChatIds = new Set(localChats.map(c => c.id));
      for (const cloudChat of cloudChats) {
        if (!localChatIds.has(cloudChat.id)) {
          localChats.push(cloudChat);
        }
      }

      localChats.sort((a, b) => b.updatedAt - a.updatedAt);
      await AsyncStorage.setItem('@poker_chats', JSON.stringify(localChats));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Chats pull failed: ${errorMsg}`);
    }

    // Pull and merge favorites
    try {
      const cloudFavorites = await supabaseStorage.getCloudFavorites(user.id);
      const localFavorites = await storageService.getFavorites();

      const localFavKeys = new Set(localFavorites.map(f => `${f.id}:${f.type}`));
      for (const cloudFav of cloudFavorites) {
        if (!localFavKeys.has(`${cloudFav.id}:${cloudFav.type}`)) {
          localFavorites.push(cloudFav);
        }
      }

      await AsyncStorage.setItem('@poker_favorites', JSON.stringify(localFavorites));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Favorites pull failed: ${errorMsg}`);
    }

    // Pull preferences
    try {
      const cloudPrefs = await supabaseStorage.getCloudPreferences(user.id);
      if (cloudPrefs) {
        if (cloudPrefs.voiceSettings) {
          await storageService.setVoiceSettings(cloudPrefs.voiceSettings);
        }
        if (cloudPrefs.sessionPreferences) {
          await storageService.setSessionPreferences(cloudPrefs.sessionPreferences);
        }
        // Daily review state would need to be imported separately if needed
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Preferences pull failed: ${errorMsg}`);
    }

    await updateSyncStatus({ lastSyncedAt: Date.now() });

    return { success: errors.length === 0, errors };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    errors.push(`Pull failed: ${errorMsg}`);
    return { success: false, errors };
  }
}

/**
 * Clear migration status (for testing/debugging)
 */
export async function clearMigrationStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MIGRATION_STATUS_KEY);
    await AsyncStorage.removeItem(SYNC_STATUS_KEY);
    console.log('Migration status cleared');
  } catch (error) {
    console.error('Error clearing migration status:', error);
  }
}
