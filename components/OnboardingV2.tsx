import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Zap } from 'lucide-react-native';
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
import { ProfileBuiltScreen } from './onboarding/ProfileBuiltScreen';
import { WhatYouGetScreen } from './onboarding/WhatYouGetScreen';
import { FeatureScreen } from './onboarding/FeatureScreen';
import { DailyReviewDemoScreen } from './onboarding/DailyReviewDemoScreen';

// Components for feature screens
import { VoiceOrb } from './VoiceOrb';

import { setUserTier, setUserIdentity } from '@/services/storageService';
import { colors } from '@/constants/colors';
import type { UserIdentity } from '@/types/poker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50; // Minimum distance for swipe

const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

// All possible steps in the onboarding flow
type OnboardingStep =
  | 'splash'
  | 'hero'
  | 'profitDemo'
  | 'liveDemo'
  | 'voice'
  | 'analysis'
  | 'sessionDemo'
  | 'dailyReviewDemo'
  | 'learningProgress'
  | 'comparison'
  | 'identity'
  | 'profileBuilt'
  | 'whatYouGet';

type OnboardingV2Props = {
  onComplete: () => void;
};

// Define the order of swipeable steps
const SWIPE_FLOW: OnboardingStep[] = [
  'hero',
  'profitDemo',
  'liveDemo',
  'voice',
  'analysis',
  'sessionDemo',
  'dailyReviewDemo',
  'learningProgress',
  'comparison',
];

export function OnboardingV2({ onComplete }: OnboardingV2Props) {
  const [step, setStep] = useState<OnboardingStep>('splash');
  const [playStyle, setPlayStyle] = useState<string>('shark');
  const [goal, setGoal] = useState<string>('profit');
  const [canSwipe, setCanSwipe] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  const transitionTo = useCallback((nextStep: OnboardingStep) => {
    setCanSwipe(false);
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

  const handleSwipeUp = useCallback(() => {
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical swipes
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow upward swipe animation
        if (gestureState.dy < 0) {
          swipeAnim.setValue(gestureState.dy * 0.3);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -SWIPE_THRESHOLD && gestureState.vy < 0) {
          // Swipe up detected
          handleSwipeUp();
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
    transitionTo('profileBuilt');
  };

  const handleComplete = async () => {
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
      experienceLevel: 'intermediate', // Default
      primaryGoal: goalMap[goal] as UserIdentity['primaryGoal'],
      biggestChallenge: null,
    };

    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    await setUserTier('free');
    await setUserIdentity(identity);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      // PHASE 1: HOOK
      case 'splash':
        return <IntroScreen onNext={() => transitionTo('hero')} />;

      case 'hero':
        return <HeroScreen onNext={() => transitionTo('profitDemo')} />;

      case 'profitDemo':
        return <ProfitDemoScreen onNext={() => transitionTo('liveDemo')} />;

      case 'liveDemo':
        return <LiveDemoScreen onNext={() => transitionTo('voice')} />;

      // PHASE 2: FEATURES
      case 'voice':
        return (
          <FeatureScreen
            icon={<VoiceOrb state="listening" size="medium" />}
            headline="Just talk."
            subheadline="Like you're at the table."
            description="Describe your hand naturally. PokerGPT understands position, action, stack sizes — everything."
            buttonText="Continue"
            onNext={() => transitionTo('analysis')}
          />
        );

      case 'analysis':
        return (
          <FeatureScreen
            icon={<Zap size={64} color={colors.onboarding.gold} />}
            headline="Instant analysis"
            description="Get GTO recommendations, exploitative lines, and confidence scores in seconds. No more second-guessing."
            buttonText="Continue"
            onNext={() => transitionTo('sessionDemo')}
          />
        );

      case 'sessionDemo':
        return <SessionDemoScreen onNext={() => transitionTo('dailyReviewDemo')} />;

      case 'dailyReviewDemo':
        return <DailyReviewDemoScreen onNext={() => transitionTo('learningProgress')} />;

      case 'learningProgress':
        return <LearningProgressScreen onNext={() => transitionTo('comparison')} />;

      case 'comparison':
        return <ComparisonScreen onNext={() => transitionTo('identity')} />;

      // PHASE 3: IDENTITY (Quick tap cards, no dots)
      case 'identity':
        return <QuickIdentityScreen onComplete={handleIdentityComplete} />;

      case 'profileBuilt':
        return (
          <ProfileBuiltScreen
            playStyle={playStyle}
            goal={goal}
            onNext={() => transitionTo('whatYouGet')}
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.tertiary, colors.background.secondary, colors.background.primary, '#0D0202']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { translateY: swipeAnim },
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
  } catch (error) {
    console.error('Error resetting onboarding:', error);
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
  content: {
    flex: 1,
  } as ViewStyle,
});

export default OnboardingV2;
