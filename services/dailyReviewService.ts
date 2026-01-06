import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DailyReviewState,
  ReviewHandData,
  DEFAULT_DAILY_REVIEW_STATE,
  TrainingHand
} from '@/types/dailyReview';
import { StoredHand, PlayerArchetype } from '@/types/poker';
import { getHandHistory, getUserIdentity } from './storageService';
import { TRAINING_HANDS, getRandomTrainingHand } from '@/data/trainingHands';

const DAILY_REVIEW_KEY = '@daily_review_state';

// Get today's date as YYYY-MM-DD string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Check if two date strings are consecutive days
function isConsecutiveDay(lastDate: string, currentDate: string): boolean {
  const last = new Date(lastDate);
  const current = new Date(currentDate);
  const diffTime = current.getTime() - last.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

// Check if date is today
function isToday(dateString: string): boolean {
  return dateString === getTodayString();
}

// Load daily review state from storage
export async function getDailyReviewState(): Promise<DailyReviewState> {
  try {
    const stored = await AsyncStorage.getItem(DAILY_REVIEW_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_DAILY_REVIEW_STATE;
  } catch (error) {
    console.error('Error getting daily review state:', error);
    return DEFAULT_DAILY_REVIEW_STATE;
  }
}

// Save daily review state
export async function saveDailyReviewState(state: DailyReviewState): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_REVIEW_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving daily review state:', error);
  }
}

// Check if user has already reviewed today
export async function hasReviewedToday(): Promise<boolean> {
  const state = await getDailyReviewState();
  return state.lastReviewDate === getTodayString();
}

// Get the next hand to review
export async function getNextReviewHand(): Promise<ReviewHandData | null> {
  const state = await getDailyReviewState();
  const userIdentity = await getUserIdentity();
  const hands = await getHandHistory();

  // First, try to get a user's hand that hasn't been reviewed
  const unreviewedUserHand = findBestUserHand(hands, state.reviewedHandIds);

  if (unreviewedUserHand) {
    return convertStoredHandToReviewHand(unreviewedUserHand);
  }

  // If no user hands, get a training hand
  const trainingHand = getNextTrainingHand(
    state.reviewedHandIds,
    userIdentity?.archetype || null
  );

  if (trainingHand) {
    return convertTrainingHandToReviewHand(trainingHand);
  }

  // If all hands reviewed, reset training hands and pick one
  // This means user has seen all training hands - loop back
  const anyTrainingHand = TRAINING_HANDS[Math.floor(Math.random() * TRAINING_HANDS.length)];
  return convertTrainingHandToReviewHand(anyTrainingHand);
}

