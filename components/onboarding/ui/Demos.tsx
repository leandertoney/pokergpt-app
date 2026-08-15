/**
 * Onboarding demos.
 *
 * These are exaggerated mock-ups of the real product surfaces, not screenshots.
 * A screenshot at this size is unreadable; what converts is an oversized,
 * simplified version of the interface doing the one thing the screen is about.
 *
 * Two rules they all follow:
 *  1. They animate on their own, but NOTHING is gated on them. The primary
 *     button is live the moment the screen appears — the old ChatDemoScreen
 *     made the user wait ~8 seconds through a scripted conversation before
 *     Continue even existed.
 *  2. They loop or settle quickly. A user who lingers sees the whole idea in
 *     about two seconds; a user who taps immediately loses nothing.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { spacing, radius, type as t, motion, elevation } from '@/constants/theme';

// -----------------------------------------------------------------------------
// ANALYZE — a hand goes in, a verdict comes out.
// The verdict card is deliberately the biggest, brightest thing on screen.
// -----------------------------------------------------------------------------
export function AnalyzeDemo() {
  const ask = useSharedValue(0);
  const think = useSharedValue(0);
  const verdict = useSharedValue(0);

  useEffect(() => {
    ask.value = withTiming(1, { duration: motion.base });
    think.value = withDelay(360, withTiming(1, { duration: motion.fast }));
    verdict.value = withDelay(760, withSpring(1, motion.springy));
  }, [ask, think, verdict]);

  const askS = useAnimatedStyle(() => ({
    opacity: ask.value,
    transform: [{ translateY: interpolate(ask.value, [0, 1], [10, 0]) }],
  }));
  const thinkS = useAnimatedStyle(() => ({
    opacity: interpolate(think.value, [0, 1], [0, 1]) * (1 - verdict.value),
  }));
  const verdictS = useAnimatedStyle(() => ({
    opacity: verdict.value,
    transform: [{ scale: interpolate(verdict.value, [0, 1], [0.9, 1]) }],
  }));

  return (
    <View style={s.stack}>
      <Animated.View style={[s.askBubble, askS]}>
        <Text style={s.askText}>Ace king. He shoved the river.</Text>
      </Animated.View>

      <Animated.View style={[s.thinking, thinkS]}>
        <Dot i={0} />
        <Dot i={1} />
        <Dot i={2} />
      </Animated.View>

      <Animated.View style={[s.verdict, verdictS]}>
        <Text style={s.verdictAction}>CALL</Text>
        <View style={s.verdictMeta}>
          <Text style={s.verdictConf}>82% confident</Text>
        </View>
        <Text style={s.verdictWhy}>His shove is too big to be a bluff, and you beat every worse ace.</Text>
      </Animated.View>
    </View>
  );
}

function Dot({ i }: { i: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(
      i * 140,
      withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(0.3, { duration: 260 })), -1, false)
    );
  }, [i, v]);
  const st = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[s.dot, st]} />;
}

// -----------------------------------------------------------------------------
// LIVE — a voice orb with concentric pulses and a live transcript.
// -----------------------------------------------------------------------------
export function LiveDemo() {
  const pulse = useSharedValue(0);
  const line = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
    line.value = withDelay(400, withTiming(1, { duration: motion.base }));
  }, [pulse, line]);

  const ring1 = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.1]) }],
  }));
  const ring2 = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.32, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 3]) }],
  }));
  const lineS = useAnimatedStyle(() => ({
    opacity: line.value,
    transform: [{ translateY: interpolate(line.value, [0, 1], [8, 0]) }],
  }));

  return (
    <View style={s.liveWrap}>
      <View style={s.orbWrap}>
        <Animated.View style={[s.ring, ring2]} />
        <Animated.View style={[s.ring, ring1]} />
        <View style={s.orb}>
          <View style={s.orbCore} />
        </View>
      </View>

      <Animated.View style={[s.transcript, lineS]}>
        <Text style={s.transcriptLabel}>You</Text>
        <Text style={s.transcriptText}>“Six players. I'm on the button with jacks.”</Text>
      </Animated.View>

      <Animated.View style={[s.transcriptCoach, lineS]}>
        <Text style={s.transcriptLabelDark}>Coach</Text>
        <Text style={s.transcriptTextDark}>“Raise. Three and a half big blinds.”</Text>
      </Animated.View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// REVIEW — bars that grow, with the worst leak flagged.
// The exaggeration is the flag: in the real app it is a row in a list.
// -----------------------------------------------------------------------------
const LEAK_BARS = [
  { label: 'Calling too wide', pct: 0.92, bad: true },
  { label: 'Bet sizing', pct: 0.54, bad: false },
  { label: 'Position', pct: 0.28, bad: false },
];

export function ReviewDemo() {
  return (
    <View style={{ gap: spacing.cozy }}>
      {LEAK_BARS.map((b, i) => (
        <Bar key={b.label} {...b} index={i} />
      ))}
    </View>
  );
}

function Bar({ label, pct, bad, index }: { label: string; pct: number; bad: boolean; index: number }) {
  const g = useSharedValue(0);
  useEffect(() => {
    g.value = withDelay(index * 140, withTiming(1, { duration: motion.slow, easing: Easing.out(Easing.cubic) }));
  }, [index, g]);

  const fill = useAnimatedStyle(() => ({ width: `${pct * 100 * g.value}%` }));
  const tag = useAnimatedStyle(() => ({ opacity: g.value }));

  return (
    <View style={s.barRow}>
      <View style={s.barHead}>
        <Text style={s.barLabel}>{label}</Text>
        {bad && (
          <Animated.View style={[s.flag, tag]}>
            <Text style={s.flagText}>FIX FIRST</Text>
          </Animated.View>
        )}
      </View>
      <View style={s.barTrack}>
        <Animated.View style={[s.barFill, bad ? s.barFillBad : s.barFillOk, fill]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stack: { gap: spacing.cozy },

  askBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.cozy,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    maxWidth: '88%',
  },
  askText: { ...t.body, color: colors.text.primary },

  thinking: { flexDirection: 'row', gap: 6, paddingLeft: spacing.tight, height: 10, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text.secondary },

  verdict: {
    backgroundColor: colors.accent.gold,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.tight,
    ...elevation.lifted,
  },
  verdictAction: { ...t.stat, fontSize: 40, lineHeight: 44, color: colors.text.dark },
  verdictMeta: { flexDirection: 'row' },
  verdictConf: { ...t.caption, color: colors.text.dark, fontWeight: '700', opacity: 0.75 },
  verdictWhy: { ...t.body, color: colors.text.dark, fontWeight: '600' },

  liveWrap: { alignItems: 'center', gap: spacing.base },
  orbWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.accent.gold,
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.card,
  },
  orbCore: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.text.dark, opacity: 0.85 },

  transcript: {
    alignSelf: 'stretch',
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.lg,
    padding: spacing.cozy,
    gap: 2,
  },
  transcriptLabel: { ...t.eyebrow, fontSize: 10, color: colors.text.secondary },
  transcriptText: { ...t.body, color: colors.text.primary },

  transcriptCoach: {
    alignSelf: 'stretch',
    backgroundColor: colors.accent.gold,
    borderRadius: radius.lg,
    padding: spacing.cozy,
    gap: 2,
  },
  transcriptLabelDark: { ...t.eyebrow, fontSize: 10, color: colors.text.dark, opacity: 0.7 },
  transcriptTextDark: { ...t.body, color: colors.text.dark, fontWeight: '700' },

  barRow: { gap: spacing.snug },
  barHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.snug },
  barLabel: { ...t.body, color: colors.text.primary, fontWeight: '600' },
  flag: {
    backgroundColor: colors.accent.primary,
    paddingHorizontal: spacing.snug,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  flagText: { ...t.eyebrow, fontSize: 9, color: colors.text.primary },
  barTrack: { height: 14, borderRadius: radius.pill, backgroundColor: colors.background.tertiary, overflow: 'hidden' },
  barFill: { height: 14, borderRadius: radius.pill },
  barFillBad: { backgroundColor: colors.accent.primary },
  barFillOk: { backgroundColor: colors.accent.gold, opacity: 0.55 },
});
