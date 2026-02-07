import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, TrendingUp, Target, Calculator } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/instant_analysis.png?v=2';

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
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: HERO_IMAGE_URL }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.heroGradient}
        />
      </View>

      <View style={styles.content}>
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
          Get a clear answer
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: titleAnim,
            },
          ]}
        >
          Call, fold, or raise - with equity, pot odds, and the reasoning to back it up.
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  heroContainer: {
    position: 'absolute',
    top: -70,
    left: 0,
    right: 0,
    height: '65%',
    overflow: 'hidden',
  } as ViewStyle,
  heroImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  } as ViewStyle,
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 120,
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
    width: '100%',
    marginTop: 24,
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
