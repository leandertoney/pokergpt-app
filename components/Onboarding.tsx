import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, ScrollView, PanResponder, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Mic, Sparkles, ChevronRight, Check, Trophy, Target, TrendingUp, Users, Zap, Crown, Flame } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserTier } from '@/services/storageService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

type OnboardingStepType = 'welcome' | 'social' | 'outcome' | 'question' | 'reinforcement' | 'value' | 'feature' | 'paywall';

type OnboardingStep = {
  type: OnboardingStepType;
  title: string;
  description: string;
  icon?: React.ReactNode;
  question?: string;
  options?: string[];
};

const steps: OnboardingStep[] = [
  {
    type: 'welcome',
    title: 'Welcome to PokerGPT',
    description: 'You just joined the smartest poker players who use AI to level up their game.',
    icon: <Sparkles size={64} color="#D4AF37" />,
  },
  {
    type: 'social',
    title: '47,000+ Players Trust Us',
    description: 'Top pros and grinders use PokerGPT to study hands and fix leaks faster than ever.',
    icon: <Users size={64} color="#D4AF37" />,
  },
  {
    type: 'outcome',
    title: 'See Your Game Transform',
    description: 'Players see better results in just 2 weeks. Fewer bad calls. More confident bets. Bigger wins.',
    icon: <TrendingUp size={64} color="#D4AF37" />,
  },
  {
    type: 'question',
    title: 'What Brings You Here?',
    description: '',
    question: 'Pick the one that fits you best:',
    options: [
      'I want to win more money',
      'I want to stop making bad calls',
      'I want to learn like a pro',
      'I want to crush my home game',
    ],
  },
  {
    type: 'reinforcement',
    title: 'Perfect. We Got You.',
    description: 'PokerGPT was built for players like you who want real results, not just theory.',
    icon: <Target size={64} color="#D4AF37" />,
  },
  {
    type: 'question',
    title: 'How Often Do You Play?',
    description: '',
    question: 'This helps us give you better advice:',
    options: [
      'Every day or most days',
      'A few times per week',
      'Once a week or less',
      'Just started playing',
    ],
  },
  {
    type: 'value',
    title: 'Here is How It Works',
    description: 'Talk about your hand. We ask smart questions. You get advice that fits your game.',
    icon: <MessageCircle size={64} color="#D4AF37" />,
  },
  {
    type: 'feature',
    title: 'Pro Features You Get',
    description: '',
    icon: <Crown size={64} color="#D4AF37" />,
  },
  {
    type: 'paywall',
    title: 'Pick Your Plan',
    description: '',
  },
];

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
    price: '$6.99',
    perMonth: '$6.99/week',
    features: [
      'Save all your hands',
      'Full AI breakdowns',
      'Voice input',
      'Mariano coach mode',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$34.99',
    perMonth: '$2.91/month',
    badge: 'SAVE 50%',
    savings: 'Save $329 vs weekly',
    features: [
      'Everything in Weekly',
      'Priority support',
      'Early new features',
      'Best for serious players',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '$49',
    perMonth: 'One time',
    badge: 'BEST VALUE',
    savings: 'Pay once, own forever',
    features: [
      'Everything in Yearly',
      'Never pay again',
      'All future updates',
      'VIP treatment',
    ],
  },
];

