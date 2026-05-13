import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Bell, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { getPriceForPlan } from '@/services/revenueCat';
import { calculateMonthlyEquivalent } from '@/utils/priceFormatting';

type PrimingScreenTwoProps = {
  onNext: () => void;
};

export function PrimingScreenTwo({ onNext }: PrimingScreenTwoProps) {
  const [yearlyPrice, setYearlyPrice] = useState<string>('$29.99');
  const [monthlyEquiv, setMonthlyEquiv] = useState<string>('$2.50');

  const iconAnim = useRef(new Animated.Value(0)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const reassuranceAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const priceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await getPriceForPlan('yearly');
        if (price) {
          setYearlyPrice(price);
          const monthly = calculateMonthlyEquivalent(price);
          setMonthlyEquiv(monthly);
        }
      } catch {
        // Keep default price
      }
    };
    fetchPrice();
  }, []);

  useEffect(() => {
    // Bell icon entrance
    setTimeout(() => {
      Animated.spring(iconAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 200);

    // Headline
    setTimeout(() => {
      Animated.spring(headlineAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 400);

    // Reassurance
    setTimeout(() => {
      Animated.spring(reassuranceAnim, {
        toValue: 1,
        tension: 40,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }, 700);

    // Button
    setTimeout(() => {
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 900);

    // Price text
    setTimeout(() => {
      Animated.timing(priceAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 1100);
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Headline first */}
        <Animated.Text
          style={[
            styles.headline,
            {
              opacity: headlineAnim,
              transform: [
                {
                  translateY: headlineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          We'll send you a reminder{'\n'}before your trial ends
        </Animated.Text>

        {/* Bell Icon with notification counter badge - centered */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: iconAnim,
              transform: [
                {
                  scale: iconAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Bell size={64} color={colors.onboarding.gold} />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>1</Text>
          </View>
        </Animated.View>
      </View>

      {/* CTA Section */}
      <Animated.View
        style={[
          styles.buttonContainer,
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
        {/* Reassurance row - right above button */}
        <Animated.View
          style={[
            styles.reassuranceRow,
            {
              opacity: reassuranceAnim,
            },
          ]}
        >
          <Check size={18} color={colors.onboarding.gold} strokeWidth={3} />
          <Text style={styles.reassuranceText}>No payment due</Text>
        </Animated.View>

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>Continue for FREE</Text>
        </TouchableOpacity>

        {/* Anchor Price */}
        <Animated.Text
          style={[styles.anchorPrice, { opacity: priceAnim }]}
        >
          Just {yearlyPrice} per year ({monthlyEquiv}/month)
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  } as ViewStyle,
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212, 168, 75, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background.primary,
  } as ViewStyle,
  notificationBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  } as TextStyle,
  headline: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 48,
  } as TextStyle,
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  } as ViewStyle,
  reassuranceText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  } as TextStyle,
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    alignItems: 'center',
  } as ViewStyle,
  ctaButton: {
    width: '100%',
    backgroundColor: colors.onboarding.gold,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: colors.onboarding.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,
  ctaButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#000',
  } as TextStyle,
  anchorPrice: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
  } as TextStyle,
});

export default PrimingScreenTwo;
