import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Star, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type HeroScreenProps = {
  onNext: () => void;
};

export function HeroScreen({ onNext }: HeroScreenProps) {
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const subtextAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      // Badge fades in first
      Animated.spring(badgeAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      // Headline slides up
      Animated.spring(headlineAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      // Subtext fades in
      Animated.timing(subtextAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Button appears
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  return (
    <View style={styles.container}>
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

      {/* Main Headline */}
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
        <Text style={styles.headline}>
          Win <Text style={styles.emphasisWord}>MORE.</Text>
        </Text>
        <Text style={styles.headline}>
          Tilt <Text style={styles.emphasisWord}>LESS.</Text>
        </Text>
      </Animated.View>

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

      {/* CTA Button */}
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
          <Text style={styles.buttonText}>See it in action</Text>
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
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 56,
  } as TextStyle,
  emphasisWord: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.onboarding.gold,
  } as TextStyle,
  subtext: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 20,
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 60,
    left: 32,
    right: 32,
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

export default HeroScreen;
