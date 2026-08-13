import React, { useEffect, useRef } from 'react';
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
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import type { PainPoint } from '@/types/poker';

// Placeholder - replace with real Supabase URL later
const HERO_IMAGE = require('../../assets/images/onboarding/identity_screen.jpg');

type ValidationScreenProps = {
  painPoint: PainPoint;
  onNext: () => void;
};

type ValidationContent = {
  headline: string;
  subtext: string;
  reassurance: string;
  transition: string;
};

const VALIDATION_CONTENT: Record<PainPoint, ValidationContent> = {
  tilt: {
    headline: "Unshakeable confidence. Smart.",
    subtext: 'The best players stay calm under pressure. With the right tools, every decision becomes clear.',
    reassurance: 'Confidence is your competitive advantage.',
    transition: "Let's get started.",
  },
  leaks: {
    headline: 'Higher stakes, bigger wins. Love it.',
    subtext: "Moving up requires skill and confidence. You're already thinking like a winner.",
    reassurance: 'You have what it takes to play bigger.',
    transition: "Let's level you up.",
  },
  overwhelmed: {
    headline: 'Effortless mastery. Great choice.',
    subtext: "Strategy doesn't have to be complicated. The best players make it look easy because they focus on what actually matters.",
    reassurance: 'Simplicity is power.',
    transition: "We'll show you how.",
  },
  consistency: {
    headline: 'Steady wins. Perfect.',
    subtext: "Consistent winrate comes from consistent process. You're already on the right path.",
    reassurance: 'Every session builds momentum.',
    transition: "Let's build yours.",
  },
};

export function ValidationScreen({ painPoint, onNext }: ValidationScreenProps) {
  const content = VALIDATION_CONTENT[painPoint];

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const subtextAnim = useRef(new Animated.Value(0)).current;
  const reassuranceAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Headline fades in
      Animated.spring(headlineAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      // Subtext appears
      Animated.timing(subtextAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Reassurance with gold highlight
      Animated.spring(reassuranceAnim, {
        toValue: 1,
        tension: 40,
        friction: 10,
        useNativeDriver: true,
      }),
      // Button slides up
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.heroGradient}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Headline */}
        <Animated.Text
          style={[
            styles.headline,
            {
              opacity: headlineAnim,
              transform: [
                {
                  translateY: headlineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {content.headline}
        </Animated.Text>

        {/* Subtext */}
        <Animated.Text
          style={[
            styles.subtext,
            {
              opacity: subtextAnim,
            },
          ]}
        >
          {content.subtext}
        </Animated.Text>

        {/* Reassurance */}
        <Animated.Text
          style={[
            styles.reassurance,
            {
              opacity: reassuranceAnim,
              transform: [
                {
                  translateY: reassuranceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {content.reassurance}
        </Animated.Text>
      </View>

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
          <Text style={styles.continueButtonText}>{content.transition}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  heroContainer: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    height: '50%',
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
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 130,
  } as ViewStyle,
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
  } as TextStyle,
  subtext: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 20,
  } as TextStyle,
  reassurance: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.onboarding.gold,
    textAlign: 'center',
    marginTop: 24,
    textShadowColor: 'rgba(232, 184, 74, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
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

export default ValidationScreen;
