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
import { Play } from 'lucide-react-native';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

type WhatYouGetScreenProps = {
  onComplete: () => void;
};

export function WhatYouGetScreen({ onComplete }: WhatYouGetScreenProps) {
  const sparkleAnim = useRef(new Animated.Value(1)).current; // Start visible immediately
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Title entrance (logo already visible)
    setTimeout(() => {
      Animated.spring(titleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Subtitle entrance
    setTimeout(() => {
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 400);

    // Button entrance
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Start button pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 600);
  }, []);

  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* Animated Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: sparkleAnim,
            transform: [
              {
                scale: sparkleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.1, 1],
                }),
              },
            ],
          },
        ]}
      >
        <AnimatedLogo variant={1} size="medium" loop />
      </Animated.View>

      {/* Title */}
      <Animated.View
        style={{
          opacity: titleAnim,
          transform: [
            {
              translateY: titleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }}
      >
        <Text style={styles.title}>Ready to{'\n'}start winning?</Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.Text
        style={[
          styles.subtitle,
          {
            opacity: subtitleAnim,
          },
        ]}
      >
        Your AI poker coach is ready.{'\n'}Let's make every hand count.
      </Animated.Text>

      {/* Start Button */}
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
              {
                scale: pulseAnim,
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <Play size={22} color="#000" fill="#000" />
          <Text style={styles.buttonText}>Start Winning</Text>
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
  logoContainer: {
    marginBottom: 24,
  } as ViewStyle,
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 44,
  } as TextStyle,
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 16,
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 100,
    left: 32,
    right: 32,
  } as ViewStyle,
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onboarding.profit,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
    gap: 12,
    shadowColor: colors.onboarding.profit,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  } as ViewStyle,
  buttonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
  } as TextStyle,
});

export default WhatYouGetScreen;
