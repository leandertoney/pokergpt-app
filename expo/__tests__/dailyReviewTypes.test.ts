import {
  TrainingHand,
  ReviewAnswer,
  DailyReviewState,
  ReviewSession,
  ReviewHandData,
  DEFAULT_DAILY_REVIEW_STATE,
} from '../types/dailyReview';

describe('Daily Review Types', () => {
  describe('DEFAULT_DAILY_REVIEW_STATE', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_DAILY_REVIEW_STATE).toEqual({
        currentStreak: 0,
        bestStreak: 0,
        lastReviewDate: null,
        reviewedHandIds: [],
        totalReviewed: 0,
        correctAnswers: 0,
      });
    });

    it('should be immutable (not affect other tests)', () => {
      // Verify the default state hasn't been mutated
      expect(DEFAULT_DAILY_REVIEW_STATE.currentStreak).toBe(0);
      expect(DEFAULT_DAILY_REVIEW_STATE.reviewedHandIds).toHaveLength(0);
    });
  });

  describe('TrainingHand type structure', () => {
    it('should accept valid training hand object', () => {
      const validHand: TrainingHand = {
        id: 'test-1',
        heroHand: 'A♠ K♠',
        heroPosition: 'BTN',
        villainPosition: 'BB',
        villainAction: 'raises to $10',
        board: 'K♥ 7♣ 2♠',
        potSize: 25,
        toCall: 10,
        correctAction: 'raise',
        explanation: 'Test explanation',
        difficulty: 'intermediate',
        category: 'postflop',
        archetypes: ['shark', 'strategist'],
      };

      expect(validHand.id).toBe('test-1');
      expect(validHand.difficulty).toBe('intermediate');
    });

    it('should accept training hand without optional fields', () => {
      const minimalHand: TrainingHand = {
        id: 'test-2',
        heroHand: 'Q♥ Q♦',
        heroPosition: 'CO',
        villainPosition: 'BTN',
        villainAction: 'checks',
        potSize: 50,
        correctAction: 'bet',
        explanation: 'Bet for value',
        difficulty: 'beginner',
        category: 'preflop',
      };

      expect(minimalHand.board).toBeUndefined();
      expect(minimalHand.toCall).toBeUndefined();
      expect(minimalHand.archetypes).toBeUndefined();
    });
  });

  describe('ReviewAnswer type', () => {
    it('should accept all valid answer types', () => {
      const validAnswers: ReviewAnswer[] = [
        'fold',
        'call',
        'raise',
        'check',
        'bet',
      ];

      validAnswers.forEach((answer) => {
        expect(['fold', 'call', 'raise', 'check', 'bet']).toContain(answer);
      });
    });
  });

  describe('DailyReviewState type structure', () => {
    it('should accept valid state object', () => {
      const validState: DailyReviewState = {
        currentStreak: 5,
        bestStreak: 10,
        lastReviewDate: '2024-01-15',
        reviewedHandIds: ['hand-1', 'hand-2'],
        totalReviewed: 20,
        correctAnswers: 15,
      };

      expect(validState.currentStreak).toBe(5);
      expect(validState.reviewedHandIds).toHaveLength(2);
    });

    it('should accept state with null lastReviewDate', () => {
      const newUserState: DailyReviewState = {
        currentStreak: 0,
        bestStreak: 0,
        lastReviewDate: null,
        reviewedHandIds: [],
        totalReviewed: 0,
        correctAnswers: 0,
      };

      expect(newUserState.lastReviewDate).toBeNull();
    });
  });

  describe('ReviewSession type structure', () => {
    it('should accept valid session object', () => {
      const validSession: ReviewSession = {
        handId: 'training-1',
        isTrainingHand: true,
        userAnswer: 'call',
        correctAnswer: 'call',
        wasCorrect: true,
        completedAt: '2024-01-15T10:30:00Z',
      };

      expect(validSession.wasCorrect).toBe(true);
    });

    it('should accept session with null values for incomplete review', () => {
      const incompleteSession: ReviewSession = {
        handId: 'training-2',
        isTrainingHand: true,
        userAnswer: null,
        correctAnswer: 'raise',
        wasCorrect: null,
        completedAt: null,
      };

      expect(incompleteSession.userAnswer).toBeNull();
      expect(incompleteSession.wasCorrect).toBeNull();
    });
  });

  describe('ReviewHandData type structure', () => {
    it('should accept valid review hand data', () => {
      const validData: ReviewHandData = {
        id: 'review-1',
        heroHand: 'J♠ T♠',
        heroPosition: 'CO',
        villainPosition: 'BB',
        villainAction: 'donk bets $20',
        board: '9♥ 8♦ 2♣',
        potSize: 60,
        toCall: 20,
        correctAction: 'call',
        explanation: 'You have an open-ended straight draw',
        isTrainingHand: true,
      };

      expect(validData.isTrainingHand).toBe(true);
    });

    it('should accept review hand data with user actual action', () => {
      const userHandData: ReviewHandData = {
        id: 'user-hand-1',
        heroHand: 'A♦ K♦',
        heroPosition: 'BTN',
        villainPosition: 'BB',
        villainAction: 'checks',
        board: 'Q♠ 7♥ 3♣',
        potSize: 40,
        correctAction: 'bet',
        explanation: 'C-bet with two overcards',
        userActualAction: 'check',
        isTrainingHand: false,
      };

      expect(userHandData.userActualAction).toBe('check');
      expect(userHandData.isTrainingHand).toBe(false);
    });
  });
});

describe('Type Validation Scenarios', () => {
  describe('Streak calculations', () => {
    it('should allow bestStreak to be greater than currentStreak', () => {
      const state: DailyReviewState = {
        currentStreak: 3,
        bestStreak: 15,
        lastReviewDate: '2024-01-01',
        reviewedHandIds: [],
        totalReviewed: 50,
        correctAnswers: 35,
      };

      expect(state.bestStreak).toBeGreaterThan(state.currentStreak);
    });

    it('should allow currentStreak to equal bestStreak', () => {
      const state: DailyReviewState = {
        currentStreak: 10,
        bestStreak: 10,
        lastReviewDate: '2024-01-15',
        reviewedHandIds: [],
        totalReviewed: 10,
        correctAnswers: 8,
      };

      expect(state.currentStreak).toBe(state.bestStreak);
    });
  });

  describe('Accuracy calculations', () => {
    it('should handle perfect accuracy', () => {
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        totalReviewed: 100,
        correctAnswers: 100,
      };

      const accuracy = (state.correctAnswers / state.totalReviewed) * 100;
      expect(accuracy).toBe(100);
    });

    it('should handle zero accuracy', () => {
      const state: DailyReviewState = {
        ...DEFAULT_DAILY_REVIEW_STATE,
        totalReviewed: 10,
        correctAnswers: 0,
      };

      const accuracy = (state.correctAnswers / state.totalReviewed) * 100;
      expect(accuracy).toBe(0);
    });
  });
});
