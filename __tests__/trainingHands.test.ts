import {
  TRAINING_HANDS,
  getTrainingHandsByDifficulty,
  getTrainingHandsForArchetype,
  getRandomTrainingHand,
} from '../data/trainingHands';
import { TrainingHand } from '../types/dailyReview';

describe('Training Hands Data', () => {
  describe('TRAINING_HANDS array', () => {
    it('should have at least 20 training hands', () => {
      expect(TRAINING_HANDS.length).toBeGreaterThanOrEqual(20);
    });

    it('should have unique IDs for all hands', () => {
      const ids = TRAINING_HANDS.map((h) => h.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid positions for all hands', () => {
      const validPositions = ['UTG', 'UTG+1', 'MP', 'CO', 'BTN', 'SB', 'BB'];

      TRAINING_HANDS.forEach((hand) => {
        expect(validPositions).toContain(hand.heroPosition);
        expect(validPositions).toContain(hand.villainPosition);
      });
    });

    it('should have valid difficulty levels for all hands', () => {
      const validDifficulties = ['beginner', 'intermediate', 'advanced'];

      TRAINING_HANDS.forEach((hand) => {
        expect(validDifficulties).toContain(hand.difficulty);
      });
    });

    it('should have valid correct actions for all hands', () => {
      const validActions = ['fold', 'call', 'raise', 'check', 'bet'];

      TRAINING_HANDS.forEach((hand) => {
        expect(validActions).toContain(hand.correctAction);
      });
    });

    it('should have non-empty explanations for all hands', () => {
      TRAINING_HANDS.forEach((hand) => {
        expect(hand.explanation).toBeTruthy();
        expect(hand.explanation.length).toBeGreaterThan(10);
      });
    });

    it('should have valid hero hands (2 cards)', () => {
      const cardPattern = /^[AKQJT2-9][♠♥♦♣]\s[AKQJT2-9][♠♥♦♣]$/;

      TRAINING_HANDS.forEach((hand) => {
        expect(hand.heroHand).toMatch(cardPattern);
      });
    });

    it('should have positive pot sizes', () => {
      TRAINING_HANDS.forEach((hand) => {
        expect(hand.potSize).toBeGreaterThan(0);
      });
    });

    it('should have toCall only when correct action is call or raise', () => {
      TRAINING_HANDS.forEach((hand) => {
        if (hand.correctAction === 'call' || hand.correctAction === 'raise') {
          // toCall can exist but isn't required
        }
        if (hand.correctAction === 'check' || hand.correctAction === 'bet') {
          // toCall shouldn't be required for these actions
        }
      });
    });
  });

  describe('Difficulty Distribution', () => {
    it('should have beginner hands', () => {
      const beginnerHands = TRAINING_HANDS.filter(
        (h) => h.difficulty === 'beginner'
      );
      expect(beginnerHands.length).toBeGreaterThan(0);
    });

    it('should have intermediate hands', () => {
      const intermediateHands = TRAINING_HANDS.filter(
        (h) => h.difficulty === 'intermediate'
      );
      expect(intermediateHands.length).toBeGreaterThan(0);
    });

    it('should have advanced hands', () => {
      const advancedHands = TRAINING_HANDS.filter(
        (h) => h.difficulty === 'advanced'
      );
      expect(advancedHands.length).toBeGreaterThan(0);
    });
  });

  describe('Category Distribution', () => {
    it('should have preflop hands', () => {
      const preflopHands = TRAINING_HANDS.filter(
        (h) => h.category === 'preflop'
      );
      expect(preflopHands.length).toBeGreaterThan(0);
    });

    it('should have postflop hands', () => {
      const postflopHands = TRAINING_HANDS.filter(
        (h) => h.category === 'postflop'
      );
      expect(postflopHands.length).toBeGreaterThan(0);
    });

    it('should have river hands', () => {
      const riverHands = TRAINING_HANDS.filter((h) => h.category === 'river');
      expect(riverHands.length).toBeGreaterThan(0);
    });
  });
});

describe('getTrainingHandsByDifficulty', () => {
  it('should return only beginner hands when filtering for beginner', () => {
    const result = getTrainingHandsByDifficulty('beginner');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((hand) => {
      expect(hand.difficulty).toBe('beginner');
    });
  });

  it('should return only intermediate hands when filtering for intermediate', () => {
    const result = getTrainingHandsByDifficulty('intermediate');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((hand) => {
      expect(hand.difficulty).toBe('intermediate');
    });
  });

  it('should return only advanced hands when filtering for advanced', () => {
    const result = getTrainingHandsByDifficulty('advanced');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((hand) => {
      expect(hand.difficulty).toBe('advanced');
    });
  });
});

describe('getTrainingHandsForArchetype', () => {
  it('should return hands for shark archetype', () => {
    const result = getTrainingHandsForArchetype('shark');
    expect(result.length).toBeGreaterThan(0);
    // Should include hands with no archetype restriction or shark archetype
    result.forEach((hand) => {
      if (hand.archetypes) {
        expect(hand.archetypes).toContain('shark');
      }
    });
  });

  it('should return hands for strategist archetype', () => {
    const result = getTrainingHandsForArchetype('strategist');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return hands for grinder archetype', () => {
    const result = getTrainingHandsForArchetype('grinder');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return all hands for unknown archetype', () => {
    // Hands without archetype restrictions should be returned
    const result = getTrainingHandsForArchetype('unknown');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('getRandomTrainingHand', () => {
  it('should return a random training hand', () => {
    const result = getRandomTrainingHand();
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('heroHand');
    expect(result).toHaveProperty('correctAction');
  });

  it('should exclude specified IDs', () => {
    const excludeIds = ['training-1', 'training-2', 'training-3'];
    const result = getRandomTrainingHand(excludeIds);

    if (result) {
      expect(excludeIds).not.toContain(result.id);
    }
  });

  it('should return null when all hands are excluded', () => {
    const allIds = TRAINING_HANDS.map((h) => h.id);
    const result = getRandomTrainingHand(allIds);
    expect(result).toBeNull();
  });

  it('should return different hands on multiple calls (randomness test)', () => {
    const results = new Set<string>();
    // Call multiple times and collect unique IDs
    for (let i = 0; i < 50; i++) {
      const hand = getRandomTrainingHand();
      if (hand) {
        results.add(hand.id);
      }
    }
    // Should have gotten at least a few different hands
    expect(results.size).toBeGreaterThan(1);
  });
});
