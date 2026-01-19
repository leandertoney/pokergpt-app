import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Onboarding screens
import { IntroScreen } from './onboarding/IntroScreen';
import { HeroScreen } from './onboarding/HeroScreen';
import { ProfitDemoScreen } from './onboarding/ProfitDemoScreen';
import { LiveDemoScreen } from './onboarding/LiveDemoScreen';
import { SessionDemoScreen } from './onboarding/SessionDemoScreen';
import { LearningProgressScreen } from './onboarding/LearningProgressScreen';
import { ComparisonScreen } from './onboarding/ComparisonScreen';
import { QuickIdentityScreen } from './onboarding/QuickIdentityScreen';
import { NameInputScreen } from './onboarding/NameInputScreen';
import { WhatYouGetScreen } from './onboarding/WhatYouGetScreen';
import { DailyReviewDemoScreen } from './onboarding/DailyReviewDemoScreen';
import { ChatDemoScreen } from './onboarding/ChatDemoScreen';
import { GoalSettingScreen } from './onboarding/GoalSettingScreen';
import { PaywallScreen } from './onboarding/PaywallScreen';
import { SkillLevelScreen } from './onboarding/SkillLevelScreen';

import { setUserTier, setUserIdentity, setUserDisplayName, setPaywallState, setGoalConfirmation } from '@/services/storageService';
import { updateUserIdentity as syncUserIdentityToSupabase, getOrCreateUser } from '@/services/supabaseStorage';
import { checkSubscriptionStatus } from '@/services/revenueCat';
import { colors } from '@/constants/colors';
import type { UserIdentity, ExperienceLevel } from '@/types/poker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50; // Minimum distance for swipe

const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

// All possible steps in the onboarding flow
type OnboardingStep =
  | 'splash'
  | 'hero'
  | 'chatDemo'
  | 'profitDemo'
  | 'liveDemo'
  | 'sessionDemo'
  | 'dailyReviewDemo'
  | 'skillLevel'
  | 'learningProgress'
  | 'comparison'
  | 'identity'
  | 'name'
  | 'goalSetting'
  | 'paywall'
  | 'whatYouGet';

type OnboardingV2Props = {
  onComplete: () => void;
};

// Define the order of swipeable steps
const SWIPE_FLOW: OnboardingStep[] = [
  'hero',
  'chatDemo',        // Chat conversation demo
  'liveDemo',        // Real-time analysis
  'sessionDemo',     // Session tracking
  'dailyReviewDemo', // 60-second review
  'profitDemo',      // Bankroll tracking (moved later)
  'learningProgress',
  'comparison',
];

// All steps in order for progress calculation (excluding splash and hero)
const ALL_STEPS: OnboardingStep[] = [
  'chatDemo',
  'liveDemo',
  'sessionDemo',
  'dailyReviewDemo',
  'skillLevel',
  'learningProgress',
  'profitDemo',
  'comparison',
  'identity',
  'name',
  'goalSetting',
  'paywall',
  'whatYouGet',
];