type OnboardingProps = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'yearly' | 'lifetime'>('lifetime');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;

  const step = steps[currentStep];

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
    if (step.type === 'paywall') {
      return;
    }

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

  const handleQuestionAnswer = (answer: string) => {
    setUserAnswers({ ...userAnswers, [currentStep]: answer });
    setTimeout(() => handleNext(), 300);
  };

  const handleFreeTier = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    await setUserTier('free');
    onComplete();
  };

  const handlePurchase = async (planId: 'weekly' | 'yearly' | 'lifetime') => {
    console.log('User selected plan:', planId);
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    await setUserTier('paid');
    onComplete();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3d1a1a', '#2d0f0f', '#1a0808', '#0f0303']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
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
            {step.type === 'question' ? (
              <QuestionStep 
                step={step} 
                onAnswer={handleQuestionAnswer}
                scaleAnim={scaleAnim}
                iconScaleAnim={iconScaleAnim}
                iconRotateAnim={iconRotateAnim}
              />
            ) : step.type === 'feature' ? (
              <FeatureStep 
                step={step} 
                onNext={handleNext}
                scaleAnim={scaleAnim}
                iconScaleAnim={iconScaleAnim}
                iconRotateAnim={iconRotateAnim}
              />
            ) : step.type === 'paywall' ? (
              <PaywallStep 
                plans={plans}
                selectedPlan={selectedPlan}
                onSelectPlan={setSelectedPlan}
                onPurchase={handlePurchase}
                onFreeTier={handleFreeTier}
              />
            ) : (
              <StandardStep 
                step={step} 
                onNext={handleNext}
                scaleAnim={scaleAnim}
                iconScaleAnim={iconScaleAnim}
                iconRotateAnim={iconRotateAnim}
              />
            )}
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

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
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
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
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
          <ChevronRight size={20} color="#000" />
        </TouchableOpacity>
      </View>
    </>
  );
}

function QuestionStep({ step, onAnswer, scaleAnim, iconScaleAnim, iconRotateAnim }: { 
  step: OnboardingStep; 
  onAnswer: (answer: string) => void;
  scaleAnim: Animated.Value;
  iconScaleAnim: Animated.Value;
  iconRotateAnim: Animated.Value;
}) {
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const optionAnims = useRef(
    (step.options || []).map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = optionAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 80),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  return (
    <>
      <Animated.View style={[styles.questionHeader, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.title}>{step.title}</Text>
        {step.question && <Text style={styles.question}>{step.question}</Text>}
      </Animated.View>

      <View style={styles.optionsContainer}>
        {step.options?.map((option, index) => {
          const translateY = optionAnims[index]?.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }) || 0;

          return (
            <Animated.View
              key={index}
              style={{
                opacity: optionAnims[index] || 1,
                transform: [{ translateY }],
              }}
            >
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  pressedIndex === index && styles.optionButtonPressed,
                ]}
                onPress={() => {
                  setPressedIndex(index);
                  setTimeout(() => onAnswer(option), 150);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.optionText}>{option}</Text>
                <ChevronRight size={20} color="#D4AF37" />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.footer} />
    </>
  );
}

function FeatureStep({ step, onNext, scaleAnim, iconScaleAnim, iconRotateAnim }: { 
  step: OnboardingStep; 
  onNext: () => void;
  scaleAnim: Animated.Value;
  iconScaleAnim: Animated.Value;
  iconRotateAnim: Animated.Value;
}) {
  const features = [
    { icon: <Zap size={32} color="#D4AF37" />, title: 'Save Every Hand', description: 'Never lose a hand again' },
    { icon: <Trophy size={32} color="#D4AF37" />, title: 'Full AI Breakdowns', description: 'GTO plus street advice' },
    { icon: <Mic size={32} color="#D4AF37" />, title: 'Voice Mode', description: 'Talk like you are at the table' },
    { icon: <Flame size={32} color="#D4AF37" />, title: 'Mariano Coach', description: 'Get hype. Learn faster.' },
  ];

  const featureAnims = useRef(features.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = featureAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 120),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
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
        style={[
          styles.iconContainer,
          { 
            transform: [
              { scale: iconScaleAnim },
              { rotate: iconRotate },
            ],
          },
        ]}
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
              style={{
                opacity: featureAnims[index],
                transform: [{ translateX }],
              }}
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

      <TouchableOpacity 
        style={styles.nextButton} 
        onPress={onNext}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>See Plans</Text>
        <ChevronRight size={20} color="#000" />
      </TouchableOpacity>
    </>
  );
}

