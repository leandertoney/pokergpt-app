/**
 * Development-only data seeder.
 *
 * A fresh install has no hands, so every screen that lists history renders its
 * empty state. That is correct behaviour but useless for App Store screenshots,
 * which have to show the app doing the thing it is sold on.
 *
 * This writes a set of realistic hands straight to the same storage key the app
 * reads (`@poker_hands` via storageService), so the home list, hand detail and
 * search all populate exactly as they would for a real user.
 *
 * Guarded by __DEV__ and never called automatically. It is invoked from
 * Settings, which only renders the control in development.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredHand } from '@/types/poker';

const HANDS_STORAGE_KEY = '@poker_hands';

/** Hours ago -> epoch ms, so the list shows a believable spread of activity. */
function hoursAgo(h: number): number {
  return Date.now() - h * 3600 * 1000;
}

const SEED: StoredHand[] = [
  {
    handData: {
      id: 'seed-1',
      heroHand: 'As Ks',
      heroPosition: 'CO',
      villainPosition: 'BTN',
      action: 'Villain 3-bets to $35, hero calls',
      potSize: 72,
      effectiveStack: 200,
      flop: ['Kh', '7d', '2c'],
      originalNarrative: 'I had ace king suited in the cutoff. Button three-bet me and I called. Flop came king high.',
    },
    analysis: {
      recommendedAction: 'Call',
      confidence: 82,
      reasoning: 'Top pair with the best kicker on a dry board. His three-bet range still contains plenty of worse aces and broadway hands that will pay you off.',
      gtoLine: 'Call and re-evaluate on the turn',
      exploitLine: 'Raise against opponents who barrel too often',
      equity: 74,
      potOdds: 2.6,
      outs: 5,
      outBreakdown: 'Two aces to two pair, three kings to trips',
      riskLevel: 'medium',
    },
    timestamp: hoursAgo(3),
  },
  {
    handData: {
      id: 'seed-2',
      heroHand: 'Qh Qd',
      heroPosition: 'MP',
      villainPosition: 'SB',
      action: 'Villain leads $60 into $85 on the river',
      potSize: 145,
      effectiveStack: 240,
      flop: ['9s', '6h', '3d'],
      originalNarrative: 'Queens in middle position. Small blind check-called twice then led big on a blank river.',
    },
    analysis: {
      recommendedAction: 'Call',
      confidence: 68,
      reasoning: 'His river lead is polarised, but the board never completed an obvious draw. You beat every bluff and every worse pair he can hold here.',
      gtoLine: 'Call, folding is far too tight',
      exploitLine: 'Fold only against players who never bluff the river',
      equity: 61,
      potOdds: 2.4,
      outs: 2,
      outBreakdown: 'Two queens to a set',
      riskLevel: 'medium',
    },
    timestamp: hoursAgo(9),
  },
  {
    handData: {
      id: 'seed-3',
      heroHand: 'Jc Tc',
      heroPosition: 'BTN',
      villainPosition: 'BB',
      action: 'Hero bets $22, villain check-raises to $75',
      potSize: 140,
      effectiveStack: 310,
      flop: ['Qc', '8c', '4h'],
      originalNarrative: 'Jack ten of clubs on the button. Flopped a flush draw with a gutshot and got check-raised.',
    },
    analysis: {
      recommendedAction: 'Raise',
      confidence: 77,
      reasoning: 'Nine clubs and four straight cards give you a huge amount of equity. Raising builds the pot while you still have fold equity against his one-pair hands.',
      gtoLine: 'Raise to $190 as a semi-bluff',
      exploitLine: 'Call against opponents who never fold to a re-raise',
      equity: 54,
      potOdds: 3.1,
      outs: 12,
      outBreakdown: 'Nine clubs to a flush, three kings to a straight',
      riskLevel: 'high',
    },
    timestamp: hoursAgo(26),
  },
  {
    handData: {
      id: 'seed-4',
      heroHand: '7h 7s',
      heroPosition: 'UTG',
      villainPosition: 'CO',
      action: 'Hero opens $15, villain calls, flop checks through',
      potSize: 38,
      effectiveStack: 180,
      flop: ['Ad', 'Th', '5c'],
      originalNarrative: 'Pocket sevens under the gun on an ace high board that checked through.',
    },
    analysis: {
      recommendedAction: 'Check',
      confidence: 71,
      reasoning: 'An ace high board hits his calling range far harder than yours. Checking keeps the pot small with a hand that does not want to face a raise.',
      gtoLine: 'Check and take a free card',
      exploitLine: 'Bet small against very passive opponents',
      equity: 38,
      potOdds: 0,
      outs: 2,
      outBreakdown: 'Two sevens to a set',
      riskLevel: 'low',
    },
    timestamp: hoursAgo(50),
  },
  {
    handData: {
      id: 'seed-5',
      heroHand: 'Ah Qd',
      heroPosition: 'SB',
      villainPosition: 'BB',
      action: 'Hero raises $12, villain jams $95',
      potSize: 107,
      effectiveStack: 95,
      flop: [],
      originalNarrative: 'Ace queen in the small blind. Big blind shoved over my raise for about 95 total.',
    },
    analysis: {
      recommendedAction: 'Call',
      confidence: 88,
      reasoning: 'At this stack depth his shoving range is wide enough that ace queen is comfortably ahead. You only lose badly to aces, kings and queens.',
      gtoLine: 'Call, this is a clear price',
      exploitLine: 'Fold only against the tightest possible shoving range',
      equity: 57,
      potOdds: 2.1,
      outs: 0,
      outBreakdown: 'Already ahead of most of his range',
      riskLevel: 'medium',
    },
    timestamp: hoursAgo(74),
  },
];

/** Populate the app with realistic history. Development only. */
export async function seedDemoData(): Promise<number> {
  if (!__DEV__) return 0;
  await AsyncStorage.setItem(HANDS_STORAGE_KEY, JSON.stringify(SEED));
  return SEED.length;
}

/** Remove seeded history. Development only. */
export async function clearDemoData(): Promise<void> {
  if (!__DEV__) return;
  await AsyncStorage.removeItem(HANDS_STORAGE_KEY);
}
