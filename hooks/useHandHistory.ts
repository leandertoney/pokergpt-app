import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getHandHistory, deleteHand as deleteHandFromStorage } from '@/services/supabaseStorage';
import { generateText } from '@/services/supabaseAI';
import * as Haptics from 'expo-haptics';
import type { HandData, AnalysisResult } from '@/types/poker';

export interface StoredHandEntry {
  handData: HandData;
  analysis: AnalysisResult;
  createdAt: string;
}

// Extended HandData type with optional handName
export interface StoredHandEntryWithName extends StoredHandEntry {
  handName?: string;
}

// Mock data for UI development
const MOCK_HANDS: StoredHandEntryWithName[] = [
  {
    handName: 'Nut Flush Draw Semi-Bluff',
    handData: {
      id: 'mock-1',
      heroHand: 'A♠ K♠',
      heroPosition: 'BTN',
      villainPosition: 'BB',
      potSize: 45,
      effectiveStack: 150,
      flop: ['Q♠', '10♠', '3♥'],
      turn: '2♦',
      river: undefined,
      action: 'Villain bets 30',
      originalNarrative: "I have AK suited on the button. Villain in the big blind bets 30 into a 45 pot on a Q-10-3 board with two spades. I have the nut flush draw and two overcards.",
    },
    analysis: {
      recommendedAction: 'Raise to 85',
      confidence: 92,
      reasoning: "You have the nut flush draw with two overcards giving you 15 outs twice. A semi-bluff raise here puts maximum pressure on villain's range while building the pot for when you hit.",
      potOdds: 2.5,
      impliedOdds: 4.2,
      equity: 54,
      riskLevel: 'medium',
      alternativeActions: [
        { action: 'Call', reasoning: 'Keep the pot small and realize equity cheaply', ev: 12.5 },
        { action: 'Fold', reasoning: 'Not recommended - too much equity to fold', ev: -15 },
      ],
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
  },
  {
    handName: 'River Bluff Catch Decision',
    handData: {
      id: 'mock-2',
      heroHand: 'J♥ J♦',
      heroPosition: 'MP',
      villainPosition: 'CO',
      potSize: 120,
      effectiveStack: 200,
      flop: ['K♣', '7♠', '2♥'],
      turn: '9♦',
      river: '4♣',
      action: 'Villain shoves all-in for 180',
      originalNarrative: "I have pocket jacks in middle position. The board is K-7-2-9-4 rainbow. Villain shoves all-in on the river for 180 into a 120 pot.",
    },
    analysis: {
      recommendedAction: 'Fold',
      confidence: 78,
      reasoning: "On this dry board, villain's river shove represents a very polarized range. With the king on board and no draws completing, villain is repping a king or better. Your jacks are likely behind here.",
      potOdds: 1.5,
      impliedOdds: 0,
      equity: 28,
      riskLevel: 'high',
      alternativeActions: [
        { action: 'Call', reasoning: 'If villain is capable of bluffing rivers', ev: -45 },
      ],
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    handName: 'Flopped Set Value Raise',
    handData: {
      id: 'mock-3',
      heroHand: '8♣ 8♠',
      heroPosition: 'SB',
      villainPosition: 'BTN',
      potSize: 25,
      effectiveStack: 100,
      flop: ['8♥', '5♦', '2♣'],
      turn: undefined,
      river: undefined,
      action: 'Villain raises to 18',
      originalNarrative: "I flopped top set with pocket eights. Villain on the button raises my continuation bet to 18.",
    },
    analysis: {
      recommendedAction: 'Raise to 52',
      confidence: 95,
      reasoning: "You have the nuts on a dry board. A 3-bet here looks like a bluff or overpair to villain and will likely get called by all overpairs and draws. Build the pot while you have the clear best hand.",
      potOdds: 2.4,
      impliedOdds: 5.5,
      equity: 95,
      riskLevel: 'low',
      alternativeActions: [
        { action: 'Call', reasoning: 'Slow play to trap on later streets', ev: 35 },
        { action: 'All-in', reasoning: 'Maximum value but may fold out worse hands', ev: 28 },
      ],
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    handName: 'Squeeze Play Gone Wrong',
    handData: {
      id: 'mock-4',
      heroHand: 'A♦ Q♦',
      heroPosition: 'BB',
      villainPosition: 'UTG',
      potSize: 85,
      effectiveStack: 180,
      flop: ['K♠', 'J♦', '7♦'],
      turn: '3♣',
      action: 'Facing a check-raise all-in',
      originalNarrative: "I 3-bet squeezed with AQs from the BB. UTG called. I c-bet the flop and got check-raised all-in.",
    },
    analysis: {
      recommendedAction: 'Call',
      confidence: 68,
      reasoning: "You have a gutshot straight draw plus nut flush draw - 12 clean outs. Getting good odds with two cards to come.",
      potOdds: 1.8,
      impliedOdds: 0,
      equity: 42,
      riskLevel: 'high',
      alternativeActions: [
        { action: 'Fold', reasoning: 'Preserve stack for better spots', ev: 0 },
      ],
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
  },
  {
    handName: 'Pocket Kings vs 4-Bet',
    handData: {
      id: 'mock-5',
      heroHand: 'K♥ K♣',
      heroPosition: 'CO',
      villainPosition: 'BTN',
      potSize: 240,
      effectiveStack: 500,
      action: 'Villain 4-bets to 95',
      originalNarrative: "I opened pocket kings from cutoff. Button 3-bet, I 4-bet, and now button 5-bets to 95.",
    },
    analysis: {
      recommendedAction: 'All-in',
      confidence: 88,
      reasoning: "KK is too strong to fold preflop. The 5-bet polarizes villain to AA/KK/AK/bluffs. You're flipping against AA but crushing everything else.",
      potOdds: 3.5,
      impliedOdds: 0,
      equity: 65,
      riskLevel: 'medium',
      alternativeActions: [
        { action: 'Call', reasoning: 'See a flop and play postflop poker', ev: 45 },
      ],
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
  },
  {
    handName: 'Turned Straight Value',
    handData: {
      id: 'mock-6',
      heroHand: '9♠ 8♠',
      heroPosition: 'BTN',
      villainPosition: 'BB',
      potSize: 65,
      effectiveStack: 140,
      flop: ['7♦', '6♣', '2♥'],
      turn: '5♠',
      action: 'Villain leads for 35',
      originalNarrative: "I flopped an open-ender with 98s and just turned the nuts. Villain donks into me.",
    },
    analysis: {
      recommendedAction: 'Raise to 95',
      confidence: 94,
      reasoning: "You have the nuts and villain is betting into you - raise for value. A smaller raise looks like a float and may get called by two pair or sets.",
      potOdds: 2.8,
      impliedOdds: 4.0,
      equity: 100,
      riskLevel: 'low',
      alternativeActions: [
        { action: 'Call', reasoning: 'Trap for river value', ev: 55 },
        { action: 'All-in', reasoning: 'Maximum value if called', ev: 48 },
      ],
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
  },
  {
    handName: 'Ace High River Call',
    handData: {
      id: 'mock-7',
      heroHand: 'A♣ 10♣',
      heroPosition: 'MP',
      villainPosition: 'SB',
      potSize: 180,
      effectiveStack: 75,
      flop: ['K♥', '8♠', '4♦'],
      turn: '2♣',
      river: '7♥',
      action: 'Villain bets 50 on river',
      originalNarrative: "I called a 3-bet in position. Board ran out dry. Villain has been betting every street and now bets small on the river.",
    },
    analysis: {
      recommendedAction: 'Call',
      confidence: 62,
      reasoning: "The small river sizing is often a blocker bet with marginal hands. Ace high might actually be good here against missed draws and weak pairs.",
      potOdds: 4.6,
      impliedOdds: 0,
      equity: 35,
      riskLevel: 'medium',
      alternativeActions: [
        { action: 'Fold', reasoning: 'If villain never bluffs the river', ev: 0 },
      ],
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
  },
];

// Set to true to use mock data for UI testing
const USE_MOCK_DATA = false;

export function useHandHistory() {
  const [hands, setHands] = useState<StoredHandEntryWithName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHands, setFilteredHands] = useState<StoredHandEntryWithName[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load hands from storage
  const loadHands = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      if (USE_MOCK_DATA) {
        // Use mock data for UI development
        setHands(MOCK_HANDS);
        setFilteredHands(MOCK_HANDS);
      } else {
        const history = await getHandHistory();
        setHands(history);
        setFilteredHands(history);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load hand history'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Manual refresh (pull-to-refresh)
  const handleRefresh = useCallback(() => {
    loadHands(true);
  }, [loadHands]);

  // Load on initial mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHands();
    }, [loadHands])
  );

  // Search hands using AI for natural language understanding
  const searchHands = useCallback(async (query: string) => {
    if (!query.trim()) {
      setFilteredHands(hands);
      return;
    }

    setIsSearching(true);

    try {
      // Create a summary of all hands for the AI to search through
      const handsSummary = hands.map((h, i) => ({
        index: i,
        heroHand: h.handData.heroHand,
        position: h.handData.heroPosition,
        villainPosition: h.handData.villainPosition,
        flop: h.handData.flop?.join(' '),
        recommendation: h.analysis.recommendedAction,
        narrative: h.handData.originalNarrative?.slice(0, 200),
      }));

      const searchPrompt = `You are a poker hand search assistant. Given a user's natural language query and a list of poker hands, return the indices of hands that match.

User query: "${query}"

Available hands:
${JSON.stringify(handsSummary, null, 2)}

Return a JSON array of matching hand indices. If no hands match, return [].
For example: [0, 2, 5]

Only return the JSON array, nothing else.`;

      const response = await generateText(searchPrompt, 'You are a precise search assistant. Only return valid JSON arrays.');

      try {
        const matchingIndices = JSON.parse(response);
        if (Array.isArray(matchingIndices)) {
          const matchedHands = matchingIndices
            .filter((i: number) => i >= 0 && i < hands.length)
            .map((i: number) => hands[i]);
          setFilteredHands(matchedHands.length > 0 ? matchedHands : []);
        } else {
          setFilteredHands([]);
        }
      } catch {
        // If AI response isn't valid JSON, fall back to simple text search
        const lowerQuery = query.toLowerCase();
        const filtered = hands.filter(h =>
          h.handData.heroHand?.toLowerCase().includes(lowerQuery) ||
          h.handData.heroPosition?.toLowerCase().includes(lowerQuery) ||
          h.handData.originalNarrative?.toLowerCase().includes(lowerQuery) ||
          h.analysis.recommendedAction?.toLowerCase().includes(lowerQuery)
        );
        setFilteredHands(filtered);
      }
    } catch (err) {
      // On error, fall back to simple search
      const lowerQuery = query.toLowerCase();
      const filtered = hands.filter(h =>
        h.handData.heroHand?.toLowerCase().includes(lowerQuery) ||
        h.handData.heroPosition?.toLowerCase().includes(lowerQuery) ||
        h.handData.originalNarrative?.toLowerCase().includes(lowerQuery) ||
        h.analysis.recommendedAction?.toLowerCase().includes(lowerQuery)
      );
      setFilteredHands(filtered);
    } finally {
      setIsSearching(false);
    }
  }, [hands]);

  // Handle search query changes
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredHands(hands);
    }
  }, [hands]);

  // Submit search
  const submitSearch = useCallback(() => {
    searchHands(searchQuery);
  }, [searchQuery, searchHands]);

  // Delete a hand
  const deleteHand = useCallback(async (handId: string) => {
    // Optimistic update - remove from state immediately
    setHands(prev => prev.filter(h => h.handData.id !== handId));
    setFilteredHands(prev => prev.filter(h => h.handData.id !== handId));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Delete from storage
    await deleteHandFromStorage(handId);
  }, []);

  return {
    hands: filteredHands,
    allHands: hands,
    isLoading,
    isRefreshing,
    isSearching,
    error,
    searchQuery,
    setSearchQuery: handleSearch,
    submitSearch,
    refresh: handleRefresh,
    deleteHand,
  };
}
