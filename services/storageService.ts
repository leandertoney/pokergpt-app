import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HandData, AnalysisResult, StoredHand, UserTier } from '@/types/poker';
import { MAX_FREE_HANDS } from '@/types/poker';

const HANDS_STORAGE_KEY = '@poker_hands';
const USER_TIER_KEY = '@user_tier';

export async function storeHand(handData: HandData, analysis: AnalysisResult): Promise<void> {
  try {
    const hands = await getHandHistory();
    const userTier = await getUserTier();
    
    const newHand: StoredHand = {
      handData,
      analysis,
      timestamp: Date.now(),
    };
    
    hands.unshift(newHand);
    
    if (userTier === 'free' && hands.length > MAX_FREE_HANDS) {
      hands.splice(MAX_FREE_HANDS);
    }
    
    await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(hands));
    console.log('Hand stored successfully');
  } catch (error) {
    console.error('Error storing hand:', error);
  }
}

export async function getHandHistory(): Promise<StoredHand[]> {
  try {
    const stored = await AsyncStorage.getItem(HANDS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting hand history:', error);
    return [];
  }
}

export async function pruneHistory(userTier: UserTier): Promise<void> {
  try {
    if (userTier === 'free') {
      const hands = await getHandHistory();
      if (hands.length > MAX_FREE_HANDS) {
        hands.splice(MAX_FREE_HANDS);
        await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(hands));
      }
    }
  } catch (error) {
    console.error('Error pruning history:', error);
  }
}

export async function getUserTier(): Promise<UserTier> {
  try {
    const tier = await AsyncStorage.getItem(USER_TIER_KEY);
    return (tier as UserTier) || 'free';
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'free';
  }
}

export async function setUserTier(tier: UserTier): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_TIER_KEY, tier);
  } catch (error) {
    console.error('Error setting user tier:', error);
  }
}

export async function deleteHand(handId: string): Promise<void> {
  try {
    const hands = await getHandHistory();
    const filtered = hands.filter(h => h.handData.id !== handId);
    await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting hand:', error);
  }
}

export async function clearAllHands(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HANDS_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing hands:', error);
  }
}
