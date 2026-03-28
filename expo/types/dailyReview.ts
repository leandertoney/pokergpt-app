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

// ============================================
// FULL HAND TRAINING - Multi-Decision Scenarios
// ============================================

// A single decision point within a full hand
export type FullHandDecision = {
  street: 'preflop' | 'flop' | 'turn' | 'river';
  board: string | null;           // null for preflop, "K♠ 9♥ 2♣" for flop, etc.
  potSize: number;
  villainAction: string;          // "raises to $15", "checks", "bets $50"
  options: ReviewAnswer[];        // Available actions for this spot
  correctAction: ReviewAnswer;
  explanation: string;            // Why this is correct

  // Educational data (optional)
  potOddsPercent?: string;        // "33%" - pot odds as percentage
  equityNeeded?: string;          // "28%" - equity needed to call
  tipText?: string;               // "Tip: Calculate pot odds..."
  villainRangeDescription?: string; // "Villain's range: AA-TT, AK-AQ"
};

// Complete full hand scenario with multiple decisions
export type FullHandScenario = {
  id: string;
  title: string;                  // "Value Betting with Top Pair"
  description: string;            // Brief scenario context
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  heroHand: string;               // "A♠ K♦"
  heroPosition: Position;
  villainPosition: Position;
  villainProfile?: string;        // "Tight-passive regular" - optional context
  decisions: FullHandDecision[];  // Array of decision points
};

// User's progress through a full hand
export type FullHandProgress = {
  scenarioId: string;
  currentDecisionIndex: number;
  userAnswers: ReviewAnswer[];    // What user chose at each point
  scores: boolean[];              // Whether each answer was correct
  startedAt: string;              // ISO timestamp
  completedAt: string | null;
};

// State for full hand training feature
export type FullHandTrainingState = {
  completedScenarioIds: string[];
  totalCompleted: number;
  totalCorrectDecisions: number;
  totalDecisions: number;
};
