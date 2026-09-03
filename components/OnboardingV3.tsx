/**
 * Onboarding, rebuilt around one worked hand.
 *
 * The flow this replaces reached the paywall reliably -- 89% of everyone who
 * started it got there -- and sold almost nobody, because it spent eleven
 * screens describing a coach the player never met. Of the first four buyers,
 * three never saw the coach do anything at all, and two of thirty-seven devices
 * ever opened the app a second time.
 *
 * So the order is inverted. The coach answers a real hand before it asks the
 * player for anything, and the screens that only made claims are gone:
 *
 *   welcome -> example -> try_hand -> (questions) -> notify -> paywall
 *
 * Three rules hold this together:
 *
 *  1. Show, never describe. 'value_analyze' and 'value_review' asserted what
 *     the app does; the example screen spends one exchange doing it.
 *  2. The player acts. Nothing plays at them and nothing is time-gated --
 *     watching a demonstration measurably raises how hard people rate the task
 *     afterwards, while doing one lands.
 *  3. No theater. 'building' and 'dealing' were a progress bar over work that
 *     does not exist, and a wait that personalises nothing costs attention and
 *     returns none.
 *
 * Copy is written at roughly a fifth-grade reading level: short sentences,
 * common words, second person, no poker jargon beyond words a player already
 * uses at the table.
 */

import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Screen, PrimaryButton, TextButton, Choice } from './onboarding/ui/Primitives';
import { WelcomeVisual, QuestionVisual } from './onboarding/ui/Visuals';
import { PaywallV2 } from './onboarding/PaywallV2';
import { TryHandFlow, TryHandNotify, type TryHandResult } from './onboarding/TryHandScreens';
import type { ParsedHand } from '@/services/handAnalysis';
import { trackOnboardingEvent } from '@/services/onboardingAnalytics';
import { setUserTier, setUserIdentity, setPaywallState, setOnboardingProfile } from '@/services/storageService';
import { ExampleHand } from './onboarding/ExampleHand';
import { checkSubscriptionStatus } from '@/services/revenueCat';
import type { UserIdentity, OnboardingProfile, BiggestChallenge } from '@/types/poker';

const ONBOARDING_COMPLETE_KEY = '@onboarding_v2_complete';

type Step =
  | 'welcome'
  | 'value_live'
  | 'try_hand'
  | 'q_play_where'
  | 'q_leak'
  | 'notify'
  | 'paywall';

/**
 * The flow, after cutting everything that talked instead of showing.
 *
 * The profile questions sit behind the payoff (progressive profiling). Both of
 * this app's early paying trials skipped them, so asking first spent real
 * screens on data neither payer gave. Stakes is asked inside the try-it flow,
 * where the reason for asking is self-evident.
 *
 * 'building' and 'dealing' were a progress bar over work that does not exist --
 * a wait that personalises nothing costs attention and returns none. 'plan' and
 * 'results' presented a plan assembled from three taps as if it were a
 * diagnosis; the coach reading a real hand is the stronger version of the same
 * promise, and it now happens before any of this. 'q_leak' survives only as a
 * fallback inside the try flow, for players we could not read a hand from.
 *
 * Eleven screens to six on the longest path.
 */
const STEPS: Step[] = [
  'welcome',
  'value_live',
  'try_hand',
  'q_play_where',
  'q_leak',
  'notify',
  'paywall',
];

const LEAKS = [
  { value: 'call_too_much', label: 'I call too much', sub: 'Hard to let go of a hand' },
  { value: 'miss_value', label: 'I miss value', sub: 'I check when I should bet' },
  { value: 'tilt', label: 'I tilt', sub: 'One bad beat and I spiral' },
  { value: 'play_scared', label: 'I play scared', sub: 'I fold when I might be ahead' },
] as const;

/**
 * Human label for the leak, for the notification screen.
 *
 * The try-hand flow derives this from the analysed hand; on the skip path there
 * is no hand, so fall back to the leak the player picked and finally to
 * something neutral rather than rendering a raw enum value.
 */
function describeLeakLabel(value: string | null | undefined): string {
  const match = LEAKS.find((l) => l.value === value);
  if (match) return match.label.replace(/^I /, 'You ');
  return 'the leak in your plan';
}

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

/**
 * Read the leak straight out of the verdict.
 *
 * Maps onto the same four values q_leak offers, so everything downstream --
 * planAnalysis, LEAK_TO_CHALLENGE, the saved identity -- is unchanged and does
 * not care whether the answer came from a tap or from the hand itself.
 *
 * Returns null when the verdict is too thin to infer from; the question is
 * then still asked.
 */
function deriveLeak(parsed: ParsedHand | null): string | null {
  const action = parsed?.analysis?.recommendedAction?.toLowerCase();
  if (!action) return null;

  // They called (or asked about calling) somewhere the read says fold.
  if (action.includes('fold')) return 'call_too_much';
  // The read wants more money in the pot than they put in.
  if (action.includes('raise') || action.includes('bet')) return 'miss_value';
  // A call being correct means they were considering folding a hand that plays.
  if (action.includes('call')) return 'play_scared';

  return null;
}

