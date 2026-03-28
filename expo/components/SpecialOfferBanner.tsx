import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { X, Sparkles, Check, Infinity } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { SPECIAL_OFFER, LIFETIME_PLAN } from '@/types/paywall';

type SpecialOfferBannerProps = {
  onAccept: () => void;
  onDismiss: () => void;
};

export function SpecialOfferBanner({ onAccept, onDismiss }: SpecialOfferBannerProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic to get attention
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAccept();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Sparkles size={28} color={colors.onboarding.gold} />
            </View>
            <Text style={styles.headerTitle}>Wait! First-Time Offer</Text>
            <Text style={styles.headerSubtitle}>
              Unlock lifetime access at a special price
            </Text>
          </View>

          {/* Pricing */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <View style={styles.infinityIcon}>
                <Infinity size={24} color={colors.onboarding.gold} />
              </View>
              <Text style={styles.planName}>Lifetime Access</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>{SPECIAL_OFFER.originalPrice}</Text>
              <Text style={styles.discountedPrice}>{SPECIAL_OFFER.discountedPrice}</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>SAVE {SPECIAL_OFFER.discountPercent}%</Text>
              </View>
            </View>

            <View style={styles.featuresContainer}>
              {LIFETIME_PLAN.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Check size={16} color={colors.onboarding.gold} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleAccept}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaText}>Claim Lifetime Access</Text>
          </TouchableOpacity>

          {/* Dismiss text */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
          >
            <Text style={styles.dismissText}>No thanks, I'll stay on free</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  } as ViewStyle,
  container: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(232, 184, 74, 0.3)',
  } as ViewStyle,
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  } as ViewStyle,
  header: {
    alignItems: 'center',
    marginBottom: 20,
  } as ViewStyle,
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(232, 184, 74, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  } as ViewStyle,
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  } as TextStyle,
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  } as TextStyle,
  pricingCard: {
    backgroundColor: 'rgba(232, 184, 74, 0.08)',
    borderWidth: 2,
    borderColor: colors.onboarding.gold,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  } as ViewStyle,
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  } as ViewStyle,
  infinityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(232, 184, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onboarding.gold,
  } as TextStyle,
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  } as ViewStyle,
  originalPrice: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  } as TextStyle,
  discountedPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  } as TextStyle,
  saveBadge: {
    backgroundColor: colors.utility.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  } as ViewStyle,
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  featuresContainer: {
    gap: 10,
  } as ViewStyle,
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } as ViewStyle,
  featureText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  } as TextStyle,
  ctaButton: {
    backgroundColor: colors.onboarding.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.onboarding.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.dark,
  } as TextStyle,
  dismissButton: {
    paddingVertical: 8,
    alignItems: 'center',
  } as ViewStyle,
  dismissText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  } as TextStyle,
});

export default SpecialOfferBanner;
