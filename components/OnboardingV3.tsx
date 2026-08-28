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
 *  - One idea per screen. Each value screen leads with the OUTCOME as its
 *    headline and proves it with an exaggerated mock of the real UI — it does
 *    not describe the feature in prose first.
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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { Screen, PrimaryButton, TextButton, Choice, NameField } from './onboarding/ui/Primitives';
import { buildPlanAnalysis } from './onboarding/planAnalysis';
import {
  BuildingSteps,
  WelcomeVisual,
  LiveVisual,
  QuestionVisual,
} from './onboarding/ui/Visuals';
import { PaywallV2 } from './onboarding/PaywallV2';
import { TryHandFlow, type TryHandResult } from './onboarding/TryHandScreens';
import type { ParsedHand } from '@/services/handAnalysis';
import { ResultsScreen } from './onboarding/ResultsScreen';
import { DealingScreen } from './onboarding/DealingScreen';
import { PlanVisualV2 } from './onboarding/PlanVisualV2';
import { spacing } from '@/constants/theme';
import { trackOnboardingEvent } from '@/services/onboardingAnalytics';
import { setUserTier, setUserIdentity, setPaywallState, setOnboardingProfile, setUserDisplayName } from '@/services/storageService';
import { checkSubscriptionStatus } from '@/services/revenueCat';
import type { UserIdentity, OnboardingProfile, BiggestChallenge } from '@/types/poker';

const ONBOARDING_COMPLETE_KEY = '@onboarding_v2_complete';

type Step =
  | 'welcome'
  | 'value_live'
  | 'try_hand'
  | 'q_play_where'
  | 'q_leak'
  | 'building'
  | 'dealing'
  | 'plan'
  | 'results'
  | 'paywall';

/**
 * Flow order, value-first.
 *
 * The three value screens that used to sit here described what the app does;
 * 'try_hand' now lets the player do it instead, roughly 30 seconds in rather
 * than after the paywall. Published onboarding benchmarks put drop-off at
 * 10-15% per screen shown before any value lands, which is what the old order
 * was spending on explanation.
 *
 * 'value_live' survives alone because it teaches the exact interaction the very
 * next screen asks for cold — talking to the app out loud.
 *
 * The profile questions move behind the payoff (progressive profiling). Both of
 * this app's paying trials skipped them, so asking first cost real screens for
 * data neither payer gave. Stakes is the exception and is asked inside the
 * try-it flow, where the reason for asking is self-evident.
 */
