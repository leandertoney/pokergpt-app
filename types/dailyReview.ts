import { Position, PlayerArchetype, ExperienceLevel } from './poker';

// Training hand for new users or when no user hands available
export type TrainingHand = {
  id: string;
  heroHand: string;           // e.g., "A♠ K♦"
  heroPosition: Position;
  villainPosition: Position;
  villainAction: string;      // e.g., "3-bet you to $100"
  board?: string;             // e.g., "9♠ 7♥ 2♣"
  potSize: number;
  toCall?: number;            // Amount to call if facing bet
  correctAction: 'fold' | 'call' | 'raise' | 'check' | 'bet';
  explanation: string;        // Why this is the correct play
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'preflop' | 'postflop' | 'river';
  archetypes?: PlayerArchetype[]; // Which archetypes this hand is best for
};

// User's answer to a review question
export type ReviewAnswer = 'fold' | 'call' | 'raise' | 'check' | 'bet';

// State for daily review feature
export type DailyReviewState = {
  currentStreak: number;
  bestStreak: number;
  lastReviewDate: string | null;  // ISO date string (YYYY-MM-DD)
  reviewedHandIds: string[];      // IDs of hands already reviewed (don't repeat)
  totalReviewed: number;          // Lifetime count
  correctAnswers: number;         // Lifetime correct
};

// A single review session
export type ReviewSession = {
  handId: string;
  isTrainingHand: boolean;
  userAnswer: ReviewAnswer | null;
  correctAnswer: ReviewAnswer;
  wasCorrect: boolean | null;
  completedAt: string | null;     // ISO timestamp
};

// Props for review flow screens
export type ReviewHandData = {
  id: string;
  heroHand: string;
  heroPosition: string;
  villainPosition: string;
  villainAction: string;
  board?: string;
  potSize: number;
  toCall?: number;
  correctAction: ReviewAnswer;
  explanation: string;
  userActualAction?: string;      // What they actually did (for user hands)
  isTrainingHand: boolean;
};

// Default state for new users
export const DEFAULT_DAILY_REVIEW_STATE: DailyReviewState = {
  currentStreak: 0,
  bestStreak: 0,
  lastReviewDate: null,
  reviewedHandIds: [],
  totalReviewed: 0,
  correctAnswers: 0,
};
