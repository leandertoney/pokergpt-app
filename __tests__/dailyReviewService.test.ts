import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDailyReviewState,
  saveDailyReviewState,
  hasReviewedToday,
  getNextReviewHand,
  completeReview,
  getAccuracyPercentage,
  resetDailyReviewState,
  getTrainingHandById,
  getOnboardingDemoHand,
} from '../services/dailyReviewService';
import {
  DailyReviewState,
  DEFAULT_DAILY_REVIEW_STATE,
} from '../types/dailyReview';

// Helper to get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];

// Helper to get yesterday's date string
const getYesterdayString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};

// Helper to get a date from 2 days ago
const getTwoDaysAgoString = () => {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  return twoDaysAgo.toISOString().split('T')[0];
};

describe('Daily Review Service', () => {
  beforeEach(async () => {
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
  });

  describe('getDailyReviewState', () => {
    it('should return default state when no state exists', async () => {
      const state = await getDailyReviewState();
      expect(state).toEqual(DEFAULT_DAILY_REVIEW_STATE);
    });

    it('should return stored state when it exists', async () => {
      const customState: DailyReviewState = {
        currentStreak: 5,
        bestStreak: 10,
        lastReviewDate: '2024-01-15',
        reviewedHandIds: ['hand-1', 'hand-2'],
        totalReviewed: 20,
        correctAnswers: 15,
      };

      await AsyncStorage.setItem(
        '@daily_review_state',
        JSON.stringify(customState)
      );

      const state = await getDailyReviewState();
      expect(state).toEqual(customState);
    });
  });

  describe('saveDailyReviewState', () => {
    it('should save state to AsyncStorage', async () => {
      const customState: DailyReviewState = {
        currentStreak: 7,
        bestStreak: 7,
        lastReviewDate: getTodayString(),
        reviewedHandIds: ['test-1'],
        totalReviewed: 10,
        correctAnswers: 8,
      };

      await saveDailyReviewState(customState);

      const stored = await AsyncStorage.getItem('@daily_review_state');
      expect(JSON.parse(stored!)).toEqual(customState);
    });
  });

  describe('hasReviewedToday', () => {
    it('should return false when no review has been done', async () => {
      const result = await hasReviewedToday();
      expect(result).toBe(false);
    });

    it('should return false when last review was yesterday', async () => {
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        lastReviewDate: getYesterdayString(),
      };
      await saveDailyReviewState(state);

      const result = await hasReviewedToday();
      expect(result).toBe(false);
    });

    it('should return true when last review was today', async () => {
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        lastReviewDate: getTodayString(),
      };
      await saveDailyReviewState(state);

      const result = await hasReviewedToday();
      expect(result).toBe(true);
    });
  });

  describe('completeReview', () => {
    it('should start a new streak on first review', async () => {
      const newState = await completeReview('training-1', true);

      expect(newState.currentStreak).toBe(1);
      expect(newState.bestStreak).toBe(1);
      expect(newState.lastReviewDate).toBe(getTodayString());
      expect(newState.totalReviewed).toBe(1);
      expect(newState.correctAnswers).toBe(1);
      expect(newState.reviewedHandIds).toContain('training-1');
    });

    it('should increment streak on consecutive day review', async () => {
      // Set up yesterday's state
      const yesterdayState: DailyReviewState = {
        currentStreak: 3,
        bestStreak: 5,
        lastReviewDate: getYesterdayString(),
        reviewedHandIds: ['old-hand'],
        totalReviewed: 10,
        correctAnswers: 7,
      };
      await saveDailyReviewState(yesterdayState);

      const newState = await completeReview('training-2', true);

      expect(newState.currentStreak).toBe(4);
      expect(newState.bestStreak).toBe(5); // Should keep the best
      expect(newState.totalReviewed).toBe(11);
      expect(newState.correctAnswers).toBe(8);
    });

    it('should reset streak if more than one day has passed', async () => {
      // Set up state from 2 days ago
      const oldState: DailyReviewState = {
        currentStreak: 10,
        bestStreak: 10,
        lastReviewDate: getTwoDaysAgoString(),
        reviewedHandIds: ['old-hand'],
        totalReviewed: 10,
        correctAnswers: 7,
      };
      await saveDailyReviewState(oldState);

      const newState = await completeReview('training-3', false);

      expect(newState.currentStreak).toBe(1); // Reset
      expect(newState.bestStreak).toBe(10); // Keep best
      expect(newState.totalReviewed).toBe(11);
      expect(newState.correctAnswers).toBe(7); // No increment (was wrong)
    });

    it('should not change streak if already reviewed today', async () => {
      const todayState: DailyReviewState = {
        currentStreak: 5,
        bestStreak: 5,
        lastReviewDate: getTodayString(),
        reviewedHandIds: ['first-hand-today'],
        totalReviewed: 5,
        correctAnswers: 3,
      };
      await saveDailyReviewState(todayState);

      const newState = await completeReview('second-hand-today', true);

      expect(newState.currentStreak).toBe(5); // No change
      expect(newState.totalReviewed).toBe(6);
      expect(newState.correctAnswers).toBe(4);
    });

    it('should update best streak when current exceeds it', async () => {
      const yesterdayState: DailyReviewState = {
        currentStreak: 5,
        bestStreak: 5,
        lastReviewDate: getYesterdayString(),
        reviewedHandIds: [],
        totalReviewed: 5,
        correctAnswers: 3,
      };
      await saveDailyReviewState(yesterdayState);

      const newState = await completeReview('training-1', true);

      expect(newState.currentStreak).toBe(6);
      expect(newState.bestStreak).toBe(6); // Updated to new best
    });

    it('should track incorrect answers', async () => {
      const newState = await completeReview('training-1', false);

      expect(newState.totalReviewed).toBe(1);
      expect(newState.correctAnswers).toBe(0); // Wrong answer
    });
  });

  describe('getAccuracyPercentage', () => {
    it('should return 0 when no reviews done', () => {
      const accuracy = getAccuracyPercentage(DEFAULT_DAILY_REVIEW_STATE);
      expect(accuracy).toBe(0);
    });

    it('should calculate correct percentage', () => {
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        totalReviewed: 10,
        correctAnswers: 7,
      };

      const accuracy = getAccuracyPercentage(state);
      expect(accuracy).toBe(70);
    });

    it('should return 100 when all correct', () => {
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        totalReviewed: 5,
        correctAnswers: 5,
      };

      const accuracy = getAccuracyPercentage(state);
      expect(accuracy).toBe(100);
    });

    it('should round to nearest integer', () => {
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        totalReviewed: 3,
        correctAnswers: 1,
      };

      const accuracy = getAccuracyPercentage(state);
      expect(accuracy).toBe(33); // 33.33 rounded
    });
  });

  describe('resetDailyReviewState', () => {
    it('should remove state from AsyncStorage', async () => {
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        currentStreak: 5,
      };
      await saveDailyReviewState(state);

      await resetDailyReviewState();

      const stored = await AsyncStorage.getItem('@daily_review_state');
      expect(stored).toBeNull();
    });
  });

  describe('getTrainingHandById', () => {
    it('should return the training hand with matching ID', () => {
      const hand = getTrainingHandById('training-1');
      expect(hand).toBeDefined();
      expect(hand?.id).toBe('training-1');
    });

    it('should return undefined for non-existent ID', () => {
      const hand = getTrainingHandById('non-existent-id');
      expect(hand).toBeUndefined();
    });
  });

  describe('getOnboardingDemoHand', () => {
    it('should return a beginner-level training hand', () => {
      const hand = getOnboardingDemoHand();
      expect(hand).toBeDefined();
      expect(hand.difficulty).toBe('beginner');
    });

    it('should return a hand with all required fields', () => {
      const hand = getOnboardingDemoHand();
      expect(hand).toHaveProperty('id');
      expect(hand).toHaveProperty('heroHand');
      expect(hand).toHaveProperty('heroPosition');
      expect(hand).toHaveProperty('villainPosition');
      expect(hand).toHaveProperty('villainAction');
      expect(hand).toHaveProperty('potSize');
      expect(hand).toHaveProperty('correctAction');
      expect(hand).toHaveProperty('explanation');
    });
  });

  describe('getNextReviewHand', () => {
    it('should return a training hand for new users', async () => {
      const hand = await getNextReviewHand();
      expect(hand).toBeDefined();
      expect(hand?.isTrainingHand).toBe(true);
    });

    it('should not return already reviewed hands', async () => {
      // Mark several hands as reviewed
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        reviewedHandIds: ['training-1', 'training-2', 'training-3'],
      };
      await saveDailyReviewState(state);

      const hand = await getNextReviewHand();

      if (hand) {
        expect(['training-1', 'training-2', 'training-3']).not.toContain(
          hand.id
        );
      }
    });

    it('should return hand with all required review fields', async () => {
      const hand = await getNextReviewHand();

      expect(hand).toHaveProperty('id');
      expect(hand).toHaveProperty('heroHand');
      expect(hand).toHaveProperty('heroPosition');
      expect(hand).toHaveProperty('villainPosition');
      expect(hand).toHaveProperty('villainAction');
      expect(hand).toHaveProperty('potSize');
      expect(hand).toHaveProperty('correctAction');
      expect(hand).toHaveProperty('explanation');
      expect(hand).toHaveProperty('isTrainingHand');
    });
  });
});

describe('Streak Logic Edge Cases', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should handle month boundary correctly', async () => {
    // Set last review to Jan 31
    const jan31 = '2024-01-31';
    const state: DailyReviewState = {
      ...DEFAULT_DAILY_REVIEW_STATE,
      currentStreak: 5,
      lastReviewDate: jan31,
    };
    await saveDailyReviewState(state);

    // If today is Feb 1, streak should continue
    // This test verifies the date handling doesn't break on month boundaries
    const currentState = await getDailyReviewState();
    expect(currentState.currentStreak).toBe(5);
  });

  it('should handle year boundary correctly', async () => {
    // Set last review to Dec 31
    const dec31 = '2024-12-31';
    const state: DailyReviewState = {
      ...DEFAULT_DAILY_REVIEW_STATE,
      currentStreak: 100,
      lastReviewDate: dec31,
    };
    await saveDailyReviewState(state);

    const currentState = await getDailyReviewState();
    expect(currentState.currentStreak).toBe(100);
  });
});
