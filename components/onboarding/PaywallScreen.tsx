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
  ScrollView,
  Image,
  Modal,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

const HERO_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/onboarding/raking_chips.png?v=2';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  PRODUCT_IDS,
  type PlanType,
} from '@/services/revenueCat';
import {
  calculateMonthlyEquivalent,
  calculateWeeklyEquivalent,
  getBasePrice,
} from '@/utils/priceFormatting';

type PaywallScreenProps = {
  goal: string;
  userName: string | null;
  onPurchase: (planId: 'weekly' | 'yearly') => void;
  onSkip: () => void;
};

// URLs for Terms and Privacy
const TERMS_URL = 'https://universoleappstudios.com/pokergpt/terms';
const PRIVACY_URL = 'https://universoleappstudios.com/pokergpt/privacy';

export function PaywallScreen({ goal, userName, onPurchase, onSkip }: PaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showLastChance, setShowLastChance] = useState(false);
  const [prices, setPrices] = useState<{
    weekly: string | null;
    yearlyPerWeek: string | null;
    yearlyTotal: string | null;
    yearlyPerMonth: string | null;
    specialYearly: string | null;
    specialPerMonth: string | null;
  }>({
    weekly: null,
    yearlyPerWeek: null,
    yearlyTotal: null,
    yearlyPerMonth: null,
    specialYearly: null,
    specialPerMonth: null,
  });
  const [priceError, setPriceError] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const timelineAnim = useRef(new Animated.Value(0)).current;
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
          // There is no `offerings.special` — RevenueCat only exposes the standard
          // package accessors ($rc_weekly/$rc_annual). The special offer has to be
          // found in availablePackages, the same way getPackageForPlan('special')
          // resolves it for the actual purchase. Reading `.special` returned
          // undefined on every platform, which tripped the "missing price data"
          // branch below even when the store was fully configured.
          const specialPrice = offerings.availablePackages.find(
            (pkg) =>
              pkg.identifier === '$rc_special' ||
              pkg.product.identifier === PRODUCT_IDS.SPECIAL
          )?.product.priceString;

          // Verify all required prices are available
          if (!weeklyPrice || !yearlyPrice || !specialPrice) {
            console.error('Missing price data from RevenueCat');
            setPriceError(true);
            return;
          }

          // Use utility functions for consistent currency formatting
          const yearlyPerWeek = calculateWeeklyEquivalent(yearlyPrice);
          const yearlyPerMonth = calculateMonthlyEquivalent(yearlyPrice);
          const specialPerMonth = calculateMonthlyEquivalent(specialPrice);

          setPrices({
            weekly: weeklyPrice,
            yearlyPerWeek,
            yearlyTotal: yearlyPrice,
            yearlyPerMonth,
            specialYearly: specialPrice,
            specialPerMonth,
          });
        } else {
          setPriceError(true);
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        setPriceError(true);
      }
    };

    fetchPrices();
  }, []);

  // Gated on prices being loaded: the paywall renders a spinner until then, so
  // running the entrance animations on mount would play them while nothing is
  // visible and reveal the real content already half-animated.
  const pricesLoaded = !!(prices.weekly && prices.yearlyTotal && prices.specialYearly);

  useEffect(() => {
    if (!pricesLoaded) return;

    // Header entrance
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Timeline entrance
    setTimeout(() => {
      Animated.spring(timelineAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Pricing cards entrance
    setTimeout(() => {
      Animated.spring(pricingAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 400);

    // Button entrance
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 600);
  }, [pricesLoaded]);

  const handlePlanSelect = (plan: 'weekly' | 'yearly') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(plan);
  };

  const handleGetStarted = async () => {
    if (isPurchasing || !prices.weekly || !prices.yearlyTotal) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await purchasePackage(selectedPlan);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPurchase(selectedPlan);
      } else if (result.error === 'cancelled') {
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
    setShowLastChance(true);
  };

  const handleSpecialOffer = async () => {
    if (isPurchasing || !prices.specialYearly) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Try to purchase the special offer
      const result = await purchasePackage('special' as PlanType);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowLastChance(false);
        onPurchase('yearly'); // Treat as yearly purchase
      } else if (result.error === 'cancelled') {
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

  const handleFinalSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLastChance(false);
    onSkip();
  };

  const openURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Failed to open URL:', error);
    }
  };

  // Google Play "broken functionality": if the store returns no products, every
  // price below falls back to '...' and the purchase buttons become dead controls
  // showing no price. vc7 was rejected for exactly that. Rather than render a
  // priced-looking paywall we can't transact, advance past it via the existing
  // skip path — the user keeps the free tier and sees no broken UI.
  useEffect(() => {
    if (priceError) {
      onSkip();
    }
  }, [priceError, onSkip]);

  if (priceError) {
    return null;
  }

  // Prices arrive asynchronously. Until they do, showing the paywall would render
  // '...' in place of every price — the same dead-control state Play flagged — so
  // hold on a spinner instead of a priced-looking screen with no prices.
  if (!pricesLoaded) {
    return (
      <View style={[styles.container, styles.priceLoadingContainer]}>
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  // Dynamic timeline Day 3 text based on selected plan
  const billingText = selectedPlan === 'yearly'
    ? `Billing starts. You'll be charged ${prices.yearlyTotal || '...'} per year`
    : `Billing starts. You'll be charged ${prices.weekly || '...'} per week`;

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: HERO_IMAGE_URL }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.heroGradient}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Headline */}
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
          <Text style={styles.headline}>
            {selectedPlan === 'yearly' ? `Start your 3-day${'\n'}free trial` : `Choose your${'\n'}plan`}
          </Text>
        </Animated.View>

        {/* Trial Timeline */}
        <Animated.View
          style={[
            styles.timelineCard,
            {
              opacity: timelineAnim,
              transform: [
                {
                  scale: timelineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Day 1 - Today */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineDotColumn}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDayLabel}>Today</Text>
              <Text style={styles.timelineDescription}>
                Start making better decisions at the table
              </Text>
            </View>
          </View>

          {/* Day 2 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineDotColumn}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDayLabel}>Day 2</Text>
              <Text style={styles.timelineDescription}>
                See your first improvements in real games
              </Text>
            </View>
          </View>

          {/* Day 3 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineDotColumn}>
              <View style={[styles.timelineDot, styles.timelineDotLast]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDayLabel}>Day 3</Text>
              <Text style={styles.timelineDescription}>{billingText}</Text>
            </View>
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
          {/* Weekly Card */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'weekly' && styles.pricingCardSelected,
            ]}
            onPress={() => handlePlanSelect('weekly')}
            activeOpacity={0.8}
          >
            <Text style={[styles.planName, { marginTop: 20 }]}>Weekly</Text>
            <Text style={styles.planPrice}>{prices.weekly || '...'}</Text>
            <Text style={styles.planBillingPeriod}>per week</Text>

            {selectedPlan === 'weekly' && (
              <View style={styles.selectedIndicator}>
                <Check size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Yearly Card */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'yearly' && styles.pricingCardSelected,
            ]}
            onPress={() => handlePlanSelect('yearly')}
            activeOpacity={0.8}
          >
            {/* 3 days free badge - sits on top border */}
            {selectedPlan === 'yearly' && (
              <View style={styles.trialBadge}>
                <Text style={styles.trialBadgeText}>3 days free</Text>
              </View>
            )}

            <Text style={[styles.planName, { marginTop: 20 }]}>Yearly</Text>
            <Text style={styles.planPrice}>{prices.yearlyTotal || '...'}</Text>
            <Text style={styles.planBillingPeriod}>per year</Text>
            <Text style={styles.planPriceBreakdown}>{prices.yearlyPerWeek || '...'}/week</Text>

            {selectedPlan === 'yearly' && (
              <View style={styles.selectedIndicator}>
                <Check size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* No payment due now */}
        {selectedPlan === 'yearly' && (
          <Animated.View
            style={[
              styles.reassuranceRow,
              {
                opacity: buttonAnim,
              },
            ]}
          >
            <Check size={18} color={colors.onboarding.gold} strokeWidth={3} />
            <Text style={styles.reassuranceText}>No payment due now</Text>
          </Animated.View>
        )}

        {/* Trial Terms and Cancellation Instructions */}
        {selectedPlan === 'yearly' && (
          <Animated.View
            style={[
              styles.trialTermsCard,
              {
                opacity: buttonAnim,
              },
            ]}
          >
            <Text style={styles.trialTermsTitle}>Trial Terms</Text>
            <Text style={styles.trialTermsText}>
              • Your 3-day free trial starts today{'\n'}
              • After 3 days, you'll be charged {prices.yearlyTotal || '...'} per year{'\n'}
              • Subscription automatically renews yearly unless cancelled{'\n'}
              • Cancel anytime in Google Play Store settings before trial ends to avoid charges
            </Text>
            <Text style={styles.trialTermsCancel}>
              To cancel: Open Google Play Store → Menu → Subscriptions → PokerPro AI → Cancel Subscription
            </Text>
          </Animated.View>
        )}

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
              <Text style={styles.ctaButtonText}>
                {selectedPlan === 'yearly' ? 'Start my 3-day free trial' : 'Subscribe Weekly'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Below button - pricing info */}
          <Text style={styles.belowButtonText}>
            {selectedPlan === 'yearly'
              ? `3 days free, then ${prices.yearlyTotal || '...'} per year (${prices.yearlyPerMonth || '...'}/month)`
              : `${prices.weekly || '...'} per week`}
          </Text>
        </Animated.View>

        {/* Continue Free Button */}
        <Animated.View
          style={[
            styles.continueFreeContainer,
            { opacity: buttonAnim },
          ]}
        >
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
            <Text style={styles.continueFreeText}>Maybe later</Text>
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
      </ScrollView>

      {/* Last Chance Modal */}
      <Modal
        visible={showLastChance}
        transparent
        animationType="fade"
        onRequestClose={handleFinalSkip}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <Text style={styles.modalTitle}>Wait! Last Chance 🎉</Text>
            <Text style={styles.modalSubtitle}>
              Get everything for just {prices.specialYearly || '...'}
            </Text>

            {/* Price Comparison */}
            <View style={styles.priceComparisonCard}>
              <View style={styles.priceRow}>
                <Text style={styles.normalPriceLabel}>Normal Price:</Text>
                <Text style={styles.normalPriceStrikethrough}>{prices.yearlyTotal || '...'}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.specialPriceLabel}>Your Price:</Text>
                <Text style={styles.specialPrice}>{prices.specialYearly || '...'}</Text>
              </View>
              <View style={styles.savingsRow}>
                <Text style={styles.savingsText}>Just {prices.specialPerMonth || '...'}/month</Text>
              </View>
            </View>

            {/* Features */}
            <View style={styles.modalFeaturesContainer}>
              <View style={styles.modalFeatureRow}>
                <Check size={18} color={colors.onboarding.gold} />
                <Text style={styles.modalFeatureText}>Stop making costly mistakes</Text>
              </View>
              <View style={styles.modalFeatureRow}>
                <Check size={18} color={colors.onboarding.gold} />
                <Text style={styles.modalFeatureText}>Win more pots per session</Text>
              </View>
              <View style={styles.modalFeatureRow}>
                <Check size={18} color={colors.onboarding.gold} />
                <Text style={styles.modalFeatureText}>Play with confidence</Text>
              </View>
            </View>

            {/* CTA Buttons */}
            <TouchableOpacity
              style={styles.modalCtaButton}
              onPress={handleSpecialOffer}
              disabled={isPurchasing}
              activeOpacity={0.8}
            >
              {isPurchasing ? (
                <ActivityIndicator color={colors.text.dark} />
              ) : (
                <Text style={styles.modalCtaButtonText}>
                  Get Special Offer - {prices.specialYearly || '...'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSkipButton}
              onPress={handleFinalSkip}
              disabled={isPurchasing}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSkipButtonText}>No thanks, continue free</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  priceLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'flex-end',
  } as ViewStyle,
  header: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  } as ViewStyle,
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
  } as TextStyle,
  // Timeline
  timelineCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
  } as ViewStyle,
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 4,
  } as ViewStyle,
  timelineDotColumn: {
    width: 28,
    alignItems: 'center',
    paddingTop: 5,
  } as ViewStyle,
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.onboarding.gold,
  } as ViewStyle,
  timelineDotLast: {
    backgroundColor: colors.onboarding.gold,
  } as ViewStyle,
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(212, 168, 75, 0.3)',
    marginVertical: 4,
  } as ViewStyle,
  timelineContent: {
    flex: 1,
    marginLeft: 16,
    paddingBottom: 20,
  } as ViewStyle,
  timelineDayLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,
  timelineDescription: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 23,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,
  // Pricing
  pricingContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  } as ViewStyle,
  pricingCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    overflow: 'visible',
  } as ViewStyle,
  pricingCardSelected: {
    borderColor: colors.onboarding.gold,
    backgroundColor: 'rgba(232, 184, 74, 0.08)',
  } as ViewStyle,
  trialBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: colors.onboarding.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  } as ViewStyle,
  trialBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.dark,
  } as TextStyle,
  planName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  } as TextStyle,
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  } as TextStyle,
  planBillingPeriod: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  } as TextStyle,
  planPriceBreakdown: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
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
  // Reassurance
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  } as ViewStyle,
  reassuranceText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  } as TextStyle,
  // Trial Terms
  trialTermsCard: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  } as ViewStyle,
  trialTermsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onboarding.gold,
    marginBottom: 8,
  } as TextStyle,
  trialTermsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginBottom: 10,
  } as TextStyle,
  trialTermsCancel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
    fontStyle: 'italic',
  } as TextStyle,
  // CTA
  ctaContainer: {
    width: '100%',
    marginBottom: 8,
  } as ViewStyle,
  ctaButton: {
    width: '100%',
    backgroundColor: colors.onboarding.gold,
    borderRadius: 14,
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
    fontSize: 19,
    fontWeight: '700',
    color: colors.text.dark,
  } as TextStyle,
  ctaButtonDisabled: {
    opacity: 0.7,
  } as ViewStyle,
  belowButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 10,
  } as TextStyle,
  continueFreeContainer: {
    marginTop: 16,
    alignItems: 'center',
  } as ViewStyle,
  continueFreeText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  } as TextStyle,
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
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
  heroContainer: {
    position: 'absolute',
    top: -120,
    left: 0,
    right: 0,
    height: '65%',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  } as ViewStyle,
  modalContent: {
    width: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.onboarding.gold,
    shadowColor: colors.onboarding.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  } as ViewStyle,
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  } as TextStyle,
  modalSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
  } as TextStyle,
  priceComparisonCard: {
    backgroundColor: 'rgba(232, 184, 74, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.3)',
  } as ViewStyle,
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  normalPriceLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  } as TextStyle,
  normalPriceStrikethrough: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  } as TextStyle,
  specialPriceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  } as TextStyle,
  specialPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onboarding.gold,
  } as TextStyle,
  savingsRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232, 184, 74, 0.2)',
  } as ViewStyle,
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onboarding.profit,
    textAlign: 'center',
  } as TextStyle,
  modalFeaturesContainer: {
    gap: 12,
    marginBottom: 24,
  } as ViewStyle,
  modalFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  modalFeatureText: {
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
  } as TextStyle,
  modalCtaButton: {
    backgroundColor: colors.onboarding.gold,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.onboarding.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
  modalCtaButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.dark,
  } as TextStyle,
  modalSkipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  } as ViewStyle,
  modalSkipButtonText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  } as TextStyle,
});

export default PaywallScreen;
