export type Position = 'UTG' | 'UTG+1' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type Action = {
  player: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount?: number;
};

export type HandData = {
  id?: string;
  timestamp?: number;
  heroHand?: string;
  heroPosition?: Position | string;
  heroStack?: number;
  villainPosition?: Position | string;
  villainStack?: number;
  villainName?: string;
  effectiveStack?: number;
  preflopActions?: Action[];
  flop?: string[];
  flopActions?: Action[];
  turn?: string;
  turnActions?: Action[];
  river?: string;
  riverActions?: Action[];
  potSize?: number;
  action?: string;
  narrativeStyle?: 'standard' | 'mariano';
  villainTendencies?: string;
  originalNarrative?: string;
  isComplete?: boolean;
  missingFields?: string[];
};

export type AlternativeAction = {
  action: string;
  reasoning: string;
  ev?: number;
};

export type AnalysisResult = {
  handId?: string;
  recommendedAction: string;
  gtoLine?: string;
  exploitLine?: string;
  hybridLine?: string;
  villainRange?: string;
  confidence: number;
  reasoning?: string;
  potOdds?: number;
  impliedOdds?: number;
  equity?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  alternativeActions?: AlternativeAction[];
  structuralAnalysis?: {
    gtoAction: string;
    potOdds?: string;
    blockerEffects?: string;
    rangeCommentary: string;
  };
  personaAnalysis?: {
    tone: 'mentor' | 'mariano';
    narrative: string;
    keyInsights?: string[];
  };
  timestamp?: number;
};

export type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  handData?: Partial<HandData>;
  analysis?: AnalysisResult;
};

export type StoredHand = {
  handData: HandData;
  analysis: AnalysisResult;
  timestamp: number;
};

export type UserTier = 'free' | 'paid';

export const MAX_FREE_HANDS = 5;

// Identity-Anchored Conversion Flow™ Types
export type PlayerArchetype =
  | 'grinder'      // Volume-focused, profit-driven
  | 'shark'        // Aggressive, exploitative
  | 'strategist'   // GTO-focused, mathematical
  | 'intuitive'    // Feel-based, reads situations
  | 'student';     // Learning-focused

export type ExperienceLevel =
  | 'beginner'     // Just starting
  | 'intermediate' // Knows fundamentals
  | 'advanced'     // Solid player
  | 'professional'; // Makes living from poker

export type PrimaryGoal =
  | 'profit'       // Make more money
  | 'improve'      // Get better
  | 'compete'      // Beat specific opponents
  | 'fun';         // Enjoy more

export type BiggestChallenge =
  | 'tilt'         // Emotional control
  | 'ranges'       // Hand reading
  | 'sizing'       // Bet sizing
  | 'spots'        // Difficult decisions
  | 'discipline';  // Bankroll/game selection

export type UserIdentity = {
  archetype: PlayerArchetype | null;
  experienceLevel: ExperienceLevel | null;
  primaryGoal: PrimaryGoal | null;
  biggestChallenge: BiggestChallenge | null;
};