function PaywallStep({ plans, selectedPlan, onSelectPlan, onPurchase, onFreeTier }: {
  plans: PricingPlan[];
  selectedPlan: 'weekly' | 'yearly' | 'lifetime';
  onSelectPlan: (plan: 'weekly' | 'yearly' | 'lifetime') => void;
  onPurchase: (plan: 'weekly' | 'yearly' | 'lifetime') => void;
  onFreeTier: () => void;
}) {
  return (
    <ScrollView style={styles.paywallScroll} contentContainerStyle={styles.paywallContent} showsVerticalScrollIndicator={false}>
      <View style={styles.paywallHeader}>
        <Crown size={48} color="#D4AF37" />
        <Text style={styles.paywallTitle}>Unlock Your Full Game</Text>
        <Text style={styles.paywallSubtitle}>Join players winning more every week</Text>
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
                {plan.savings && (
                  <Text style={styles.planSavings}>{plan.savings}</Text>
                )}
              </View>

              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.planFeature}>
                    <Check size={16} color="#D4AF37" />
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
        <Text style={styles.purchaseButtonText}>Start Winning Now</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.freeButton}
        onPress={onFreeTier}
        activeOpacity={0.7}
      >
        <Text style={styles.freeButtonText}>Continue with 5 Free Hands</Text>
      </TouchableOpacity>

      <Text style={styles.paywallFooter}>Cancel anytime. No tricks.</Text>
    </ScrollView>
  );
}

export async function checkOnboardingComplete(): Promise<boolean> {
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
    await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  } as ViewStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 60,
  } as ViewStyle,
  stepContainer: {
    alignItems: 'center',
    width: '100%',
    minHeight: SCREEN_HEIGHT * 0.75,
    justifyContent: 'flex-start',
  } as ViewStyle,
  iconContainer: {
    marginBottom: 40,
    marginTop: 20,
  } as ViewStyle,
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  } as TextStyle,
  description: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 340,
    marginBottom: 40,
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
    backgroundColor: '#D4AF37',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 220,
    gap: 8,
  } as ViewStyle,
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700' as const,
  } as TextStyle,
  questionHeader: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  } as ViewStyle,
  question: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
  optionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 40,
  } as ViewStyle,
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
  } as ViewStyle,
  optionButtonPressed: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#D4AF37',
  } as ViewStyle,
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
  } as TextStyle,
  featureList: {
    width: '100%',
    gap: 20,
    marginTop: 24,
    marginBottom: 40,
  } as ViewStyle,
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  } as ViewStyle,
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  featureContent: {
    flex: 1,
  } as ViewStyle,
  featureTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  } as TextStyle,
  featureDescription: {
    color: '#999',
    fontSize: 14,
  } as TextStyle,
  paywallScroll: {
    flex: 1,
    width: '100%',
  } as ViewStyle,
  paywallContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  } as ViewStyle,
  paywallHeader: {
    alignItems: 'center',
    marginBottom: 32,
  } as ViewStyle,
  paywallTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  } as TextStyle,
  paywallSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  } as TextStyle,
  plansContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  } as ViewStyle,
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 16,
    padding: 20,
    position: 'relative' as const,
  } as ViewStyle,
  planCardSelected: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  } as ViewStyle,
  planCardLifetime: {
    borderColor: '#D4AF37',
    borderWidth: 3,
  } as ViewStyle,
  planBadge: {
    position: 'absolute' as const,
    top: -12,
    right: 20,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  planBadgeLifetime: {
    backgroundColor: '#FFD700',
  } as ViewStyle,
  planBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800' as const,
  } as TextStyle,
  planHeader: {
    marginBottom: 16,
  } as ViewStyle,
  planName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  } as TextStyle,
  planPrice: {
    color: '#D4AF37',
    fontSize: 36,
    fontWeight: '800' as const,
    marginBottom: 4,
  } as TextStyle,
  planPerMonth: {
    color: '#999',
    fontSize: 14,
    marginBottom: 4,
  } as TextStyle,
  planSavings: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600' as const,
  } as TextStyle,
  planFeatures: {
    gap: 10,
  } as ViewStyle,
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  planFeatureText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  } as TextStyle,
  selectedIndicator: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  purchaseButton: {
    width: '100%',
    backgroundColor: '#D4AF37',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  } as ViewStyle,
  purchaseButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800' as const,
  } as TextStyle,
  freeButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  } as ViewStyle,
  freeButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600' as const,
  } as TextStyle,
  paywallFooter: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
});
