/**
 * Paywall, rebuilt.
 *
 * Design decisions and the evidence behind them:
 *
 *  - MULTI-PAGE. Superwall measured 12.41% vs 9.07% for multi-page versus
 *    single-page onboarding paywalls across 40M+ opens — a 37% lift — and only
 *    ~24% of apps do it. Page one sells, page two prices.
 *
 *  - NO FEATURE LIST. Blinkist's "honest paywall" test won +23% trial signups
 *    and cut support complaints 55% by deleting feature bullets and instead
 *    addressing the real fear: being charged unexpectedly. Page two leads with
 *    the billing timeline, not a list of what you get.
 *
 *  - NO DARK PATTERNS. The dismiss control is a plain, visible "Not now". The
 *    same test found hidden exits backfire through reactance.
 *
 *  - "Try for $0.00" rather than "Start free trial" — consistently reported to
 *    outperform by emphasising that nothing is charged today.
 *
 *  - Copy is remotely overridable via RevenueCat Offering metadata
 *    (getPaywallCopy), so headline, CTA and trial framing can be A/B tested by
 *    Experiments WITHOUT shipping a build and WITHOUT adopting RevenueCat's
 *    hosted paywall UI. Every key falls back to the local default below.
 *
 *  - Self-skips when the store returns no products. This is what fixed the
 *    Google Play "broken functionality" rejection: previously every price
 *    rendered as '...' and the buttons were dead controls.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Linking, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getOfferings,
  getPaywallCopy,
  purchasePackage,
  restorePurchases,
  PRODUCT_IDS,
  type PlanType,
} from '@/services/revenueCat';
import { trackOnboardingEvent } from '@/services/onboardingAnalytics';
import { colors } from '@/constants/colors';
import { spacing, radius, type as t, motion, elevation } from '@/constants/theme';

const TERMS_URL = 'https://universoleappstudios.com/pokergpt/terms';
const PRIVACY_URL = 'https://universoleappstudios.com/pokergpt/privacy';

const GOLD = colors.accent.gold;
const INK = colors.text.dark;
const PAPER = colors.text.primary;

/** Local defaults. Any key can be overridden from the RevenueCat dashboard. */
const DEFAULT_COPY = {
  sell_headline: 'Every hand,\nplayed right.',
  sell_support: 'Your coach is ready. Bring it your next session.',
  price_headline: 'Try it free\nfor 3 days.',
  cta: 'Try for $0.00',
  dismiss: 'Not now',
};

type Props = {
  goal?: string | null;
  onPurchase: () => void;
  onSkip: () => void;
};

