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
const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/identity_screen.png?v=2';

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
    headline: "You're not alone.",
    subtext: 'Every serious player deals with tilt. The difference is having a system to catch it before it costs you.',
    reassurance: 'Tilt costs more than bad cards ever will.',
    transition: "We can help.",
  },
  leaks: {
    headline: 'Finding your own leaks is hard.',
    subtext: "It's nearly impossible to spot patterns when you're in the middle of a session.",
    reassurance: 'Most players never plug their leaks without outside perspective.',
    transition: "That's why we built this.",
  },
  overwhelmed: {
    headline: 'Strategy can feel complex.',
    subtext: "But you don't need to master everything at once. The best players focus on what actually moves the needle.",
    reassurance: 'Cut through the noise. Focus on what matters.',
    transition: "We'll guide you.",
  },
  consistency: {
    headline: 'Variance is real.',
    subtext: "But some of those swings might be patterns you can actually identify and fix.",
    reassurance: 'Consistency comes from process, not luck.',
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
          source={{ uri: HERO_IMAGE_URL }}
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
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
  } as TextStyle,
  subtext: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 20,
  } as TextStyle,
  reassurance: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onboarding.gold,
    textAlign: 'center',
    marginTop: 24,
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
