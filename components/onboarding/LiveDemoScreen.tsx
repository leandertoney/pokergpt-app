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
import { Check, ChevronRight, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { VoiceOrb, type VoiceOrbState } from '@/components/VoiceOrb';
import { colors } from '@/constants/colors';

type LiveDemoScreenProps = {
  onNext: () => void;
};

const DEMO_TRANSCRIPT = "I have ace-king on the button, villain 3-bets from the small blind...";
const DEMO_RESULT = {
  action: 'CALL',
  confidence: 73,
  ev: 42,
  reasoning: "You have great implied odds with position and a strong hand.",
};

export function LiveDemoScreen({ onNext }: LiveDemoScreenProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [orbState, setOrbState] = useState<VoiceOrbState>('idle');
  const [showResult, setShowResult] = useState(false);
  const [confidenceWidth, setConfidenceWidth] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);

  const transcriptAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start the demo sequence
    const sequence = async () => {
      // Phase 1: Show orb as idle, then transition to listening
      await delay(500);
      setOrbState('listening');

      // Phase 2: Typewriter effect for transcript
      await delay(300);
      Animated.timing(transcriptAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Type out the transcript
      for (let i = 0; i <= DEMO_TRANSCRIPT.length; i++) {
        setDisplayedText(DEMO_TRANSCRIPT.slice(0, i));
        await delay(40);
      }

      // Phase 3: Processing
      await delay(300);
      setOrbState('processing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Phase 4: Show result
      await delay(1500);
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

      // Phase 5: Show continue button
      await delay(800);
      setAnimationComplete(true);
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
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
      <Text style={styles.title}>See the magic</Text>

      {/* Transcript bubble */}
      <Animated.View
        style={[
          styles.transcriptBubble,
          {
            opacity: transcriptAnim,
            transform: [
              {
                translateY: transcriptAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.transcriptText}>
          "{displayedText}"
          <Text style={styles.cursor}>|</Text>
        </Text>
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
          <View style={styles.resultHeader}>
            <View style={styles.checkCircle}>
              <Check size={16} color="#000" />
            </View>
            <Text style={styles.resultAction}>{DEMO_RESULT.action}</Text>
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

          {/* EV Indicator */}
          <View style={styles.evContainer}>
            <TrendingUp size={16} color={colors.onboarding.profit} />
            <Text style={styles.evText}>+${DEMO_RESULT.ev} expected value</Text>
          </View>

          <Text style={styles.resultReasoning}>{DEMO_RESULT.reasoning}</Text>
        </Animated.View>
      )}

      {/* Continue button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.button}>
          <Text style={styles.buttonText}>This is what you get</Text>
          <ChevronRight size={20} color="#000" />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  } as ViewStyle,
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  } as TextStyle,
  transcriptBubble: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    maxWidth: '100%',
  } as ViewStyle,
  transcriptText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    lineHeight: 22,
  } as TextStyle,
  cursor: {
    color: colors.onboarding.gold,
    fontWeight: '300',
  } as TextStyle,
  orbContainer: {
    marginVertical: 24,
  } as ViewStyle,
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 16,
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
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
  evContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  } as ViewStyle,
  evText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onboarding.profit,
  } as TextStyle,
  resultReasoning: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
  } as ViewStyle,
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
  } as ViewStyle,
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
});

export default LiveDemoScreen;
