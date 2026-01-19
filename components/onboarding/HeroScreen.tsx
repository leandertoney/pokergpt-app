import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Star, ChevronLeft } from 'lucide-react-native';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { colors } from '@/constants/colors';

type HeroScreenProps = {
  onNext: () => void;
};

export function HeroScreen({ onNext }: HeroScreenProps) {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const winAnim = useRef(new Animated.Value(0)).current;
  const moreAnim = useRef(new Animated.Value(0)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const lessAnim = useRef(new Animated.Value(0)).current;
  const subtextAnim = useRef(new Animated.Value(0)).current;
  const swipeHintAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered word-by-word animations
    Animated.sequence([
      // Logo fades in first
      Animated.spring(logoAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      // Badge fades in
      Animated.spring(badgeAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      // "Win" appears
      Animated.spring(winAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      // "MORE" punches in with emphasis
      Animated.spring(moreAnim, {
        toValue: 1,
        tension: 80,
        friction: 5,
        useNativeDriver: true,
      }),
      // Brief pause then "Tilt" appears
      Animated.delay(150),
      Animated.spring(tiltAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      // "LESS" fades in with subtle effect
      Animated.spring(lessAnim, {
        toValue: 1,
        tension: 40,
        friction: 10,
        useNativeDriver: true,
      }),
      // Subtext fades in
      Animated.timing(subtextAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Swipe hint animation (pulsing)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(swipeHintAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(swipeHintAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 2500);
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoAnim,
            transform: [
              {
                scale: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <AnimatedLogo variant={1} size="large" loop />
      </Animated.View>

      {/* App Store Badge */}
      <Animated.View
        style={[
          styles.badge,
          {
            opacity: badgeAnim,
            transform: [
              {
                scale: badgeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Star size={14} color={colors.onboarding.gold} fill={colors.onboarding.gold} />
        <Text style={styles.badgeText}>Loved by poker players</Text>
      </Animated.View>

      {/* Main Headline - Word by Word */}
      <View style={styles.headlineContainer}>
        {/* Win MORE line */}
        <View style={styles.headlineLine}>
          <Animated.Text
            style={[
              styles.headline,
              {
                opacity: winAnim,
                transform: [
                  {
                    translateY: winAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            Win{' '}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.emphasisMore,
              {
                opacity: moreAnim,
                transform: [
                  {
                    scale: moreAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 1.15, 1],
                    }),
                  },
                  {
                    translateY: moreAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            MORE.
          </Animated.Text>
        </View>

        {/* Tilt LESS line */}
        <View style={styles.headlineLine}>
          <Animated.Text
            style={[
              styles.headline,
              {
                opacity: tiltAnim,
                transform: [
                  {
                    translateY: tiltAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            Tilt{' '}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.emphasisLess,
              {
                opacity: lessAnim,
                transform: [
                  {
                    translateY: lessAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            LESS.
          </Animated.Text>
        </View>
      </View>

      {/* Supporting Text */}
      <Animated.Text
        style={[
          styles.subtext,
          {
            opacity: subtextAnim,
          },
        ]}
      >
        Real-time poker AI that thinks{'\n'}with you at the table.
      </Animated.Text>

      {/* Swipe Hint */}
      <Animated.View
        style={[
          styles.swipeHint,
          {
            opacity: swipeHintAnim,
          },
        ]}
      >
        <ChevronLeft size={24} color="rgba(255,255,255,0.5)" />
        <Text style={styles.swipeText}>Swipe to continue</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  } as ViewStyle,
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 168, 75, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 32,
  } as ViewStyle,
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onboarding.gold,
  } as TextStyle,
  headlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  headlineLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  } as ViewStyle,
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 56,
  } as TextStyle,
  emphasisMore: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.onboarding.profit, // Green for "MORE" - money association
    textShadowColor: 'rgba(34, 197, 94, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  } as TextStyle,
  emphasisLess: {
    fontSize: 40,
    fontWeight: '300', // Extra thin weight for "LESS" - emphasizes reduction
    color: 'rgba(255,255,255,0.4)', // Faded/muted - visually "less"
    letterSpacing: 6, // More spaced out for "reduction" feel
  } as TextStyle,
  logoContainer: {
    marginBottom: 24,
  } as ViewStyle,
  subtext: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 24,
  } as TextStyle,
  swipeHint: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  swipeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  } as TextStyle,
});

export default HeroScreen;
