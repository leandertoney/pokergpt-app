import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type {
  FullHandScenario,
  FullHandDecision,
  FullHandProgress,
  FullHandTrainingState,
  ReviewAnswer,
} from '@/types/dailyReview';
import { getRandomFullHandScenario, FULL_HAND_SCENARIOS } from '@/data/fullHandScenarios';

const FULL_HAND_STATE_KEY = '@full_hand_training_state';

// Review step in the flow
export type FullHandStep = 'intro' | 'decision' | 'feedback' | 'summary';

// Return type for the hook
export type UseFullHandReviewReturn = {
  // Current state
  step: FullHandStep;
  scenario: FullHandScenario | null;
  currentDecision: FullHandDecision | null;
  currentDecisionIndex: number;
  totalDecisions: number;

  // User's progress
  userAnswers: ReviewAnswer[];
  scores: boolean[];
  lastAnswer: ReviewAnswer | null;
  lastWasCorrect: boolean | null;

  // Computed values
  correctCount: number;
  isComplete: boolean;
  scorePercentage: number;

  // Cumulative stats
  stats: FullHandTrainingState;

  // Loading states
  isLoading: boolean;

  // Actions
  startScenario: (scenarioId?: string) => void;
  submitAnswer: (answer: ReviewAnswer) => void;
  nextDecision: () => void;
  reset: () => void;
};

// Default stats
const DEFAULT_STATS: FullHandTrainingState = {
  completedScenarioIds: [],
  totalCompleted: 0,
  totalCorrectDecisions: 0,
  totalDecisions: 0,
};

export function useFullHandReview(): UseFullHandReviewReturn {
  // State
  const [step, setStep] = useState<FullHandStep>('intro');
  const [scenario, setScenario] = useState<FullHandScenario | null>(null);
  const [currentDecisionIndex, setCurrentDecisionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<ReviewAnswer[]>([]);
  const [scores, setScores] = useState<boolean[]>([]);
  const [lastAnswer, setLastAnswer] = useState<ReviewAnswer | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [stats, setStats] = useState<FullHandTrainingState>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const stored = await AsyncStorage.getItem(FULL_HAND_STATE_KEY);
      if (stored) {
        setStats(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading full hand stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveStats = async (newStats: FullHandTrainingState) => {
    try {
      await AsyncStorage.setItem(FULL_HAND_STATE_KEY, JSON.stringify(newStats));
      setStats(newStats);
    } catch (error) {
      console.error('Error saving full hand stats:', error);
    }
  };

  // Computed values
  const currentDecision = scenario?.decisions[currentDecisionIndex] ?? null;
  const totalDecisions = scenario?.decisions.length ?? 0;
  const correctCount = scores.filter(Boolean).length;
  const isComplete = scenario !== null && currentDecisionIndex >= totalDecisions && step === 'summary';
  const scorePercentage = totalDecisions > 0 ? Math.round((correctCount / totalDecisions) * 100) : 0;

  // Start a scenario
  const startScenario = useCallback((scenarioId?: string) => {
    let newScenario: FullHandScenario | null = null;

    if (scenarioId) {
      // Find specific scenario
      newScenario = FULL_HAND_SCENARIOS.find(s => s.id === scenarioId) ?? null;
    } else {
      // Get random scenario (prefer ones not completed yet)
      newScenario = getRandomFullHandScenario(stats.completedScenarioIds);
      // If all completed, pick any random one
      if (!newScenario) {
        newScenario = getRandomFullHandScenario([]);
      }
    }

    if (newScenario) {
      setScenario(newScenario);
      setCurrentDecisionIndex(0);
      setUserAnswers([]);
      setScores([]);
      setLastAnswer(null);
      setLastWasCorrect(null);
      setStep('decision');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [stats.completedScenarioIds]);

  // Submit an answer
  const submitAnswer = useCallback((answer: ReviewAnswer) => {
    if (!currentDecision) return;

    const isCorrect = answer === currentDecision.correctAction;

    setUserAnswers(prev => [...prev, answer]);
    setScores(prev => [...prev, isCorrect]);
    setLastAnswer(answer);
    setLastWasCorrect(isCorrect);
    setStep('feedback');

    // Haptic feedback
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [currentDecision]);

  // Move to next decision or summary
  const nextDecision = useCallback(async () => {
    if (!scenario) return;

    const nextIndex = currentDecisionIndex + 1;

    if (nextIndex >= scenario.decisions.length) {
      // All decisions made - show summary
      setStep('summary');

      // Update stats
      const newCorrectCount = scores.filter(Boolean).length + (lastWasCorrect ? 1 : 0);
      const newStats: FullHandTrainingState = {
        completedScenarioIds: stats.completedScenarioIds.includes(scenario.id)
          ? stats.completedScenarioIds
          : [...stats.completedScenarioIds, scenario.id],
        totalCompleted: stats.totalCompleted + 1,
        totalCorrectDecisions: stats.totalCorrectDecisions + newCorrectCount,
        totalDecisions: stats.totalDecisions + scenario.decisions.length,
      };
      await saveStats(newStats);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Move to next decision
      setCurrentDecisionIndex(nextIndex);
      setLastAnswer(null);
      setLastWasCorrect(null);
      setStep('decision');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scenario, currentDecisionIndex, scores, lastWasCorrect, stats]);

  // Reset to intro
  const reset = useCallback(() => {
    setStep('intro');
    setScenario(null);
    setCurrentDecisionIndex(0);
    setUserAnswers([]);
    setScores([]);
    setLastAnswer(null);
    setLastWasCorrect(null);
  }, []);

  return {
    step,
    scenario,
    currentDecision,
    currentDecisionIndex,
    totalDecisions,
    userAnswers,
    scores,
    lastAnswer,
    lastWasCorrect,
    correctCount,
    isComplete,
    scorePercentage,
    stats,
    isLoading,
    startScenario,
    submitAnswer,
    nextDecision,
    reset,
  };
}

export default useFullHandReview;
