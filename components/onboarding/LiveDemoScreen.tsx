import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Check, ChevronLeft, TrendingUp, Target, Calculator } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VoiceOrb, type VoiceOrbState } from '@/components/VoiceOrb';
import { colors } from '@/constants/colors';

// Card display component - centered rank + suit design
function MiniCard({ rank, suit, size = 'medium' }: { rank: string; suit: string; size?: 'small' | 'medium' }) {
  const suitSymbols: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const suitSymbol = suitSymbols[suit] || suit;
  const isRed = suit === 'h' || suit === 'd';
  const isSmall = size === 'small';

  return (
    <View style={[miniCardStyles.card, isSmall && miniCardStyles.cardSmall]}>
      <Text style={[miniCardStyles.rank, isSmall && miniCardStyles.rankSmall, isRed && miniCardStyles.redText]}>{rank}</Text>
      <Text style={[miniCardStyles.suit, isSmall && miniCardStyles.suitSmall, isRed && miniCardStyles.redText]}>{suitSymbol}</Text>
    </View>
  );
}

type LiveDemoScreenProps = {
  onNext: () => void;
};

const DEMO_RESULT = {
  action: 'CALL',
  confidence: 73,
  equity: 54,
  ev: 42,
  potOdds: '2.7:1',
  reasoning: "Strong implied odds with position. Villain's range is capped here.",
};

// Demo transcription text that appears word by word
const TRANSCRIPTION_TEXT = '"I had ace king suited... villain 3-bet to 45... pot was 120..."';

