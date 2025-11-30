export type Position = 'UTG' | 'UTG+1' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export type Action = {
  player: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
  amount?: number;
};

export type HandData = {
  id: string;
  timestamp: number;
  heroHand?: string;
  heroPosition?: Position;
  heroStack?: number;
  villainPosition?: Position;
  villainStack?: number;
  villainName?: string;
  preflopActions?: Action[];
  flop?: string[];
  flopActions?: Action[];
  turn?: string;
  turnActions?: Action[];
  river?: string;
  riverActions?: Action[];
  potSize?: number;
  narrativeStyle: 'standard' | 'mariano';
  villainTendencies?: string;
  originalNarrative: string;
  isComplete: boolean;
  missingFields: string[];
};

export type AnalysisResult = {
  handId: string;
  recommendedAction: string;
  gtoLine: string;
  exploitLine: string;
  hybridLine: string;
  villainRange: string;
  confidence: number;
  structuralAnalysis: {
    gtoAction: string;
    potOdds?: string;
    blockerEffects?: string;
    rangeCommentary: string;
  };
  personaAnalysis: {
    tone: 'mentor' | 'mariano';
    narrative: string;
    keyInsights: string[];
  };
  timestamp: number;
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
