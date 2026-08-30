import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { BottomNav } from '@/components/BottomNav';
import { useDailyReview, ReviewStep } from '@/hooks/useDailyReview';
import { trackScreen } from '@/services/appAnalytics';
import { ReviewAnswer } from '@/types/dailyReview';

// Action button component
function ActionButton({
  label,
  onPress,
  variant = 'default',
}: {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'success' | 'muted';
}) {
  const buttonColors = {
    default: ['#3A1515', '#2A0E0E'],
    primary: [colors.onboarding.profit, '#16A34A'],
    success: [colors.onboarding.profit, '#16A34A'],
    muted: ['#2A1A1A', '#1A0E0E'],
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.actionButtonContainer}>
      <LinearGradient
        colors={buttonColors[variant] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.actionButton,
          variant === 'primary' && styles.actionButtonPrimary,
        ]}
      >
        <Text style={[
          styles.actionButtonText,
          variant === 'primary' && styles.actionButtonTextPrimary,
        ]}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Card display component
function CardDisplay({ card }: { card: string }) {
  const suits = ['♠', '♥', '♦', '♣'];
  let rank = card;
  let suit = '';

  for (const s of suits) {
    if (card.includes(s)) {
      rank = card.replace(s, '');
      suit = s;
      break;
    }
  }

  const isRed = suit === '♥' || suit === '♦';

  return (
    <View style={cardStyles.card}>
      <Text style={[cardStyles.rank, isRed && cardStyles.redText]}>{rank}</Text>
      <Text style={[cardStyles.suit, isRed && cardStyles.redText]}>{suit}</Text>
    </View>
  );
}

// Spot Screen - "What would you do?"
function SpotScreen({
  hand,
  onAnswer,
}: {
  hand: NonNullable<ReturnType<typeof useDailyReview>['currentHand']>;
  onAnswer: (answer: ReviewAnswer) => void;
}) {
  const cards = hand.heroHand.split(' ').filter(c => c.length > 0);

  // Determine which actions to show
  const showFold = true;
  const showCheck = !hand.toCall;
  const showCall = !!hand.toCall;
  const showBet = !hand.toCall && hand.board;
  const showRaise = !!hand.toCall;

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      {/* Header */}
      <Text style={styles.screenLabel}>
        {hand.isTrainingHand ? 'Training Hand' : "Yesterday's Hand"}
      </Text>

      {/* Hero Hand */}
      <View style={styles.cardsSection}>
        <Text style={styles.sectionLabel}>You have:</Text>
        <View style={styles.cardsRow}>
          {cards.map((card, index) => (
            <CardDisplay key={index} card={card} />
          ))}
        </View>
      </View>

      {/* Position Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Position:</Text>
          <Text style={styles.infoValue}>{hand.heroPosition}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Villain:</Text>
          <Text style={styles.infoValue}>{hand.villainPosition}</Text>
        </View>
      </View>

      {/* Board (if postflop) */}
      {hand.board && (
        <View style={styles.boardSection}>
          <Text style={styles.sectionLabel}>Board:</Text>
          <View style={styles.boardCards}>
            {hand.board.split(' ').map((card, index) => (
              <CardDisplay key={index} card={card} />
            ))}
          </View>
        </View>
      )}

      {/* Action Info */}
      <View style={styles.actionInfo}>
        <Text style={styles.potText}>Pot: ${hand.potSize}</Text>
        <Text style={styles.villainActionText}>{hand.villainAction}</Text>
        {hand.toCall && (
          <Text style={styles.toCallText}>${hand.toCall} to call</Text>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Question */}
      <Text style={styles.questionText}>What do you do here?</Text>

      {/* Action Buttons */}
      <View style={styles.actionsGrid}>
        {showFold && (
          <ActionButton label="Fold" onPress={() => onAnswer('fold')} />
        )}
        {showCheck && (
          <ActionButton label="Check" onPress={() => onAnswer('check')} />
        )}
        {showCall && (
          <ActionButton label="Call" onPress={() => onAnswer('call')} />
        )}
        {showBet && (
          <ActionButton label="Bet" onPress={() => onAnswer('bet')} />
        )}
        {showRaise && (
          <ActionButton label="Raise" onPress={() => onAnswer('raise')} />
        )}
      </View>
    </ScrollView>
  );
}

