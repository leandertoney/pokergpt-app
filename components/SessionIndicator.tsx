import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

interface SessionIndicatorProps {
  elapsedTime: string;
  handCount: number;
  onPress: () => void;
}

export function SessionIndicator({ elapsedTime, handCount, onPress }: SessionIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for the recording dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
      <Text style={styles.timer}>{elapsedTime}</Text>
      {handCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{handCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(232, 184, 74, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.3)',
  } as ViewStyle,
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.gold,
  } as ViewStyle,
  timer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent.gold,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  badge: {
    backgroundColor: colors.accent.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  } as ViewStyle,
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
  } as TextStyle,
});

export default SessionIndicator;
