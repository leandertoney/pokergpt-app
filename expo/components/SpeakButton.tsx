import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { AudioLines, MicOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

export type SpeakButtonState = 'idle' | 'connecting' | 'listening' | 'processing';

interface SpeakButtonProps {
  state: SpeakButtonState;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean; // Compact mode for inline use in search bar
}

const STATE_LABELS: Record<SpeakButtonState, string> = {
  idle: 'Speak',
  connecting: 'Connecting...',
  listening: 'Listening...',
  processing: 'Processing...',
};

export function SpeakButton({ state, onPress, disabled, compact }: SpeakButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barAnims = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.5),
    new Animated.Value(0.3),
  ]).current;

  // Sound bar animation when listening
  useEffect(() => {
    if (state === 'listening') {
      const animations = barAnims.map((anim, index) => {
        const animate = () => {
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.3 + Math.random() * 0.7,
              duration: 150 + index * 50,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2 + Math.random() * 0.3,
              duration: 150 + index * 50,
              useNativeDriver: false,
            }),
          ]).start(() => {
            if (state === 'listening') animate();
          });
        };
        animate();
      });
    } else {
      // Reset bars
      barAnims.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: index === 1 ? 0.5 : 0.3,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [state, barAnims]);

  // Pulse animation for connecting
  useEffect(() => {
    if (state === 'connecting' || state === 'processing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.7,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const isActive = state !== 'idle';
  const label = STATE_LABELS[state];

  // Compact mode shows shorter labels
  const compactLabel = compact ? (state === 'idle' ? 'Speak' : state === 'listening' ? 'Listening' : '') : label;
  const iconColor = '#1A1A1A';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        compact && styles.buttonCompact,
        isActive && styles.buttonActive,
        disabled && styles.buttonDisabled,
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Animated.View style={[styles.content, { opacity: pulseAnim }]}>
        {/* Sound bars icon */}
        {state === 'listening' ? (
          <View style={styles.barsContainer}>
            {barAnims.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.bar,
                  {
                    height: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 18],
                    }),
                  },
                ]}
              />
            ))}
          </View>
        ) : isActive ? (
          <MicOff size={compact ? 16 : 18} color={iconColor} />
        ) : (
          <AudioLines size={compact ? 16 : 18} color={iconColor} />
        )}

        {/* Label - always show in compact mode */}
        <Text style={[styles.label, compact && styles.labelCompact]}>{compactLabel}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.gold,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    minWidth: 100,
    shadowColor: colors.accent.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  buttonCompact: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 80,
    shadowOpacity: 0,
    elevation: 0,
  } as ViewStyle,
  buttonActive: {
    backgroundColor: colors.onboarding.goldDark,
  } as ViewStyle,
  buttonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 18,
    height: 18,
    justifyContent: 'center',
  } as ViewStyle,
  bar: {
    width: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
  } as ViewStyle,
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  } as TextStyle,
  labelCompact: {
    fontSize: 14,
  } as TextStyle,
});

export default SpeakButton;
