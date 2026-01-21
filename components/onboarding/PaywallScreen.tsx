import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  Dimensions,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X, Mic, Brain, Clock, Target, MessageCircle, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  type PlanType,
} from '@/services/revenueCat';

type PaywallScreenProps = {
  playStyle: string;
  goal: string;
  userName: string | null;
  onPurchase: (planId: 'weekly' | 'yearly') => void;
  onSkip: () => void;
};

// URLs for Terms and Privacy
const TERMS_URL = 'https://pokergpt.app/terms';
const PRIVACY_URL = 'https://pokergpt.app/privacy';

// Feature categories with icons and accent colors
type FeatureItem = {
  icon: typeof Check;
  text: string;
  highlight?: boolean; // Gold highlight for premium features
  profit?: boolean; // Green highlight for profit-related features
};

const FEATURES: FeatureItem[] = [
  { icon: MessageCircle, text: 'Unlimited hand analysis', highlight: true },
  { icon: Mic, text: 'Voice coaching - hands free', highlight: true },
  { icon: Brain, text: 'GTO & exploitative breakdowns' },
  { icon: Clock, text: 'Complete hand history' },
  { icon: Target, text: 'Daily review quiz + streaks', profit: true },
  { icon: Sparkles, text: 'Full hand training scenarios', profit: true },
];

