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
  sessionId?: string; // Links hand to a session for session tracking
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
  // Outs tracking for math education
  outs?: number;
  outBreakdown?: string; // e.g., "9 flush + 6 straight - 3 overlap = 12 outs"
  // Quick reasoning bullets for shareable card
  reasoningBullets?: string[]; // 2-3 short phrases (max 8 words each)
  // Situation summary for quick recall
  situationSummary?: string; // 1-2 sentence summary starting with "You..."
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

export const MAX_FREE_HANDS = 3;

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

export type PainPoint =
  | 'tilt'         // "I spew when I'm tilted"
  | 'leaks'        // "I'm bleeding chips somewhere"
  | 'overwhelmed'  // "GTO makes my brain melt"
  | 'consistency'; // "I run hot then run like death"

export type UserIdentity = {
  archetype: PlayerArchetype | null;
  experienceLevel: ExperienceLevel | null;
  primaryGoal: PrimaryGoal | null;
  biggestChallenge: BiggestChallenge | null;
  painPoint: PainPoint | null;
};