// Reveal Screen - Show answer
function RevealScreen({
  hand,
  userAnswer,
  wasCorrect,
  onContinue,
}: {
  hand: NonNullable<ReturnType<typeof useDailyReview>['currentHand']>;
  userAnswer: ReviewAnswer;
  wasCorrect: boolean;
  onContinue: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      {/* Result Badge */}
      <View style={[styles.resultBadge, wasCorrect ? styles.correctBadge : styles.incorrectBadge]}>
        <Text style={styles.resultEmoji}>{wasCorrect ? '✓' : '✗'}</Text>
        <Text style={styles.resultText}>
          {wasCorrect ? 'Correct!' : 'Not quite'}
        </Text>
      </View>

      {/* Your Answer */}
      <View style={styles.answerSection}>
        <Text style={styles.answerLabel}>You chose:</Text>
        <Text style={styles.answerValue}>{userAnswer.toUpperCase()}</Text>
      </View>

      {/* Correct Answer */}
      <View style={styles.answerSection}>
        <Text style={styles.answerLabel}>Optimal play:</Text>
        <Text style={[styles.answerValue, styles.optimalAnswer]}>
          {hand.correctAction.toUpperCase()}
        </Text>
      </View>

      {/* What they actually did (for user hands) */}
      {hand.userActualAction && !hand.isTrainingHand && (
        <View style={styles.answerSection}>
          <Text style={styles.answerLabel}>What you actually did:</Text>
          <Text style={styles.answerValue}>{hand.userActualAction}</Text>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Explanation */}
      <View style={styles.explanationSection}>
        <Text style={styles.explanationLabel}>Analysis:</Text>
        <Text style={styles.explanationText}>{hand.explanation}</Text>
      </View>

      {/* Continue Button */}
      <View style={styles.continueSection}>
        <ActionButton
          label="Got it →"
          onPress={onContinue}
          variant="primary"
        />
      </View>
    </ScrollView>
  );
}

// Streak Screen - Celebration
function StreakScreen({
  streak,
  bestStreak,
  accuracy,
  totalReviewed,
  onFinish,
}: {
  streak: number;
  bestStreak: number;
  accuracy: number;
  totalReviewed: number;
  onFinish: () => void;
}) {
  return (
    <View style={styles.streakScreenContent}>
      {/* Big Streak Display */}
      <View style={styles.bigStreakContainer}>
        <Text style={styles.bigFireEmoji}>🔥</Text>
        <Text style={styles.bigStreakNumber}>{streak}</Text>
        <Text style={styles.bigStreakLabel}>Day Streak!</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {bestStreak > streak && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalReviewed}</Text>
          <Text style={styles.statLabel}>Hands Reviewed</Text>
        </View>
        {accuracy > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        )}
      </View>

      {/* Motivational Message */}
      <Text style={styles.motivationalText}>
        {streak === 1
          ? "Great start! Come back tomorrow to build your streak."
          : streak < 7
            ? "Keep it up! You're building a winning habit."
            : "Incredible consistency! You're becoming a better player."}
      </Text>

      {/* Done Button */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={onFinish}
        activeOpacity={0.8}
      >
        <Text style={styles.doneButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

// Main Daily Review Screen
export default function DailyReviewScreen() {
  useEffect(() => {
    trackScreen('daily_review');
  }, []);

  const router = useRouter();
  const {
    state,
    currentHand,
    userAnswer,
    isLoading,
    hasReviewed,
    step,
    accuracy,
    wasCorrect,
    startReview,
    submitAnswer,
    finishReview,
    resetToCard,
  } = useDailyReview();

  // Auto-start review when screen loads
  useEffect(() => {
    if (!isLoading && !hasReviewed && step === 'card') {
      startReview();
    }
  }, [isLoading, hasReviewed, step, startReview]);

  const handleFinish = () => {
    resetToCard();
    router.back();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={colors.gradients.background as unknown as [string, string, ...string[]]}
          style={styles.background}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.onboarding.profit} />
            <Text style={styles.loadingText}>Loading your review...</Text>
          </View>
        </LinearGradient>
        <BottomNav active="daily" />
    </SafeAreaView>
    );
  }

  // Already reviewed today
  if (hasReviewed && step !== 'streak') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={colors.gradients.background as unknown as [string, string, ...string[]]}
          style={styles.background}
        >
          <View style={styles.alreadyReviewedContainer}>
            <Text style={styles.alreadyReviewedEmoji}>✓</Text>
            <Text style={styles.alreadyReviewedTitle}>Today&apos;s Review Complete!</Text>
            <Text style={styles.alreadyReviewedText}>
              Come back tomorrow to continue your streak.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <BottomNav active="daily" />
    </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={colors.gradients.background as unknown as [string, string, ...string[]]}
        style={styles.background}
      >
        {/* Spot Screen */}
        {step === 'spot' && currentHand && (
          <SpotScreen hand={currentHand} onAnswer={submitAnswer} />
        )}

        {/* Reveal Screen */}
        {step === 'reveal' && currentHand && userAnswer && (
          <RevealScreen
            hand={currentHand}
            userAnswer={userAnswer}
            wasCorrect={wasCorrect ?? false}
            onContinue={finishReview}
          />
        )}

        {/* Streak Screen */}
        {step === 'streak' && (
          <StreakScreen
            streak={state.currentStreak}
            bestStreak={state.bestStreak}
            accuracy={accuracy}
            totalReviewed={state.totalReviewed}
            onFinish={handleFinish}
          />
        )}
      </LinearGradient>
      <BottomNav active="daily" />
    </SafeAreaView>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 8,
    width: 48,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rank: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A0505',
  },
  suit: {
    fontSize: 18,
    marginTop: -2,
    color: '#1A0505',
  },
  redText: {
    color: '#E63333',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  screenContent: {
    padding: 24,
    paddingTop: 16,
  },
  screenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  cardsSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  cardsRow: {
    flexDirection: 'row',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  boardSection: {
    marginBottom: 20,
  },
  boardCards: {
    flexDirection: 'row',
  },
  actionInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  potText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onboarding.gold,
    marginBottom: 4,
  },
  villainActionText: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 4,
  },
  toCallText: {
    fontSize: 14,
    color: colors.accent.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  actionButtonContainer: {
    minWidth: 100,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  actionButtonPrimary: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  // Reveal Screen Styles
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 24,
    alignSelf: 'center',
  },
  correctBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  incorrectBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  resultEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  resultText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  answerSection: {
    marginBottom: 16,
  },
  answerLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  answerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  optimalAnswer: {
    color: colors.onboarding.profit,
  },
  explanationSection: {
    marginBottom: 24,
  },
  explanationLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.primary,
  },
  continueSection: {
    alignItems: 'center',
  },
  // Streak Screen Styles
  streakScreenContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bigStreakContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  bigFireEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  bigStreakNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.onboarding.profit,
  },
  bigStreakLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: -4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  motivationalText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: colors.onboarding.profit,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Already reviewed styles
  alreadyReviewedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  alreadyReviewedEmoji: {
    fontSize: 64,
    marginBottom: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    width: 100,
    height: 100,
    borderRadius: 50,
    textAlign: 'center',
    lineHeight: 100,
    overflow: 'hidden',
    color: colors.onboarding.profit,
  },
  alreadyReviewedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  alreadyReviewedText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