export function LiveDemoScreen({ onNext }: LiveDemoScreenProps) {
  const [orbState, setOrbState] = useState<VoiceOrbState>('idle');
  const [showCards, setShowCards] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [confidenceWidth, setConfidenceWidth] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  const titleAnim = useRef(new Animated.Value(0)).current;
  const transcriptAnim = useRef(new Animated.Value(0)).current;
  const handAnim = useRef(new Animated.Value(0)).current;
  const boardAnim = useRef(new Animated.Value(0)).current;
  const actionAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Animate transcription text word by word
  const animateTranscription = async () => {
    const words = TRANSCRIPTION_TEXT.split(' ');
    for (let i = 0; i < words.length; i++) {
      await delay(120); // Speed per word
      setDisplayedText(words.slice(0, i + 1).join(' '));

      // Show cards when we mention them
      if (i === 3) { // After "ace king suited"
        setShowCards(true);
        Animated.spring(handAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  useEffect(() => {
    // Start the demo sequence
    const sequence = async () => {
      // Phase 1: Show title
      Animated.spring(titleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Phase 2: Start listening immediately + show transcript area
      await delay(400);
      setOrbState('listening');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.timing(transcriptAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Phase 3: Animate transcription text word by word (cards appear during this)
      await delay(300);
      await animateTranscription();

      // Phase 4: Show board cards after transcription
      await delay(300);
      setShowBoard(true);
      Animated.spring(boardAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Phase 5: Show action context
      await delay(300);
      Animated.timing(actionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Phase 6: Processing
      await delay(400);
      setOrbState('processing');

      // Phase 7: Show result
      await delay(1000);
      setOrbState('speaking');
      setShowResult(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.spring(resultAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Animate confidence bar
      await delay(200);
      animateConfidence();

      // Phase 8: Show swipe hint with pulsing animation
      await delay(800);
      setAnimationComplete(true);
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
    };

    sequence();
  }, []);

  const animateConfidence = () => {
    let current = 0;
    const target = DEMO_RESULT.confidence;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setConfidenceWidth(current);
    }, 10);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handlePress = () => {
    if (animationComplete) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onNext();
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handlePress}
    >
      {/* Title */}
      <Animated.Text
        style={[
          styles.title,
          {
            opacity: titleAnim,
            transform: [
              {
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        Just speak your hand
      </Animated.Text>

      {/* Voice Orb - Now at top to show this is voice-first */}
      <View style={styles.orbContainer}>
        <VoiceOrb state={orbState} size="small" />
      </View>

      {/* Live Transcription Text */}
      <Animated.View
        style={[
          styles.transcriptContainer,
          {
            opacity: transcriptAnim,
          },
        ]}
      >
        <Text style={styles.transcriptText}>
          {displayedText || '...'}
        </Text>
      </Animated.View>

      {/* Hand Display Card */}
      <Animated.View
        style={[
          styles.handCard,
          {
            opacity: handAnim,
            transform: [
              {
                scale: handAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* Your Hand */}
        <View style={styles.handSection}>
          <Text style={styles.sectionLabel}>Your Hand</Text>
          <View style={styles.cardsRow}>
            {showCards && (
              <>
                <MiniCard rank="A" suit="s" size="medium" />
                <MiniCard rank="K" suit="h" size="medium" />
              </>
            )}
          </View>
        </View>

        {/* Board */}
        <Animated.View
          style={[
            styles.handSection,
            {
              opacity: boardAnim,
            },
          ]}
        >
          <Text style={styles.sectionLabel}>Flop</Text>
          <View style={styles.cardsRow}>
            {showBoard && (
              <>
                <MiniCard rank="Q" suit="d" size="small" />
                <MiniCard rank="J" suit="c" size="small" />
                <MiniCard rank="3" suit="s" size="small" />
              </>
            )}
          </View>
        </Animated.View>

        {/* Action Context */}
        <Animated.View
          style={[
            styles.actionContext,
            {
              opacity: actionAnim,
            },
          ]}
        >
          <Text style={styles.actionText}>Villain 3-bets to $45</Text>
          <Text style={styles.potText}>Pot: $120</Text>
        </Animated.View>
      </Animated.View>

      {/* Result Card */}
      {showResult && (
        <Animated.View
          style={[
            styles.resultCard,
            {
              opacity: resultAnim,
              transform: [
                {
                  translateY: resultAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Action Header */}
          <View style={styles.resultHeader}>
            <View style={styles.checkCircle}>
              <Check size={16} color="#000" />
            </View>
            <Text style={styles.resultAction}>{DEMO_RESULT.action}</Text>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Target size={14} color={colors.onboarding.data} />
              <Text style={styles.statLabel}>Equity</Text>
              <Text style={styles.statValue}>{DEMO_RESULT.equity}%</Text>
            </View>
            <View style={styles.statItem}>
              <TrendingUp size={14} color={colors.onboarding.profit} />
              <Text style={styles.statLabel}>EV</Text>
              <Text style={[styles.statValue, styles.evValue]}>+${DEMO_RESULT.ev}</Text>
            </View>
            <View style={styles.statItem}>
              <Calculator size={14} color={colors.onboarding.data} />
              <Text style={styles.statLabel}>Pot Odds</Text>
              <Text style={styles.statValue}>{DEMO_RESULT.potOdds}</Text>
            </View>
          </View>

          {/* Confidence bar */}
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${confidenceWidth}%` },
                ]}
              />
            </View>
            <Text style={styles.confidenceText}>{confidenceWidth}%</Text>
          </View>

          {/* Reasoning */}
          <Text style={styles.resultReasoning}>{DEMO_RESULT.reasoning}</Text>
        </Animated.View>
      )}

      {/* Swipe Hint */}
      <Animated.View
        style={[
          styles.swipeHint,
          {
            opacity: buttonAnim,
          },
        ]}
      >
        <ChevronLeft size={24} color="rgba(255,255,255,0.5)" />
        <Text style={styles.swipeText}>Swipe to continue</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  } as ViewStyle,
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  } as TextStyle,
  handCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12,
    width: '100%',
  } as ViewStyle,
  handSection: {
    marginBottom: 12,
  } as ViewStyle,
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
  } as ViewStyle,
  actionContext: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  } as ViewStyle,
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  } as TextStyle,
  potText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onboarding.gold,
  } as TextStyle,
  orbContainer: {
    marginVertical: 8,
  } as ViewStyle,
  transcriptContainer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    width: '100%',
    minHeight: 44,
  } as ViewStyle,
  transcriptText: {
    fontSize: 16,
    color: '#fff',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  } as TextStyle,
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    width: '100%',
  } as ViewStyle,
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  } as ViewStyle,
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.onboarding.gold,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  resultAction: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  } as TextStyle,
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
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
    gap: 10,
    marginBottom: 8,
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
  resultReasoning: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
    fontStyle: 'italic',
  } as TextStyle,
  swipeHint: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
  } as ViewStyle,
  swipeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  } as TextStyle,
});

// Mini card styles - centered rank + suit design
const miniCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 6,
    width: 48,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  cardSmall: {
    width: 38,
    height: 52,
  } as ViewStyle,
  rank: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  } as TextStyle,
  rankSmall: {
    fontSize: 18,
  } as TextStyle,
  suit: {
    fontSize: 18,
    marginTop: -2,
    color: '#1A1A1A',
  } as TextStyle,
  suitSmall: {
    fontSize: 14,
  } as TextStyle,
  redText: {
    color: '#FF3A3A',
  } as TextStyle,
});

export default LiveDemoScreen;
