/**
 * Onboarding, rebuilt.
 *
 * What was wrong with the old flow:
 *  - ChatDemoScreen played an 11-message scripted conversation and gated the
 *    Continue button behind it — roughly 8 seconds of forced waiting with no
 *    skip. Nothing the user did mattered until it finished.
 *  - Questions were wordy and extractive: four of them, and the answers were
 *    thrown away at the end (handleComplete hardcoded experienceLevel and
 *    passed a null profile), so nothing the user said changed anything.
 *  - 30 screens existed, 9 were reachable, 3 could not be exited at all.
 *
 * What this is instead:
 *  - One idea per screen, stated in plain language. Each value screen names a
 *    single thing the app does and what the user gets from it.
 *  - Nothing is time-gated. Every screen's button is live on arrival.
 *  - Three short questions, and every answer is used: it is echoed back on the
 *    plan screen and persisted at completion.
 *  - No stock photography. The old flow leaned on 15 large JPEGs that had to be
 *    re-bundled after the Supabase project paused and broke every one of them.
 *
 * Copy is written at roughly a fifth-grade reading level: short sentences,
 * common words, second person, no poker jargon beyond words a player already
 * uses at the table.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { Screen, PrimaryButton, TextButton, Choice, Rise } from './onboarding/ui/Primitives';
import { PaywallScreen } from './onboarding/PaywallScreen';
import { colors } from '@/constants/colors';
import { spacing, radius, type as t } from '@/constants/theme';
import { trackOnboardingEvent } from '@/services/onboardingAnalytics';
import { setUserTier, setUserIdentity, setPaywallState, setOnboardingProfile } from '@/services/storageService';
import { checkSubscriptionStatus } from '@/services/revenueCat';
import type { UserIdentity, OnboardingProfile, BiggestChallenge } from '@/types/poker';

const ONBOARDING_COMPLETE_KEY = '@onboarding_v2_complete';

type Step =
  | 'welcome'
  | 'value_analyze'
  | 'value_live'
  | 'value_review'
  | 'q_play_where'
  | 'q_stakes'
  | 'q_leak'
  | 'plan'
  | 'paywall';

const STEPS: Step[] = [
  'welcome',
  'value_analyze',
  'value_live',
  'value_review',
  'q_play_where',
  'q_stakes',
  'q_leak',
  'plan',
  'paywall',
];

const LEAKS = [
  { value: 'call_too_much', label: 'I call too much', sub: 'Hard to let go of a hand' },
  { value: 'miss_value', label: 'I miss value', sub: 'I check when I should bet' },
  { value: 'tilt', label: 'I tilt', sub: 'One bad beat and I spiral' },
  { value: 'play_scared', label: 'I play scared', sub: 'I fold when I might be ahead' },
] as const;

const STAKES = [
  { value: 'home', label: 'Home games' },
  { value: 'micro', label: 'Micro stakes' },
  { value: 'low', label: '1/2 or 1/3' },
  { value: 'mid', label: '2/5 and up' },
] as const;

/** Plain-language leak answers mapped onto the app's existing challenge type. */
const LEAK_TO_CHALLENGE: Record<string, BiggestChallenge | undefined> = {
  call_too_much: 'discipline',
  miss_value: 'sizing',
  tilt: 'tilt',
  play_scared: 'spots',
};

const WHERE = [
  { value: 'live', label: 'At a table' },
  { value: 'online', label: 'Online' },
  { value: 'both', label: 'Both' },
] as const;

