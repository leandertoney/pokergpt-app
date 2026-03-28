import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { colors } from '@/constants/colors';

export interface ParsedHandData {
  heroHand?: string;
  heroPosition?: string;
  villainPosition?: string;
  potSize?: number;
  effectiveStack?: number;
  board?: string[];
  action?: string;
}

interface ParsedHandPreviewProps {
  data: ParsedHandData;
  isVisible: boolean;
}

interface ParsedFieldProps {
  label: string;
  value: string | number | undefined;
  index: number;
}

function ParsedField({ label, value, index }: ParsedFieldProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (value !== undefined) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          delay: index * 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value, fadeAnim, slideAnim, index]);

  const hasValue = value !== undefined && value !== '';

  return (
    <Animated.View
      style={[
        styles.field,
        {
          opacity: hasValue ? fadeAnim : 0.3,
          transform: [{ translateX: hasValue ? slideAnim : 0 }],
        },
      ]}
    >
      <View style={[styles.checkmark, hasValue && styles.checkmarkActive]}>
        {hasValue ? (
          <Check size={12} color={colors.text.primary} strokeWidth={3} />
        ) : (
          <Circle size={12} color={colors.text.muted} strokeWidth={2} />
        )}
      </View>
      <Text style={[styles.label, hasValue && styles.labelActive]}>{label}:</Text>
      <Text style={[styles.value, hasValue && styles.valueActive]}>
        {hasValue ? String(value) : '...'}
      </Text>
    </Animated.View>
  );
}

export function ParsedHandPreview({ data, isVisible }: ParsedHandPreviewProps) {
  const containerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(containerAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, containerAnim]);

  const hasAnyData = Object.values(data).some(v => v !== undefined && v !== '');

  if (!isVisible && !hasAnyData) {
    return null;
  }

  const formatBoard = (board?: string[]) => {
    if (!board || board.length === 0) return undefined;
    return board.join(' ');
  };

  const formatPosition = () => {
    if (data.heroPosition && data.villainPosition) {
      return `${data.heroPosition} vs ${data.villainPosition}`;
    }
    return data.heroPosition;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerAnim,
          transform: [
            {
              scale: containerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Detected Hand Info</Text>
        {hasAnyData && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        )}
      </View>

      <View style={styles.fieldsContainer}>
        <ParsedField label="Hand" value={data.heroHand} index={0} />
        <ParsedField label="Position" value={formatPosition()} index={1} />
        <ParsedField label="Pot" value={data.potSize ? `$${data.potSize}` : undefined} index={2} />
        <ParsedField label="Stack" value={data.effectiveStack ? `$${data.effectiveStack}` : undefined} index={3} />
        <ParsedField label="Board" value={formatBoard(data.board)} index={4} />
        <ParsedField label="Action" value={data.action} index={5} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 51, 51, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.primary,
    marginRight: 6,
  } as ViewStyle,
  liveText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.accent.primary,
    textTransform: 'uppercase',
  } as TextStyle,
  fieldsContainer: {
    gap: 8,
  } as ViewStyle,
  field: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  } as ViewStyle,
  checkmarkActive: {
    backgroundColor: colors.accent.primary,
  } as ViewStyle,
  label: {
    fontSize: 14,
    color: colors.text.muted,
    width: 70,
  } as TextStyle,
  labelActive: {
    color: colors.text.secondary,
  } as TextStyle,
  value: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '500' as const,
    flex: 1,
  } as TextStyle,
  valueActive: {
    color: colors.text.primary,
    fontWeight: '600' as const,
  } as TextStyle,
});
