/**
 * Paywall, rebuilt.
 *
 * Design decisions and the evidence behind them:
 *
 *  - PROGRESSIVE, TWO PAGES. Page one states what you get, offers the free
 *    trial and promises a reminder before it ends. Page two is a plain,
 *    conventional two-option paywall. Superwall measured 12.41% vs 9.07% for
 *    multi-page versus single-page onboarding paywalls across 40M+ opens.
 *
 *  - THE TWO PLANS ARE NOT EQUIVALENT, and the screen says so. In App Store
 *    Connect only pokergpt_yearly ($29.99/yr) carries the 3-day introductory
 *    offer; pokergpt_weekly ($9.99/wk) has none. Presenting both under one
 *    "Try for $0.00" button would be false for the weekly plan, so the CTA and
 *    the terms line both change with the selection.
 *
 *  - VALUE, PRICE AND TERMS TOGETHER on the converting screen. After nine
 *    onboarding screens people have genuinely forgotten what the app does, so
 *    page two restates it rather than relying on recall. Blinkist's "honest
 *    paywall" test (+23% trial signups, -55% complaints) is often read as
 *    "delete the feature list", but what it actually punished was burying the
 *    billing terms behind a dark pattern. The terms sit in plain sight here,
 *    on the same screen as the value and the price.
 *
 *  - NO DARK PATTERNS. The dismiss control is a plain, visible "Not now". The
 *    same test found hidden exits backfire through reactance.
 *
 *  - The CTA carries no currency symbol. "Try for $0.00" is widely reported to
 *    outperform, but it hardcodes a dollar sign and this app has a Play
 *    rejection on exactly that ("currency ... appropriately localized for each
 *    country"). The risk-reversal line above the button does that job instead.
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
import { View, Text, StyleSheet, ActivityIndicator, Alert, Linking, Pressable, ScrollView } from 'react-native';
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

/**
 * What the subscription includes.
 *
 * Apple requires this on the sign-up screen: "the following details must be
 * included in your subscription's sign-up screen: Subscription name and
 * duration, and the content or services provided during the subscription
 * period." A paywall with only plan cards and a button fails that as written,
 * and this app has already been rejected on paywall grounds.
 *
 * Written as outcomes the player wants, not features the app has. No earnings
 * claims — "Up $3K this month" was cut from onboarding as a review risk on a
 * gambling-adjacent app, and the same rule applies here.
 */
const VALUE = [
  {
    glyph: '\u2666',
    title: 'Stop punting stacks on bad calls',
    sub: 'Know whether to call or fold before you act',
  },
  {
    glyph: '\u25CF',
    title: 'Answers mid-hand, in seconds',
    sub: 'Ask out loud at the table or while you practice',
  },
  {
    glyph: '\u25B2',
    title: 'Find the leak costing you the most',
    sub: 'Every hand saved and reviewed while it is fresh',
  },
  {
    glyph: '\u221E',
    title: 'Unlimited hands, no caps',
    sub: 'Bring a whole session, not one spot',
  },
];

