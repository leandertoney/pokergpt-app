import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type ProfileBuiltScreenProps = {
  playStyle: string;
  goal: string;
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

// Confetti particle
type ConfettiParticle = {
  id: number;
  x: number;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: number;
  color: string;
  delay: number;
};

const CONFETTI_COLORS = [
  colors.onboarding.gold,
  colors.onboarding.profit,
  colors.onboarding.data,
  '#FF6B6B',
  '#C084FC',
];

export function ProfileBuiltScreen({ playStyle, goal, onNext }: ProfileBuiltScreenProps) {
  const profile = PROFILES[playStyle] || PROFILES.shark;
  const goalText = GOALS[goal] || GOALS.profit;

  const headlineAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Create confetti particles
  const confettiParticles = useRef<ConfettiParticle[]>(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: new Animated.Value(-50),
      rotation: new Animated.Value(0),
      scale: 0.5 + Math.random() * 0.5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 500,
    }))
  ).current;

  useEffect(() => {
    // Haptic celebration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Start confetti
    confettiParticles.forEach(particle => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(particle.y, {
            toValue: SCREEN_HEIGHT + 50,
            duration: 2500 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.timing(particle.rotation, {
              toValue: 1,
              duration: 1000 + Math.random() * 500,
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

    // Button
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 900);
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <View style={styles.container}>
      {/* Confetti */}
      {confettiParticles.map(particle => (
        <Animated.View
          key={particle.id}
          style={[
            styles.confetti,
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
          <View style={[styles.confettiPiece, { backgroundColor: particle.color }]} />
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
        <View style={styles.sparkleRow}>
          <Sparkles size={24} color={colors.onboarding.gold} />
          <Text style={styles.perfectText}>Perfect.</Text>
          <Sparkles size={24} color={colors.onboarding.gold} />
        </View>
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
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>See what you get</Text>
          <ChevronRight size={20} color="#000" />
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
  confetti: {
    position: 'absolute',
    top: 0,
  } as ViewStyle,
  confettiPiece: {
    width: 10,
    height: 10,
    borderRadius: 2,
  } as ViewStyle,
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  } as ViewStyle,
  perfectText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
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

export default ProfileBuiltScreen;
