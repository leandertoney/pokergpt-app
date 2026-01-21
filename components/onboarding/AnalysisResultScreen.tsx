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
import { Check, TrendingUp, Target, Calculator } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { colors } from '@/constants/colors';

type AnalysisResultScreenProps = {
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

export function AnalysisResultScreen({ onNext }: AnalysisResultScreenProps) {
  const [confidenceWidth, setConfidenceWidth] = useState(0);

  const titleAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Title entrance
    Animated.spring(titleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Result card entrance
    setTimeout(() => {
      Animated.spring(resultAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate confidence bar
      setTimeout(() => animateConfidence(), 200);
    }, 300);

    // Show continue button
    setTimeout(() => {
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1200);
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

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: titleAnim,
            transform: [
              {
                scale: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <AnimatedLogo variant={1} size="small" loop />
      </Animated.View>

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
        Instant Analysis
      </Animated.Text>

      <Animated.Text
        style={[
          styles.subtitle,
          {
            opacity: titleAnim,
          },
        ]}
      >
        AI-powered recommendations in seconds
      </Animated.Text>

      {/* Result Card */}
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

      {/* Continue Button */}
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
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  logoContainer: {
    marginBottom: 16,
  } as ViewStyle,
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 32,
  } as TextStyle,
  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
  } as ViewStyle,
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    gap: 10,
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
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
  } as ViewStyle,
  continueButton: {
    backgroundColor: colors.onboarding.gold,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  } as ViewStyle,
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
});

export default AnalysisResultScreen;
