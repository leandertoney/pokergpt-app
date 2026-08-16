/**
 * Onboarding UI primitives.
 *
 * The old flow had no shared components, so all 30 screens re-declared their
 * own button, their own heading sizes and their own entrance animation — 8 to
 * 34 hand-rolled Animated calls each. Everything below is built once here and
 * driven by constants/theme.ts.
 *
 * Rules this file enforces:
 *  - One idea per screen. Screen() takes a single headline and one supporting
 *    line, and there is deliberately no slot for a third block of text.
 *  - Nothing is time-gated. Content animates in, but the primary button is
 *    live immediately — the old ChatDemoScreen made users wait 8 seconds
 *    before Continue even appeared.
 *  - Fifth-grade reading level is a copy constraint, but short lines are a
 *    layout constraint too: headlines wrap at ~3 words per line at this size.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { spacing, radius, type, motion, elevation } from '@/constants/theme';

// -----------------------------------------------------------------------------
// Fade + rise. The single entrance animation used everywhere, so screens feel
// like one system instead of 30 slightly different springs.
// -----------------------------------------------------------------------------
export function Rise({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  // Starts at 1, not 0. Previously this began fully transparent and depended on
  // a worklet running to become visible, which meant any failure in the
  // animation layer left the screen permanently blank with no error. Content is
  // now visible by default and the entrance is a refinement on top of it.
  const p = useSharedValue(1);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(
      delay,
      withTiming(1, { duration: motion.base, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, p]);

  const anim = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: interpolate(p.value, [0, 1], [14, 0]) }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

// -----------------------------------------------------------------------------
// Primary button. Always enabled unless explicitly disabled — never gated on an
// animation finishing.
// -----------------------------------------------------------------------------
export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const press = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.97]) }],
  }));

  return (
    <Animated.View style={anim}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPressIn={() => (press.value = withTiming(1, { duration: motion.fast }))}
        onPressOut={() => (press.value = withSpring(0, motion.springy))}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        style={[s.primary, disabled && s.primaryDisabled]}
      >
        <Text style={s.primaryLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={s.textButton}
      hitSlop={12}
    >
      <Text style={s.textButtonLabel}>{label}</Text>
    </Pressable>
  );
}

// -----------------------------------------------------------------------------
// Choice row. Big tap target, immediate selected state, no "confirm" step.
// -----------------------------------------------------------------------------
export function Choice({
  label,
  sublabel,
  selected,
  onPress,
}: {
  label: string;
  sublabel?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const press = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.98]) }],
  }));

  return (
    <Animated.View style={anim}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!selected }}
        accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
        onPressIn={() => (press.value = withTiming(1, { duration: motion.fast }))}
        onPressOut={() => (press.value = withSpring(0, motion.springy))}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={[s.choice, selected && s.choiceSelected]}
      >
        <View style={s.choiceText}>
          <Text style={[s.choiceLabel, selected && s.choiceLabelSelected]}>{label}</Text>
          {!!sublabel && <Text style={s.choiceSub}>{sublabel}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// -----------------------------------------------------------------------------
// Progress. A thin rule, not a segmented bar — it reports position without
// implying "look how many are left".
// -----------------------------------------------------------------------------
export function Progress({ value }: { value: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(value, { duration: motion.base, easing: Easing.out(Easing.cubic) });
  }, [value, p]);

  const anim = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, p.value)) * 100}%` }));

  return (
    <View style={s.progressTrack}>
      <Animated.View style={[s.progressFill, anim]} />
    </View>
  );
}

// -----------------------------------------------------------------------------
// Screen shell. Enforces the one-idea rule structurally: a headline, at most one
// supporting line, a body slot, and a footer. No second paragraph slot exists.
// -----------------------------------------------------------------------------
export function Screen({
  eyebrow,
  headline,
  support,
  children,
  footer,
  progress,
  onBack,
  scroll,
}: {
  eyebrow?: string;
  headline: string;
  support?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  progress?: number;
  onBack?: () => void;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;

  return (
    <View style={[s.screen, { paddingTop: insets.top + spacing.snug }]}>
      <View style={s.header}>
        {onBack ? <TextButton label="Back" onPress={onBack} /> : <View style={s.headerSpacer} />}
        {progress !== undefined && (
          <View style={s.progressWrap}>
            <Progress value={progress} />
          </View>
        )}
      </View>

      {/* ScrollView throws an Invariant Violation if justifyContent reaches its
          `style` — it must live on contentContainerStyle. s.body carries
          justifyContent for the View case, so the scrolling case gets a
          layout-only style instead. */}
      <Body
        style={scroll ? s.bodyScroll : s.body}
        {...(scroll
          ? { contentContainerStyle: s.bodyScrollContent, showsVerticalScrollIndicator: false }
          : {})}
      >
        {!!eyebrow && (
          <Rise>
            <Text style={s.eyebrow}>{eyebrow}</Text>
          </Rise>
        )}

        <Rise delay={motion.stagger}>
          <Text style={s.headline}>{headline}</Text>
        </Rise>

        {!!support && (
          <Rise delay={motion.stagger * 2}>
            <Text style={s.support}>{support}</Text>
          </Rise>
        )}

        {!!children && (
          <Rise delay={motion.stagger * 3} style={s.content}>
            {children}
          </Rise>
        )}
      </Body>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
        {footer}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.base,
    gap: spacing.cozy,
  },
  headerSpacer: { width: 52 },
  progressWrap: { flex: 1, paddingRight: spacing.base },

  body: { flex: 1, paddingHorizontal: spacing.roomy, justifyContent: 'center' },
  bodyScroll: { flex: 1, paddingHorizontal: spacing.roomy },
  bodyScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.roomy },

  eyebrow: { ...type.eyebrow, color: colors.accent.gold, marginBottom: spacing.cozy },
  headline: { ...type.title, color: colors.text.primary },
  support: { ...type.subtitle, color: colors.text.secondary, marginTop: spacing.cozy },
  content: { marginTop: spacing.roomy },

  footer: { paddingHorizontal: spacing.roomy, paddingTop: spacing.cozy, gap: spacing.snug },

  primary: {
    backgroundColor: colors.accent.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing.base + 2,
    alignItems: 'center',
    ...elevation.card,
  },
  primaryDisabled: { opacity: 0.4 },
  primaryLabel: { ...type.button, color: colors.text.dark },

  textButton: { paddingVertical: spacing.snug, alignItems: 'center' },
  textButtonLabel: { ...type.caption, color: colors.text.secondary, fontWeight: '600' },

  choice: {
    backgroundColor: colors.background.tertiary,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.snug,
  },
  choiceSelected: { borderColor: colors.accent.gold, backgroundColor: colors.background.shadow },
  choiceText: { gap: 2 },
  choiceLabel: { ...type.heading, fontSize: 18, lineHeight: 24, color: colors.text.primary },
  choiceLabelSelected: { color: colors.accent.gold },
  choiceSub: { ...type.caption, color: colors.text.secondary },

  progressTrack: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.background.tertiary,
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: radius.pill, backgroundColor: colors.accent.gold },
});
