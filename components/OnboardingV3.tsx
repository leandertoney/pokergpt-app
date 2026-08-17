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
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { Screen, PrimaryButton, TextButton, Choice } from './onboarding/ui/Primitives';
import { buildPlanAnalysis } from './onboarding/planAnalysis';
import {
  AnalysisVisual,
  BuildingSteps,
  WelcomeVisual,
  AnalyzeVisual,
  LiveVisual,
  ReviewVisual,
  QuestionVisual,
  PlanVisual,
} from './onboarding/ui/Visuals';
import { PaywallV2 } from './onboarding/PaywallV2';
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
  | 'building'
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
  'building',
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

  // The first screen is never a transition target, so tracking only inside go()
  // left 'welcome' permanently at zero and made every later step look like 100%
  // of a funnel that had no top.
  useEffect(() => {
    trackOnboardingEvent('welcome');
  }, []);

  const go = useCallback((next: Step, props: Record<string, unknown> = {}) => {
    trackOnboardingEvent(next, props);
    setStep(next);
  }, []);

  const back = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }, [step]);

  // A synthesised read of the three answers, not a receipt of the taps. 48
  // combinations produce genuinely different text — see planAnalysis.ts.
  const analysis = useMemo(
    () => buildPlanAnalysis(where as any, stakes as any, leak as any),
    [where, stakes, leak]
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
          headline={'Stop guessing\nat the table.'}
          reveal
          accent={['guessing']}
          support="Know the right play, every hand."
          footer={<PrimaryButton label="Get started" onPress={() => go('value_analyze')} />}
        >
          <WelcomeVisual />
        </Screen>
      );

    // -- Three value screens. One idea each, no photos, no scripted waiting. --
    case 'value_analyze':
      return (
        <Screen
          progress={progress}
          onBack={back}
          headline={'Call or fold?\nKnow in seconds.'}
          reveal
          accent={['call', 'fold']}
          support="Say what happened. Get the play and the reason."
          footer={<PrimaryButton label="Next" onPress={() => go('value_live')} />}
        >
          <AnalyzeVisual />
        </Screen>
      );

    case 'value_live':
      return (
        <Screen
          progress={progress}
          onBack={back}
          headline={'Ask out loud,\nmid-hand.'}
          reveal
          accent={['loud', 'mid-hand']}
          support="Use it live at the table or at home."
          footer={<PrimaryButton label="Next" onPress={() => go('value_review')} />}
        >
          <LiveVisual />
        </Screen>
      );

    case 'value_review':
      return (
        <Screen
          progress={progress}
          onBack={back}
          headline={'Plug the leak\ndraining your stack.'}
          reveal
          accent={['leak', 'draining']}
          support="Every hand is saved. You get one thing to fix first."
          footer={<PrimaryButton label="Next" onPress={() => go('q_play_where')} />}
        >
          <ReviewVisual />
        </Screen>
      );

    // -- Three short questions. Every answer is used on the plan screen. --
    case 'q_play_where':
      return (
        <Screen
          progress={progress}
          onBack={back}
          headline="Where do you play?"
          footer={<TextButton label="Skip" onPress={() => go('q_stakes')} />}
        >
          <QuestionVisual n={1} />
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
          headline="What do you play for?"
          footer={<TextButton label="Skip" onPress={() => go('q_leak')} />}
        >
          <QuestionVisual n={2} />
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
          headline="What costs you the most?"
          scroll
          footer={<TextButton label="Not sure yet" onPress={() => go('building')} />}
        >
          <QuestionVisual n={3} />
          {LEAKS.map((o) => (
            <Choice
              key={o.value}
              label={o.label}
              sublabel={o.sub}
              selected={leak === o.value}
              onPress={() => {
                setLeak(o.value);
                go('building', { leak: o.value });
              }}
            />
          ))}
        </Screen>
      );

    // -- The payback. Their answers, read back to them. --
    case 'building':
      return (
        <BuildingScreen
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
          headline={'Here is what\nwe found.'}
          reveal
          accent={['found.']}
          scroll
          footer={
            <PrimaryButton
              label="Start playing better"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                go('paywall');
              }}
            />
          }
        >
          <AnalysisVisual
            profile={analysis.profile}
            diagnosis={analysis.diagnosis}
            outcome={analysis.outcome}
            thirtyDay={analysis.thirtyDay}
          />
        </Screen>
      );

    case 'paywall':
      return (
        <PaywallV2 goal={leak} onPurchase={onPurchase} onSkip={onSkipPaywall} />
      );
  }
}

// -----------------------------------------------------------------------------





const s = StyleSheet.create({



});

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
function BuildingScreen({ stakesLabel, onDone }: { stakesLabel: string; onDone: () => void }) {
  const steps = useMemo(
    () => [
      'Reading your answers',
      `Comparing players at ${stakesLabel.toLowerCase()}`,
      'Building your plan',
    ],
    [stakesLabel]
  );
  const [step, setStep] = useState(0);

  useEffect(() => {
    const a = setTimeout(() => setStep(1), 800);
    const b = setTimeout(() => setStep(2), 1600);
    const done = setTimeout(onDone, 2400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <Screen headline={'Customizing\nyour plan.'} reveal accent={['Customizing']}>
      <BuildingSteps steps={steps} active={step} />
    </Screen>
  );
}
