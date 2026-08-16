/**
 * Onboarding visuals.
 *
 * One per screen. These are drawn with Views and Reanimated — not photographs
 * and not screenshots. Two reasons that matters here:
 *
 *  - The old flow shipped 15 stock JPEGs hosted in Supabase storage. When that
 *    project auto-paused, every one of them 404'd and the whole flow rendered
 *    blank. Vector-style visuals cannot break that way.
 *  - A real screenshot is unreadable at this size. These are exaggerated: the
 *    verdict card is enormous, the leak bar is blood red, the orb is oversized.
 *    They read in half a second from arm's length.
 *
 * Every visual is visible immediately and animates as a refinement. Nothing
 * gates the button — the old ChatDemoScreen made users wait ~8s before Continue
 * appeared, and that is the single worst thing onboarding can do.
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

const GOLD = colors.accent.gold;
const RED = colors.accent.primary;
const CARD = colors.background.tertiary;
const INK = colors.text.dark;
const PAPER = colors.text.primary;

// -----------------------------------------------------------------------------
// WELCOME — two hole cards fanning out and settling.
// -----------------------------------------------------------------------------
export function WelcomeVisual() {
  const a = useSharedValue(0);
  useEffect(() => {
    a.value = withDelay(80, withSpring(1, motion.springy));
  }, [a]);

  const left = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(a.value, [0, 1], [0, -14])}deg` },
      { translateX: interpolate(a.value, [0, 1], [0, -18]) },
    ],
  }));
  const right = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(a.value, [0, 1], [0, 12])}deg` },
      { translateX: interpolate(a.value, [0, 1], [0, 18]) },
    ],
  }));

  return (
    <View style={s.center}>
      <View style={s.cardRow}>
        <Animated.View style={[s.card, left]}>
          <Text style={[s.cardRank, { color: INK }]}>A</Text>
          <Text style={[s.cardSuit, { color: INK }]}>♠</Text>
        </Animated.View>
        <Animated.View style={[s.card, s.cardOverlap, right]}>
          <Text style={[s.cardRank, { color: RED }]}>K</Text>
          <Text style={[s.cardSuit, { color: RED }]}>♥</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// ANALYZE — a question arrives, then a verdict card slams in.
// -----------------------------------------------------------------------------
export function AnalyzeVisual() {
  const q = useSharedValue(0);
  const v = useSharedValue(0);

  useEffect(() => {
    q.value = withTiming(1, { duration: motion.base });
    v.value = withDelay(520, withSpring(1, motion.springy));
  }, [q, v]);

  const qs = useAnimatedStyle(() => ({
    opacity: q.value,
    transform: [{ translateY: interpolate(q.value, [0, 1], [8, 0]) }],
  }));
  const vs = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: interpolate(v.value, [0, 1], [0.86, 1]) }],
  }));

  return (
    <View style={{ gap: spacing.cozy }}>
      <Animated.View style={[s.ask, qs]}>
        <Text style={s.askText}>Ace king. He shoved the river.</Text>
      </Animated.View>

      <Animated.View style={[s.verdict, vs]}>
        <Text style={s.verdictAction}>CALL</Text>
        <Text style={s.verdictWhy}>Too big to be a bluff. You beat every worse ace.</Text>
      </Animated.View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// LIVE — pulsing orb with a sound-wave bar row.
// -----------------------------------------------------------------------------
export function LiveVisual() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false);
  }, [pulse]);

  const ring1 = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.55, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2]) }],
  }));
  const ring2 = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.9]) }],
  }));

  return (
    <View style={[s.center, { gap: spacing.roomy }]}>
      <View style={s.orbWrap}>
        <Animated.View style={[s.ring, ring2]} />
        <Animated.View style={[s.ring, ring1]} />
        <View style={s.orb}>
          <View style={s.mic} />
          <View style={s.micStem} />
        </View>
      </View>

      <View style={s.waveRow}>
        {[0.35, 0.7, 1, 0.55, 0.85, 0.4, 0.65].map((h, i) => (
          <Wave key={i} h={h} i={i} />
        ))}
      </View>
    </View>
  );
}

function Wave({ h, i }: { h: number; i: number }) {
  const v = useSharedValue(0.4);
  useEffect(() => {
    v.value = withDelay(
      i * 90,
      withRepeat(
        withSequence(withTiming(1, { duration: 420 }), withTiming(0.4, { duration: 420 })),
        -1,
        false
      )
    );
  }, [i, v]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: v.value }] }));
  return <Animated.View style={[s.wave, { height: 44 * h }, st]} />;
}

// -----------------------------------------------------------------------------
// REVIEW — leak bars, worst one flagged.
// -----------------------------------------------------------------------------
const BARS = [
  { label: 'Calling too wide', pct: 0.95, bad: true },
  { label: 'Bet sizing', pct: 0.5, bad: false },
  { label: 'Position', pct: 0.26, bad: false },
];

export function ReviewVisual() {
  return (
    <View style={{ gap: spacing.base }}>
      {BARS.map((b, i) => (
        <Bar key={b.label} {...b} index={i} />
      ))}
    </View>
  );
}

function Bar({ label, pct, bad, index }: { label: string; pct: number; bad: boolean; index: number }) {
  const g = useSharedValue(0);
  useEffect(() => {
    g.value = withDelay(index * 150, withTiming(1, { duration: motion.slow, easing: Easing.out(Easing.cubic) }));
  }, [index, g]);

  const fill = useAnimatedStyle(() => ({ width: `${pct * 100 * g.value}%` }));
  const flag = useAnimatedStyle(() => ({ opacity: g.value }));

  return (
    <View style={{ gap: spacing.snug }}>
      <View style={s.barHead}>
        <Text style={s.barLabel}>{label}</Text>
        {bad && (
          <Animated.View style={[s.flag, flag]}>
            <Text style={s.flagText}>FIX FIRST</Text>
          </Animated.View>
        )}
      </View>
      <View style={s.barTrack}>
        <Animated.View style={[s.barFill, { backgroundColor: bad ? RED : GOLD }, !bad && { opacity: 0.5 }, fill]} />
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// QUESTION MARKER — a small numbered chip so the three questions read as a set.
// -----------------------------------------------------------------------------
export function QuestionVisual({ n, total = 3 }: { n: number; total?: number }) {
  return (
    <View style={s.pipRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.pip, i < n && s.pipOn]} />
      ))}
      <Text style={s.pipText}>
        {n} of {total}
      </Text>
    </View>
  );
}

// -----------------------------------------------------------------------------
// PLAN — a checklist that ticks itself in.
// -----------------------------------------------------------------------------
export function PlanVisual({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={{ gap: spacing.cozy }}>
      {items.map((it, i) => (
        <PlanRow key={it.label} {...it} index={i} />
      ))}
    </View>
  );
}

function PlanRow({ label, value, index }: { label: string; value: string; index: number }) {
  const a = useSharedValue(0);
  useEffect(() => {
    a.value = withDelay(index * 180, withSpring(1, motion.springy));
  }, [index, a]);

  const tick = useAnimatedStyle(() => ({
    opacity: a.value,
    transform: [{ scale: interpolate(a.value, [0, 1], [0.4, 1]) }],
  }));

  return (
    <View style={s.planRow}>
      <Animated.View style={[s.tick, tick]}>
        <Text style={s.tickMark}>✓</Text>
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={s.planLabel}>{label}</Text>
        <Text style={s.planValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },

  cardRow: { flexDirection: 'row', height: 132, alignItems: 'center' },
  card: {
    width: 88,
    height: 124,
    borderRadius: radius.md,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.lifted,
  },
  cardOverlap: { marginLeft: -22 },
  cardRank: { ...t.stat, fontSize: 38, lineHeight: 40 },
  cardSuit: { fontSize: 30, lineHeight: 32 },

  ask: {
    alignSelf: 'flex-end',
    backgroundColor: CARD,
    paddingVertical: spacing.cozy,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    maxWidth: '90%',
  },
  askText: { ...t.body, color: PAPER },

  verdict: { backgroundColor: GOLD, borderRadius: radius.xl, padding: spacing.base, gap: spacing.tight, ...elevation.lifted },
  verdictAction: { ...t.stat, fontSize: 44, lineHeight: 48, color: INK },
  verdictWhy: { ...t.body, color: INK, fontWeight: '700' },

  orbWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: GOLD },
  orb: { width: 84, height: 84, borderRadius: 42, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', ...elevation.card },
  mic: { width: 22, height: 34, borderRadius: 11, backgroundColor: INK },
  micStem: { width: 4, height: 10, backgroundColor: INK, marginTop: 3, borderRadius: 2 },

  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 48 },
  wave: { width: 7, borderRadius: radius.pill, backgroundColor: GOLD },

  barHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.snug },
  barLabel: { ...t.body, color: PAPER, fontWeight: '600' },
  flag: { backgroundColor: RED, paddingHorizontal: spacing.snug, paddingVertical: 3, borderRadius: radius.pill },
  flagText: { ...t.eyebrow, fontSize: 9, color: PAPER },
  barTrack: { height: 16, borderRadius: radius.pill, backgroundColor: CARD, overflow: 'hidden' },
  barFill: { height: 16, borderRadius: radius.pill },

  pipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.snug },
  pip: { width: 22, height: 4, borderRadius: radius.pill, backgroundColor: CARD },
  pipOn: { backgroundColor: GOLD },
  pipText: { ...t.caption, color: colors.text.secondary, marginLeft: spacing.tight },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.cozy },
  tick: { width: 30, height: 30, borderRadius: 15, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  tickMark: { color: INK, fontSize: 17, fontWeight: '900' },
  planLabel: { ...t.caption, color: colors.text.secondary },
  planValue: { ...t.body, color: PAPER, fontWeight: '700' },
});
