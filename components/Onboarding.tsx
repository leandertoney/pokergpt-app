import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, ScrollView, PanResponder, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MessageCircle, Mic, Sparkles, ChevronRight, Check, Trophy, Target,
  TrendingUp, Users, Zap, Crown, Flame, Brain, Crosshair, BookOpen,
  DollarSign, Award, Smile, BarChart3, Heart, Shield, Clock, Star
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserTier, setUserIdentity } from '@/services/storageService';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { colors } from '@/constants/colors';
import type { PlayerArchetype, ExperienceLevel, PrimaryGoal, BiggestChallenge, UserIdentity } from '@/types/poker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

// ============================================================================
// IDENTITY-ANCHORED CONVERSION FLOW™ CONFIGURATION
// ============================================================================

type OnboardingStepType =
  | 'welcome'
  | 'social'
  | 'outcome'
  | 'archetype'      // NEW: Player identity
  | 'experience'     // NEW: Experience level
  | 'goal'           // Enhanced: Primary goal
  | 'challenge'      // NEW: Biggest leak
  | 'reinforcement'  // Enhanced: Personalized
  | 'value'          // Enhanced: Personalized benefits
  | 'feature'
  | 'paywall';

type OnboardingStep = {
  type: OnboardingStepType;
  title: string;
  description: string;
  icon?: React.ReactNode;
  stepLabel?: string;
};

const steps: OnboardingStep[] = [
  {
    type: 'welcome',
    title: 'Smart move.',
    description: 'The best players don\'t guess.\nThey know.',
    icon: <Sparkles size={64} color={colors.accent.primary} />,
  },
  {
    type: 'social',
    title: '50,000+ Players Trust Us',
    description: 'Top pros and grinders use PokerPro AI to study hands and fix leaks faster than ever.',
    icon: <Users size={64} color={colors.accent.primary} />,
  },
  {
    type: 'outcome',
    title: 'See Your Game Transform',
    description: 'Players report better results in just 2 weeks.\nFewer bad calls. More confident bets. Bigger wins.',
    icon: <TrendingUp size={64} color={colors.accent.primary} />,
  },
  {
    type: 'archetype',
    title: 'What kind of player are you?',
    description: '',
    stepLabel: 'STEP 1 OF 4',
  },
  {
    type: 'experience',
    title: 'Where are you in your journey?',
    description: '',
    stepLabel: 'STEP 2 OF 4',
  },
  {
    type: 'goal',
    title: 'What\'s your #1 goal?',
    description: '',
    stepLabel: 'STEP 3 OF 4',
  },
  {
    type: 'challenge',
    title: 'What\'s your biggest leak?',
    description: '',
    stepLabel: 'STEP 4 OF 4',
  },
  {
    type: 'reinforcement',
    title: 'Got it.',
    description: '', // Dynamically generated
    icon: <Check size={64} color={colors.accent.primary} />,
  },
  {
    type: 'value',
    title: 'Built for you',
    description: '', // Dynamically generated
    icon: <Target size={64} color={colors.accent.primary} />,
  },
  {
    type: 'feature',
    title: 'Go Further with Premium',
    description: '',
    icon: <Crown size={64} color={colors.accent.primary} />,
  },
  {
    type: 'paywall',
    title: 'Pick Your Plan',
    description: '',
  },
];

// Identity option configurations
type ArchetypeOption = {
  id: PlayerArchetype;
  emoji: string;
  title: string;
  description: string;
};

const archetypeOptions: ArchetypeOption[] = [
  { id: 'grinder', emoji: '⚡', title: 'The Grinder', description: 'Volume is king. You put in the hours.' },
  { id: 'shark', emoji: '🦈', title: 'The Shark', description: 'You read people and exploit weaknesses.' },
  { id: 'strategist', emoji: '🧮', title: 'The Strategist', description: 'Math and GTO guide every decision.' },
  { id: 'intuitive', emoji: '🎯', title: 'The Intuitive', description: 'Reads and instincts drive your wins.' },
  { id: 'student', emoji: '📚', title: 'The Student', description: 'Always learning. Improvement is the goal.' },
];

type ExperienceOption = {
  id: ExperienceLevel;
  emoji: string;
  title: string;
  description: string;
};

