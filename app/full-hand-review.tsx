import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { ChevronLeft, Play, Check, X, Trophy, Target } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useFullHandReview } from '@/hooks/useFullHandReview';
import type { ReviewAnswer, FullHandDecision } from '@/types/dailyReview';

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

// Progress indicator showing street progression
function StreetProgress({
  decisions,
  currentIndex,
  scores,
}: {
  decisions: FullHandDecision[];
  currentIndex: number;
  scores: boolean[];
}) {
  return (
    <View style={styles.progressContainer}>
      {decisions.map((decision, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        const isCorrect = scores[index];

        return (
          <View key={index} style={styles.progressItemWrapper}>
            <View
              style={[
                styles.progressDot,
                isActive && styles.progressDotActive,
                isComplete && (isCorrect ? styles.progressDotCorrect : styles.progressDotWrong),
              ]}
            >
              {isComplete && (
                isCorrect ? (
                  <Check size={12} color="#fff" />
                ) : (
                  <X size={12} color="#fff" />
                )
              )}
            </View>
            <Text
              style={[
                styles.progressLabel,
                isActive && styles.progressLabelActive,
              ]}
            >
              {decision.street.charAt(0).toUpperCase() + decision.street.slice(1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// Action button
function ActionButton({
  label,
  onPress,
  variant = 'default',
}: {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'success' | 'danger';
}) {
  const buttonColors = {
    default: ['#3A1515', '#2A0E0E'],
    primary: [colors.onboarding.profit, '#16A34A'],
    success: [colors.onboarding.profit, '#16A34A'],
    danger: ['#DC2626', '#991B1B'],
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.actionButtonContainer}>
      <LinearGradient
        colors={buttonColors[variant] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.actionButton,
          variant !== 'default' && styles.actionButtonPrimary,
        ]}
      >
        <Text style={[
          styles.actionButtonText,
          variant !== 'default' && styles.actionButtonTextPrimary,
        ]}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Intro screen
function IntroScreen({
  onStart,
  stats,
}: {
  onStart: () => void;
  stats: { totalCompleted: number; totalCorrectDecisions: number; totalDecisions: number };
}) {
  const accuracy = stats.totalDecisions > 0
    ? Math.round((stats.totalCorrectDecisions / stats.totalDecisions) * 100)
    : 0;

  return (
    <View style={styles.centeredContainer}>
      <View style={styles.iconContainer}>
        <Target size={64} color={colors.onboarding.gold} />
      </View>
      <Text style={styles.introTitle}>Full Hand Training</Text>
      <Text style={styles.introSubtitle}>
        Play through complete hands and make decisions at every street.
      </Text>

      {stats.totalCompleted > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalCompleted}</Text>
            <Text style={styles.statLabel}>Hands Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.startButton} onPress={onStart} activeOpacity={0.8}>
        <LinearGradient
          colors={[colors.onboarding.gold, '#D4A017']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.startButtonGradient}
        >
          <Play size={24} color="#000" />
          <Text style={styles.startButtonText}>Start Training</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// Decision screen
function DecisionScreen({
  scenario,
  decision,
  decisionIndex,
  totalDecisions,
  scores,
  onAnswer,
}: {
  scenario: NonNullable<ReturnType<typeof useFullHandReview>['scenario']>;
  decision: NonNullable<ReturnType<typeof useFullHandReview>['currentDecision']>;
  decisionIndex: number;
  totalDecisions: number;
  scores: boolean[];
  onAnswer: (answer: ReviewAnswer) => void;
}) {
  const heroCards = scenario.heroHand.split(' ').filter(c => c.length > 0);
  const boardCards = decision.board?.split(' ').filter(c => c.length > 0) || [];

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      {/* Progress */}
      <StreetProgress
        decisions={scenario.decisions}
        currentIndex={decisionIndex}
        scores={scores}
      />

      {/* Street Label */}
      <View style={styles.streetBadge}>
        <Text style={styles.streetBadgeText}>
          {decision.street.toUpperCase()}
        </Text>
      </View>

      {/* Your Hand */}
      <Text style={styles.sectionLabel}>YOUR HAND</Text>
      <View style={styles.cardsRow}>
        {heroCards.map((card, i) => (
          <CardDisplay key={i} card={card} />
        ))}
      </View>

      {/* Board */}
      {boardCards.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>BOARD</Text>
          <View style={styles.cardsRow}>
            {boardCards.map((card, i) => (
              <CardDisplay key={i} card={card} />
            ))}
          </View>
        </>
      )}

      {/* Situation */}
      <View style={styles.situationBox}>
        <View style={styles.situationRow}>
          <Text style={styles.situationLabel}>Pot:</Text>
          <Text style={styles.situationValue}>${decision.potSize}</Text>
        </View>
        <View style={styles.situationRow}>
          <Text style={styles.situationLabel}>Villain ({scenario.villainPosition}):</Text>
          <Text style={styles.situationValue}>{decision.villainAction}</Text>
        </View>
        <View style={styles.situationRow}>
          <Text style={styles.situationLabel}>Your position:</Text>
          <Text style={styles.situationValue}>{scenario.heroPosition}</Text>
        </View>
      </View>

      {/* Villain Range (if available) */}
      {decision.villainRangeDescription && (
        <View style={styles.rangeBox}>
          <Text style={styles.rangeLabel}>🎯 Villain's Likely Range:</Text>
          <Text style={styles.rangeText}>{decision.villainRangeDescription}</Text>
        </View>
      )}

      {/* Question */}
      <Text style={styles.questionText}>What do you do?</Text>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {decision.options.includes('fold') && (
          <ActionButton label="Fold" onPress={() => onAnswer('fold')} />
        )}
        {decision.options.includes('check') && (
          <ActionButton label="Check" onPress={() => onAnswer('check')} />
        )}
        {decision.options.includes('call') && (
          <ActionButton label="Call" onPress={() => onAnswer('call')} />
        )}
        {decision.options.includes('bet') && (
          <ActionButton label="Bet" onPress={() => onAnswer('bet')} variant="primary" />
        )}
        {decision.options.includes('raise') && (
          <ActionButton label="Raise" onPress={() => onAnswer('raise')} variant="primary" />
        )}
      </View>
    </ScrollView>
  );
}

// Feedback screen
function FeedbackScreen({
  decision,
  userAnswer,
  wasCorrect,
  onNext,
  isLastDecision,
}: {
  decision: FullHandDecision;
  userAnswer: ReviewAnswer;
  wasCorrect: boolean;
  onNext: () => void;
  isLastDecision: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      {/* Result Icon */}
      <View style={[styles.resultIcon, wasCorrect ? styles.resultIconCorrect : styles.resultIconWrong]}>
        {wasCorrect ? (
          <Check size={40} color="#fff" />
        ) : (
          <X size={40} color="#fff" />
        )}
      </View>

      <Text style={[styles.resultTitle, wasCorrect ? styles.resultTitleCorrect : styles.resultTitleWrong]}>
        {wasCorrect ? 'Correct!' : 'Not Quite'}
      </Text>

      {/* Answers comparison */}
      <View style={styles.answersComparison}>
        <View style={styles.answerBox}>
          <Text style={styles.answerLabel}>Your Answer</Text>
          <Text style={[styles.answerValue, !wasCorrect && styles.answerValueWrong]}>
            {userAnswer.charAt(0).toUpperCase() + userAnswer.slice(1)}
          </Text>
        </View>
        <View style={styles.answerBox}>
          <Text style={styles.answerLabel}>Optimal Play</Text>
          <Text style={[styles.answerValue, styles.answerValueCorrect]}>
            {decision.correctAction.charAt(0).toUpperCase() + decision.correctAction.slice(1)}
          </Text>
        </View>
      </View>

      {/* Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationTitle}>Why?</Text>
        <Text style={styles.explanationText}>{decision.explanation}</Text>
      </View>

      {/* Pot Odds / Equity Info (if available) */}
      {(decision.potOddsPercent || decision.equityNeeded) && (
        <View style={styles.mathBox}>
          <Text style={styles.mathTitle}>📊 The Math:</Text>
          {decision.potOddsPercent && (
            <Text style={styles.mathText}>Pot Odds: {decision.potOddsPercent}</Text>
          )}
          {decision.equityNeeded && (
            <Text style={styles.mathText}>{decision.equityNeeded}</Text>
          )}
        </View>
      )}

      {/* Educational Tip (if available) */}
      {decision.tipText && (
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>💡 {decision.tipText}</Text>
        </View>
      )}

      {/* Next Button */}
      <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
        <LinearGradient
          colors={[colors.onboarding.profit, '#16A34A']}
          style={styles.nextButtonGradient}
        >
          <Text style={styles.nextButtonText}>
            {isLastDecision ? 'See Results' : 'Next Decision'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Summary screen
function SummaryScreen({
  scenario,
  scores,
  correctCount,
  totalDecisions,
  onPlayAgain,
  onExit,
}: {
  scenario: NonNullable<ReturnType<typeof useFullHandReview>['scenario']>;
  scores: boolean[];
  correctCount: number;
  totalDecisions: number;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  const percentage = Math.round((correctCount / totalDecisions) * 100);
  const isGreat = percentage >= 75;
  const isGood = percentage >= 50;

  const getMessage = () => {
    if (percentage === 100) return "Perfect! You nailed every decision!";
    if (isGreat) return "Great job! Strong reads throughout.";
    if (isGood) return "Good effort! Keep practicing.";
    return "Room to improve. Review the explanations!";
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      {/* Trophy */}
      <View style={[styles.trophyContainer, isGreat && styles.trophyContainerGreat]}>
        <Trophy size={56} color={isGreat ? colors.onboarding.gold : colors.text.muted} />
      </View>

      <Text style={styles.summaryTitle}>Hand Complete!</Text>
      <Text style={styles.scenarioTitle}>{scenario.title}</Text>

      {/* Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreValue}>{correctCount}/{totalDecisions}</Text>
        <Text style={styles.scoreLabel}>Correct Decisions</Text>
        <Text style={[styles.scorePercentage, isGreat && styles.scorePercentageGreat]}>
          {percentage}%
        </Text>
      </View>

      {/* Message */}
      <Text style={styles.summaryMessage}>{getMessage()}</Text>

      {/* Decision breakdown */}
      <View style={styles.breakdownContainer}>
        {scenario.decisions.map((decision, index) => (
          <View key={index} style={styles.breakdownRow}>
            <View style={[styles.breakdownIcon, scores[index] ? styles.breakdownIconCorrect : styles.breakdownIconWrong]}>
              {scores[index] ? <Check size={14} color="#fff" /> : <X size={14} color="#fff" />}
            </View>
            <Text style={styles.breakdownStreet}>
              {decision.street.charAt(0).toUpperCase() + decision.street.slice(1)}
            </Text>
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.summaryButtons}>
        <TouchableOpacity style={styles.playAgainButton} onPress={onPlayAgain} activeOpacity={0.8}>
          <Text style={styles.playAgainText}>Play Another</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitButton} onPress={onExit} activeOpacity={0.8}>
          <Text style={styles.exitText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Main screen component
export default function FullHandReviewScreen() {
  const router = useRouter();
  const {
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
    stats,
    isLoading,
    startScenario,
    submitAnswer,
    nextDecision,
    reset,
  } = useFullHandReview();

  const handleExit = () => {
    reset();
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.background.secondary, colors.background.primary, '#0D0202']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.onboarding.gold} />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Full Hand Training',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: colors.accent.primary,
          headerLeft: () => (
            <TouchableOpacity onPress={handleExit} style={styles.headerButton}>
              <ChevronLeft size={24} color={colors.text.muted} />
            </TouchableOpacity>
          ),
        }}
      />

      <LinearGradient
        colors={[colors.background.secondary, colors.background.primary, '#0D0202']}
        style={styles.gradient}
      >
        {step === 'intro' && (
          <IntroScreen onStart={() => startScenario()} stats={stats} />
        )}

        {step === 'decision' && scenario && currentDecision && (
          <DecisionScreen
            scenario={scenario}
            decision={currentDecision}
            decisionIndex={currentDecisionIndex}
            totalDecisions={totalDecisions}
            scores={scores}
            onAnswer={submitAnswer}
          />
        )}

        {step === 'feedback' && currentDecision && lastAnswer && lastWasCorrect !== null && (
          <FeedbackScreen
            decision={currentDecision}
            userAnswer={lastAnswer}
            wasCorrect={lastWasCorrect}
            onNext={nextDecision}
            isLastDecision={currentDecisionIndex >= totalDecisions - 1}
          />
        )}

        {step === 'summary' && scenario && (
          <SummaryScreen
            scenario={scenario}
            scores={scores}
            correctCount={correctCount}
            totalDecisions={totalDecisions}
            onPlayAgain={() => startScenario()}
            onExit={handleExit}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

// Styles
const cardStyles = StyleSheet.create({
  card: {
    width: 48,
    height: 68,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rank: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  suit: {
    fontSize: 18,
    marginTop: -4,
    color: '#1a1a1a',
  },
  redText: {
    color: '#DC2626',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    padding: 8,
  },

  // Centered container
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Intro screen
  iconContainer: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 32,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onboarding.gold,
  },
  statLabel: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.background.tertiary,
  },
  startButton: {
    marginTop: 48,
    width: '100%',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },

  // Screen content
  screenContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  progressItemWrapper: {
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  progressDotActive: {
    backgroundColor: colors.onboarding.gold,
  },
  progressDotCorrect: {
    backgroundColor: colors.onboarding.profit,
  },
  progressDotWrong: {
    backgroundColor: '#DC2626',
  },
  progressLabel: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: '600',
  },
  progressLabelActive: {
    color: colors.onboarding.gold,
  },

  // Street badge
  streetBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  streetBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onboarding.gold,
    letterSpacing: 2,
  },

  // Section labels
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },

  // Situation box
  situationBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  situationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  situationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  situationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },

  // Question
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 24,
  },

  // Action buttons
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  actionButtonContainer: {
    width: '45%',
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  actionButtonTextPrimary: {
    color: '#fff',
  },

  // Feedback screen
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 40,
  },
  resultIconCorrect: {
    backgroundColor: colors.onboarding.profit,
  },
  resultIconWrong: {
    backgroundColor: '#DC2626',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
  },
  resultTitleCorrect: {
    color: colors.onboarding.profit,
  },
  resultTitleWrong: {
    color: '#DC2626',
  },
  answersComparison: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 16,
  },
  answerBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  answerLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 8,
  },
  answerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  answerValueCorrect: {
    color: colors.onboarding.profit,
  },
  answerValueWrong: {
    color: '#DC2626',
  },
  explanationBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onboarding.gold,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  // Range box (decision screen)
  rangeBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onboarding.data,
    marginBottom: 4,
  },
  rangeText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  // Math box (feedback screen)
  mathBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  mathTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onboarding.profit,
    marginBottom: 6,
  },
  mathText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  // Tip box (feedback screen)
  tipBox: {
    backgroundColor: 'rgba(212, 168, 75, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 75, 0.2)',
  },
  tipText: {
    fontSize: 14,
    color: colors.onboarding.gold,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  nextButton: {
    marginTop: 32,
  },
  nextButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  // Summary screen
  trophyContainer: {
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 16,
  },
  trophyContainerGreat: {
    // Could add glow effect here
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  scenarioTitle: {
    fontSize: 16,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text.primary,
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
  },
  scorePercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.secondary,
    marginTop: 8,
  },
  scorePercentageGreat: {
    color: colors.onboarding.gold,
  },
  summaryMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 24,
  },
  breakdownContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  breakdownIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakdownIconCorrect: {
    backgroundColor: colors.onboarding.profit,
  },
  breakdownIconWrong: {
    backgroundColor: '#DC2626',
  },
  breakdownStreet: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  summaryButtons: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 16,
  },
  playAgainButton: {
    flex: 1,
    backgroundColor: colors.onboarding.gold,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  exitButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  exitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