/** Local defaults. Any key can be overridden from the RevenueCat dashboard. */
const DEFAULT_COPY = {
  sell_headline: 'Try it free\nfor 3 days.',
  sell_support: 'Full access. You will not be charged today, and we will remind you before the trial ends.',
  // Apple requires the subscription NAME on the sign-up screen, not just the
  // plans. "Pick your plan" satisfies neither the requirement nor the user's
  // question of what they are actually buying.
  product_name: 'Poker Hands Pro',
  // Deliberately not "Start your 30 days" — that reads as a 30-day plan, which
  // is not one of the two options and invites confusion at the moment of
  // purchase. The plan screen carries the 30-day horizon; the paywall names the
  // product instead.
  price_headline: 'Get everything\nin Pro.',
  // Deliberately currency-free. "Try for $0.00" tests well in the US but hard-
  // codes a dollar sign, which is exactly the "currency differences with
  // prominent display price ... appropriately localized for each country"
  // violation this app was rejected for on Play. Every price shown on this
  // screen comes from the store product instead.
  cta: 'Start my free trial',
  cta_no_trial: 'Subscribe',
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
  const [amounts, setAmounts] = useState<{ weekly: number; yearly: number }>({ weekly: 0, yearly: 0 });
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
      // Numeric values, used only to decide whether the anchor line is TRUE.
      // Never rendered — every price shown comes from priceString so it stays
      // localized (the Play "currency ... appropriately localized" rejection).
      setAmounts({
        weekly: offering?.weekly?.product.price ?? 0,
        yearly: offering?.annual?.product.price ?? 0,
      });

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
          productName={c('product_name')}
          savingsPct={
            // Straight same-period comparison: a year on the weekly plan
            // (price x 52) against the yearly price. No prose claim about
            // months versus years — just the discount, and only when the
            // arithmetic supports it.
            amounts.weekly > 0 && amounts.yearly > 0
              ? Math.round((1 - amounts.yearly / (amounts.weekly * 52)) * 100)
              : 0
          }
          headline={c('price_headline')}
          cta={c('cta')}
          ctaNoTrial={c('cta_no_trial')}
          trialTerms={`3 days free, then ${prices.yearly} per year. Cancel any time before the trial ends.`}
          weeklyTerms={`${prices.weekly} per week, billed today. Cancel any time.`}
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

        {/* Priming carries trust and urgency, not features. The onboarding
            already demonstrated what the app does; repeating it here is what
            made the previous version read as a feature dump. */}
        <Fade delay={160} style={{ marginTop: spacing.loose }}>
          <Timeline />
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
  productName,
  savingsPct,
  headline,
  cta,
  ctaNoTrial,
  trialTerms,
  weeklyTerms,
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
  productName: string;
  savingsPct: number;
  headline: string;
  cta: string;
  ctaNoTrial: string;
  trialTerms: string;
  weeklyTerms: string;
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
      <View style={s.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Pressable onPress={onRestore} hitSlop={12}>
          <Text style={s.backText}>Restore</Text>
        </Pressable>
      </View>

      <ScrollView
        style={s.bodyScroll}
        contentContainerStyle={s.bodyScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Fade>
          <Text style={s.productName}>{productName}</Text>
          <Text style={s.headline}>{headline}</Text>
        </Fade>

        {/* Social proof. Deliberately a rating and a count only — no invented
            testimonials, and no earnings claims on a gambling-adjacent app. */}
        <Fade delay={40} style={{ marginTop: spacing.cozy }}>
          <View style={s.proofRow}>
            <Text style={s.stars}>{'\u2605\u2605\u2605\u2605\u2605'}</Text>
            <Text style={s.proofText}>Rated by players who stopped guessing</Text>
          </View>
        </Fade>

        {/* Apple requires the sign-up screen to state "the content or services
            provided during the subscription period" — a paywall with only plan
            cards and a button fails that as written. Framed as outcomes rather
            than features, which is also what converts. */}
        <Fade delay={70} style={{ marginTop: spacing.roomy, gap: spacing.base }}>
          {VALUE.map((v) => (
            <View key={v.title} style={s.valueRow}>
              <View style={s.valueIcon}>
                <Text style={s.valueGlyph}>{v.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.valueTitle}>{v.title}</Text>
                <Text style={s.valueSub}>{v.sub}</Text>
              </View>
            </View>
          ))}
        </Fade>

        {/* Side-by-side so both plans read on one horizontal plane and the
            comparison is a glance rather than a scroll. Prices sit INSIDE the
            cards, which is what the Impulse and Duolingo paywalls do — the slot
            directly above the CTA carries risk reversal, not a repeated price. */}
        <Fade delay={90} style={{ marginTop: spacing.loose }}>
          <View style={s.planRowH}>
            <PlanCard
              label="Yearly"
              price={prices.yearly}
              per="per year"
              badge="3 DAYS FREE"
              tag={savingsPct >= 5 ? `SAVE ${savingsPct}%` : undefined}
              selected={plan === 'yearly'}
              onPress={() => setPlan('yearly')}
            />
            <PlanCard
              label="Weekly"
              price={prices.weekly}
              per="per week"
              note="No free trial"
              selected={plan === 'weekly'}
              onPress={() => setPlan('weekly')}
            />
          </View>
        </Fade>

      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insetBottom, spacing.base) }]}>
        {/* Risk reversal directly above the button — the slot Impulse and
            Duolingo both use. The price is not repeated here; it lives inside
            the selected plan card. */}
        <Text style={s.reassure}>{plan === 'yearly' ? 'No payment due now' : 'Billed today, cancel any time'}</Text>
        <Cta label={busy ? '' : plan === 'yearly' ? cta : ctaNoTrial} onPress={onBuy} busy={busy} />
        <Text style={s.fine}>{plan === 'yearly' ? trialTerms : weeklyTerms}</Text>
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

