import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, MicOff, Volume2, Wifi } from 'lucide-react-native';
import { colors } from '@/constants/colors';

export type VoiceOrbState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

interface VoiceOrbProps {
  state: VoiceOrbState;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

const SIZE_MAP = {
  small: { orb: 80, icon: 32, glow: 100 },
  medium: { orb: 120, icon: 48, glow: 160 },
  large: { orb: 160, icon: 64, glow: 220 },
};

export function VoiceOrb({ state, size = 'large', onPress }: VoiceOrbProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const dimensions = SIZE_MAP[size];

  // Pulse animation for listening and speaking states
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: state === 'speaking' ? 1.1 : 1.15,
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
      case 'connecting':
        return ['#3B82F6', '#2563EB', '#1D4ED8']; // Blue for connecting
      case 'listening':
        return [colors.accent.primary, '#FF6B6B', colors.accent.glow];
      case 'processing':
        return [colors.accent.gold, '#FFD700', colors.accent.primary];
      case 'speaking':
        return ['#4CAF50', '#2E7D32', '#1B5E20']; // Green for speaking
      case 'error':
        return ['#FF4444', '#CC0000', '#990000'];
      default:
        return [colors.accent.primary, '#B82828', '#8B1C1C'];
    }
  };

  const getIconComponent = () => {
    if (state === 'error') return MicOff;
    if (state === 'speaking') return Volume2;
    if (state === 'connecting') return Wifi;
    return Mic;
  };

  const IconComponent = getIconComponent();

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
              backgroundColor: state === 'speaking' ? '#4CAF50' : colors.accent.glow,
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
              borderTopColor: state === 'connecting' ? '#3B82F6' : colors.accent.gold,
              borderRightColor: state === 'connecting' ? '#3B82F6' : colors.accent.gold,
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
          <IconComponent
            size={dimensions.icon}
            color={colors.text.primary}
            strokeWidth={2}
          />
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
    backgroundColor: colors.accent.glow,
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
    shadowColor: colors.accent.glow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  } as ViewStyle,
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
  } as ViewStyle,
});