// Hero image URL
const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/raking_chips.png';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function PaywallScreen({ playStyle, goal, userName, onPurchase, onSkip }: PaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [prices, setPrices] = useState<{ weekly: string; yearly: string }>({
    weekly: '$9.99/wk',
    yearly: '$49/yr',
  });

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const pricingAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  // Fetch real prices from RevenueCat
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const offerings = await getOfferings();
        if (offerings) {
          const weeklyPrice = offerings.weekly?.product.priceString;
          const yearlyPrice = offerings.annual?.product.priceString;

          setPrices({
            weekly: weeklyPrice ? `${weeklyPrice}/wk` : '$9.99/wk',
            yearly: yearlyPrice ? `${yearlyPrice}/yr` : '$49/yr',
          });
        }
      } catch (error) {
        console.warn('Failed to fetch prices:', error);
        // Keep default prices on error
      }
    };

    fetchPrices();
  }, []);

  useEffect(() => {
    // Header entrance
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Features card entrance
    setTimeout(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 150);

    // Pricing cards entrance
    setTimeout(() => {
      Animated.spring(pricingAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 300);

    // Button entrance
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 450);
  }, []);

  const handlePlanSelect = (plan: 'weekly' | 'yearly') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handleGetStarted = async () => {
    if (isPurchasing) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchasePackage(selectedPlan);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPurchase(selectedPlan);
      } else if (result.error === 'cancelled') {
        // User cancelled - do nothing
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (isLoading) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await restorePurchases();

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'OK', onPress: () => onPurchase('yearly') },
        ]);
      } else {
        Alert.alert('No Subscription Found', result.error || 'No active subscription to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const openURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Failed to open URL:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero Image - Absolute positioned to fill top */}
      <Animated.View
        style={[
          styles.heroContainer,
          {
            opacity: headerAnim,
            transform: [
              {
                scale: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.1, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: HERO_IMAGE_URL }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(26, 26, 26, 0.6)', colors.background.primary]}
          locations={[0, 0.5, 1]}
          style={styles.heroGradient}
        />
      </Animated.View>

      {/* X Button - Top Right */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleSkip}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <X size={24} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Header with Logo */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.headline}>Get PokerGPT Pro</Text>
          <Text style={styles.subtitle}>Unlock your edge at the table</Text>
        </Animated.View>

        {/* Features Card */}
        <Animated.View
          style={[
            styles.featuresCard,
            {
              opacity: cardAnim,
              transform: [
                {
                  scale: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.featuresTitle}>Everything you need to win</Text>
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => {
              const IconComponent = feature.icon;
              const iconColor = feature.profit
                ? colors.onboarding.profit
                : feature.highlight
                ? colors.onboarding.gold
                : 'rgba(255,255,255,0.7)';
              return (
                <View key={index} style={styles.featureRow}>
                  <View style={[
                    styles.featureIconContainer,
                    feature.profit && styles.featureIconProfit,
                    feature.highlight && styles.featureIconHighlight,
                  ]}>
                    <IconComponent size={14} color={iconColor} />
                  </View>
                  <Text style={[
                    styles.featureText,
                    feature.profit && styles.featureTextProfit,
                    feature.highlight && styles.featureTextHighlight,
                  ]}>
                    {feature.text}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Pricing Cards - Side by Side */}
        <Animated.View
          style={[
            styles.pricingContainer,
            {
              opacity: pricingAnim,
              transform: [
                {
                  translateY: pricingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Yearly Card */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'yearly' && styles.pricingCardSelected,
            ]}
            onPress={() => handlePlanSelect('yearly')}
            activeOpacity={0.8}
          >
            {/* Discount Badge */}
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>91% OFF</Text>
            </View>

            <Text style={styles.planName}>Yearly</Text>
            <Text style={styles.planPrice}>$4.08/mo</Text>
            <Text style={styles.planBilling}>Billed at {prices.yearly.replace('/yr', '')}/yr{'\n'}after free trial</Text>

            {/* Selection Indicator */}
            {selectedPlan === 'yearly' && (
              <View style={styles.selectedIndicator}>
                <Check size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Weekly Card */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'weekly' && styles.pricingCardSelected,
            ]}
            onPress={() => handlePlanSelect('weekly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.planName, { marginTop: 24 }]}>Weekly</Text>
            <Text style={styles.planPrice}>{prices.weekly}</Text>
            <Text style={styles.planBilling}>Billed weekly{'\n'}after free trial</Text>

            {/* Selection Indicator */}
            {selectedPlan === 'weekly' && (
              <View style={styles.selectedIndicator}>
                <Check size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View
          style={[
            styles.ctaContainer,
            {
              opacity: buttonAnim,
              transform: [
                {
                  translateY: buttonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.ctaButton, isPurchasing && styles.ctaButtonDisabled]}
            onPress={handleGetStarted}
            activeOpacity={0.9}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color={colors.text.dark} />
            ) : (
              <Text style={styles.ctaButtonText}>Start 3-day free trial</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Footer Links */}
        <Animated.View
          style={[
            styles.footer,
            { opacity: buttonAnim },
          ]}
        >
          <TouchableOpacity onPress={handleRestore} activeOpacity={0.7} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.onboarding.gold} />
            ) : (
              <Text style={styles.footerLink}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => openURL(TERMS_URL)} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => openURL(PRIVACY_URL)} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  } as ViewStyle,
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    overflow: 'hidden',
  } as ViewStyle,
  heroImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  } as ViewStyle,
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  header: {
    width: '100%',
    marginBottom: 8,
    alignItems: 'center',
  } as ViewStyle,
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  } as TextStyle,
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  } as TextStyle,
  featuresCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  } as ViewStyle,
  featuresTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  featuresContainer: {
    gap: 6,
  } as ViewStyle,
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  featureIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  featureIconHighlight: {
    backgroundColor: 'rgba(232, 184, 74, 0.15)',
  } as ViewStyle,
  featureIconProfit: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  } as ViewStyle,
  featureText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  } as TextStyle,
  featureTextHighlight: {
    color: colors.onboarding.gold,
    fontWeight: '600',
  } as TextStyle,
  featureTextProfit: {
    color: colors.onboarding.profit,
    fontWeight: '600',
  } as TextStyle,
  pricingContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 10,
  } as ViewStyle,
  pricingCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    position: 'relative',
  } as ViewStyle,
  pricingCardSelected: {
    borderColor: colors.onboarding.gold,
    backgroundColor: 'rgba(232, 184, 74, 0.08)',
  } as ViewStyle,
  discountBadge: {
    backgroundColor: colors.onboarding.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  } as ViewStyle,
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.dark,
  } as TextStyle,
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  } as TextStyle,
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  } as TextStyle,
  planBilling: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 16,
  } as TextStyle,
  selectedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.onboarding.gold,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  ctaContainer: {
    width: '100%',
    marginBottom: 8,
  } as ViewStyle,
  ctaButton: {
    width: '100%',
    backgroundColor: colors.onboarding.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.onboarding.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.dark,
  } as TextStyle,
  ctaButtonDisabled: {
    opacity: 0.7,
  } as ViewStyle,
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 'auto',
    paddingBottom: 20,
  } as ViewStyle,
  footerLink: {
    fontSize: 14,
    color: colors.onboarding.gold,
    fontWeight: '500',
  } as TextStyle,
  footerDot: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  } as TextStyle,
});

export default PaywallScreen;
