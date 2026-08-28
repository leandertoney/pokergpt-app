import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Onboarding screens
import { PainPointScreen } from './onboarding/PainPointScreen';
import { HookScreen } from './onboarding/HookScreen';
import { SkillLevelScreen } from './onboarding/SkillLevelScreen';
import { AccomplishScreen } from './onboarding/AccomplishScreen';
import { ComparisonScreen } from './onboarding/ComparisonScreen';
import { ChatDemoScreen } from './onboarding/ChatDemoScreen';
import { GoalTimelineScreen } from './onboarding/GoalTimelineScreen';
import { PotentialScreen } from './onboarding/PotentialScreen';
import { PaywallScreen } from './onboarding/PaywallScreen';

import { setUserTier, setUserIdentity, setUserDisplayName, setPaywallState, setOnboardingProfile } from '@/services/storageService';
import { updateUserIdentity as syncUserIdentityToSupabase, getOrCreateUser } from '@/services/supabaseStorage';
import { checkSubscriptionStatus } from '@/services/revenueCat';
import { withTimeout } from '@/utils/withTimeout';
import { colors } from '@/constants/colors';
import type { UserIdentity, PainPoint, OnboardingProfile, ExperienceLevel } from '@/types/poker';

const ONBOARDING_COMPLETE_KEY = '@onboarding_v2_complete';

// All possible steps in the onboarding flow
type OnboardingStep =
  | 'hook'
  | 'painPoint'
  | 'skillLevel'
  | 'accomplish'
  | 'comparison'
  | 'chatDemo'
  | 'goalTimeline'
  | 'potential'
  | 'paywall';

type OnboardingV2Props = {
  onComplete: () => void;
};

// All steps in order for progress calculation.
//
// Outcome-based sequence: every question states the outcome it buys, and each
// phase ends by handing something back that was built from the user's answers.
// The previous flow asked four questions and used none of them (the paywall was
// hardcoded to goal='profit'), then ran five consecutive scripted demos.
const ALL_STEPS: OnboardingStep[] = [
  // PHASE 1: THEIR SITUATION — three questions, each one used later
  'hook', 'painPoint', 'skillLevel', 'accomplish',
  // PHASE 2: PAY IT BACK — results assembled from those answers
  'comparison', 'chatDemo',
  // PHASE 3: CLOSE ON THEIR GOAL
  'goalTimeline', 'potential', 'paywall',
];

// DEV ONLY: Set to any step name to jump straight there (e.g. 'paywall', 'primingTwo')
// Set to null for normal flow. Ignored in production builds.
const DEV_START_STEP: OnboardingStep | null = __DEV__ ? null : null;