export function PaywallV2({ onPurchase, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<'sell' | 'price'>('sell');
  const [plan, setPlan] = useState<PlanType>('yearly');
  const [prices, setPrices] = useState<{ weekly?: string; yearly?: string }>({});
  const [copy, setCopy] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const c = (k: keyof typeof DEFAULT_COPY) => copy[k] ?? DEFAULT_COPY[k];

  useEffect(() => {
    (async () => {
      const [offering, meta] = await Promise.all([getOfferings(), getPaywallCopy()]);
      setCopy(meta);

      const weekly = offering?.weekly?.product.priceString;
      const yearly = offering?.annual?.product.priceString;

      if (!weekly || !yearly) {
        // No purchasable products — never render priced-looking dead controls.
        setUnavailable(true);
        return;
      }
      setPrices({ weekly, yearly });
    })();
  }, []);

  useEffect(() => {
    if (unavailable) onSkip();
  }, [unavailable, onSkip]);

  const buy = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackOnboardingEvent('paywall_subscribe_tapped', { plan });
    try {
      const res = await purchasePackage(plan);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPurchase();
      } else if (res.error !== 'cancelled') {
        Alert.alert('Could not complete', res.error ?? 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }, [busy, plan, onPurchase]);

  const restore = useCallback(async () => {
    const res = await restorePurchases();
    if (res.success) onPurchase();
    else Alert.alert('Nothing to restore', 'No previous purchase was found on this account.');
  }, [onPurchase]);

  if (unavailable) return null;

  const loaded = !!(prices.weekly && prices.yearly);
  if (!loaded) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top + spacing.base }]}>
      {page === 'sell' ? (
        <SellPage
          headline={c('sell_headline')}
          support={c('sell_support')}
          onNext={() => {
            trackOnboardingEvent('paywall_page_price');
            setPage('price');
          }}
          onSkip={onSkip}
          dismissLabel={c('dismiss')}
          insetBottom={insets.bottom}
        />
      ) : (
        <PricePage
          headline={c('price_headline')}
          cta={c('cta')}
          dismissLabel={c('dismiss')}
          plan={plan}
          setPlan={setPlan}
          prices={prices as { weekly: string; yearly: string }}
          busy={busy}
          onBuy={buy}
          onRestore={restore}
          onSkip={onSkip}
          onBack={() => setPage('sell')}
          insetBottom={insets.bottom}
        />
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// PAGE 1 — sell. No prices, no feature list. One promise and a visual.
// -----------------------------------------------------------------------------
function SellPage({
  headline,
  support,
  onNext,
  onSkip,
  dismissLabel,
  insetBottom,
}: {
  headline: string;
  support: string;
  onNext: () => void;
  onSkip: () => void;
  dismissLabel: string;
  insetBottom: number;
}) {
  return (
    <View style={s.page}>
      <View style={s.body}>
        <Fade>
          <Text style={s.headline}>{headline}</Text>
        </Fade>
        <Fade delay={80}>
          <Text style={s.support}>{support}</Text>
        </Fade>
        <Fade delay={160} style={{ marginTop: spacing.loose }}>
          <StreakVisual />
        </Fade>
      </View>

      <View style={[s.footer, { paddingBottom: Math.max(insetBottom, spacing.base) }]}>
        <Cta label="Continue" onPress={onNext} />
        <Dismiss label={dismissLabel} onPress={onSkip} />
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// PAGE 2 — price. Leads with the billing timeline, per the Blinkist result.
// -----------------------------------------------------------------------------
function PricePage({
  headline,
  cta,
  dismissLabel,
  plan,
  setPlan,
  prices,
  busy,
  onBuy,
  onRestore,
  onSkip,
  onBack,
  insetBottom,
}: {
  headline: string;
  cta: string;
  dismissLabel: string;
  plan: PlanType;
  setPlan: (p: PlanType) => void;
  prices: { weekly: string; yearly: string };
  busy: boolean;
  onBuy: () => void;
  onRestore: () => void;
  onSkip: () => void;
  onBack: () => void;
  insetBottom: number;
}) {
  return (
    <View style={s.page}>
      <Pressable onPress={onBack} hitSlop={12} style={s.back}>
        <Text style={s.backText}>Back</Text>
      </Pressable>

      <View style={s.body}>
        <Fade>
          <Text style={s.headline}>{headline}</Text>
        </Fade>

        <Fade delay={80} style={{ marginTop: spacing.roomy }}>
          <Timeline />
        </Fade>

        <Fade delay={160} style={{ marginTop: spacing.roomy, gap: spacing.snug }}>
          <PlanRow
            label="Yearly"
            price={prices.yearly}
            note="Best value"
            selected={plan === 'yearly'}
            onPress={() => setPlan('yearly')}
          />
          <PlanRow
            label="Weekly"
            price={prices.weekly}
            selected={plan === 'weekly'}
            onPress={() => setPlan('weekly')}
          />
        </Fade>
      </View>

      <View style={[s.footer, { paddingBottom: Math.max(insetBottom, spacing.base) }]}>
        <Cta label={busy ? '' : cta} onPress={onBuy} busy={busy} />
        <Text style={s.fine}>No charge today. Cancel any time before day 3.</Text>
        <Dismiss label={dismissLabel} onPress={onSkip} />
        <View style={s.legalRow}>
          <Pressable onPress={onRestore} hitSlop={8}>
            <Text style={s.legal}>Restore</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
            <Text style={s.legal}>Terms</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
            <Text style={s.legal}>Privacy</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Visuals
// -----------------------------------------------------------------------------

/** A rising row of bars — "every hand, played right". */
function StreakVisual() {
  return (
    <View style={s.streakRow}>
      {[0.3, 0.45, 0.4, 0.62, 0.75, 0.7, 0.92, 1].map((h, i) => (
        <StreakBar key={i} h={h} i={i} last={i === 7} />
      ))}
    </View>
  );
}

function StreakBar({ h, i, last }: { h: number; i: number; last: boolean }) {
  const g = useSharedValue(0);
  useEffect(() => {
    g.value = withDelay(i * 70, withSpring(1, motion.springy));
  }, [i, g]);
  const st = useAnimatedStyle(() => ({
    height: 130 * h * g.value,
    opacity: interpolate(g.value, [0, 1], [0, 1]),
  }));
  return <Animated.View style={[s.streakBar, last && s.streakBarLast, st]} />;
}

/** The billing timeline. Addresses the fear instead of listing features. */
const STEPS = [
  { day: 'Today', text: 'Full access. You are not charged.' },
  { day: 'Day 2', text: 'We remind you before the trial ends.' },
  { day: 'Day 3', text: 'Trial ends. Cancel any time before this.' },
];

function Timeline() {
  return (
    <View style={{ gap: spacing.base }}>
      {STEPS.map((st, i) => (
        <View key={st.day} style={s.tlRow}>
          <View style={s.tlLeft}>
            <View style={[s.tlDot, i === 0 && s.tlDotOn]} />
            {i < STEPS.length - 1 && <View style={s.tlLine} />}
          </View>
          <View style={{ flex: 1, paddingBottom: spacing.snug }}>
            <Text style={s.tlDay}>{st.day}</Text>
            <Text style={s.tlText}>{st.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Controls
// -----------------------------------------------------------------------------

function Fade({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const p = useSharedValue(1);
  useEffect(() => {
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration: motion.base, easing: Easing.out(Easing.cubic) }));
  }, [delay, p]);
  const a = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: interpolate(p.value, [0, 1], [12, 0]) }],
  }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

function Cta({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label || 'Continue'} onPress={onPress} style={s.cta}>
      {busy ? <ActivityIndicator color={INK} /> : <Text style={s.ctaText}>{label}</Text>}
    </Pressable>
  );
}

function Dismiss({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={12} style={s.dismiss}>
      <Text style={s.dismissText}>{label}</Text>
    </Pressable>
  );
}

function PlanRow({
  label,
  price,
  note,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  note?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${price}${note ? `, ${note}` : ''}`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[s.plan, selected && s.planOn]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[s.planLabel, selected && s.planLabelOn]}>{label}</Text>
        {!!note && <Text style={s.planNote}>{note}</Text>}
      </View>
      <Text style={[s.planPrice, selected && s.planLabelOn]}>{price}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.primary },
  center: { alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.roomy, justifyContent: 'center' },
  footer: { paddingHorizontal: spacing.roomy, gap: spacing.snug },

  back: { paddingHorizontal: spacing.roomy, paddingVertical: spacing.snug, alignSelf: 'flex-start' },
  backText: { ...t.caption, color: colors.text.secondary, fontWeight: '600' },

  headline: { ...t.title, color: PAPER },
  support: { ...t.subtitle, color: colors.text.secondary, marginTop: spacing.cozy },

  streakRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.snug, height: 140 },
  streakBar: { flex: 1, borderRadius: radius.sm, backgroundColor: GOLD, opacity: 0.45 },
  streakBarLast: { opacity: 1, ...elevation.card },

  tlRow: { flexDirection: 'row', gap: spacing.cozy },
  tlLeft: { alignItems: 'center', width: 16 },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.background.tertiary },
  tlDotOn: { backgroundColor: GOLD },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.background.tertiary, marginTop: 2 },
  tlDay: { ...t.caption, color: colors.text.secondary, fontWeight: '700' },
  tlText: { ...t.body, color: PAPER },

  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.background.tertiary,
    gap: spacing.base,
  },
  planOn: { borderColor: GOLD, backgroundColor: colors.background.shadow },
  planLabel: { ...t.heading, fontSize: 18, lineHeight: 24, color: PAPER },
  planLabelOn: { color: GOLD },
  planNote: { ...t.caption, color: colors.text.secondary },
  planPrice: { ...t.heading, fontSize: 18, lineHeight: 24, color: PAPER },

  cta: {
    backgroundColor: GOLD,
    borderRadius: radius.pill,
    paddingVertical: spacing.base + 2,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
    ...elevation.card,
  },
  ctaText: { ...t.button, color: INK },

  dismiss: { paddingVertical: spacing.cozy, alignItems: 'center' },
  dismissText: { ...t.caption, color: colors.text.secondary, fontWeight: '600' },

  fine: { ...t.fine, color: colors.text.secondary, textAlign: 'center' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.roomy, paddingTop: spacing.tight },
  legal: { ...t.fine, color: colors.text.secondary, textDecorationLine: 'underline' },
});
