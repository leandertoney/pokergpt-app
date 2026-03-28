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
import { ValidationScreen } from './onboarding/ValidationScreen';
import { HookScreen } from './onboarding/HookScreen';
import { HeroScreen } from './onboarding/HeroScreen';
import { LiveDemoScreen } from './onboarding/LiveDemoScreen';
import { NameInputScreen } from './onboarding/NameInputScreen';
import { WhatYouGetScreen } from './onboarding/WhatYouGetScreen';
import { DailyReviewDemoScreen } from './onboarding/DailyReviewDemoScreen';
import { ChatDemoScreen } from './onboarding/ChatDemoScreen';
import { GoalSettingScreen } from './onboarding/GoalSettingScreen';
import { PaywallScreen } from './onboarding/PaywallScreen';
import { SkillLevelScreen } from './onboarding/SkillLevelScreen';
import { AnalysisResultScreen } from './onboarding/AnalysisResultScreen';
import { PrimingScreenOne } from './onboarding/PrimingScreenOne';
import { PrimingScreenTwo } from './onboarding/PrimingScreenTwo';
import { FrequencyScreen } from './onboarding/FrequencyScreen';
import { AccomplishScreen } from './onboarding/AccomplishScreen';
import { GoalTimelineScreen } from './onboarding/GoalTimelineScreen';
import { PotentialScreen } from './onboarding/PotentialScreen';
import { NotificationScreen } from './onboarding/NotificationScreen';
import { ReferralScreen } from './onboarding/ReferralScreen';

import { setUserTier, setUserIdentity, setUserDisplayName, setPaywallState, setGoalConfirmation, setOnboardingProfile } from '@/services/storageService';
import { updateUserIdentity as syncUserIdentityToSupabase, getOrCreateUser } from '@/services/supabaseStorage';
import { checkSubscriptionStatus } from '@/services/revenueCat';
import { withTimeout } from '@/utils/withTimeout';
import { colors } from '@/constants/colors';
import type { UserIdentity, ExperienceLevel, PainPoint, OnboardingProfile } from '@/types/poker';

const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

// All possible steps in the onboarding flow
type OnboardingStep =
  | 'hook'
  | 'hero'
  | 'painPoint'
  | 'validation'
  | 'chatDemo'
  | 'skillLevel'
  | 'liveDemo'
  | 'frequency'
  | 'analysisResult'
  | 'dailyReviewDemo'
  | 'name'
  | 'referral'
  | 'accomplish'
  | 'goalTimeline'
  | 'goalSetting'
  | 'potential'
  | 'notifications'
  | 'primingOne'
  | 'primingTwo'
  | 'paywall'
  | 'whatYouGet';

type OnboardingV2Props = {
  onComplete: () => void;
};

// All steps in order for progress calculation
const ALL_STEPS: OnboardingStep[] = [
  // PHASE 1: HOOK
  'hook', 'hero',
  // PHASE 2: IDENTIFY
  'painPoint', 'validation',
  // PHASE 3: DEMO + QUESTIONS (interleaved)
  'chatDemo', 'liveDemo', 'frequency',
  'analysisResult', 'skillLevel', 'dailyReviewDemo',
  // PHASE 4: PERSONALIZE
  'name', 'referral', 'accomplish', 'goalTimeline',
  // PHASE 5: COMMIT
  'goalSetting', 'potential',
  // PHASE 6: CONVERT
  'notifications', 'primingOne', 'primingTwo', 'paywall', 'whatYouGet',
];

// DEV ONLY: Set to any step name to jump straight there (e.g. 'paywall', 'primingTwo')
// Set to null for normal flow. Ignored in production builds.
const DEV_START_STEP: OnboardingStep | null = __DEV__ ? null : null;

