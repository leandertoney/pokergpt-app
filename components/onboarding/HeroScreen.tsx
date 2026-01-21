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
import { Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/pocket_aces.png';

type HeroScreenProps = {
  onNext: () => void;
};

export function HeroScreen({ onNext }: HeroScreenProps) {
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const winAnim = useRef(new Animated.Value(0)).current;
  const moreAnim = useRef(new Animated.Value(0)).current;
  const tiltAnim = useRef(new Animated.Value(0)).current;
  const lessAnim = useRef(new Animated.Value(0)).current;
  const subtextAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered word-by-word animations
    Animated.sequence([
      // Badge fades in first
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
      // Button fades in
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
      {/* Hero Image at Top */}
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

      {/* Content Container */}
      <View style={styles.content}>
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
          <Text style={styles.continueButtonText}>Continue</Text>
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
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
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
    paddingHorizontal: 32,
    paddingBottom: 140,
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
  subtext: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
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

export default HeroScreen;
