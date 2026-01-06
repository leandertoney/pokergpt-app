import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { getOnboardingDemoHand } from '@/services/dailyReviewService';

type DailyReviewDemoScreenProps = {
  onNext: () => void;
};

type DemoPhase = 'intro' | 'question' | 'answer' | 'celebrate';

// Card display component
function MiniCard({ card }: { card: string }) {
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
    <View style={miniCardStyles.card}>
      <Text style={[miniCardStyles.rank, isRed && miniCardStyles.redText]}>{rank}</Text>
      <Text style={[miniCardStyles.suit, isRed && miniCardStyles.redText]}>{suit}</Text>
    </View>
  );
}

export function DailyReviewDemoScreen({ onNext }: DailyReviewDemoScreenProps) {
  const [phase, setPhase] = useState<DemoPhase>('intro');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const streakAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const demoHand = getOnboardingDemoHand();
  const cards = demoHand.heroHand.split(' ').filter(c => c.length > 0);

  useEffect(() => {
    // Initial animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Start button pulse after delay
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(buttonAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1000);
  }, []);

  const handleTryNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('question');
  };

  const handleAnswer = (answer: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedAnswer(answer);
    setPhase('answer');

    // Show if correct after a moment
    setTimeout(() => {
      setShowCorrect(true);
      Haptics.notificationAsync(
        answer === demoHand.correctAction
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    }, 300);

    // Transition to celebrate
    setTimeout(() => {
      setPhase('celebrate');
      Animated.spring(streakAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }, 1500);
  };

  // Render intro phase
  if (phase === 'intro') {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Headline */}
          <View style={styles.streakIcon}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>

          <Text style={styles.headline}>60 Seconds to Level Up</Text>

          <Text style={styles.description}>
            Every day, we show you a hand.{'\n'}
            You guess. We teach. You improve.
          </Text>

          {/* Demo card preview */}
          <View style={styles.demoPreview}>
            <View style={styles.miniCardsRow}>
              {cards.map((card, index) => (
                <MiniCard key={index} card={card} />
              ))}
            </View>
            <Text style={styles.previewText}>Build your streak</Text>
          </View>

          {/* Try Now Button */}
          <TouchableOpacity
            style={styles.tryButton}
            onPress={handleTryNow}
            activeOpacity={0.85}
          >
            <Text style={styles.tryButtonText}>Try One Now →</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Swipe hint */}
        <Animated.View style={[styles.swipeHint, { opacity: buttonAnim }]}>
          <ChevronRight size={24} color="rgba(255,255,255,0.5)" />
          <Text style={styles.swipeText}>Or swipe to skip</Text>
        </Animated.View>
      </View>
    );
  }

  // Render question phase
  if (phase === 'question') {
    return (
      <View style={styles.container}>
        <View style={styles.questionContent}>
          <Text style={styles.questionLabel}>Training Hand</Text>

          {/* Cards */}
          <View style={styles.cardsSection}>
            <Text style={styles.sectionLabel}>You have:</Text>
            <View style={styles.cardsRow}>
              {cards.map((card, index) => (
                <MiniCard key={index} card={card} />
              ))}
            </View>
          </View>

          {/* Position & Action */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Position: {demoHand.heroPosition} | Villain: {demoHand.villainPosition}
            </Text>
            <Text style={styles.actionText}>{demoHand.villainAction}</Text>
          </View>

          {/* Question */}
          <Text style={styles.questionText}>What do you do?</Text>

          {/* Answer buttons */}
          <View style={styles.answerRow}>
            <TouchableOpacity
              style={styles.answerButton}
              onPress={() => handleAnswer('fold')}
            >
              <Text style={styles.answerButtonText}>Fold</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.answerButton}
              onPress={() => handleAnswer('call')}
            >
              <Text style={styles.answerButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.answerButton, styles.answerButtonRaise]}
              onPress={() => handleAnswer('raise')}
            >
              <Text style={[styles.answerButtonText, styles.answerButtonTextRaise]}>Raise</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Render answer phase
  if (phase === 'answer') {
    const isCorrect = selectedAnswer === demoHand.correctAction;

    return (
      <View style={styles.container}>
        <View style={styles.answerContent}>
          {/* Result */}
          <View style={[styles.resultBadge, isCorrect ? styles.correctBadge : styles.incorrectBadge]}>
            <Text style={styles.resultEmoji}>{isCorrect ? '✓' : '✗'}</Text>
            <Text style={styles.resultText}>{isCorrect ? 'Correct!' : 'Not quite'}</Text>
          </View>

          {showCorrect && (
            <>
              <View style={styles.answerDisplay}>
                <Text style={styles.answerLabel}>You chose:</Text>
                <Text style={styles.answerValue}>{selectedAnswer?.toUpperCase()}</Text>
              </View>

              <View style={styles.answerDisplay}>
                <Text style={styles.answerLabel}>Optimal play:</Text>
                <Text style={[styles.answerValue, styles.optimalText]}>
                  {demoHand.correctAction.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.explanationText}>{demoHand.explanation}</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  // Render celebrate phase
  return (
    <View style={styles.container}>
      <View style={styles.celebrateContent}>
        <Animated.View
          style={[
            styles.bigStreakContainer,
            {
              transform: [
                {
                  scale: streakAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.2, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.bigFireEmoji}>🔥</Text>
          <Text style={styles.bigStreakNumber}>1</Text>
          <Text style={styles.bigStreakLabel}>Day Streak!</Text>
        </Animated.View>

        <Text style={styles.celebrateText}>
          That's all it takes.{'\n'}
          60 seconds a day to become a better player.
        </Text>

        {/* Continue button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onNext}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const miniCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 6,
    width: 42,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rank: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A0505',
  },
  suit: {
    fontSize: 16,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  content: {
    alignItems: 'center',
  } as ViewStyle,
  streakIcon: {
    marginBottom: 16,
  } as ViewStyle,
  fireEmoji: {
    fontSize: 48,
  } as TextStyle,
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  } as TextStyle,
  description: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  } as TextStyle,
  demoPreview: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  } as ViewStyle,
  miniCardsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  } as ViewStyle,
  previewText: {
    fontSize: 14,
    color: colors.onboarding.profit,
    fontWeight: '600',
  } as TextStyle,
  tryButton: {
    backgroundColor: colors.onboarding.profit,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  } as ViewStyle,
  tryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  swipeHint: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  swipeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  } as TextStyle,
  // Question phase
  questionContent: {
    alignItems: 'center',
    width: '100%',
  } as ViewStyle,
  questionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  } as TextStyle,
  cardsSection: {
    marginBottom: 20,
  } as ViewStyle,
  sectionLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  } as ViewStyle,
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  } as ViewStyle,
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    textAlign: 'center',
  } as TextStyle,
  actionText: {
    fontSize: 16,
    color: colors.onboarding.gold,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  } as TextStyle,
  answerRow: {
    flexDirection: 'row',
    gap: 12,
  } as ViewStyle,
  answerButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  } as ViewStyle,
  answerButtonRaise: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  } as ViewStyle,
  answerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  answerButtonTextRaise: {
    color: colors.onboarding.profit,
  } as TextStyle,
  // Answer phase
  answerContent: {
    alignItems: 'center',
    width: '100%',
  } as ViewStyle,
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 24,
  } as ViewStyle,
  correctBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  } as ViewStyle,
  incorrectBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  } as ViewStyle,
  resultEmoji: {
    fontSize: 20,
    marginRight: 8,
  } as TextStyle,
  resultText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  answerDisplay: {
    marginBottom: 12,
    alignItems: 'center',
  } as ViewStyle,
  answerLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  } as TextStyle,
  answerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  optimalText: {
    color: colors.onboarding.profit,
  } as TextStyle,
  explanationText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
    paddingHorizontal: 16,
  } as TextStyle,
  // Celebrate phase
  celebrateContent: {
    alignItems: 'center',
  } as ViewStyle,
  bigStreakContainer: {
    alignItems: 'center',
    marginBottom: 32,
  } as ViewStyle,
  bigFireEmoji: {
    fontSize: 56,
    marginBottom: 4,
  } as TextStyle,
  bigStreakNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.onboarding.profit,
  } as TextStyle,
  bigStreakLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: -4,
  } as TextStyle,
  celebrateText: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  } as TextStyle,
  continueButton: {
    backgroundColor: colors.onboarding.profit,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
  } as ViewStyle,
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
});

export default DailyReviewDemoScreen;