export function OnboardingV2({ onComplete }: OnboardingV2Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<OnboardingStep>(DEV_START_STEP ?? 'hook');
  const [stepHistory, setStepHistory] = useState<OnboardingStep[]>([DEV_START_STEP ?? 'hook']);
  const [painPoint, setPainPoint] = useState<PainPoint | null>(null);
  const [goal, setGoal] = useState<string>('profit');
  const [userName, setUserName] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [frequency, setFrequency] = useState<string | null>(null);
  const [goalTimeline, setGoalTimeline] = useState<string | null>(null);
  const [referralSource, setReferralSource] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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
    transitionTo('validation');
  };

  const handleValidationComplete = () => {
    transitionTo('chatDemo');
  };

  const handleSkillLevelComplete = (level: ExperienceLevel) => {
    setExperienceLevel(level);
    transitionTo('dailyReviewDemo');
  };

  const handleFrequencyComplete = (selectedFrequency: string) => {
    setFrequency(selectedFrequency);
    transitionTo('analysisResult');
  };

  const handleNameComplete = (name: string | null) => {
    setUserName(name);
    transitionTo('referral');
  };

  const handleReferralComplete = (source: string) => {
    setReferralSource(source);
    transitionTo('accomplish');
  };

  const handleAccomplishComplete = (selectedGoal: string) => {
    setGoal(selectedGoal);
    transitionTo('goalTimeline');
  };

  const handleGoalTimelineComplete = (timeline: string) => {
    setGoalTimeline(timeline);
    transitionTo('goalSetting');
  };

  const handleGoalConfirmed = async (timestamp: number) => {
    await setGoalConfirmation({
      goal,
      userName,
      timestamp,
    });
    transitionTo('potential');
  };

  const handleNotificationComplete = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    transitionTo('primingOne');
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

    transitionTo('whatYouGet');
  };

  const handlePaywallSkip = async () => {
    await setUserTier('free');
    await setPaywallState({ hasSeenPaywall: true, hasSkippedPaywall: true });
    transitionTo('whatYouGet');
  };

  const handleComplete = async () => {
    try {
      // Map goal to primaryGoal
      const goalMap: Record<string, string> = {
        profit: 'profit',
        win: 'compete',
        learn: 'improve',
        confidence: 'fun',
      };

      const identity: UserIdentity = {
        archetype: null,
        experienceLevel: experienceLevel,
        primaryGoal: goalMap[goal] as UserIdentity['primaryGoal'],
        biggestChallenge: null,
        painPoint: painPoint,
      };

      // Save onboarding profile
      const profile: OnboardingProfile = {
        frequency,
        goalTimeline,
        referralSource,
        notificationsEnabled,
      };

      // Save to local storage
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      await setUserTier('free');
      await setUserIdentity(identity);
      await setUserDisplayName(userName);
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
      // PHASE 1: HOOK
      case 'hook':
        return <HookScreen onNext={() => transitionTo('hero')} />;

      case 'hero':
        return <HeroScreen onNext={() => transitionTo('painPoint')} />;

      // PHASE 2: IDENTIFY
      case 'painPoint':
        return <PainPointScreen onComplete={handlePainPointComplete} />;

      case 'validation':
        return (
          <ValidationScreen
            painPoint={painPoint!}
            onNext={handleValidationComplete}
          />
        );

      // PHASE 3: DEMO + QUESTIONS (interleaved)
      case 'chatDemo':
        return <ChatDemoScreen onNext={() => transitionTo('liveDemo')} />;

      case 'skillLevel':
        return <SkillLevelScreen onComplete={handleSkillLevelComplete} />;

      case 'liveDemo':
        return <LiveDemoScreen onNext={() => transitionTo('frequency')} />;

      case 'frequency':
        return <FrequencyScreen onComplete={handleFrequencyComplete} />;

      case 'analysisResult':
        return <AnalysisResultScreen onNext={() => transitionTo('skillLevel')} />;

      case 'dailyReviewDemo':
        return <DailyReviewDemoScreen onNext={() => transitionTo('name')} />;

      // PHASE 4: PERSONALIZE
      case 'name':
        return <NameInputScreen onComplete={handleNameComplete} />;

      case 'referral':
        return <ReferralScreen onComplete={handleReferralComplete} />;

      case 'accomplish':
        return <AccomplishScreen onComplete={handleAccomplishComplete} />;

      case 'goalTimeline':
        return <GoalTimelineScreen onComplete={handleGoalTimelineComplete} />;

      // PHASE 5: COMMIT
      case 'goalSetting':
        return (
          <GoalSettingScreen
            goal={goal}
            userName={userName}
            painPoint={painPoint}
            onComplete={handleGoalConfirmed}
          />
        );

      case 'potential':
        return (
          <PotentialScreen
            userName={userName}
            experienceLevel={experienceLevel}
            frequency={frequency}
            goal={goal}
            goalTimeline={goalTimeline}
            onNext={() => transitionTo('notifications')}
          />
        );

      // PHASE 6: CONVERT
      case 'notifications':
        return <NotificationScreen onComplete={handleNotificationComplete} />;

      case 'primingOne':
        return <PrimingScreenOne onNext={() => transitionTo('primingTwo')} />;

      case 'primingTwo':
        return <PrimingScreenTwo onNext={() => transitionTo('paywall')} />;

      case 'paywall':
        return (
          <PaywallScreen
            goal={goal}
            userName={userName}
            onPurchase={handlePaywallPurchase}
            onSkip={handlePaywallSkip}
          />
        );

      case 'whatYouGet':
        return <WhatYouGetScreen onComplete={handleComplete} />;

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

  if (!isAuthenticated) return false;
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
