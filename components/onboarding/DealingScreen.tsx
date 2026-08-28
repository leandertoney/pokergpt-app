/**
 * The beat between "Customizing your plan" and the plan itself.
 *
 * A spinner here would be dead time. This names what is actually being compared
 * — the street, the board texture, the bet the player faced — so the wait reads
 * as work being done on their hand rather than a loading bar.
 *
 * Cards deal in one at a time and the last stays face down until the plan
 * lands. When the player skipped the try-it step there is no hand to describe,
 * so the lines fall back to their stated answers instead.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing, radius, type as t, elevation } from '@/constants/theme';
import { Screen } from './ui/Primitives';
import type { ParsedHand } from '@/services/handAnalysis';

const DEAL_MS = 260;
const HOLD_MS = 1500;

export function DealingScreen({
  progress,
  parsed,
  stakesLabel,
  onDone,
}: {
  progress: number;
  parsed: ParsedHand | null;
  stakesLabel: string;
  onDone: () => void;
}) {
  const lines = buildLines(parsed, stakesLabel);
  const [line, setLine] = useState(0);

  useEffect(() => {
    const timers = lines.map((_, i) =>
      setTimeout(() => setLine(i), i * (HOLD_MS / lines.length))
    );
    const done = setTimeout(onDone, HOLD_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = handCards(parsed);

  return (
    <Screen
      eyebrow="Building"
      headline={headlineFor(parsed, stakesLabel)}
      reveal
      accent={[stakesLabel.toLowerCase()]}
      progress={progress}
    >
      <View style={s.wrap}>
        <View style={s.deal}>
          {cards.map((c, i) => (
            <DealCard key={i} index={i} label={c} facedown={i === cards.length - 1} />
          ))}
        </View>

        <View style={s.track}>
          <Sweep />
        </View>

        <Text style={s.line}>{lines[line]}</Text>
      </View>
    </Screen>
  );
}

function DealCard({
  index,
  label,
  facedown,
}: {
  index: number;
  label: string;
  facedown: boolean;
}) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 320,
      delay: index * DEAL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [a, index]);

  const offset = (index - 1.5) * 36;
  const tilt = (index - 1.5) * 5;

  return (
    <Animated.View
      style={[
        s.card,
        facedown && s.cardBack,
        {
          opacity: a,
          transform: [
            { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, offset] }) },
            { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
            { rotate: `${tilt}deg` },
          ],
        },
      ]}
    >
      <Text style={[s.cardText, facedown && s.cardBackText]}>{facedown ? '?' : label}</Text>
    </Animated.View>
  );
}

/** Indeterminate sweep. The work is a network call, so real progress is a lie. */
function Sweep() {
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [x]);

  return (
    <Animated.View
      style={[
        s.sweep,
        { left: x.interpolate({ inputRange: [0, 1], outputRange: ['-38%', '100%'] }) },
      ]}
    />
  );
}

/* ---------------- content ---------------- */

function headlineFor(parsed: ParsedHand | null, stakesLabel: string): string {
  if (parsed?.handData?.heroHand) return `Reading your hand\nagainst ${stakesLabel}.`;
  return `Comparing players\nat ${stakesLabel}.`;
}

function handCards(parsed: ParsedHand | null): string[] {
  const flop = parsed?.handData?.flop;
  if (Array.isArray(flop) && flop.length >= 3) {
    return [...flop.slice(0, 3).map(short), '?'];
  }
  return ['A', 'K', 'Q', '?'];
}

/** First glyph of a card string, so "9♦" renders inside a small card face. */
function short(card: string): string {
  return String(card).trim().slice(0, 2);
}

function buildLines(parsed: ParsedHand | null, stakesLabel: string): string[] {
  const a = parsed?.analysis;
  const h = parsed?.handData;

  if (a?.recommendedAction) {
    const street = h?.river ? 'river' : h?.turn ? 'turn' : 'flop';
    return [
      'Reading what you said',
      `Checking the ${street} against ${stakesLabel} ranges`,
      'Comparing similar spots',
      'Building your plan',
    ];
  }

  return [
    'Reading your answers',
    `Comparing players at ${stakesLabel}`,
    'Building your plan',
  ];
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.roomy, paddingVertical: spacing.base },

  deal: {
    height: 78,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  card: {
    position: 'absolute',
    width: 44,
    height: 62,
    borderRadius: 7,
    backgroundColor: colors.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.card,
  } as ViewStyle,
  cardBack: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent.gold,
  } as ViewStyle,
  cardText: {
    ...t.heading,
    fontSize: 19,
    color: colors.text.dark,
  } as TextStyle,
  cardBackText: { color: colors.accent.gold } as TextStyle,

  track: {
    width: '100%',
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(244,232,216,0.16)',
    overflow: 'hidden',
  } as ViewStyle,
  sweep: {
    position: 'absolute',
    width: '38%',
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.gold,
  } as ViewStyle,

  line: {
    ...t.caption,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  } as TextStyle,
});
