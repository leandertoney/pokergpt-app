import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { AnimatedLogo } from '@/components/AnimatedLogo';
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

// Features included in premium
const FEATURES = [
  'Unlimited hand analysis',
  'Voice input',
  'Full AI breakdowns',
  'Hand history',
];

export function PaywallScreen({ playStyle, goal, userName, onPurchase, onSkip }: PaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [prices, setPrices] = useState<{ weekly: string; yearly: string }>({
    weekly: '$4.99/wk',
    yearly: '$29.99/yr',
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
            weekly: weeklyPrice ? `${weeklyPrice}/wk` : '$4.99/wk',
            yearly: yearlyPrice ? `${yearlyPrice}/yr` : '$29.99/yr',
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
      {/* X Button - Top Right */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleSkip}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <X size={24} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <View style={styles.logoContainer}>
            <AnimatedLogo variant={1} size="small" loop />
          </View>
          <Text style={styles.headline}>Get PokerGPT Pro</Text>
          <Text style={styles.subtitle}>Your pocket coach, unlimited</Text>
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
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Check size={20} color={colors.onboarding.gold} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
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
              <Text style={styles.discountText}>88% OFF</Text>
            </View>

            <Text style={styles.planName}>Yearly</Text>
            <Text style={styles.planPrice}>$2.50/mo</Text>
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

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  } as ViewStyle,
  header: {
    alignItems: 'center',
    marginBottom: 24,
  } as ViewStyle,
  logoContainer: {
    marginBottom: 16,
  } as ViewStyle,
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  } as TextStyle,
  featuresCard: {
    width: '100%',
    backgroundColor: 'rgba(232, 184, 74, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  } as ViewStyle,
  featuresContainer: {
    gap: 14,
  } as ViewStyle,
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
  } as TextStyle,
  pricingContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 24,
  } as ViewStyle,
  pricingCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 20,
  } as ViewStyle,
  ctaButton: {
    width: '100%',
    backgroundColor: colors.onboarding.gold,
    borderRadius: 16,
    paddingVertical: 18,
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
  bottomSpacer: {
    height: 40,
  } as ViewStyle,
});

export default PaywallScreen;
