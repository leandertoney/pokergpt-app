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
import { Check, ChevronUp, TrendingUp, Target, Calculator } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VoiceOrb, type VoiceOrbState } from '@/components/VoiceOrb';
import { PlayingCard, EmptyCard } from '@/components/PlayingCard';
import { colors } from '@/constants/colors';

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

export function LiveDemoScreen({ onNext }: LiveDemoScreenProps) {
  const [orbState, setOrbState] = useState<VoiceOrbState>('idle');
  const [showCards, setShowCards] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [confidenceWidth, setConfidenceWidth] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);

  const titleAnim = useRef(new Animated.Value(0)).current;
  const handAnim = useRef(new Animated.Value(0)).current;
  const boardAnim = useRef(new Animated.Value(0)).current;
  const actionAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

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

      // Phase 2: Show hero cards
      await delay(400);
      setShowCards(true);
      Animated.spring(handAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Phase 3: Show board cards
      await delay(600);
      setShowBoard(true);
      Animated.spring(boardAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Phase 4: Show action context
      await delay(400);
      Animated.timing(actionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Phase 5: Start listening
      await delay(300);
      setOrbState('listening');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Phase 6: Processing
      await delay(1200);
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
        Real-time analysis
      </Animated.Text>

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
                <PlayingCard rank="A" suit="s" size="medium" animateIn delay={0} />
                <PlayingCard rank="K" suit="h" size="medium" animateIn delay={100} />
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
          <Text style={styles.sectionLabel}>Board</Text>
          <View style={styles.cardsRow}>
            {showBoard && (
              <>
                <PlayingCard rank="Q" suit="d" size="small" animateIn delay={0} />
                <PlayingCard rank="J" suit="c" size="small" animateIn delay={100} />
                <PlayingCard rank="3" suit="s" size="small" animateIn delay={200} />
                <EmptyCard size="small" />
                <EmptyCard size="small" />
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

      {/* Voice Orb */}
      <View style={styles.orbContainer}>
        <VoiceOrb state={orbState} size="medium" />
      </View>

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
        <ChevronUp size={24} color="rgba(255,255,255,0.5)" />
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
    paddingTop: 50,
  } as ViewStyle,
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  } as TextStyle,
  handCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  } as ViewStyle,
  handSection: {
    marginBottom: 16,
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
    paddingTop: 12,
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
    marginVertical: 16,
  } as ViewStyle,
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  } as ViewStyle,
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  } as ViewStyle,
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.onboarding.gold,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  resultAction: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  } as TextStyle,
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    backgroundColor: colors.accent.primary,
    borderRadius: 4,
  } as ViewStyle,
  confidenceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onboarding.gold,
    width: 45,
  } as TextStyle,
  resultReasoning: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
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

export default LiveDemoScreen;
