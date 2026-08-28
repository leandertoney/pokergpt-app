/**
 * The plan, ranked instead of listed.
 *
 * The previous layout stacked four equal blocks (game / cost / changes / 30
 * days), which made everything read as equally important and therefore as
 * nothing in particular. This leads with the one thing the player is meant to
 * leave holding — the named leak — supports it with the numbers from their own
 * hand, and turns the plan into three concrete actions.
 *
 * Content still comes from planAnalysis.ts. Nothing here invents a claim, and
 * the stat tiles only render values that actually exist.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing, radius, type as t } from '@/constants/theme';
import { Rise } from './ui/Primitives';
import type { ParsedHand } from '@/services/handAnalysis';

export function PlanVisualV2({
  diagnosis,
  outcomeShort,
  thirtyDay,
  parsed,
}: {
  diagnosis: string;
  outcomeShort: string;
  thirtyDay: string;
  parsed: ParsedHand | null;
}) {
  const equity = parsed?.analysis?.equity;
  const readHand = Boolean(parsed?.analysis?.recommendedAction);

  return (
    <View style={{ gap: spacing.base }}>
      {/* The hero: one thing, named. */}
      <Rise delay={0}>
        <View style={s.hero}>
          <Text style={s.heroLabel}>THE LEAK</Text>
          <Text style={s.heroTitle}>{titleCase(outcomeShort)}</Text>
          <Text style={s.heroSub}>{diagnosis}</Text>
        </View>
      </Rise>

      {/* Support: only the numbers that genuinely exist. */}
      <Rise delay={90}>
        <View style={s.stats}>
          <Stat value={readHand ? '1' : '3'} label={readHand ? 'Hand read' : 'Answers'} />
          {typeof equity === 'number' && <Stat value={`${equity}%`} label="Your equity" />}
          <Stat value="30" label="Day plan" />
        </View>
      </Rise>

      {/* The plan itself, as things to do. */}
      <Rise delay={170}>
        <View style={{ gap: spacing.snug }}>
          {buildSteps(parsed, outcomeShort).map((text, i) => (
            <View key={i} style={s.step}>
              <View style={s.stepNo}>
                <Text style={s.stepNoText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{text}</Text>
            </View>
          ))}
        </View>
      </Rise>

      <Rise delay={250}>
        <Text style={s.tail}>{thirtyDay}</Text>
      </Rise>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Three actions. When a hand was actually read, step one names the street it
 * happened on so the plan is visibly about their spot rather than generic.
 */
function buildSteps(parsed: ParsedHand | null, outcomeShort: string): string[] {
  const h = parsed?.handData;
  const street = h?.river ? 'river' : h?.turn ? 'turn' : h?.flop ? 'flop' : null;

  if (street) {
    return [
      `Spot the ${street} before you act`,
      `Start ${outcomeShort} in that spot`,
      'Bring the next one back and check it',
    ];
  }

  return [
    'Bring one hand you are unsure about',
    `Start ${outcomeShort}`,
    'Check the next one against it',
  ];
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}


const s = StyleSheet.create({
  hero: {
    backgroundColor: 'rgba(232,184,74,0.12)',
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.45)',
  } as ViewStyle,
  heroLabel: {
    ...t.caption,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: colors.accent.gold,
  } as TextStyle,
  heroTitle: {
    ...t.heading,
    fontSize: 21,
    color: colors.text.primary,
    marginTop: 4,
  } as TextStyle,
  heroSub: {
    ...t.body,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.snug,
  } as TextStyle,

  stats: { flexDirection: 'row', gap: spacing.snug },
  stat: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.md,
    paddingVertical: spacing.snug,
    alignItems: 'center',
  } as ViewStyle,
  statValue: {
    ...t.heading,
    fontSize: 18,
    color: colors.accent.gold,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
  statLabel: {
    ...t.caption,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.text.secondary,
    marginTop: 2,
  } as TextStyle,

  step: {
    flexDirection: 'row',
    gap: spacing.snug,
    alignItems: 'flex-start',
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.md,
    padding: spacing.snug + 2,
  } as ViewStyle,
  stepNo: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  } as ViewStyle,
  stepNoText: {
    ...t.caption,
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.dark,
  } as TextStyle,
  stepText: {
    ...t.body,
    fontSize: 14,
    color: colors.text.primary,
    flex: 1,
  } as TextStyle,

  tail: {
    ...t.body,
    fontSize: 14,
    color: colors.text.secondary,
  } as TextStyle,
});
