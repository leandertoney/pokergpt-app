import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';

export type VoiceOrbState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceOrbProps {
  state: VoiceOrbState;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

const SIZE_MAP = {
  small: { orb: 80, bar: { width: 4, maxHeight: 24, gap: 3 }, glow: 100 },
  medium: { orb: 120, bar: { width: 5, maxHeight: 36, gap: 4 }, glow: 160 },
  large: { orb: 160, bar: { width: 6, maxHeight: 48, gap: 5 }, glow: 220 },
};

const NUM_BARS = 5;

// Animation configurations per state
const STATE_CONFIGS = {
  idle: { minHeight: 0.15, maxHeight: 0.35, duration: 1500, randomness: 0.1 },
  connecting: { minHeight: 0.2, maxHeight: 0.5, duration: 400, randomness: 0.3 },
  listening: { minHeight: 0.25, maxHeight: 0.9, duration: 200, randomness: 0.5 },
  processing: { minHeight: 0.3, maxHeight: 0.7, duration: 150, randomness: 0.2 },
  speaking: { minHeight: 0.2, maxHeight: 0.85, duration: 300, randomness: 0.3 },
  error: { minHeight: 0.1, maxHeight: 0.2, duration: 2000, randomness: 0 },
};

export function VoiceOrb({ state, size = 'large', onPress }: VoiceOrbProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Create animated values for each bar
  const barAnims = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.2))
  ).current;

  const dimensions = SIZE_MAP[size];

  // Sound wave bar animations
  useEffect(() => {
    const config = STATE_CONFIGS[state];
    const animations: Animated.CompositeAnimation[] = [];

    barAnims.forEach((anim, index) => {
      // Create phase offset for wave effect
      const phaseOffset = index * (Math.PI / NUM_BARS);

      const animate = () => {
        // Calculate target height with randomness
        const baseHeight = config.minHeight +
          (config.maxHeight - config.minHeight) *
          (0.5 + 0.5 * Math.sin(Date.now() / config.duration + phaseOffset));

        const targetHeight = baseHeight +
          (Math.random() - 0.5) * config.randomness * 2;

        const clampedHeight = Math.max(config.minHeight, Math.min(config.maxHeight, targetHeight));

        Animated.timing(anim, {
          toValue: clampedHeight,
          duration: config.duration + Math.random() * 50,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }).start(() => {
          if (state !== 'error') {
            animate();
          }
        });
      };

      // Stagger start times
      const timeoutId = setTimeout(animate, index * 50);
      return () => clearTimeout(timeoutId);
    });

    return () => {
      animations.forEach(a => a.stop());
    };
  }, [state, barAnims]);

  // Pulse animation for listening and speaking states
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: state === 'speaking' ? 1.08 : 1.12,
            duration: state === 'speaking' ? 600 : 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: state === 'speaking' ? 600 : 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      // Glow animation
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: state === 'speaking' ? 800 : 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: state === 'speaking' ? 800 : 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      glow.start();

      return () => {
        pulse.stop();
        glow.stop();
        pulseAnim.setValue(1);
        glowAnim.setValue(0);
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [state, pulseAnim, glowAnim]);

  // Rotation animation for processing and connecting states
  useEffect(() => {
    if (state === 'processing' || state === 'connecting') {
      const rotate = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotate.start();

      return () => {
        rotate.stop();
        rotateAnim.setValue(0);
      };
    } else {
      rotateAnim.setValue(0);
    }
  }, [state, rotateAnim]);

  // Press feedback animation
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onPress?.();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getGradientColors = (): readonly [string, string, ...string[]] => {
    switch (state) {
      case 'error':
        return ['#FF4444', '#CC0000', '#990000'];
      default:
        // Use gold accent color to match SpeakButton
        return [colors.accent.gold, colors.onboarding.goldDark, '#A88A2A'];
    }
  };

  const getBarColor = () => {
    switch (state) {
      case 'error':
        return 'rgba(255, 255, 255, 0.4)';
      default:
        // Dark bars on gold background (like SpeakButton)
        return '#1A1A1A';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: dimensions.glow,
          height: dimensions.glow,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Outer glow ring */}
      {(state === 'listening' || state === 'speaking') && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: dimensions.glow,
              height: dimensions.glow,
              borderRadius: dimensions.glow / 2,
              opacity: glowAnim,
              transform: [{ scale: pulseAnim }],
              backgroundColor: colors.accent.gold,
            },
          ]}
        />
      )}

      {/* Processing/Connecting ring */}
      {(state === 'processing' || state === 'connecting') && (
        <Animated.View
          style={[
            styles.processingRing,
            {
              width: dimensions.glow - 10,
              height: dimensions.glow - 10,
              borderRadius: (dimensions.glow - 10) / 2,
              transform: [{ rotate: spin }],
              borderTopColor: colors.accent.gold,
              borderRightColor: colors.accent.gold,
            },
          ]}
        />
      )}

      {/* Main orb */}
      <Animated.View
        style={[
          styles.orbWrapper,
          {
            width: dimensions.orb,
            height: dimensions.orb,
            borderRadius: dimensions.orb / 2,
            transform: [{ scale: (state === 'listening' || state === 'speaking') ? pulseAnim : 1 }],
          },
        ]}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onTouchCancel={() => scaleAnim.setValue(1)}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.orb,
            {
              width: dimensions.orb,
              height: dimensions.orb,
              borderRadius: dimensions.orb / 2,
            },
          ]}
        >
          {/* Sound Wave Bars */}
          <View style={styles.barsContainer}>
            {barAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.bar,
                  {
                    width: dimensions.bar.width,
                    marginHorizontal: dimensions.bar.gap / 2,
                    backgroundColor: getBarColor(),
                    height: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [dimensions.bar.maxHeight * 0.15, dimensions.bar.maxHeight],
                    }),
                  },
                ]}
              />
            ))}
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Inner highlight */}
      <View
        style={[
          styles.highlight,
          {
            width: dimensions.orb * 0.4,
            height: dimensions.orb * 0.15,
            top: dimensions.glow / 2 - dimensions.orb / 2 + dimensions.orb * 0.15,
            left: dimensions.glow / 2 - dimensions.orb * 0.2,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  glowRing: {
    position: 'absolute',
    backgroundColor: colors.accent.gold,
    opacity: 0.3,
  } as ViewStyle,
  processingRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: colors.accent.gold,
    borderRightColor: colors.accent.gold,
  } as ViewStyle,
  orbWrapper: {
    shadowColor: colors.accent.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  } as ViewStyle,
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  bar: {
    borderRadius: 3,
  } as ViewStyle,
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
  } as ViewStyle,
});
