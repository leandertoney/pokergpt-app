import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';

interface LoadingIndicatorProps {
  text?: string;
  variant?: 2 | 3 | 4;
  size?: 'small' | 'medium';
}

const sizeMap = {
  small: 40,
  medium: 60,
};

export function LoadingIndicator({
  text,
  variant = 2,
  size = 'small',
}: LoadingIndicatorProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dimension = sizeMap[size];

  useEffect(() => {
    // Spin animation
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [spinAnim, pulseAnim]);

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            transform: [{ rotate: rotation }, { scale: pulseAnim }],
          },
        ]}
      >
        <View style={[styles.innerCircle, {
          width: dimension - 8,
          height: dimension - 8,
          borderRadius: (dimension - 8) / 2,
        }]} />
      </Animated.View>
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  } as ViewStyle,
  spinner: {
    borderWidth: 3,
    borderColor: colors.background.tertiary,
    borderTopColor: colors.accent.primary,
    borderRightColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  innerCircle: {
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  text: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  } as TextStyle,
});

export default LoadingIndicator;