const experienceOptions: ExperienceOption[] = [
  { id: 'beginner', emoji: '🌱', title: 'Just Getting Started', description: 'Learning the basics' },
  { id: 'intermediate', emoji: '📈', title: 'Solid Foundation', description: 'Know fundamentals, ready to level up' },
  { id: 'advanced', emoji: '🎯', title: 'Experienced Player', description: 'Consistent winner, looking for edge' },
  { id: 'professional', emoji: '👑', title: 'Professional', description: 'This is my livelihood' },
];

type GoalOption = {
  id: PrimaryGoal;
  emoji: string;
  title: string;
  description: string;
};

const goalOptions: GoalOption[] = [
  { id: 'profit', emoji: '💰', title: 'Maximize Profits', description: 'I want to make more money' },
  { id: 'improve', emoji: '📚', title: 'Master the Game', description: 'I want to become much better' },
  { id: 'compete', emoji: '🏆', title: 'Crush Competition', description: 'I want to beat specific players' },
  { id: 'fun', emoji: '🎲', title: 'Enjoy More', description: 'Play with confidence, less stress' },
];

type ChallengeOption = {
  id: BiggestChallenge;
  emoji: string;
  title: string;
  description: string;
};

const challengeOptions: ChallengeOption[] = [
  { id: 'tilt', emoji: '😤', title: 'Emotional Control', description: 'Tilt hurts my results' },
  { id: 'ranges', emoji: '🎴', title: 'Reading Hands', description: 'Struggling with opponent ranges' },
  { id: 'sizing', emoji: '📊', title: 'Bet Sizing', description: 'Never sure of the right amount' },
  { id: 'spots', emoji: '🤔', title: 'Tough Decisions', description: 'Close spots give me trouble' },
  { id: 'discipline', emoji: '🎯', title: 'Discipline', description: 'Game selection & bankroll' },
];

// Pricing plans
type PricingPlan = {
  id: 'weekly' | 'yearly' | 'lifetime';
  name: string;
  price: string;
  perMonth?: string;
  badge?: string;
  savings?: string;
  features: string[];
};

const plans: PricingPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: '$9.99',
    perMonth: '$9.99/week',
    features: ['Unlimited hand analysis', 'Voice input', 'Full AI breakdowns', 'Hand history'],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$49',
    perMonth: '$4.08/month',
    badge: 'SAVE 91%',
    savings: 'Save $470 vs weekly',
    features: ['Everything in Weekly', 'Priority support', 'Early features', 'Best for serious players'],
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '$49',
    perMonth: 'One time',
    badge: 'BEST VALUE',
    savings: 'Pay once, own forever',
    features: ['Everything forever', 'Never pay again', 'All future updates', 'VIP treatment'],
  },
];

// ============================================================================
// PERSONALIZATION ENGINE
// ============================================================================

function getPersonalizedHeadline(identity: UserIdentity): string {
  const { archetype, primaryGoal } = identity;

  if (archetype === 'grinder' && primaryGoal === 'profit') {
    return "You're built for volume.\nLet's make every hand count.";
  }
  if (archetype === 'shark') {
    return "You see what others miss.\nLet's sharpen that edge.";
  }
  if (archetype === 'strategist') {
    return "Precision is your power.\nLet's add more weapons.";
  }
  if (archetype === 'intuitive') {
    return "Your reads are real.\nLet's back them with data.";
  }
  if (archetype === 'student') {
    return "Hunger beats talent.\nLet's accelerate your growth.";
  }
  if (primaryGoal === 'profit') {
    return "Money follows mastery.\nLet's get you there.";
  }
  if (primaryGoal === 'compete') {
    return "Dominance isn't luck.\nIt's preparation.";
  }
  return "You know who you are.\nNow let's level you up.";
}