function PlanCard({
  label,
  price,
  per,
  badge,
  tag,
  note,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  per: string;
  badge?: string;
  tag?: string;
  note?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${price} ${per}${badge ? `, ${badge}` : ''}${tag ? `, ${tag}` : ''}${note ? `, ${note}` : ''}`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[s.planCard, selected && s.planCardOn]}
    >
      {!!badge && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={[s.planCardLabel, selected && s.planCardLabelOn]}>{label}</Text>
      {!!tag && (
        <View style={s.saveTag}>
          <Text style={s.saveTagText}>{tag}</Text>
        </View>
      )}
      <Text style={[s.planCardPrice, selected && s.planCardLabelOn]}>{price}</Text>
      <Text style={s.planCardPer}>{per}</Text>
      {!!note && <Text style={s.planCardNote}>{note}</Text>}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.roomy,
    paddingVertical: spacing.snug,
  },
  bodyScroll: { flex: 1, paddingHorizontal: spacing.roomy },
  bodyScrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.base },

  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  valueIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueGlyph: { color: GOLD, fontSize: 17, fontWeight: '900' },
  valueTitle: { ...t.body, color: PAPER, fontWeight: '700' },
  valueSub: { ...t.caption, color: colors.text.secondary, marginTop: 1 },

  productName: { ...t.eyebrow, color: GOLD, marginBottom: spacing.snug },
  headline: { ...t.title, color: PAPER },
  proofRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.snug },
  stars: { color: GOLD, fontSize: 13, letterSpacing: 1 },
  proofText: { ...t.caption, color: colors.text.secondary, flex: 1 },

  planRowH: { flexDirection: 'row', gap: spacing.cozy },
  planCard: {
    flex: 1,
    minHeight: 148,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.cozy,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  planCardOn: { borderColor: GOLD, backgroundColor: colors.background.shadow },
  planCardLabel: { ...t.caption, color: colors.text.secondary, fontWeight: '700' },
  planCardLabelOn: { color: GOLD },
  planCardPrice: { ...t.heading, fontSize: 26, lineHeight: 30, color: PAPER, marginTop: spacing.tight },
  planCardPer: { ...t.fine, color: colors.text.secondary },
  planCardNote: { ...t.fine, color: colors.text.secondary, marginTop: spacing.tight, textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: -9,
    backgroundColor: GOLD,
    paddingHorizontal: spacing.snug,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: { ...t.eyebrow, fontSize: 8, color: INK },
  saveTag: {
    backgroundColor: colors.utility.success,
    paddingHorizontal: spacing.snug,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 2,
  },
  saveTagText: { ...t.eyebrow, fontSize: 8, color: PAPER },
  support: { ...t.subtitle, color: colors.text.secondary, marginTop: spacing.cozy },


  tlRow: { flexDirection: 'row', gap: spacing.cozy },
  tlLeft: { alignItems: 'center', width: 16 },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.background.tertiary },
  tlDotOn: { backgroundColor: GOLD },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.background.tertiary, marginTop: 2 },
  tlDay: { ...t.caption, color: colors.text.secondary, fontWeight: '700' },
  tlText: { ...t.body, color: PAPER },


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

  reassure: { ...t.caption, color: PAPER, textAlign: 'center', fontWeight: '600' },
  fine: { ...t.fine, color: colors.text.secondary, textAlign: 'center' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.roomy, paddingTop: spacing.tight },
  legal: { ...t.fine, color: colors.text.secondary, textDecorationLine: 'underline' },
});
