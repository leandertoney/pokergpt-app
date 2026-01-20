import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaywallScreen } from '@/components/onboarding/PaywallScreen';
import { colors } from '@/constants/colors';
import { setUserTier } from '@/services/storageService';
import { checkSubscriptionStatus } from '@/services/revenueCat';

export default function PaywallRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePurchase = async (planId: 'weekly' | 'yearly') => {
    // Verify subscription status and update tier
    const status = await checkSubscriptionStatus();
    if (status.isSubscribed) {
      await setUserTier('paid');
    }
    router.back();
  };

  const handleSkip = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <LinearGradient
        colors={[colors.background.tertiary, colors.background.secondary, colors.background.primary]}
        style={[styles.gradient, { paddingTop: insets.top }]}
      >
        <PaywallScreen
          playStyle=""
          goal=""
          userName={null}
          onPurchase={handlePurchase}
          onSkip={handleSkip}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    flex: 1,
  },
});