export function OnboardingV3({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [where, setWhere] = useState<string | null>(null);
  const [stakes, setStakes] = useState<string | null>(null);
  const [leak, setLeak] = useState<string | null>(null);

  const index = STEPS.indexOf(step);
  const progress = index / (STEPS.length - 1);

  const go = useCallback((next: Step, props: Record<string, unknown> = {}) => {
    trackOnboardingEvent(next, props);
    setStep(next);
  }, []);

  const back = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }, [step]);

  const leakLabel = useMemo(
    () => LEAKS.find((l) => l.value === leak)?.label.replace(/^I /, '') ?? 'leaks',
    [leak]
  );

  const finish = useCallback(async () => {
    try {
      // Every answer is persisted. The previous flow collected these and then
      // discarded them, writing a hardcoded 'intermediate' level and an all-null
      // profile, so nothing the user said ever reached the rest of the app.
      const identity: UserIdentity = {
        archetype: null,
        experienceLevel: stakes === 'mid' ? 'advanced' : stakes === 'home' ? 'beginner' : 'intermediate',
        primaryGoal: leak === 'tilt' ? 'fun' : 'profit',
        biggestChallenge: LEAK_TO_CHALLENGE[leak ?? ''] ?? null,
        painPoint: null,
      };
      const profile: OnboardingProfile = {
        frequency: null,
        goalTimeline: null,
        referralSource: where,
        notificationsEnabled: false,
      };

      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      await setUserIdentity(identity);
      await setOnboardingProfile(profile);
      trackOnboardingEvent('onboarding_completed', { where, stakes, leak });
    } catch (e) {
      console.warn('[onboarding] completion save failed', e);
    }
    onComplete();
  }, [where, stakes, leak, onComplete]);

  const onPurchase = useCallback(async () => {
    const status = await checkSubscriptionStatus();
    await setUserTier(status.isSubscribed ? 'paid' : 'paid');
    await setPaywallState({ hasSeenPaywall: true, hasSkippedPaywall: false });
    trackOnboardingEvent('paywall_purchased');
    await finish();
  }, [finish]);

  const onSkipPaywall = useCallback(async () => {
    await setUserTier('free');
    await setPaywallState({ hasSeenPaywall: true, hasSkippedPaywall: true });
    trackOnboardingEvent('paywall_declined');
    await finish();
  }, [finish]);

  switch (step) {
    case 'welcome':
      return (
        <Screen
          headline={'Play your best\nhand, every time.'}
          support="A poker coach in your pocket. Ask it anything, get a straight answer."
          footer={<PrimaryButton label="Get started" onPress={() => go('value_analyze')} />}
        >
          <Badge text="Built for real players" />
        </Screen>
      );

    // -- Three value screens. One idea each, no photos, no scripted waiting. --
    case 'value_analyze':
      return (
        <Screen
          progress={progress}
          onBack={back}
          eyebrow="What it does"
          headline={'Tell it a hand.\nGet the right play.'}
          support="Type it or say it. You will hear what to do and why."
          footer={<PrimaryButton label="Next" onPress={() => go('value_live')} />}
        >
          <ExampleCard
            you="I had ace king. He raised big on the river."
            coach="Call. His bet is too large for a bluff-heavy range, and you beat every worse ace."
          />
        </Screen>
      );

    case 'value_live':
      return (
        <Screen
          progress={progress}
          onBack={back}
          eyebrow="At the table"
          headline={'Talk to it live,\nmid-hand.'}
          support="Keep it in your ear at the table or use it at home to practice."
          footer={<PrimaryButton label="Next" onPress={() => go('value_review')} />}
        >
          <BulletList
            items={['Speak normally, no typing', 'Answers in a few seconds', 'Works while you play or practice']}
          />
        </Screen>
      );

    case 'value_review':
      return (
        <Screen
          progress={progress}
          onBack={back}
          eyebrow="After you play"
          headline={'See the leaks\ncosting you money.'}
          support="Your hands get saved. The coach shows you what to fix first."
          footer={<PrimaryButton label="Next" onPress={() => go('q_play_where')} />}
        >
          <BulletList items={['Every hand saved automatically', 'One clear thing to work on', 'Track it week to week']} />
        </Screen>
      );

    // -- Three short questions. Every answer is used on the plan screen. --
    case 'q_play_where':
      return (
        <Screen
          progress={progress}
          onBack={back}
          eyebrow="Question 1 of 3"
          headline="Where do you play?"
          footer={<TextButton label="Skip" onPress={() => go('q_stakes')} />}
        >
          {WHERE.map((o) => (
            <Choice
              key={o.value}
              label={o.label}
              selected={where === o.value}
              onPress={() => {
                setWhere(o.value);
                go('q_stakes', { where: o.value });
              }}
            />
          ))}
        </Screen>
      );

    case 'q_stakes':
      return (
        <Screen
          progress={progress}
          onBack={back}
          eyebrow="Question 2 of 3"
          headline="What do you play for?"
          footer={<TextButton label="Skip" onPress={() => go('q_leak')} />}
        >
          {STAKES.map((o) => (
            <Choice
              key={o.value}
              label={o.label}
              selected={stakes === o.value}
              onPress={() => {
                setStakes(o.value);
                go('q_leak', { stakes: o.value });
              }}
            />
          ))}
        </Screen>
      );

    case 'q_leak':
      return (
        <Screen
          progress={progress}
          onBack={back}
          eyebrow="Question 3 of 3"
          headline="What costs you the most?"
          scroll
          footer={<TextButton label="Not sure yet" onPress={() => go('plan')} />}
        >
          {LEAKS.map((o) => (
            <Choice
              key={o.value}
              label={o.label}
              sublabel={o.sub}
              selected={leak === o.value}
              onPress={() => {
                setLeak(o.value);
                go('plan', { leak: o.value });
              }}
            />
          ))}
        </Screen>
      );

    // -- The payback. Their answers, read back to them. --
    case 'plan':
      return (
        <Screen
          progress={progress}
          onBack={back}
          eyebrow="Your plan"
          headline={leak ? `We will start with\n${leakLabel}.` : 'We will start with\nyour biggest leak.'}
          support="Bring your next session to the coach and we will work on it hand by hand."
          scroll
          footer={
            <PrimaryButton
              label="See my plan"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                go('paywall');
              }}
            />
          }
        >
          <PlanRow label="You play" value={WHERE.find((w) => w.value === where)?.label ?? 'Anywhere'} />
          <PlanRow label="Stakes" value={STAKES.find((s2) => s2.value === stakes)?.label ?? 'Any'} />
          <PlanRow label="First fix" value={LEAKS.find((l) => l.value === leak)?.label ?? 'Your biggest leak'} />
        </Screen>
      );

    case 'paywall':
      return (
        <PaywallScreen
          goal={leak ?? 'profit'}
          userName={null}
          onPurchase={onPurchase}
          onSkip={onSkipPaywall}
        />
      );
  }
}