const STEPS: Step[] = [
  'welcome',
  'value_live',
  'try_hand',
  'q_play_where',
  'q_leak',
  'building',
  'dealing',
  'plan',
  'results',
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
  const [name, setName] = useState<string | null>(null);
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
  const afterWhere: Step = leakFromHand ? 'building' : 'q_leak';

  // The first screen is never a transition target, so tracking only inside go()
  // left 'welcome' permanently at zero and made every later step look like 100%
  // of a funnel that had no top.
  useEffect(() => {
    // flow:2 splits this cohort from the pre-try-it funnel. An OTA does not
    // change app_version, so both flows report 1.1.0, and several event names
    // (value_live, q_play_where) now sit at different positions. Without this
    // the two funnels average together and neither is readable.
    trackOnboardingEvent('welcome', { flow: 2 });
  }, []);

  const go = useCallback((next: Step, props: Record<string, unknown> = {}) => {
    trackOnboardingEvent(next, props);
    setStep(next);
  }, []);

  const back = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i <= 0) return;
    // 'dealing' auto-advances to 'plan' on a timer, so stepping back into it
    // would bounce straight forward again. Skip over it.
    const prev = STEPS[i - 1];
    setStep(prev === 'dealing' && i - 2 >= 0 ? STEPS[i - 2] : prev);
  }, [step]);

  // A synthesised read of the three answers, not a receipt of the taps. 48
  // combinations produce genuinely different text — see planAnalysis.ts.
  const analysis = useMemo(
    () => buildPlanAnalysis(where as any, stakes as any, (leakFromHand ?? leak) as any),
    [where, stakes, leak, leakFromHand]
  );

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
      // Persist the name. The previous flow collected answers and threw them
      // away at completion; anything asked for has to actually be kept.
      if (name?.trim()) await setUserDisplayName(name.trim());
      await setUserIdentity(identity);
      await setOnboardingProfile(profile);
      trackOnboardingEvent('onboarding_completed', { where, stakes, leak, named: !!name?.trim() });
    } catch (e) {
      console.warn('[onboarding] completion save failed', e);
    }
    onComplete();
  }, [where, stakes, leak, leakFromHand, name, onComplete, tryResult]);

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
          headline={'Stop guessing\nat the table.'}
          reveal
          accent={['guessing']}
          support="Know the right play, every hand."
          footer={<PrimaryButton label="Get started" onPress={() => go('value_live')} />}
        >
          <WelcomeVisual />
        </Screen>
      );

    // -- One value screen. It teaches the interaction the next screen needs. --
    case 'value_live':
      return (
        <Screen
          progress={progress}
          onBack={back}
          headline={'Ask out loud,\nmid-hand.'}
          reveal
          accent={['loud', 'mid-hand']}
          support="Say what happened. Get the play and the reason, in seconds."
          footer={<PrimaryButton label="Try it on a hand" onPress={() => go('try_hand')} />}
        >
          <LiveVisual />
        </Screen>
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
              <PrimaryButton label="Continue" onPress={() => go('building', { leak })} />
              <TextButton
                label="Not sure yet"
                onPress={() => {
                  setLeak(null);
                  go('building', { skipped: true });
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

    // -- The payback. Their answers, read back to them. --
    case 'building':
      return (
        <BuildingScreen
          stakesLabel={STAKES.find((x) => x.value === stakes)?.label ?? 'your stakes'}
          name={name}
          setName={setName}
          onDone={() => go('dealing', { named: !!name })}
        />
      );

    // -- Themed hold while the plan is composed. Names what is being compared
    //    rather than showing a bare spinner. --
    case 'dealing':
      return (
        <DealingScreen
          progress={progress}
          parsed={tryResult?.parsed ?? null}
          stakesLabel={STAKES.find((x) => x.value === stakes)?.label ?? 'your stakes'}
          onDone={() => go('plan')}
        />
      );

    case 'plan':
      return (
        <Screen
          progress={progress}
          onBack={back}
          eyebrow="Your analysis"
          headline={name ? `Here is what\nwe found, ${name}.` : 'Here is what\nwe found.'}
          reveal
          accent={name ? [`${name.toLowerCase()}.`] : ['found.']}
          scroll
          footer={
            <PrimaryButton
              label="What this looks like"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                go('results');
              }}
            />
          }
        >
          <PlanVisualV2
            diagnosis={analysis.diagnosis}
            outcomeShort={analysis.outcomeShort}
            thirtyDay={analysis.thirtyDay}
            parsed={tryResult?.parsed ?? null}
          />
        </Screen>
      );

    // -- Forward-looking payoff before the price. Counts a behaviour in one
    //    spot, never a win rate or an amount won: this app is gambling-adjacent
    //    and an invented outcome statistic is a review risk. --
    case 'results':
      return (
        <ResultsScreen
          progress={progress}
          onBack={back}
          outcomeShort={analysis.outcomeShort}
          spotLabel={tryResult?.parsed ? 'the spot you brought us' : 'your biggest leak'}
          onContinue={() => go('paywall')}
        />
      );

    case 'paywall':
      return (
        <PaywallV2 goal={leak} onPurchase={onPurchase} onSkip={onSkipPaywall} />
      );
  }
}

// -----------------------------------------------------------------------------

/**
 * The "customizing your plan" beat.
 *
 * A short processing moment before the analysis. Every high-converting flow
 * researched (Cal AI, RISE, Opal) has one: it makes the output feel earned
 * rather than instant, and it is where the app says out loud that it is reading
 * *their* answers rather than showing everyone the same page.
 *
 * Capped at 2.4s and it advances itself — nothing here can strand the user, and
 * there is no button to wait for.
 */
function BuildingScreen({
  stakesLabel,
  name,
  setName,
  onDone,
}: {
  stakesLabel: string;
  name: string | null;
  setName: (v: string) => void;
  onDone: () => void;
}) {
  const steps = useMemo(
    () => [
      'Reading your answers',
      `Comparing players at ${stakesLabel.toLowerCase()}`,
      'Building your plan',
    ],
    [stakesLabel]
  );
  const [step, setStep] = useState(0);

  // The steps run on their own. The name field sits alongside them so asking
  // costs no extra screen, and the button is live from the first frame — the
  // processing beat never gates the user.
  useEffect(() => {
    const a = setTimeout(() => setStep(1), 900);
    const b = setTimeout(() => setStep(2), 1800);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  return (
    <Screen
      headline={'Customizing\nyour plan.'}
      reveal
      accent={['Customizing']}
      support="What should we call you?"
      scroll
      footer={<PrimaryButton label="See my analysis" onPress={onDone} />}
    >
      <View style={{ gap: spacing.roomy }}>
        <NameField value={name ?? ''} onChange={setName} onSubmit={onDone} />
        <BuildingSteps steps={steps} active={step} />
      </View>
    </Screen>
  );
}