function getPersonalizedBenefits(identity: UserIdentity): Array<{ icon: React.ReactNode; title: string; description: string }> {
  const { archetype, primaryGoal, biggestChallenge } = identity;
  const benefits: Array<{ icon: React.ReactNode; title: string; description: string }> = [];

  // Core benefit
  benefits.push({
    icon: <Mic size={28} color={colors.accent.primary} />,
    title: 'Voice-first analysis',
    description: 'Describe any hand naturally. Get instant expert insight.',
  });

  // Archetype-specific
  if (archetype === 'grinder') {
    benefits.push({
      icon: <Zap size={28} color={colors.accent.primary} />,
      title: 'Speed-optimized',
      description: 'Quick reads for high-volume sessions.',
    });
  } else if (archetype === 'shark') {
    benefits.push({
      icon: <Crosshair size={28} color={colors.accent.primary} />,
      title: 'Exploit detection',
      description: 'Identify and punish villain tendencies.',
    });
  } else if (archetype === 'strategist') {
    benefits.push({
      icon: <Brain size={28} color={colors.accent.primary} />,
      title: 'GTO backbone',
      description: 'Every recommendation grounded in theory.',
    });
  } else if (archetype === 'intuitive') {
    benefits.push({
      icon: <Target size={28} color={colors.accent.primary} />,
      title: 'Validate your reads',
      description: 'Turn gut feelings into +EV decisions.',
    });
  } else {
    benefits.push({
      icon: <BookOpen size={28} color={colors.accent.primary} />,
      title: 'Learn as you play',
      description: 'Every analysis teaches something new.',
    });
  }

  // Challenge-specific
  if (biggestChallenge === 'tilt') {
    benefits.push({
      icon: <Shield size={28} color={colors.accent.primary} />,
      title: 'Confidence in chaos',
      description: 'Clear answers reduce doubt and tilt.',
    });
  } else if (biggestChallenge === 'ranges') {
    benefits.push({
      icon: <BarChart3 size={28} color={colors.accent.primary} />,
      title: 'Range visualization',
      description: 'See what villains can have, street by street.',
    });
  } else if (biggestChallenge === 'sizing') {
    benefits.push({
      icon: <DollarSign size={28} color={colors.accent.primary} />,
      title: 'Precise sizing',
      description: 'Know the optimal bet for every spot.',
    });
  } else if (biggestChallenge === 'spots') {
    benefits.push({
      icon: <Crosshair size={28} color={colors.accent.primary} />,
      title: 'Tough spot solver',
      description: 'Turn hard decisions into clear plans.',
    });
  } else {
    benefits.push({
      icon: <Clock size={28} color={colors.accent.primary} />,
      title: 'Pattern recognition',
      description: 'Track tendencies and fix leaks.',
    });
  }

  // Goal-specific
  if (primaryGoal === 'profit') {
    benefits.push({
      icon: <TrendingUp size={28} color={colors.accent.primary} />,
      title: 'Profit tracking',
      description: 'See how analyzed spots affect your bottom line.',
    });
  } else if (primaryGoal === 'improve') {
    benefits.push({
      icon: <Award size={28} color={colors.accent.primary} />,
      title: 'Skill progression',
      description: 'Watch your understanding deepen.',
    });
  } else if (primaryGoal === 'compete') {
    benefits.push({
      icon: <Trophy size={28} color={colors.accent.primary} />,
      title: 'Opponent profiling',
      description: 'Build exploits for tough competition.',
    });
  } else {
    benefits.push({
      icon: <Smile size={28} color={colors.accent.primary} />,
      title: 'Play relaxed',
      description: 'Confidence from knowing the right call.',
    });
  }

  return benefits;
}