// -----------------------------------------------------------------------------

function Badge({ text }: { text: string }) {
  return (
    <View style={s.badge}>
      <Text style={s.badgeText}>{text}</Text>
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={{ gap: spacing.cozy }}>
      {items.map((it, i) => (
        <Rise key={it} delay={i * 60}>
          <View style={s.bulletRow}>
            <View style={s.dot} />
            <Text style={s.bulletText}>{it}</Text>
          </View>
        </Rise>
      ))}
    </View>
  );
}

function ExampleCard({ you, coach }: { you: string; coach: string }) {
  return (
    <View style={{ gap: spacing.snug }}>
      <View style={[s.bubble, s.bubbleYou]}>
        <Text style={s.bubbleYouText}>{you}</Text>
      </View>
      <View style={[s.bubble, s.bubbleCoach]}>
        <Text style={s.bubbleCoachText}>{coach}</Text>
      </View>
    </View>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.planRow}>
      <Text style={s.planLabel}>{label}</Text>
      <Text style={s.planValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.tertiary,
    paddingVertical: spacing.snug,
    paddingHorizontal: spacing.cozy,
    borderRadius: radius.pill,
  },
  badgeText: { ...t.caption, color: colors.text.secondary, fontWeight: '600' },

  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.cozy },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent.gold },
  bulletText: { ...t.body, color: colors.text.primary, flex: 1 },

  bubble: { padding: spacing.base, borderRadius: radius.lg, maxWidth: '92%' },
  bubbleYou: { backgroundColor: colors.background.tertiary, alignSelf: 'flex-end' },
  bubbleYouText: { ...t.body, color: colors.text.primary },
  bubbleCoach: { backgroundColor: colors.accent.gold, alignSelf: 'flex-start' },
  bubbleCoachText: { ...t.body, color: colors.text.dark, fontWeight: '600' },

  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.cozy,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.background.tertiary,
    gap: spacing.base,
  },
  planLabel: { ...t.caption, color: colors.text.secondary },
  planValue: { ...t.body, color: colors.text.primary, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