export function OnboardingV2({ onComplete }: OnboardingV2Props) {
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [stepHistory, setStepHistory] = useState<OnboardingStep[]>(['splash']);
  const [playStyle, setPlayStyle] = useState<string>('shark');
  const [goal, setGoal] = useState<string>('profit');
  const [userName, setUserName] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [canSwipe, setCanSwipe] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Calculate and animate progress when step changes
  useEffect(() => {
    const stepIndex = ALL_STEPS.indexOf(step);
    if (stepIndex >= 0) {
      const progress = (stepIndex + 1) / ALL_STEPS.length;
      Animated.spring(progressAnim, {
        toValue: progress,
        tension: 50,
        friction: 10,
        useNativeDriver: false,
      }).start();
    }
  }, [step, progressAnim]);

  const transitionTo = useCallback((nextStep: OnboardingStep) => {
    setCanSwipe(false);
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
      ]).start(() => {
        setCanSwipe(true);
      });
    });
  }, [fadeAnim, slideAnim]);

  const transitionBack = useCallback(() => {
    if (stepHistory.length <= 1) return;

    setCanSwipe(false);
    const previousStep = stepHistory[stepHistory.length - 2];

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 40,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(previousStep);
      setStepHistory(prev => prev.slice(0, -1));
      slideAnim.setValue(-40);
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
      ]).start(() => {
        setCanSwipe(true);
      });
    });
  }, [stepHistory, fadeAnim, slideAnim]);

  // Swipe left to advance to next screen
  const handleSwipeLeft = useCallback(() => {
    if (!canSwipe) return;

    const currentIndex = SWIPE_FLOW.indexOf(step);
    if (currentIndex >= 0 && currentIndex < SWIPE_FLOW.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      transitionTo(SWIPE_FLOW[currentIndex + 1]);
    } else if (step === 'comparison') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      transitionTo('identity');
    }
  }, [step, canSwipe, transitionTo]);

  // Keep a ref to the latest swipe handler to avoid stale closures
  const handleSwipeRef = useRef(handleSwipeLeft);
  useEffect(() => {
    handleSwipeRef.current = handleSwipeLeft;
  }, [handleSwipeLeft]);

  // Keep a ref to the latest back handler to avoid stale closures
  const handleBackRef = useRef(transitionBack);
  useEffect(() => {
    handleBackRef.current = transitionBack;
  }, [transitionBack]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow both left and right swipe animation
        swipeAnim.setValue(gestureState.dx * 0.3);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD && gestureState.vx < 0) {
          // Swipe left detected - go forward
          handleSwipeRef.current();
        } else if (gestureState.dx > SWIPE_THRESHOLD && gestureState.vx > 0) {
          // Swipe right detected - go back
          handleBackRef.current();
        }
        // Reset swipe animation
        Animated.spring(swipeAnim, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleIdentityComplete = (selectedPlayStyle: string, selectedGoal: string) => {
    setPlayStyle(selectedPlayStyle);
    setGoal(selectedGoal);
    transitionTo('name');
  };

  const handleNameComplete = (name: string | null) => {
    setUserName(name);
    transitionTo('goalSetting');
  };

  const handleSkillLevelComplete = (level: ExperienceLevel) => {
    setExperienceLevel(level);
    transitionTo('learningProgress');
  };

  const handleGoalConfirmed = async (timestamp: number) => {
    await setGoalConfirmation({
      playStyle,
      goal,
      userName,
      timestamp,
    });
    transitionTo('paywall');
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
      // (RevenueCat might have a slight delay in updating status)
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
      // Map playStyle to archetype
      const archetypeMap: Record<string, string> = {
        shark: 'shark',
        analyst: 'strategist',
        grinder: 'grinder',
        student: 'student',
      };

      // Map goal to primaryGoal
      const goalMap: Record<string, string> = {
        profit: 'profit',
        win: 'compete',
        learn: 'improve',
        confidence: 'fun',
      };

      const identity: UserIdentity = {
        archetype: archetypeMap[playStyle] as UserIdentity['archetype'],
        experienceLevel: experienceLevel,
        primaryGoal: goalMap[goal] as UserIdentity['primaryGoal'],
        biggestChallenge: null,
      };

      // Save to local storage
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      await setUserTier('free');
      await setUserIdentity(identity);
      await setUserDisplayName(userName);

      // Sync to Supabase (gracefully fails if offline)
      try {
        await getOrCreateUser();
        await syncUserIdentityToSupabase(identity);
      } catch {
        // Silent - app works offline, will sync later
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Log but don't crash - proceed to complete onboarding anyway
      console.warn('Error during onboarding completion:', error);
    }

    // Always call onComplete to exit onboarding, even if storage failed
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      // PHASE 1: HOOK
      case 'splash':
        return <IntroScreen onNext={() => transitionTo('hero')} />;

      case 'hero':
        return <HeroScreen onNext={() => transitionTo('chatDemo')} />;

      case 'chatDemo':
        return <ChatDemoScreen onNext={() => transitionTo('liveDemo')} />;

      case 'profitDemo':
        return <ProfitDemoScreen onNext={() => transitionTo('comparison')} />;

      case 'liveDemo':
        return <LiveDemoScreen onNext={() => transitionTo('sessionDemo')} />;

      case 'sessionDemo':
        return <SessionDemoScreen onNext={() => transitionTo('dailyReviewDemo')} />;

      case 'dailyReviewDemo':
        return <DailyReviewDemoScreen onNext={() => transitionTo('skillLevel')} />;

      case 'skillLevel':
        return <SkillLevelScreen onComplete={handleSkillLevelComplete} />;

      case 'learningProgress':
        return <LearningProgressScreen onNext={() => transitionTo('profitDemo')} />;

      case 'comparison':
        return <ComparisonScreen onNext={() => transitionTo('identity')} />;

      // PHASE 3: IDENTITY (Quick tap cards, no dots)
      case 'identity':
        return <QuickIdentityScreen onComplete={handleIdentityComplete} />;

      case 'name':
        return <NameInputScreen onComplete={handleNameComplete} />;

      case 'goalSetting':
        return (
          <GoalSettingScreen
            playStyle={playStyle}
            goal={goal}
            userName={userName}
            onComplete={handleGoalConfirmed}
          />
        );

      case 'paywall':
        return (
          <PaywallScreen
            playStyle={playStyle}
            goal={goal}
            userName={userName}
            onPurchase={handlePaywallPurchase}
            onSkip={handlePaywallSkip}
          />
        );

      // PHASE 4: CLOSE
      case 'whatYouGet':
        return <WhatYouGetScreen onComplete={handleComplete} />;

      default:
        return null;
    }
  };

  // Check if current step is swipeable
  const isSwipeableStep = SWIPE_FLOW.includes(step);

  // Show progress bar for all steps except splash and hero
  const showProgress = step !== 'splash' && step !== 'hero';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.primary, colors.background.primary, colors.background.primary]}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        {/* Back Button */}
        {step !== 'splash' && step !== 'hero' && stepHistory.length > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={transitionBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {/* Progress Bar */}
        {showProgress && (
          <View style={styles.progressContainer}>
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
              transform: [
                { translateX: slideAnim },
                { translateX: swipeAnim },
              ],
            },
          ]}
          {...(isSwipeableStep ? panResponder.panHandlers : {})}
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
    const subscriptionStatus = await checkSubscriptionStatus();
    if (subscriptionStatus.isSubscribed) {
      // Mark onboarding as complete and set user tier
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      await setUserTier('paid');
      return true;
    }
  } catch (error) {
    console.warn('Failed to check subscription status:', error);
    // Continue with normal flow if RevenueCat check fails
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
  backButton: {
    position: 'absolute',
    top: 54,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  } as ViewStyle,
  progressContainer: {
    paddingHorizontal: 60,
    paddingTop: 60,
    paddingBottom: 8,
  } as ViewStyle,
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  } as ViewStyle,
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.gold,
    borderRadius: 2,
  } as ViewStyle,
  content: {
    flex: 1,
  } as ViewStyle,
});

export default OnboardingV2;
