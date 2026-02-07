import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Target, Pen, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import type { PainPoint } from '@/types/poker';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/goal_setting.png?v=2';

type GoalSettingScreenProps = {
  playStyle: string;
  goal: string;
  userName: string | null;
  painPoint: PainPoint | null;
  onComplete: (timestamp: number) => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PROFILES: Record<string, { emoji: string; title: string; action: string; commitment: string }> = {
  shark: { emoji: '🦈', title: 'The Shark', action: 'Reading opponents and exploiting every edge', commitment: 'dominate every table I sit at' },
  analyst: { emoji: '📊', title: 'The Analyst', action: 'Making data-driven decisions at every turn', commitment: 'master the math behind every decision' },
  grinder: { emoji: '⚡', title: 'The Grinder', action: 'Putting in the volume and staying disciplined', commitment: 'outwork and outlast the competition' },
  student: { emoji: '📚', title: 'The Student', action: 'Studying and improving every single session', commitment: 'learn something new every session' },
};

const GOAL_COMMITMENTS: Record<string, string> = {
  profit: 'grow my bankroll consistently',
  win: 'compete at the highest level',
  learn: 'become a true student of the game',
  confidence: 'trust my reads and decisions',
};

const PAIN_POINT_COMMITMENTS: Record<PainPoint, string> = {
  tilt: 'keeping my head when the deck hits me',
  leaks: 'plugging the leaks that are costing me',
  overwhelmed: 'cutting through the noise',
  consistency: 'building a process that prints',
};

// Poker chip particle for celebration
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

const CHIP_VARIANTS = [
  { color: '#E53935', stripeColor: '#FFFFFF' },
  { color: '#43A047', stripeColor: '#FFFFFF' },
  { color: '#212121', stripeColor: '#FFFFFF' },
  { color: '#1E88E5', stripeColor: '#FFFFFF' },
  { color: '#7B1FA2', stripeColor: '#FFFFFF' },
];

export function GoalSettingScreen({ playStyle, goal, userName, painPoint, onComplete }: GoalSettingScreenProps) {
  const profile = PROFILES[playStyle] || PROFILES.shark;
  const goalCommitment = GOAL_COMMITMENTS[goal] || GOAL_COMMITMENTS.profit;
  const painPointCommitment = painPoint ? PAIN_POINT_COMMITMENTS[painPoint] : null;

  const [initials, setInitials] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const signatureAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  // Chip particles for celebration
  const chipParticles = useRef<ChipParticle[]>(
    Array.from({ length: 20 }, (_, i) => {
      const variant = CHIP_VARIANTS[Math.floor(Math.random() * CHIP_VARIANTS.length)];
      return {
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: new Animated.Value(-60),
        rotation: new Animated.Value(0),
        scale: 0.5 + Math.random() * 0.4,
        color: variant.color,
        stripeColor: variant.stripeColor,
        delay: Math.random() * 400,
      };
    })
  ).current;

  const canConfirm = initials.trim().length >= 1;

  useEffect(() => {
    // Header entrance
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Card entrance
    setTimeout(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 150);

    // Signature section entrance
    setTimeout(() => {
      Animated.spring(signatureAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 300);

    // Button entrance
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 450);
  }, []);

  const startCelebration = () => {
    setShowCelebration(true);
    chipParticles.forEach(particle => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(particle.y, {
            toValue: SCREEN_HEIGHT + 60,
            duration: 2500 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.timing(particle.rotation, {
              toValue: 1,
              duration: 700 + Math.random() * 400,
              useNativeDriver: true,
            })
          ),
        ]).start();
      }, particle.delay);
    });
  };

  const handleConfirm = () => {
    if (!canConfirm || isConfirming) return;

    setIsConfirming(true);

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Checkmark animation
    Animated.spring(checkmarkAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Start celebration
    startCelebration();

    // Navigate after celebration (give chips time to fall)
    setTimeout(() => {
      onComplete(Date.now());
    }, 2500);
  };

  const displayName = userName || 'Player';

  // Scroll to signature section when input is focused
  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
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

      {/* Celebration Chips */}
      {showCelebration && chipParticles.map(particle => (
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
          <View style={[styles.chip, { backgroundColor: particle.color }]}>
            <View style={[styles.chipInner, { borderColor: particle.stripeColor }]}>
              <View style={[styles.chipStripe, { backgroundColor: particle.stripeColor }]} />
            </View>
          </View>
        </Animated.View>
      ))}

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

      {/* Header */}
      <Animated.View
        style={[
          styles.headerSection,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.headerTitle}>Your Poker Commitment</Text>
        <Text style={styles.headerSubtitle}>
          {displayName}, here's what you're signing up for
        </Text>
      </Animated.View>

      {/* Commitment Card */}
      <Animated.View
        style={[
          styles.commitmentCard,
          {
            opacity: cardAnim,
            transform: [
              {
                scale: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.commitmentLabel}>I COMMIT TO:</Text>

        <View style={styles.commitmentItem}>
          <View style={styles.bulletPoint} />
          <Text style={styles.commitmentText}>
            <Text style={styles.highlightText}>{profile.action}</Text>
          </Text>
        </View>

        <View style={styles.commitmentItem}>
          <View style={styles.bulletPoint} />
          <Text style={styles.commitmentText}>
            My mission: <Text style={styles.highlightText}>{goalCommitment}</Text>
          </Text>
        </View>

        {painPointCommitment && (
          <View style={styles.commitmentItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.commitmentText}>
              Working on <Text style={styles.highlightText}>{painPointCommitment}</Text>
            </Text>
          </View>
        )}

        <View style={styles.commitmentItem}>
          <View style={styles.bulletPoint} />
          <Text style={styles.commitmentText}>
            Using PokerPro AI to <Text style={styles.highlightText}>level up my game</Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.pledgeText}>
          I'm ready to put in the work and become the player I know I can be.
        </Text>
      </Animated.View>

      {/* Signature Section */}
      <Animated.View
        style={[
          styles.signatureSection,
          {
            opacity: signatureAnim,
            transform: [
              {
                translateY: signatureAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.signatureHeader}>
          <Pen size={16} color={colors.onboarding.gold} />
          <Text style={styles.signatureLabel}>Initial here to commit</Text>
        </View>
        <View style={styles.signatureInputWrapper}>
          <TextInput
            style={styles.signatureInput}
            value={initials}
            onChangeText={(text) => setInitials(text.toUpperCase().slice(0, 3))}
            onFocus={handleInputFocus}
            placeholder="ABC"
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={3}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {canConfirm && (
            <Animated.View
              style={[
                styles.checkBadge,
                {
                  opacity: checkmarkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                },
              ]}
            >
              <Check size={14} color={colors.utility.success} />
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* Confirm Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              { scale: buttonScaleAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.confirmButton,
            !canConfirm && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={!canConfirm || isConfirming}
        >
          {isConfirming ? (
            <>
              <Check size={22} color={colors.text.dark} />
              <Text style={styles.buttonText}>Committed!</Text>
            </>
          ) : (
            <>
              <Text style={styles.buttonText}>Lock It In</Text>
              <Target size={20} color={colors.text.dark} />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 80,
  } as ViewStyle,
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  chipContainer: {
    position: 'absolute',
    top: 0,
    zIndex: 100,
  } as ViewStyle,
  chip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  } as ViewStyle,
  chipInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  chipStripe: {
    width: 10,
    height: 2,
    borderRadius: 1,
  } as ViewStyle,
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  } as ViewStyle,
  headerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  } as TextStyle,
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  } as TextStyle,
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 6,
  } as TextStyle,
  commitmentCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.3)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  } as ViewStyle,
  commitmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onboarding.gold,
    letterSpacing: 2,
    marginBottom: 16,
  } as TextStyle,
  commitmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 8,
  } as ViewStyle,
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onboarding.gold,
    marginTop: 7,
    marginRight: 12,
  } as ViewStyle,
  commitmentText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    flex: 1,
  } as TextStyle,
  highlightText: {
    color: colors.onboarding.gold,
    fontWeight: '600',
  } as TextStyle,
  divider: {
    height: 1,
    backgroundColor: 'rgba(232, 184, 74, 0.2)',
    marginVertical: 16,
  } as ViewStyle,
  pledgeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  } as TextStyle,
  signatureSection: {
    marginTop: 24,
    alignItems: 'center',
  } as ViewStyle,
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  } as ViewStyle,
  signatureLabel: {
    fontSize: 14,
    color: colors.onboarding.gold,
    fontWeight: '500',
  } as TextStyle,
  signatureInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  signatureInput: {
    width: 100,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'rgba(232, 184, 74, 0.4)',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 4,
  } as TextStyle,
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  buttonContainer: {
    marginTop: 32,
    width: '100%',
    maxWidth: 280,
  } as ViewStyle,
  confirmButton: {
    backgroundColor: colors.onboarding.gold,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.onboarding.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
  confirmButtonDisabled: {
    backgroundColor: 'rgba(232, 184, 74, 0.4)',
    shadowOpacity: 0,
  } as ViewStyle,
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.dark,
  } as TextStyle,
});

export default GoalSettingScreen;
