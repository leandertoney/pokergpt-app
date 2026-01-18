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
import { ChevronLeft, TrendingUp, Target, Calculator, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { getOnboardingDemoHand } from '@/services/dailyReviewService';

type DailyReviewDemoScreenProps = {
  onNext: () => void;
};

type DemoPhase = 'intro' | 'question' | 'answer' | 'celebrate';

// Demo analysis stats (shown after answer)
const DEMO_STATS = {
  equity: 62,
  ev: 28,
  potOdds: '2.3:1',
  confidence: 78,
};

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
  const [confidenceWidth, setConfidenceWidth] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const streakAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const demoHand = getOnboardingDemoHand();
  const cards = demoHand.heroHand.split(' ').filter(c => c.length > 0);

  // Card dealing animations - one for each card
  const cardAnims = useRef(cards.map(() => new Animated.Value(0))).current;
  // Question phase card animations
  const questionCardAnims = useRef(cards.map(() => new Animated.Value(0))).current;

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

    // Deal cards with staggered animation
    cardAnims.forEach((anim, index) => {
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }).start();
        // Haptic feedback for each card dealt
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 400 + index * 150); // Start after fade-in, 150ms between cards
    });

    // Start button pulse after cards dealt
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
    }, 400 + cards.length * 150 + 300); // After all cards dealt
  }, []);

  const handleTryNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('question');

    // Deal cards in question phase with staggered animation
    questionCardAnims.forEach((anim, index) => {
      anim.setValue(0); // Reset
      setTimeout(() => {
        Animated.spring(anim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 100 + index * 150);
    });
  };

  const animateConfidence = () => {
    let current = 0;
    const target = DEMO_STATS.confidence;
    const interval = setInterval(() => {
      current += 3;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setConfidenceWidth(current);
    }, 15);
  };

  const handleAnswer = (answer: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedAnswer(answer);
    setPhase('answer');

    // Show if correct after a moment, then animate stats
    setTimeout(() => {
      setShowCorrect(true);
      Haptics.notificationAsync(
        answer === demoHand.correctAction
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      // Animate confidence bar
      setTimeout(() => animateConfidence(), 200);
    }, 300);

    // Transition to celebrate (increased delay to show stats)
    setTimeout(() => {
      setPhase('celebrate');
      Animated.spring(streakAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }, 2500);
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
          {/* Subheadline */}
          <Text style={styles.subheadline}>Daily Training</Text>

          {/* Demo card preview - Now bigger and more prominent */}
          <View style={styles.demoPreview}>
            <View style={styles.miniCardsRow}>
              {cards.map((card, index) => (
                <Animated.View
                  key={index}
                  style={{
                    opacity: cardAnims[index],
                    transform: [
                      {
                        translateX: cardAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-100, 0],
                        }),
                      },
                      {
                        rotate: cardAnims[index].interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: ['-15deg', '3deg', '0deg'],
                        }),
                      },
                      {
                        scale: cardAnims[index].interpolate({
                          inputRange: [0, 0.8, 1],
                          outputRange: [0.5, 1.05, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <MiniCard card={card} />
                </Animated.View>
              ))}
            </View>
            <Text style={styles.previewQuestion}>What would you do?</Text>
          </View>

          {/* Headline - Now smaller and below the card */}
          <Text style={styles.headline}>One hand. One minute.</Text>

          <Text style={styles.description}>
            Every day, a new spot to solve.{'\n'}
            Build your streak. Sharpen your game.
          </Text>

          {/* Try Now Button */}
          <TouchableOpacity
            style={styles.tryButton}
            onPress={handleTryNow}
            activeOpacity={0.85}
          >
            <Text style={styles.tryButtonText}>Try It Now</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Swipe hint */}
        <Animated.View style={[styles.swipeHint, { opacity: buttonAnim }]}>
          <ChevronLeft size={24} color="rgba(255,255,255,0.5)" />
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
                <Animated.View
                  key={index}
                  style={{
                    opacity: questionCardAnims[index],
                    transform: [
                      {
                        translateX: questionCardAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [-80, 0],
                        }),
                      },
                      {
                        rotate: questionCardAnims[index].interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: ['-12deg', '2deg', '0deg'],
                        }),
                      },
                      {
                        scale: questionCardAnims[index].interpolate({
                          inputRange: [0, 0.8, 1],
                          outputRange: [0.6, 1.03, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <MiniCard card={card} />
                </Animated.View>
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
          <Text style={styles.chooseOneLabel}>Choose one</Text>

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
              style={styles.answerButton}
              onPress={() => handleAnswer('raise')}
            >
              <Text style={styles.answerButtonText}>Raise</Text>
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
          {/* Result Header */}
          <View style={styles.resultHeader}>
            <View style={[styles.checkCircle, !isCorrect && styles.wrongCircle]}>
              <Check size={16} color={isCorrect ? "#000" : "#fff"} />
            </View>
            <Text style={styles.resultAction}>{demoHand.correctAction.toUpperCase()}</Text>
          </View>

          {showCorrect && (
            <>
              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Target size={14} color={colors.onboarding.data} />
                  <Text style={styles.statLabel}>Equity</Text>
                  <Text style={styles.statValue}>{DEMO_STATS.equity}%</Text>
                </View>
                <View style={styles.statItem}>
                  <TrendingUp size={14} color={colors.onboarding.profit} />
                  <Text style={styles.statLabel}>EV</Text>
                  <Text style={[styles.statValue, styles.evValue]}>+${DEMO_STATS.ev}</Text>
                </View>
                <View style={styles.statItem}>
                  <Calculator size={14} color={colors.onboarding.data} />
                  <Text style={styles.statLabel}>Pot Odds</Text>
                  <Text style={styles.statValue}>{DEMO_STATS.potOdds}</Text>
                </View>
              </View>

              {/* Confidence bar */}
              <View style={styles.confidenceContainer}>
                <View style={styles.confidenceBar}>
                  <View style={[styles.confidenceFill, { width: `${confidenceWidth}%` }]} />
                </View>
                <Text style={styles.confidenceText}>{confidenceWidth}%</Text>
              </View>

              {/* Your choice indicator */}
              {!isCorrect && (
                <View style={styles.yourChoiceRow}>
                  <Text style={styles.yourChoiceLabel}>You chose:</Text>
                  <Text style={styles.yourChoiceValue}>{selectedAnswer?.toUpperCase()}</Text>
                </View>
              )}

              {/* Reasoning */}
              <Text style={styles.reasoningText}>{demoHand.explanation}</Text>
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
    borderRadius: 8,
    width: 56,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  rank: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A0505',
  },
  suit: {
    fontSize: 20,
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
  subheadline: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  } as TextStyle,
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  } as TextStyle,
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  } as TextStyle,
  demoPreview: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
  } as ViewStyle,
  miniCardsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  } as ViewStyle,
  previewQuestion: {
    fontSize: 18,
    color: colors.onboarding.profit,
    fontWeight: '700',
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
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  chooseOneLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
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
  answerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  // Answer phase - Full analysis display
  answerContent: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  } as ViewStyle,
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  } as ViewStyle,
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.onboarding.gold,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  wrongCircle: {
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
  } as ViewStyle,
  resultAction: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  } as TextStyle,
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 8,
  } as ViewStyle,
  statItem: {
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  } as TextStyle,
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  evValue: {
    color: colors.onboarding.profit,
  } as TextStyle,
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    width: '100%',
  } as ViewStyle,
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  } as ViewStyle,
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.onboarding.gold,
    borderRadius: 4,
  } as ViewStyle,
  confidenceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onboarding.gold,
    width: 45,
  } as TextStyle,
  yourChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  } as ViewStyle,
  yourChoiceLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  } as TextStyle,
  yourChoiceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  } as TextStyle,
  reasoningText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
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
