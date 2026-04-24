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
import { WhatYouGetScreen } from './onboarding/WhatYouGetScreen';
import { DailyReviewDemoScreen } from './onboarding/DailyReviewDemoScreen';
import { SessionDemoScreen } from './onboarding/SessionDemoScreen';
import { ChatDemoScreen } from './onboarding/ChatDemoScreen';
import { PaywallScreen } from './onboarding/PaywallScreen';
import { AnalysisResultScreen } from './onboarding/AnalysisResultScreen';
import { PrimingScreenOne } from './onboarding/PrimingScreenOne';
import { PrimingScreenTwo } from './onboarding/PrimingScreenTwo';

import { setUserTier, setUserIdentity, setUserDisplayName, setPaywallState, setOnboardingProfile } from '@/services/storageService';
import { updateUserIdentity as syncUserIdentityToSupabase, getOrCreateUser } from '@/services/supabaseStorage';
import { checkSubscriptionStatus } from '@/services/revenueCat';
import { withTimeout } from '@/utils/withTimeout';
import { colors } from '@/constants/colors';
import type { UserIdentity, PainPoint, OnboardingProfile } from '@/types/poker';

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
  | 'analysisResult'
  | 'dailyReviewDemo'
  | 'sessionDemo'
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
  // PHASE 2: IDENTIFY (1 question only)
  'painPoint', 'validation',
  // PHASE 3: SHOW FEATURES (demos only, no questions)
  'chatDemo', 'liveDemo', 'analysisResult', 'dailyReviewDemo', 'sessionDemo',
  // PHASE 4: CONVERT
  'primingOne', 'primingTwo', 'paywall', 'whatYouGet',
];

// DEV ONLY: Set to any step name to jump straight there (e.g. 'paywall', 'primingTwo')
// Set to null for normal flow. Ignored in production builds.
const DEV_START_STEP: OnboardingStep | null = __DEV__ ? null : null;

export function OnboardingV2({ onComplete }: OnboardingV2Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<OnboardingStep>(DEV_START_STEP ?? 'hook');
  const [stepHistory, setStepHistory] = useState<OnboardingStep[]>([DEV_START_STEP ?? 'hook']);
  const [painPoint, setPainPoint] = useState<PainPoint | null>(null);

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

      case 'liveDemo':
        return <LiveDemoScreen onNext={() => transitionTo('analysisResult')} />;

      case 'analysisResult':
        return <AnalysisResultScreen onNext={() => transitionTo('dailyReviewDemo')} />;

      case 'dailyReviewDemo':
        return <DailyReviewDemoScreen onNext={() => transitionTo('sessionDemo')} />;

      case 'sessionDemo':
        return <SessionDemoScreen onNext={() => transitionTo('primingOne')} />;

      case 'primingOne':
        return <PrimingScreenOne onNext={() => transitionTo('primingTwo')} />;

      case 'primingTwo':
        return <PrimingScreenTwo onNext={() => transitionTo('paywall')} />;

      case 'paywall':
        return (
          <PaywallScreen
            goal={'profit'} // Default goal
            userName={null} // No name collected in streamlined flow
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
