import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type ProfileBuiltScreenProps = {
  playStyle: string;
  goal: string;
  userName?: string | null;
  onNext: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PROFILES: Record<string, { emoji: string; title: string; subtitle: string }> = {
  shark: { emoji: '🦈', title: 'The Shark', subtitle: 'Reads and exploits opponents' },
  analyst: { emoji: '📊', title: 'The Analyst', subtitle: 'GTO-focused strategist' },
  grinder: { emoji: '⚡', title: 'The Grinder', subtitle: 'Volume and consistency' },
  student: { emoji: '📚', title: 'The Student', subtitle: 'Always learning, always growing' },
};

const GOALS: Record<string, string> = {
  profit: 'build your bankroll',
  win: 'dominate the competition',
  learn: 'master poker strategy',
  confidence: 'trust your decisions',
};

// Poker chip particle
type ChipParticle = {
  id: number;
  x: number;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: number;
  color: string;
  stripeColor: string;
  delay: number;
};

// Poker chip colors (based on real casino chips)
const CHIP_VARIANTS = [
  { color: '#E53935', stripeColor: '#FFFFFF' },  // $5 - Red
  { color: '#43A047', stripeColor: '#FFFFFF' },  // $25 - Green
  { color: '#212121', stripeColor: '#FFFFFF' },  // $100 - Black
  { color: '#1E88E5', stripeColor: '#FFFFFF' },  // $1 - Blue
  { color: '#7B1FA2', stripeColor: '#FFFFFF' },  // $500 - Purple
];

export function ProfileBuiltScreen({ playStyle, goal, userName, onNext }: ProfileBuiltScreenProps) {
  const profile = PROFILES[playStyle] || PROFILES.shark;
  const goalText = GOALS[goal] || GOALS.profit;

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Create poker chip particles
  const chipParticles = useRef<ChipParticle[]>(
    Array.from({ length: 25 }, (_, i) => {
      const variant = CHIP_VARIANTS[Math.floor(Math.random() * CHIP_VARIANTS.length)];
      return {
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: new Animated.Value(-60),
        rotation: new Animated.Value(0),
        scale: 0.6 + Math.random() * 0.4,
        color: variant.color,
        stripeColor: variant.stripeColor,
        delay: Math.random() * 600,
      };
    })
  ).current;

  useEffect(() => {
    // Haptic celebration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Start poker chips rain
    chipParticles.forEach(particle => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(particle.y, {
            toValue: SCREEN_HEIGHT + 60,
            duration: 2800 + Math.random() * 1200,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.timing(particle.rotation, {
              toValue: 1,
              duration: 800 + Math.random() * 400,
              useNativeDriver: true,
            })
          ),
        ]).start();
      }, particle.delay);
    });

    // Headline entrance
    Animated.spring(headlineAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Profile card
    setTimeout(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 300);

    // Subtitle
    setTimeout(() => {
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 600);

    // Swipe hint with pulsing animation
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
    }, 900);
  }, []);

  return (
    <View style={styles.container}>
      {/* Poker Chips Rain */}
      {chipParticles.map(particle => (
        <Animated.View
          key={particle.id}
          style={[
            styles.chipContainer,
            {
              left: particle.x,
              transform: [
                { translateY: particle.y },
                {
                  rotate: particle.rotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
                { scale: particle.scale },
              ],
            },
          ]}
        >
          {/* Poker chip */}
          <View style={[styles.chip, { backgroundColor: particle.color }]}>
            <View style={[styles.chipInner, { borderColor: particle.stripeColor }]}>
              <View style={[styles.chipStripe, { backgroundColor: particle.stripeColor }]} />
            </View>
          </View>
        </Animated.View>
      ))}

      {/* Headline */}
      <Animated.View
        style={{
          opacity: headlineAnim,
          transform: [
            {
              translateY: headlineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }}
      >
        <AnimatedLogo variant={1} size="medium" loop />
        <Text style={styles.perfectText}>
          {userName ? `Perfect, ${userName}.` : 'Perfect.'}
        </Text>
      </Animated.View>

      {/* Profile Card */}
      <Animated.View
        style={[
          styles.profileCard,
          {
            opacity: cardAnim,
            transform: [
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.profileEmoji}>{profile.emoji}</Text>
        <Text style={styles.profileTitle}>{profile.title}</Text>
        <Text style={styles.profileSubtitle}>{profile.subtitle}</Text>
      </Animated.View>

      {/* Goal subtitle */}
      <Animated.Text
        style={[
          styles.goalText,
          {
            opacity: subtitleAnim,
          },
        ]}
      >
        We'll help you {goalText}.
      </Animated.Text>

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
  chipContainer: {
    position: 'absolute',
    top: 0,
    zIndex: 100,  // Ensures confetti renders in front of animated logo
  } as ViewStyle,
  chip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  } as ViewStyle,
  chipInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  chipStripe: {
    width: 12,
    height: 3,
    borderRadius: 1,
  } as ViewStyle,
  perfectText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  } as TextStyle,
  profileCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
    borderColor: colors.onboarding.gold,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  } as ViewStyle,
  profileEmoji: {
    fontSize: 64,
    marginBottom: 16,
  } as TextStyle,
  profileTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onboarding.gold,
  } as TextStyle,
  profileSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
  goalText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 26,
  } as TextStyle,
  swipeHint: {
    position: 'absolute',
    bottom: 50,
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

export default ProfileBuiltScreen;
