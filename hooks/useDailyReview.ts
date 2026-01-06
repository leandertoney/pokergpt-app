import { useState, useEffect, useCallback } from 'react';
import {
  DailyReviewState,
  ReviewHandData,
  ReviewAnswer,
  DEFAULT_DAILY_REVIEW_STATE,
} from '@/types/dailyReview';
import {
  getDailyReviewState,
  getNextReviewHand,
  hasReviewedToday,
  completeReview,
  getAccuracyPercentage,
} from '@/services/dailyReviewService';

export type ReviewStep = 'card' | 'spot' | 'reveal' | 'streak';

export function useDailyReview() {
  const [state, setState] = useState<DailyReviewState>(DEFAULT_DAILY_REVIEW_STATE);
  const [currentHand, setCurrentHand] = useState<ReviewHandData | null>(null);
  const [userAnswer, setUserAnswer] = useState<ReviewAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [step, setStep] = useState<ReviewStep>('card');

  // Load initial state
  const loadState = useCallback(async () => {
    try {
      setIsLoading(true);
      const [reviewState, reviewed] = await Promise.all([
        getDailyReviewState(),
        hasReviewedToday(),
      ]);
      setState(reviewState);
      setHasReviewed(reviewed);
    } catch (error) {
      console.error('Error loading daily review state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Start a review session
  const startReview = useCallback(async () => {
    try {
      setIsLoading(true);
      const hand = await getNextReviewHand();
      if (hand) {
        setCurrentHand(hand);
        setUserAnswer(null);
        setStep('spot');
      }
    } catch (error) {
      console.error('Error starting review:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Submit an answer
  const submitAnswer = useCallback((answer: ReviewAnswer) => {
    setUserAnswer(answer);
    setStep('reveal');
  }, []);

  // Complete the review and update streak
  const finishReview = useCallback(async () => {
    if (!currentHand || userAnswer === null) return;

    try {
      const wasCorrect = userAnswer === currentHand.correctAction;
      const newState = await completeReview(currentHand.id, wasCorrect);
      setState(newState);
      setHasReviewed(true);
      setStep('streak');
    } catch (error) {
      console.error('Error completing review:', error);
    }
  }, [currentHand, userAnswer]);

  // Reset to card view
  const resetToCard = useCallback(() => {
    setStep('card');
    setCurrentHand(null);
    setUserAnswer(null);
  }, []);

  // Get display values
  const accuracy = getAccuracyPercentage(state);
  const wasCorrect = currentHand && userAnswer ? userAnswer === currentHand.correctAction : null;

  return {
    // State
    state,
    currentHand,
    userAnswer,
    isLoading,
    hasReviewed,
    step,
    accuracy,
    wasCorrect,

    // Actions
    loadState,
    startReview,
    submitAnswer,
    finishReview,
    resetToCard,
    setStep,
  };
}

// Simplified hook for just displaying the card on home screen
export function useDailyReviewCard() {
  const [state, setState] = useState<DailyReviewState>(DEFAULT_DAILY_REVIEW_STATE);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [reviewState, reviewed] = await Promise.all([
          getDailyReviewState(),
          hasReviewedToday(),
        ]);
        setState(reviewState);
        setHasReviewed(reviewed);
      } catch (error) {
        console.error('Error loading daily review card state:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const refresh = useCallback(async () => {
    const [reviewState, reviewed] = await Promise.all([
      getDailyReviewState(),
      hasReviewedToday(),
    ]);
    setState(reviewState);
    setHasReviewed(reviewed);
  }, []);

  return {
    streak: state.currentStreak,
    bestStreak: state.bestStreak,
    hasReviewed,
    isLoading,
    totalReviewed: state.totalReviewed,
    accuracy: getAccuracyPercentage(state),
    refresh,
  };
}