export function OnboardingV3({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  // Pre-selected with the most common answer for each question. A user who taps
  // Continue without changing anything still lands on a real analysis instead of
  // the generic fallback, and anyone who disagrees just taps a different option.
  // Skipping is still possible; these are defaults, not answers on their behalf.
  const [where, setWhere] = useState<string | null>('live');
  const [stakes, setStakes] = useState<string | null>('low');
  const [leak, setLeak] = useState<string | null>('call_too_much');
  // Outcome of the try-it sequence. Null when the player skipped it, the mic was
  // denied, or the model could not read what they said — all of which are normal
  // paths, not errors, and all of which continue to the plan.
  const [tryResult, setTryResult] = useState<TryHandResult | null>(null);

  const index = STEPS.indexOf(step);
  const progress = index / (STEPS.length - 1);

  // When a hand was actually read, the app has already diagnosed the leak and
  // asking "what costs you the most?" is backwards -- people download this
  // BECAUSE they do not know. The question only survives as a fallback for the
  // players we could not read a hand from.
  const leakFromHand = deriveLeak(tryResult?.parsed ?? null);
  const afterWhere: Step = leakFromHand ? 'notify' : 'q_leak';

  // The first screen is never a transition target, so tracking only inside go()
  // left 'welcome' permanently at zero and made every later step look like 100%
  // of a funnel that had no top.
  useEffect(() => {
    // flow:2 splits this cohort from the pre-try-it funnel. An OTA does not
    // change app_version, so both flows report 1.1.0, and several event names
    // (value_live, q_play_where) now sit at different positions. Without this
    // the two funnels average together and neither is readable.
    trackOnboardingEvent('welcome', { flow: 2 });
    // Mirrored into storage so RevenueCat can tag the customer with the flow
    // they actually saw, rather than assuming the current one.
    AsyncStorage.setItem('@onboarding_flow', '2').catch(() => {});
  }, []);

  const go = useCallback(
    (next: Step, props: Record<string, unknown> = {}) => {
      // Nobody is asked for notifications twice. The try-hand flow ends with
      // the same prompt, so a player who granted (or refused) it there walks
      // straight past this one. Centralised here rather than at each call site
      // into 'notify' -- there are several, and one that forgot would ask again.
      if (next === 'notify' && tryResult) {
        trackOnboardingEvent('paywall', { ...props, notifySkipped: true });
        setStep('paywall');
        return;
      }
      trackOnboardingEvent(next, props);
      setStep(next);
    },
    [tryResult]
  );

  const back = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i <= 0) return;
    let prev = STEPS[i - 1];
    // 'notify' is skipped forward for anyone who already enabled notifications
    // in the try-hand flow; stepping back into it would ask again.
    if (prev === 'notify' && tryResult?.notificationsEnabled && i - 2 >= 0) {
      prev = STEPS[i - 2];
    }
    setStep(prev);
  }, [step, tryResult]);

  const finish = useCallback(async () => {
    try {
      // Every answer is persisted. The previous flow collected these and then
      // discarded them, writing a hardcoded 'intermediate' level and an all-null
      // profile, so nothing the user said ever reached the rest of the app.
      const identity: UserIdentity = {
        archetype: null,
        experienceLevel: stakes === 'mid' ? 'advanced' : stakes === 'home' ? 'beginner' : 'intermediate',
        primaryGoal: (leakFromHand ?? leak) === 'tilt' ? 'fun' : 'profit',
        biggestChallenge: LEAK_TO_CHALLENGE[(leakFromHand ?? leak) ?? ''] ?? null,
        painPoint: null,
      };
      const profile: OnboardingProfile = {
        frequency: null,
        goalTimeline: null,
        referralSource: where,
        // Carries the real answer now. This was hardcoded false, so the profile
        // recorded a decision the player was never actually asked to make.
        notificationsEnabled: tryResult?.notificationsEnabled ?? false,
      };

      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      // Release the Settings override so the flow does not reappear next launch.
      await AsyncStorage.removeItem('@force_onboarding');
      await setUserIdentity(identity);
      await setOnboardingProfile(profile);
      trackOnboardingEvent('onboarding_completed', { where, stakes, leak });
    } catch (e) {
      console.warn('[onboarding] completion save failed', e);
    }
    onComplete();
  }, [where, stakes, leak, leakFromHand, onComplete, tryResult]);

  /**
   * Request the push token from the main flow.
   *
   * Mirrors the try-hand version, but records the result on state rather than
   * on the TryHandResult, since there may be no hand on this path. A denial is
   * recorded and the player moves on -- the prompt is never repeated.
   */
  const onEnableNotifications = useCallback(async () => {
    trackOnboardingEvent('notif_prompt_accepted', { source: 'main_flow' });
    try {
      const { requestAndRegisterPushToken } = await import('@/services/notificationService');
      const granted = await requestAndRegisterPushToken();
      trackOnboardingEvent('notif_permission_result', { granted, source: 'main_flow' });
      setTryResult((prev) =>
        prev
          ? { ...prev, notificationsEnabled: granted }
          : { parsed: null, stakes: null, notificationsEnabled: granted }
      );
    } catch {
      // A failed token is a missed re-engagement, not something to surface
      // mid-onboarding.
    }
    go('paywall');
  }, [go]);

  const onPurchase = useCallback(async () => {
    // Trust the entitlement, not the fact that the sheet closed. Both arms of
    // this used to be 'paid', which marked anyone who reached the store as a
    // subscriber even when the purchase never granted the entitlement.
    const status = await checkSubscriptionStatus();
    await setUserTier(status.isSubscribed ? 'paid' : 'free');
    await setPaywallState({ hasSeenPaywall: true, hasSkippedPaywall: false });
    trackOnboardingEvent('paywall_purchased', {
      entitled: status.isSubscribed,
      trial: status.isInTrial,
    });
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
          headline={'Stop guessing\nat the table.'}
          reveal
          accent={['guessing']}
          support="Know the right play, every hand."
          footer={<PrimaryButton label="Get started" onPress={() => go('value_live')} />}
        >
          <WelcomeVisual />
        </Screen>
      );

    // -- One worked exchange, advanced by the player. It does not describe the
    //    coach, it runs one turn of it, which is the thing the old value
    //    screens were only claiming. See ExampleHand.tsx. --
    case 'value_live':
      return (
        <ExampleHand
          progress={progress}
          onBack={back}
          onDone={() => go('try_hand')}
        />
      );

    // -- The player uses the product. Five sub-screens, all failures fall
    //    forward to the questions. See TryHandScreens.tsx. --
    case 'try_hand':
      return (
        <TryHandFlow
          onDone={(r) => {
            setTryResult(r);
            // Stakes answered inside the try flow is the real answer; keep the
            // default rather than overwriting it with null when they skipped.
            if (r.stakes) setStakes(r.stakes);
            go('q_play_where', {
              gotVerdict: !!r.parsed,
              notificationsEnabled: r.notificationsEnabled,
            });
          }}
        />
      );

    // -- Three short questions. Every answer is used on the plan screen. --
    case 'q_play_where':
      return (
        <Screen
          progress={progress}
          onBack={back}
          headline="Where do you play?"
          footer={
            <>
              <PrimaryButton label="Continue" onPress={() => go(afterWhere, { where })} />
              <TextButton
                label="Skip"
                onPress={() => {
                  setWhere(null);
                  go(afterWhere, { skipped: true });
                }}
              />
            </>
          }
        >
          <QuestionVisual n={1} />
          {WHERE.map((o) => (
            <Choice
              key={o.value}
              label={o.label}
              selected={where === o.value}
              onPress={() => setWhere(o.value)}
            />
          ))}
        </Screen>
      );

    case 'q_leak':
      return (
        <Screen
          progress={progress}
          onBack={back}
          headline="What costs you the most?"
          scroll
          footer={
            <>
              <PrimaryButton label="Continue" onPress={() => go('notify', { leak })} />
              <TextButton
                label="Not sure yet"
                onPress={() => {
                  setLeak(null);
                  go('notify', { skipped: true });
                }}
              />
            </>
          }
        >
          <QuestionVisual n={3} />
          {LEAKS.map((o) => (
            <Choice
              key={o.value}
              label={o.label}
              sublabel={o.sub}
              selected={leak === o.value}
              onPress={() => setLeak(o.value)}
            />
          ))}
        </Screen>
      );

    // -- Ask for notifications on a path everyone walks.
    //
    //    This prompt used to live only at the end of the try-hand flow, so it
    //    was reached solely by players who recorded a hand, got a verdict and
    //    tapped through. Everyone who skipped the hand -- the majority, by the
    //    event log -- arrived at the paywall with no push token, which made
    //    them permanently unreachable: the day-two follow-up selects on
    //    expo_push_token, so it can never see them. The trials most likely to
    //    lapse were exactly the ones nothing could be sent to.
    //
    //    Anyone who already enabled inside the try-hand flow skips straight
    //    past, so nobody is asked twice. --
    case 'notify':
      return (
        <TryHandNotify
          leakLabel={describeLeakLabel(leakFromHand ?? leak)}
          // A leak derived from an actual hand is the only case where the
          // coach has something of theirs to keep working on. A leak they
          // merely tapped in q_leak is not the same claim, so those players
          // get the daily-hand offer instead.
          hasHand={!!leakFromHand}
          onEnable={onEnableNotifications}
          onSkip={() => {
            trackOnboardingEvent('notif_prompt_declined');
            go('paywall');
          }}
        />
      );

    case 'paywall':
      return (
        <PaywallV2 goal={leak} onPurchase={onPurchase} onSkip={onSkipPaywall} />
      );
  }
}
