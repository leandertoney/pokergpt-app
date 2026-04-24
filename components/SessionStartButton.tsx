import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

interface SessionStartButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function SessionStartButton({ onPress, disabled }: SessionStartButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Play size={14} color={colors.text.primary} fill={colors.text.primary} />
      <Text style={styles.text}>Start Session</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent.gold,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  } as ViewStyle,
  buttonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  } as TextStyle,
});

export default SessionStartButton;
