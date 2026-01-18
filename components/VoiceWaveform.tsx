/**
 * VoiceWaveform Component
 *
 * Animated waveform visualization for voice conversation states.
 * Shows different animations for listening, processing, and speaking.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '@/constants/colors';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing';

interface VoiceWaveformProps {
  state: VoiceState;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const BAR_COUNT = 5;

// Different configurations for sizes
const SIZE_CONFIG = {
  small: { height: 24, barWidth: 3, gap: 3 },
  medium: { height: 40, barWidth: 4, gap: 4 },
  large: { height: 60, barWidth: 6, gap: 6 },
};

export function VoiceWaveform({
  state,
  size = 'medium',
  color = colors.accent.gold,
}: VoiceWaveformProps) {
  const config = SIZE_CONFIG[size];
  const animatedValues = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    // Stop all animations first
    animatedValues.forEach(val => val.stopAnimation());

    if (state === 'idle' || state === 'connecting') {
      // Reset to idle state
      animatedValues.forEach(val => {
        Animated.timing(val, {
          toValue: 0.2,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    if (state === 'listening') {
      // Gentle pulsing - waiting for input
      const animations = animatedValues.map((val, i) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: 0.4 + Math.random() * 0.3,
              duration: 400 + i * 50,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: 0.2,
              duration: 400 + i * 50,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
      });
      Animated.parallel(animations).start();
    } else if (state === 'speaking') {
      // Active waveform - dynamic heights
      const animations = animatedValues.map((val, i) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: 0.5 + Math.random() * 0.5,
              duration: 100 + Math.random() * 100,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: 0.3 + Math.random() * 0.2,
              duration: 100 + Math.random() * 100,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        );
      });
      Animated.parallel(animations).start();
    } else if (state === 'processing') {
      // Loading pulse - sequential bars
      const sequence = Animated.loop(
        Animated.stagger(
          80,
          animatedValues.map(val =>
            Animated.sequence([
              Animated.timing(val, {
                toValue: 0.8,
                duration: 200,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
              Animated.timing(val, {
                toValue: 0.2,
                duration: 200,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true,
              }),
            ])
          )
        )
      );
      sequence.start();
    }

    return () => {
      animatedValues.forEach(val => val.stopAnimation());
    };
  }, [state, animatedValues]);

  const totalWidth = BAR_COUNT * config.barWidth + (BAR_COUNT - 1) * config.gap;

  return (
    <View
      style={[
        styles.container,
        { width: totalWidth, height: config.height },
      ]}
    >
      {animatedValues.map((animVal, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width: config.barWidth,
              backgroundColor: color,
              transform: [{ scaleY: animVal }],
              opacity: state === 'idle' ? 0.4 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Pulsing circle indicator for connection state
 */
export function PulsingIndicator({
  active,
  color = colors.accent.gold,
  size = 12,
}: {
  active: boolean;
  color?: string;
  size?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (active) {
      const pulse = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.5,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.3,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      scaleAnim.setValue(1);
      opacityAnim.setValue(0.6);
    }
  }, [active, scaleAnim, opacityAnim]);

  return (
    <View style={[styles.pulseContainer, { width: size * 2, height: size * 2 }]}>
      <Animated.View
        style={[
          styles.pulseOuter,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      <View
        style={[
          styles.pulseInner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOuter: {
    position: 'absolute',
  },
  pulseInner: {
    position: 'absolute',
  },
});