// Find the best user hand to review based on priority algorithm
function findBestUserHand(hands: StoredHand[], excludeIds: string[]): StoredHand | null {
  const now = Date.now();
  const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);

  // Filter out already reviewed hands
  const available = hands.filter(h =>
    h.handData.id && !excludeIds.includes(h.handData.id)
  );

  if (available.length === 0) return null;

  // Score each hand based on priority
  const scored = available.map(hand => {
    let score = 0;

    // Prefer recent hands (within 48 hours)
    if (hand.timestamp > fortyEightHoursAgo) {
      score += 50;
    }

    // Prefer hands with lower confidence (more interesting spots)
    if (hand.analysis.confidence < 85) {
      score += 30;
    }
    if (hand.analysis.confidence < 70) {
      score += 20;
    }

    // Prefer postflop hands (more to learn)
    if (hand.handData.flop && hand.handData.flop.length > 0) {
      score += 10;
    }

    // Prefer river decisions (hardest street)
    if (hand.handData.river) {
      score += 15;
    }

    // Add some randomness
    score += Math.random() * 10;

    return { hand, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.hand || null;
}

// Get next training hand based on user archetype
function getNextTrainingHand(excludeIds: string[], archetype: PlayerArchetype | null): TrainingHand | null {
  let available = TRAINING_HANDS.filter(h => !excludeIds.includes(h.id));

  // If archetype set, prefer matching hands
  if (archetype && available.length > 5) {
    const archetypeHands = available.filter(h =>
      !h.archetypes || h.archetypes.includes(archetype)
    );
    if (archetypeHands.length > 0) {
      available = archetypeHands;
    }
  }

  if (available.length === 0) return null;

  // Mix of difficulties, slight preference for intermediate
  const weights = {
    beginner: available.filter(h => h.difficulty === 'beginner'),
    intermediate: available.filter(h => h.difficulty === 'intermediate'),
    advanced: available.filter(h => h.difficulty === 'advanced'),
  };

  // Pick category based on weighted random
  const rand = Math.random();
  let pool: TrainingHand[];
  if (rand < 0.3 && weights.beginner.length > 0) {
    pool = weights.beginner;
  } else if (rand < 0.7 && weights.intermediate.length > 0) {
    pool = weights.intermediate;
  } else if (weights.advanced.length > 0) {
    pool = weights.advanced;
  } else {
    pool = available;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// Convert a stored hand to review format
function convertStoredHandToReviewHand(stored: StoredHand): ReviewHandData {
  const { handData, analysis } = stored;

  // Determine the action facing user
  let villainAction = 'checks';
  let board = '';
  let potSize = 100; // Default
  let toCall: number | undefined;

  // Build board string
  if (handData.flop) {
    board = handData.flop.join(' ');
    if (handData.turn) {
      board += ` ${handData.turn}`;
    }
    if (handData.river) {
      board += ` ${handData.river}`;
    }
  }

  // Try to determine villain action from the hand data
  if (handData.potSize) {
    potSize = handData.potSize;
  }

  // Use recommended action as "correct" for user hands
  const correctAction = mapActionToReviewAnswer(analysis.recommendedAction);

  return {
    id: handData.id || `user-${Date.now()}`,
    heroHand: handData.heroHand || '?? ??',
    heroPosition: handData.heroPosition || 'BTN',
    villainPosition: handData.villainPosition || 'BB',
    villainAction: villainAction,
    board: board || undefined,
    potSize: potSize,
    toCall: toCall,
    correctAction: correctAction,
    explanation: analysis.reasoning || 'Review the analysis for details.',
    userActualAction: handData.action,
    isTrainingHand: false,
  };
}

// Convert training hand to review format
function convertTrainingHandToReviewHand(training: TrainingHand): ReviewHandData {
  return {
    id: training.id,
    heroHand: training.heroHand,
    heroPosition: training.heroPosition,
    villainPosition: training.villainPosition,
    villainAction: training.villainAction,
    board: training.board,
    potSize: training.potSize,
    toCall: training.toCall,
    correctAction: training.correctAction,
    explanation: training.explanation,
    isTrainingHand: true,
  };
}

// Map action string to review answer
function mapActionToReviewAnswer(action: string): 'fold' | 'call' | 'raise' | 'check' | 'bet' {
  const lower = action.toLowerCase();
  if (lower.includes('fold')) return 'fold';
  if (lower.includes('call')) return 'call';
  if (lower.includes('raise') || lower.includes('3-bet') || lower.includes('4-bet')) return 'raise';
  if (lower.includes('check')) return 'check';
  if (lower.includes('bet')) return 'bet';
  return 'call'; // Default
}

// Complete a review and update state
export async function completeReview(
  handId: string,
  wasCorrect: boolean
): Promise<DailyReviewState> {
  const state = await getDailyReviewState();
  const today = getTodayString();

  // Update streak
  let newStreak = state.currentStreak;

  if (state.lastReviewDate === null) {
    // First ever review
    newStreak = 1;
  } else if (isToday(state.lastReviewDate)) {
    // Already reviewed today, don't change streak
  } else if (isConsecutiveDay(state.lastReviewDate, today)) {
    // Consecutive day, increment streak
    newStreak = state.currentStreak + 1;
  } else {
    // Streak broken, start fresh
    newStreak = 1;
  }

  const newState: DailyReviewState = {
    currentStreak: newStreak,
    bestStreak: Math.max(state.bestStreak, newStreak),
    lastReviewDate: today,
    reviewedHandIds: [...state.reviewedHandIds, handId],
    totalReviewed: state.totalReviewed + 1,
    correctAnswers: state.correctAnswers + (wasCorrect ? 1 : 0),
  };

  await saveDailyReviewState(newState);
  return newState;
}

// Get accuracy percentage
export function getAccuracyPercentage(state: DailyReviewState): number {
  if (state.totalReviewed === 0) return 0;
  return Math.round((state.correctAnswers / state.totalReviewed) * 100);
}

// Reset daily review state (for testing)
export async function resetDailyReviewState(): Promise<void> {
  await AsyncStorage.removeItem(DAILY_REVIEW_KEY);
}

// Get a specific training hand by ID (for onboarding demo)
export function getTrainingHandById(id: string): TrainingHand | undefined {
  return TRAINING_HANDS.find(h => h.id === id);
}

// Get a beginner-friendly training hand for onboarding
export function getOnboardingDemoHand(): TrainingHand {
  const beginnerHands = TRAINING_HANDS.filter(h => h.difficulty === 'beginner');
  // Pick a memorable one - pocket Aces
  return beginnerHands.find(h => h.id === 'training-1') || beginnerHands[0];
}
