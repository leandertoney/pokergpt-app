/**
 * The payoff screen, shown between the plan and the price.
 *
 * IMPORTANT — what this screen may and may not claim.
 *
 * It compares HANDS PLAYED CORRECTLY IN ONE SPOT, not win rate, not money, not
 * an amount won. This app is gambling-adjacent and has already been rejected
 * once on paywall grounds; an unverifiable outcome statistic is a review risk.
 * The old "Up $3K this month" hero was cut for exactly this reason, and a
 * "your win rate with vs without" chart is the same claim in chart form.
 *
 * The bars are illustrative of a behaviour changing, are labelled as being
 * about the player's own spot, and carry a line saying so. Do not replace them
 * with earnings, win rate, bb/100, or any number presented as a measured result.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing, radius, type as t } from '@/constants/theme';
import { Screen, PrimaryButton } from './ui/Primitives';

export function ResultsScreen({
  progress,
  onBack,
  outcomeShort,
  spotLabel,
  onContinue,
}: {
  progress: number;
  onBack: () => void;
  /** e.g. "folding when you are beat" — from planAnalysis. */
  outcomeShort: string;
  /** What the comparison is about, in the player's terms. */
  spotLabel: string;
  onContinue: () => void;
}) {
  return (
    <Screen
      progress={progress}
      onBack={onBack}
      eyebrow="30 days"
      headline={'Hands you\'d\nget right.'}
      reveal
      accent={['right.']}
      scroll
      footer={<PrimaryButton label="Continue" onPress={onContinue} />}
    >
      <View style={s.card}>
        <View style={s.bars}>
          <BarColumn label="Today" sub={spotLabel} value="1 of 4" fraction={0.34} />
          <BarColumn
            label="After 30 days"
            sub="same spot, reviewed"
            value="3 of 4"
            fraction={0.86}
            highlight
          />
        </View>

        <Text style={s.note}>
          Based on the spot you brought us, not an average. Your number is whatever you
          actually fold.
        </Text>
      </View>

      <Text style={s.tail}>
        One leak, worked on for a month. That is the whole plan.
      </Text>
    </Screen>
  );
}

function BarColumn({
  label,
  sub,
  value,
  fraction,
  highlight,
}: {
  label: string;
  sub: string;
  value: string;
  fraction: number;
  highlight?: boolean;
}) {
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(grow, {
      toValue: 1,
      duration: highlight ? 720 : 520,
      delay: highlight ? 180 : 0,
      // Height cannot be driven natively.
      useNativeDriver: false,
    }).start();
  }, [grow, highlight]);

  return (
    <View style={s.col}>
      <Text style={[s.colValue, highlight && s.colValueHi]}>{value}</Text>
      <View style={s.track}>
        <Animated.View
          style={[
            s.bar,
            highlight ? s.barHi : s.barLo,
            {
              height: grow.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', `${Math.round(fraction * 100)}%`],
              }),
            },
          ]}
        />
      </View>
      <Text style={s.colLabel}>{label}</Text>
      <Text style={s.colSub}>{sub}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.18)',
  } as ViewStyle,

  bars: {
    flexDirection: 'row',
    gap: spacing.roomy,
    height: 168,
    paddingHorizontal: spacing.snug,
  } as ViewStyle,

  col: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 6 },

  track: { width: '100%', flex: 1, justifyContent: 'flex-end' } as ViewStyle,
  bar: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8 } as ViewStyle,
  barLo: { backgroundColor: 'rgba(244,232,216,0.19)' } as ViewStyle,
  barHi: { backgroundColor: colors.accent.gold } as ViewStyle,

  colValue: {
    ...t.heading,
    fontSize: 17,
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  colValueHi: { color: colors.accent.gold } as TextStyle,

  colLabel: {
    ...t.caption,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  } as TextStyle,
  colSub: {
    ...t.caption,
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
  } as TextStyle,

  note: {
    ...t.caption,
    color: colors.text.secondary,
    marginTop: spacing.base,
    opacity: 0.9,
  } as TextStyle,

  tail: {
    ...t.body,
    fontSize: 15,
    color: colors.text.secondary,
    marginTop: spacing.base,
  } as TextStyle,
});