export function OnboardingV2({ onComplete }: OnboardingV2Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<OnboardingStep>(DEV_START_STEP ?? 'hook');
  const [stepHistory, setStepHistory] = useState<OnboardingStep[]>([DEV_START_STEP ?? 'hook']);
  const [painPoint, setPainPoint] = useState<PainPoint | null>(null);
  // Answers collected in phase 1 and consumed by phases 2 and 3. These are what
  // make the flow outcome-based: comparison, potential and the paywall are all
  // rendered from these values rather than from hardcoded defaults.
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [goalTimeline, setGoalTimeline] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animate progress bar when step changes
  useEffect(() => {
    const stepIndex = ALL_STEPS.indexOf(step);
    const progress = stepIndex >= 0 ? (stepIndex + 1) / ALL_STEPS.length : 0;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const transitionTo = useCallback((nextStep: OnboardingStep) => {
    setStepHistory(prev => [...prev, nextStep]);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -40,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(40);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  // --- Handlers ---

  const handlePainPointComplete = (selectedPainPoint: PainPoint) => {
    setPainPoint(selectedPainPoint);
    transitionTo('skillLevel');
  };

  const handleSkillLevelComplete = (level: ExperienceLevel) => {
    setExperienceLevel(level);
    transitionTo('accomplish');
  };

  const handleAccomplishComplete = (selectedGoal: string) => {
    setGoal(selectedGoal);
    transitionTo('comparison');
  };

  const handleGoalTimelineComplete = (timeline: string) => {
    setGoalTimeline(timeline);
    transitionTo('potential');
  };

  const handlePaywallPurchase = async (planId: 'weekly' | 'yearly') => {
    console.log('User purchased plan:', planId);

    // Verify subscription status with RevenueCat
    const status = await checkSubscriptionStatus();

    if (status.isSubscribed) {
      await setUserTier('paid');
      await setPaywallState({ hasSeenPaywall: true, hasSkippedPaywall: false });
    } else {
      // Fallback - mark as paid if purchase callback was called
      await setUserTier('paid');
      await setPaywallState({ hasSeenPaywall: true, hasSkippedPaywall: false });
    }

    // The benefit summary used to live on a whatYouGet screen AFTER the paywall,
    // where it was too late to inform the decision. It is folded into the paywall
    // now, so purchasing or skipping ends onboarding directly.
    await handleComplete();
  };

  const handlePaywallSkip = async () => {
    await setUserTier('free');
    await setPaywallState({ hasSeenPaywall: true, hasSkippedPaywall: true });
    await handleComplete();
  };

  const handleComplete = async () => {
    try {
      // Map painPoint to primaryGoal
      const painPointToGoalMap: Record<string, UserIdentity['primaryGoal']> = {
        tilt: 'fun',
        leaks: 'profit',
        overwhelmed: 'improve',
        consistency: 'profit',
      };

      const identity: UserIdentity = {
        archetype: null,
        experienceLevel: 'intermediate', // Default since we removed the question
        primaryGoal: painPoint ? painPointToGoalMap[painPoint] : 'profit',
        biggestChallenge: null,
        painPoint: painPoint,
      };

      // Save onboarding profile with minimal data
      const profile: OnboardingProfile = {
        frequency: null,
        goalTimeline: null,
        referralSource: null,
        notificationsEnabled: false,
      };

      // Save to local storage
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      await setUserTier('free');
      await setUserIdentity(identity);
      await setUserDisplayName(null); // No name collected in streamlined flow
      await setOnboardingProfile(profile);

      // Sync to Supabase (gracefully fails if offline)
      try {
        await getOrCreateUser();
        await syncUserIdentityToSupabase(identity);
      } catch {
        // Silent - app works offline, will sync later
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Error during onboarding completion:', error);
    }

    // Always call onComplete to exit onboarding, even if storage failed
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      // PHASE 1: THEIR SITUATION — three questions, every answer used later
      case 'hook':
        return <HookScreen onNext={() => transitionTo('painPoint')} />;

      case 'painPoint':
        return <PainPointScreen onComplete={handlePainPointComplete} />;

      case 'skillLevel':
        return <SkillLevelScreen onComplete={handleSkillLevelComplete} />;

      case 'accomplish':
        return <AccomplishScreen onComplete={handleAccomplishComplete} />;

      // PHASE 2: PAY IT BACK — results built from the answers above
      case 'comparison':
        return <ComparisonScreen onNext={() => transitionTo('chatDemo')} />;

      // The one demo worth keeping: they ask about a hand themselves.
      case 'chatDemo':
        return <ChatDemoScreen onNext={() => transitionTo('goalTimeline')} />;

      // PHASE 3: CLOSE ON THEIR GOAL
      case 'goalTimeline':
        return <GoalTimelineScreen onComplete={handleGoalTimelineComplete} />;

      case 'potential':
        return (
          <PotentialScreen
            userName={null}
            experienceLevel={experienceLevel ?? 'intermediate'}
            frequency={null}
            goal={goal ?? 'profit'}
            goalTimeline={goalTimeline}
            onNext={() => transitionTo('paywall')}
          />
        );

      case 'paywall':
        return (
          <PaywallScreen
            goal={goal ?? 'profit'}
            userName={null}
            onPurchase={handlePaywallPurchase}
            onSkip={handlePaywallSkip}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.primary, colors.background.primary, colors.background.primary]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        {/* Persistent thin progress bar */}
        {(
          <View style={[styles.progressContainer, { paddingTop: insets.top + 8 }]}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        )}

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {renderStep()}
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

// Exports
export async function checkOnboardingComplete(isAuthenticated: boolean = false): Promise<boolean> {
  // Force the flow open, ahead of every other check including the subscription
  // short-circuit below.
  //
  // A subscribed device can otherwise never see onboarding: the RevenueCat
  // branch marks it complete and returns true, so Settings → Restart Onboarding
  // clears the flag and this immediately re-sets it. That leaves the owner of
  // the app unable to test the one flow every new user gets.
  //
  // Set from Settings → Restart Onboarding. Cleared when the flow completes.
  try {
    if ((await AsyncStorage.getItem('@force_onboarding')) === 'true') return false;
  } catch {
    // An unreadable store just means no override.
  }

  // Skip onboarding in development mode for faster iteration
  if (__DEV__) {
    const skipOnboarding = await AsyncStorage.getItem('@dev_skip_onboarding');
    if (skipOnboarding === 'true') return true;
  }

  // Check if user is already subscribed via RevenueCat - skip onboarding for subscribers
  try {
    const subscriptionStatus = await withTimeout(
      checkSubscriptionStatus(),
      5000,
      'checkOnboardingComplete subscription check'
    );
    if (subscriptionStatus.isSubscribed) {
      // Mark onboarding as complete and set user tier
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      await setUserTier('paid');
      return true;
    }
  } catch (error) {
    console.warn('Failed to check subscription status during onboarding check:', error);
    // Continue with normal flow if RevenueCat check fails or times out
  }

  // The stored completion flag is authoritative for everyone, signed in or not.
  //
  // This previously read `if (!isAuthenticated) return false;`, which threw the
  // flag away for guests and re-ran onboarding on every single launch. Someone
  // who never signs in could finish the flow dozens of times and still land
  // back at the welcome screen, because completion was written and then never
  // read.
  //
  // Gating a *feature* on sign-in is reasonable; gating the record of a
  // finished flow on it is not.
  try {
    const complete = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return complete === 'true';
  } catch {
    return false;
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    await AsyncStorage.removeItem('@dev_skip_onboarding');
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
}

// Dev helper: Call this once to skip onboarding in development
export async function devSkipOnboarding(): Promise<void> {
  if (__DEV__) {
    await AsyncStorage.setItem('@dev_skip_onboarding', 'true');
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    console.log('Dev: Onboarding will be skipped on next app load');
  }
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 4,
    zIndex: 10,
  } as ViewStyle,
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  } as ViewStyle,
  progressFill: {
    height: '100%',
    backgroundColor: colors.onboarding?.gold || colors.accent.gold,
    borderRadius: 1.5,
  } as ViewStyle,
  content: {
    flex: 1,
  } as ViewStyle,
});

export default OnboardingV2;