function getPaywallCTA(identity: UserIdentity): string {
  const { primaryGoal } = identity;
  if (primaryGoal === 'profit') return 'Unlock My Profit Potential';
  if (primaryGoal === 'improve') return 'Accelerate My Growth';
  if (primaryGoal === 'compete') return 'Get My Competitive Edge';
  return 'Start Winning Now';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type OnboardingProps = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [identity, setIdentity] = useState<UserIdentity>({
    archetype: null,
    experienceLevel: null,
    primaryGoal: null,
    biggestChallenge: null,
    painPoint: null,
  });
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'yearly' | 'lifetime'>('lifetime');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;

  const step = steps[currentStep];

  // Progress bar (only show for identity steps)
  const showProgress = step.type === 'archetype' || step.type === 'experience' ||
                       step.type === 'goal' || step.type === 'challenge';
  const progressSteps = ['archetype', 'experience', 'goal', 'challenge'];
  const progressIndex = progressSteps.indexOf(step.type);
  const progressPercent = showProgress ? ((progressIndex + 1) / progressSteps.length) * 100 : 0;

  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    iconScaleAnim.setValue(0);
    iconRotateAnim.setValue(0);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(iconRotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const handleNext = async () => {
    if (step.type === 'paywall') return;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(currentStep + 1);
      slideAnim.setValue(SCREEN_WIDTH);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => currentStep < steps.length - 1,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && currentStep < steps.length - 1;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -80 && currentStep < steps.length - 1) {
          handleNext();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleIdentitySelect = (type: keyof UserIdentity, value: string) => {
    setIdentity(prev => ({ ...prev, [type]: value }));
    setTimeout(() => handleNext(), 200);
  };

  const handleFreeTier = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    await setUserTier('free');
    await setUserIdentity(identity);
    onComplete();
  };

  const handlePurchase = async (planId: 'weekly' | 'yearly' | 'lifetime') => {
    console.log('User selected plan:', planId);
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    await setUserTier('paid');
    await setUserIdentity(identity);
    onComplete();
  };

  const renderStep = () => {
    switch (step.type) {
      case 'archetype':
        return (
          <IdentitySelectionStep
            stepLabel={step.stepLabel!}
            title={step.title}
            options={archetypeOptions}
            selectedValue={identity.archetype}
            onSelect={(value) => handleIdentitySelect('archetype', value)}
            scaleAnim={scaleAnim}
          />
        );
      case 'experience':
        return (
          <IdentitySelectionStep
            stepLabel={step.stepLabel!}
            title={step.title}
            options={experienceOptions}
            selectedValue={identity.experienceLevel}
            onSelect={(value) => handleIdentitySelect('experienceLevel', value)}
            scaleAnim={scaleAnim}
          />
        );
      case 'goal':
        return (
          <IdentitySelectionStep
            stepLabel={step.stepLabel!}
            title={step.title}
            options={goalOptions}
            selectedValue={identity.primaryGoal}
            onSelect={(value) => handleIdentitySelect('primaryGoal', value)}
            scaleAnim={scaleAnim}
          />
        );
      case 'challenge':
        return (
          <IdentitySelectionStep
            stepLabel={step.stepLabel!}
            title={step.title}
            options={challengeOptions}
            selectedValue={identity.biggestChallenge}
            onSelect={(value) => handleIdentitySelect('biggestChallenge', value)}
            scaleAnim={scaleAnim}
            buttonText="See my personalized plan"
          />
        );
      case 'reinforcement':
        return (
          <ReinforcementStep
            identity={identity}
            onNext={handleNext}
            scaleAnim={scaleAnim}
            iconScaleAnim={iconScaleAnim}
          />
        );
      case 'value':
        return (
          <PersonalizedValueStep
            identity={identity}
            onNext={handleNext}
            scaleAnim={scaleAnim}
          />
        );
      case 'feature':
        return (
          <FeatureStep
            step={step}
            identity={identity}
            onNext={handleNext}
            scaleAnim={scaleAnim}
            iconScaleAnim={iconScaleAnim}
            iconRotateAnim={iconRotateAnim}
          />
        );
      case 'paywall':
        return (
          <PaywallStep
            plans={plans}
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onPurchase={handlePurchase}
            onFreeTier={handleFreeTier}
            identity={identity}
          />
        );
      default:
        return (
          <StandardStep
            step={step}
            onNext={handleNext}
            scaleAnim={scaleAnim}
            iconScaleAnim={iconScaleAnim}
            iconRotateAnim={iconRotateAnim}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.tertiary, colors.background.secondary, colors.background.primary, '#0D0202']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        {/* Progress bar */}
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  { width: `${progressPercent}%` }
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.content} {...panResponder.panHandlers}>
          <Animated.View
            style={[
              styles.stepContainer,
              {
                transform: [{ translateX: slideAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            {renderStep()}
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function StandardStep({ step, onNext, scaleAnim, iconScaleAnim, iconRotateAnim }: {
  step: OnboardingStep;
  onNext: () => void;
  scaleAnim: Animated.Value;
  iconScaleAnim: Animated.Value;
  iconRotateAnim: Animated.Value;
}) {
  const iconRotate = iconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: Animated.multiply(iconScaleAnim, pulseAnim) },
              { rotate: iconRotate },
            ],
          },
        ]}
      >
        {step.icon}
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>Continue</Text>
          <ChevronRight size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function IdentitySelectionStep<T extends string>({
  stepLabel,
  title,
  options,
  selectedValue,
  onSelect,
  scaleAnim,
  buttonText,
}: {
  stepLabel: string;
  title: string;
  options: Array<{ id: T; emoji: string; title: string; description: string }>;
  selectedValue: T | null;
  onSelect: (value: T) => void;
  scaleAnim: Animated.Value;
  buttonText?: string;
}) {
  const [pressedId, setPressedId] = useState<T | null>(null);
  const optionAnims = useRef(options.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = optionAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 60),
        Animated.spring(anim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  return (
    <>
      <Animated.View style={[styles.questionHeader, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.stepLabel}>{stepLabel}</Text>
        <Text style={styles.title}>{title}</Text>
      </Animated.View>

      <ScrollView
        style={styles.optionsScroll}
        contentContainerStyle={styles.optionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option, index) => {
          const translateY = optionAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          });
          const isPressed = pressedId === option.id;

          return (
            <Animated.View
              key={option.id}
              style={{ opacity: optionAnims[index], transform: [{ translateY }] }}
            >
              <TouchableOpacity
                style={[styles.identityOption, isPressed && styles.identityOptionPressed]}
                onPress={() => {
                  setPressedId(option.id);
                  setTimeout(() => onSelect(option.id), 150);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.identityEmoji}>{option.emoji}</Text>
                <View style={styles.identityContent}>
                  <Text style={styles.identityTitle}>{option.title}</Text>
                  <Text style={styles.identityDescription}>{option.description}</Text>
                </View>
                <View style={[styles.radioOuter, isPressed && styles.radioOuterSelected]}>
                  {isPressed && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={styles.footer} />
    </>
  );
}

function ReinforcementStep({ identity, onNext, scaleAnim, iconScaleAnim }: {
  identity: UserIdentity;
  onNext: () => void;
  scaleAnim: Animated.Value;
  iconScaleAnim: Animated.Value;
}) {
  const headline = getPersonalizedHeadline(identity);

  const archetypeNames: Record<PlayerArchetype, string> = {
    grinder: 'The Grinder',
    shark: 'The Shark',
    strategist: 'The Strategist',
    intuitive: 'The Intuitive',
    student: 'The Student',
  };

  const experienceLabels: Record<ExperienceLevel, string> = {
    beginner: 'Building foundations',
    intermediate: 'Leveling up',
    advanced: 'Refining edges',
    professional: 'Playing elite',
  };

  const goalLabels: Record<PrimaryGoal, string> = {
    profit: 'Maximize profits',
    improve: 'Master the game',
    compete: 'Crush competition',
    fun: 'Play with confidence',
  };

  const challengeLabels: Record<BiggestChallenge, string> = {
    tilt: 'emotional control',
    ranges: 'hand reading',
    sizing: 'bet sizing',
    spots: 'tough decisions',
    discipline: 'discipline',
  };

  const profileItems = [
    { emoji: '🎭', label: 'Player type', value: identity.archetype ? archetypeNames[identity.archetype] : '' },
    { emoji: '📈', label: 'Stage', value: identity.experienceLevel ? experienceLabels[identity.experienceLevel] : '' },
    { emoji: '🎯', label: 'Goal', value: identity.primaryGoal ? goalLabels[identity.primaryGoal] : '' },
    { emoji: '🔧', label: 'Focus', value: identity.biggestChallenge ? `Improve ${challengeLabels[identity.biggestChallenge]}` : '' },
  ];

  return (
    <>
      <Animated.View style={[styles.reinforcementIcon, { transform: [{ scale: iconScaleAnim }] }]}>
        <View style={styles.checkCircle}>
          <Check size={40} color="#000" />
        </View>
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Text style={styles.title}>Got it.</Text>
        <Text style={styles.reinforcementHeadline}>{headline}</Text>
      </Animated.View>

      <View style={styles.profileCard}>
        <Text style={styles.profileTitle}>YOUR PROFILE</Text>
        {profileItems.map((item, index) => (
          <View key={index} style={styles.profileItem}>
            <Text style={styles.profileEmoji}>{item.emoji}</Text>
            <View style={styles.profileItemContent}>
              <Text style={styles.profileLabel}>{item.label}</Text>
              <Text style={styles.profileValue}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.calibratedText}>
        PokerPro AI is now calibrated to <Text style={styles.calibratedHighlight}>your game</Text>
      </Text>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>Show me how it helps</Text>
          <ChevronRight size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function PersonalizedValueStep({ identity, onNext, scaleAnim }: {
  identity: UserIdentity;
  onNext: () => void;
  scaleAnim: Animated.Value;
}) {
  const benefits = getPersonalizedBenefits(identity);
  const benefitAnims = useRef(benefits.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = benefitAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.spring(anim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  const goalHeadlines: Record<PrimaryGoal, string> = {
    profit: 'Built to boost your winrate',
    improve: 'Built for rapid improvement',
    compete: 'Built to give you the edge',
    fun: 'Built for confident play',
  };

  const headline = identity.primaryGoal ? goalHeadlines[identity.primaryGoal] : 'Built for serious players';

  return (
    <>
      <Animated.View style={[styles.valueHeader, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.stepLabel}>TAILORED FOR YOU</Text>
        <Text style={styles.title}>{headline}</Text>
      </Animated.View>

      <ScrollView
        style={styles.benefitsScroll}
        contentContainerStyle={styles.benefitsContainer}
        showsVerticalScrollIndicator={false}
      >
        {benefits.map((benefit, index) => {
          const translateX = benefitAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [-30, 0],
          });

          return (
            <Animated.View
              key={index}
              style={{ opacity: benefitAnims[index], transform: [{ translateX }] }}
            >
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>{benefit.icon}</View>
                <View style={styles.benefitContent}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
        <Text style={styles.nextButtonText}>What else can it do?</Text>
        <ChevronRight size={20} color="#000" />
      </TouchableOpacity>
    </>
  );
}

function FeatureStep({ step, identity, onNext, scaleAnim, iconScaleAnim, iconRotateAnim }: {
  step: OnboardingStep;
  identity: UserIdentity;
  onNext: () => void;
  scaleAnim: Animated.Value;
  iconScaleAnim: Animated.Value;
  iconRotateAnim: Animated.Value;
}) {
  const features = [
    { icon: <Zap size={28} color={colors.accent.primary} />, title: 'Unlimited Analysis', description: 'No daily limits ever' },
    { icon: <Trophy size={28} color={colors.accent.primary} />, title: 'Full AI Breakdowns', description: 'GTO + exploitative advice' },
    { icon: <Mic size={28} color={colors.accent.primary} />, title: 'Voice Mode', description: 'Talk like at the table' },
    { icon: <Flame size={28} color={colors.accent.primary} />, title: 'Mariano Coach', description: 'Get hype. Learn faster.' },
  ];

  const featureAnims = useRef(features.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = featureAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.spring(anim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  const iconRotate = iconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <Animated.View
        style={[styles.iconContainer, { transform: [{ scale: iconScaleAnim }, { rotate: iconRotate }] }]}
      >
        {step.icon}
      </Animated.View>

      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={styles.title}>{step.title}</Text>
      </Animated.View>

      <View style={styles.featureList}>
        {features.map((feature, index) => {
          const translateX = featureAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
          });

          return (
            <Animated.View
              key={index}
              style={{ opacity: featureAnims[index], transform: [{ translateX }] }}
            >
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>{feature.icon}</View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.nextButton} onPress={onNext} activeOpacity={0.8}>
        <Text style={styles.nextButtonText}>{getPaywallCTA(identity)}</Text>
        <ChevronRight size={20} color="#000" />
      </TouchableOpacity>
    </>
  );
}

function PaywallStep({ plans, selectedPlan, onSelectPlan, onPurchase, onFreeTier, identity }: {
  plans: PricingPlan[];
  selectedPlan: 'weekly' | 'yearly' | 'lifetime';
  onSelectPlan: (plan: 'weekly' | 'yearly' | 'lifetime') => void;
  onPurchase: (plan: 'weekly' | 'yearly' | 'lifetime') => void;
  onFreeTier: () => void;
  identity: UserIdentity;
}) {
  const ctaText = getPaywallCTA(identity);

  return (
    <ScrollView style={styles.paywallScroll} contentContainerStyle={styles.paywallContent} showsVerticalScrollIndicator={false}>
      <View style={styles.paywallHeader}>
        <Crown size={48} color={colors.accent.primary} />
        <Text style={styles.paywallTitle}>{ctaText}</Text>
        <Text style={styles.paywallSubtitle}>Join 50,000+ winning players</Text>
        <View style={styles.ratingContainer}>
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Text style={styles.ratingText}>4.9/5 from 2,847 reviews</Text>
        </View>
      </View>

      <View style={styles.plansContainer}>
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlan;
          const isLifetime = plan.id === 'lifetime';

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
                isLifetime && styles.planCardLifetime,
              ]}
              onPress={() => onSelectPlan(plan.id)}
              activeOpacity={0.8}
            >
              {plan.badge && (
                <View style={[styles.planBadge, isLifetime && styles.planBadgeLifetime]}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPerMonth}>{plan.perMonth}</Text>
                {plan.savings && <Text style={styles.planSavings}>{plan.savings}</Text>}
              </View>

              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.planFeature}>
                    <Check size={16} color={colors.accent.primary} />
                    <Text style={styles.planFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Check size={20} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.purchaseButton}
        onPress={() => onPurchase(selectedPlan)}
        activeOpacity={0.8}
      >
        <Text style={styles.purchaseButtonText}>{ctaText}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.freeButton} onPress={onFreeTier} activeOpacity={0.7}>
        <Text style={styles.freeButtonText}>Continue with 5 Free Hands</Text>
      </TouchableOpacity>

      <Text style={styles.paywallFooter}>Cancel anytime. No tricks.</Text>
    </ScrollView>
  );
}

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export async function checkOnboardingComplete(isAuthenticated: boolean = false): Promise<boolean> {
  // Guest users always see onboarding
  if (!isAuthenticated) {
    return false;
  }

  // Only check storage for authenticated users
  try {
    const complete = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
    return complete === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    // Clear BOTH keys. This file's ONBOARDING_COMPLETE_KEY is '@onboarding_complete',
    // but the live flow is OnboardingV2, which writes '@onboarding_v2_complete'.
    // Removing only the legacy key meant Settings → Restart Onboarding silently
    // did nothing: the v2 flag survived, so onboarding never reappeared.
    await AsyncStorage.multiRemove([
      ONBOARDING_COMPLETE_KEY,
      '@onboarding_v2_complete',
    ]);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 24,
  } as ViewStyle,
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  } as ViewStyle,
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
  } as ViewStyle,
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 80,
  } as ViewStyle,
  stepContainer: {
    alignItems: 'center',
    width: '100%',
    minHeight: SCREEN_HEIGHT * 0.75,
    justifyContent: 'flex-start',
  } as ViewStyle,
  iconContainer: {
    marginBottom: 32,
    marginTop: 20,
  } as ViewStyle,
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  } as TextStyle,
  description: {
    fontSize: 17,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
    marginBottom: 32,
  } as TextStyle,
  footer: {
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto' as const,
    paddingBottom: 40,
  } as ViewStyle,
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 220,
    gap: 8,
  } as ViewStyle,
  nextButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700' as const,
  } as TextStyle,
  stepLabel: {
    fontSize: 12,
    color: colors.accent.primary,
    fontWeight: '600' as const,
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  questionHeader: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  } as ViewStyle,
  optionsScroll: {
    flex: 1,
    width: '100%',
  } as ViewStyle,
  optionsContainer: {
    gap: 12,
    paddingBottom: 20,
  } as ViewStyle,
  identityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 14,
  } as ViewStyle,
  identityOptionPressed: {
    backgroundColor: 'rgba(230, 51, 51, 0.15)',
    borderColor: colors.accent.primary,
  } as ViewStyle,
  identityEmoji: {
    fontSize: 28,
  } as TextStyle,
  identityContent: {
    flex: 1,
  } as ViewStyle,
  identityTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 2,
  } as TextStyle,
  identityDescription: {
    color: '#888',
    fontSize: 14,
  } as TextStyle,
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  radioOuterSelected: {
    borderColor: colors.accent.primary,
  } as ViewStyle,
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent.primary,
  } as ViewStyle,
  reinforcementIcon: {
    marginBottom: 24,
    marginTop: 20,
  } as ViewStyle,
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  reinforcementHeadline: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 300,
    marginBottom: 32,
  } as TextStyle,
  profileCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  } as ViewStyle,
  profileTitle: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600' as const,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  } as TextStyle,
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  } as ViewStyle,
  profileEmoji: {
    fontSize: 20,
  } as TextStyle,
  profileItemContent: {
    flex: 1,
  } as ViewStyle,
  profileLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  profileValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500' as const,
  } as TextStyle,
  calibratedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  } as TextStyle,
  calibratedHighlight: {
    color: '#fff',
    fontWeight: '500' as const,
  } as TextStyle,
  valueHeader: {
    alignItems: 'center',
    marginBottom: 24,
  } as ViewStyle,
  benefitsScroll: {
    flex: 1,
    width: '100%',
  } as ViewStyle,
  benefitsContainer: {
    gap: 16,
    paddingBottom: 24,
  } as ViewStyle,
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  } as ViewStyle,
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(230, 51, 51, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  benefitContent: {
    flex: 1,
  } as ViewStyle,
  benefitTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600' as const,
    marginBottom: 4,
  } as TextStyle,
  benefitDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  } as TextStyle,
  featureList: {
    width: '100%',
    gap: 16,
    marginTop: 16,
    marginBottom: 32,
  } as ViewStyle,
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  } as ViewStyle,
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(230, 51, 51, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  featureContent: {
    flex: 1,
  } as ViewStyle,
  featureTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 2,
  } as TextStyle,
  featureDescription: {
    color: '#888',
    fontSize: 14,
  } as TextStyle,
  paywallScroll: {
    flex: 1,
    width: '100%',
  } as ViewStyle,
  paywallContent: {
    paddingVertical: 20,
    alignItems: 'center',
  } as ViewStyle,
  paywallHeader: {
    alignItems: 'center',
    marginBottom: 24,
  } as ViewStyle,
  paywallTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 6,
  } as TextStyle,
  paywallSubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  } as TextStyle,
  plansContainer: {
    width: '100%',
    gap: 14,
    marginBottom: 20,
  } as ViewStyle,
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 16,
    padding: 18,
    position: 'relative' as const,
  } as ViewStyle,
  planCardSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  } as ViewStyle,
  planCardLifetime: {
    borderColor: colors.accent.primary,
    borderWidth: 3,
  } as ViewStyle,
  planBadge: {
    position: 'absolute' as const,
    top: -12,
    right: 18,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  } as ViewStyle,
  planBadgeLifetime: {
    backgroundColor: '#FFD700',
  } as ViewStyle,
  planBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800' as const,
  } as TextStyle,
  planHeader: {
    marginBottom: 14,
  } as ViewStyle,
  planName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 6,
  } as TextStyle,
  planPrice: {
    color: colors.accent.primary,
    fontSize: 32,
    fontWeight: '800' as const,
    marginBottom: 2,
  } as TextStyle,
  planPerMonth: {
    color: '#888',
    fontSize: 13,
    marginBottom: 2,
  } as TextStyle,
  planSavings: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '600' as const,
  } as TextStyle,
  planFeatures: {
    gap: 8,
  } as ViewStyle,
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  planFeatureText: {
    color: '#bbb',
    fontSize: 14,
    flex: 1,
  } as TextStyle,
  selectedIndicator: {
    position: 'absolute' as const,
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  purchaseButton: {
    width: '100%',
    backgroundColor: colors.accent.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  } as ViewStyle,
  purchaseButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800' as const,
  } as TextStyle,
  freeButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  freeButtonText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500' as const,
  } as TextStyle,
  paywallFooter: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  } as TextStyle,
});
