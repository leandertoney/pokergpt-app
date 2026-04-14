import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CreditCard,
  Bell,
  HelpCircle,
  Shield,
  FileText,
  ChevronRight,
  Mic,
  Volume2,
  Info,
  LogIn,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import {
  checkSubscriptionStatus,
  restorePurchases,
  type SubscriptionStatus,
} from '@/services/revenueCat';

// URLs - Hosted on agency site
const HELP_URL = 'https://universoleappstudios.com/pokergpt/help';
const PRIVACY_URL = 'https://universoleappstudios.com/pokergpt/privacy';
const TERMS_URL = 'https://universoleappstudios.com/pokergpt/terms';

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}

function SettingsItem({ icon, title, subtitle, onPress, showChevron = true, rightElement }: SettingsItemProps) {
  const content = (
    <View style={styles.settingsItem}>
      <View style={styles.settingsItemIcon}>{icon}</View>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
      {showChevron && !rightElement && <ChevronRight size={20} color={colors.text.muted} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  // Voice input preference (stored locally for now)
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  // Fetch subscription status on mount
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const status = await checkSubscriptionStatus();
        setSubscriptionStatus(status);
      } catch (error) {
        console.warn('Failed to fetch subscription status:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscriptionStatus();
  }, []);

  const getSubscriptionSubtitle = () => {
    if (isLoadingSubscription) return 'Loading...';
    if (!subscriptionStatus) return 'Free tier';
    if (subscriptionStatus.isSubscribed) {
      if (subscriptionStatus.isInTrial) {
        return 'Pro (Trial)';
      }
      return 'Pro';
    }
    return 'Free tier';
  };

  const openURL = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open link');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const openNotificationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const showAbout = () => {
    Alert.alert(
      'PokerPro AI',
      `Version ${appVersion}\n\nYour AI-powered poker coach.\n\nAnalyze hands, calculate odds, and improve your game with expert guidance.`,
      [{ text: 'OK' }]
    );
  };

  const handleSubscription = () => {
    if (subscriptionStatus?.isSubscribed) {
      // User is subscribed - show manage options
      Alert.alert(
        'Manage Subscription',
        subscriptionStatus.isInTrial
          ? 'You are currently on a free trial.'
          : 'You have an active Pro subscription.',
        [
          {
            text: 'Manage in Settings',
            onPress: () => {
              // Open device subscription settings
              if (Platform.OS === 'ios') {
                Linking.openURL('https://apps.apple.com/account/subscriptions');
              } else {
                Linking.openURL('https://play.google.com/store/account/subscriptions');
              }
            },
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } else {
      // User is not subscribed - offer to subscribe or restore
      Alert.alert(
        'Upgrade to Pro',
        'Get unlimited hand analysis, voice input, and more.',
        [
          {
            text: 'Restore Purchase',
            onPress: handleRestorePurchases,
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleRestorePurchases = async () => {
    if (isRestoring) return;

    setIsRestoring(true);
    try {
      const result = await restorePurchases();

      if (result.success) {
        // Refresh subscription status
        const status = await checkSubscriptionStatus();
        setSubscriptionStatus(status);
        Alert.alert('Restored!', 'Your subscription has been restored.');
      } else {
        Alert.alert('No Subscription Found', result.error || 'No active subscription to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600' as const,
            fontSize: 18,
          },
          headerBackTitle: 'Back',
        }}
      />

      <LinearGradient
        colors={[colors.background.tertiary, colors.background.secondary, colors.background.primary, '#0D0202']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <SettingsSection title="Account">
            <SettingsItem
              icon={<CreditCard size={22} color={colors.accent.gold} />}
              title="Subscription"
              subtitle={getSubscriptionSubtitle()}
              onPress={handleSubscription}
              rightElement={isLoadingSubscription ? <ActivityIndicator size="small" color={colors.text.muted} /> : undefined}
            />
          </SettingsSection>

          <SettingsSection title="Preferences">
            <SettingsItem
              icon={<Mic size={22} color={colors.accent.gold} />}
              title="Voice Input"
              subtitle={voiceEnabled ? 'Enabled' : 'Disabled'}
              showChevron={false}
              rightElement={
                <Switch
                  value={voiceEnabled}
                  onValueChange={(value) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setVoiceEnabled(value);
                  }}
                  trackColor={{ false: colors.background.tertiary, true: colors.accent.gold }}
                  thumbColor={colors.text.primary}
                />
              }
            />
            <SettingsItem
              icon={<Volume2 size={22} color={colors.accent.gold} />}
              title="Voice Settings"
              subtitle="Configure voice provider"
              onPress={() => router.push('/voice-settings')}
            />
            <SettingsItem
              icon={<Bell size={22} color={colors.accent.gold} />}
              title="Daily Reminders"
              subtitle="Set review reminder time"
              onPress={() => router.push('/notification-settings')}
            />
          </SettingsSection>

          <SettingsSection title="Support">
            <SettingsItem
              icon={<HelpCircle size={22} color={colors.accent.gold} />}
              title="Help Center"
              subtitle="FAQs and guides"
              onPress={() => openURL(HELP_URL)}
            />
            <SettingsItem
              icon={<Info size={22} color={colors.accent.gold} />}
              title="About"
              subtitle={`Version ${appVersion}`}
              onPress={showAbout}
            />
          </SettingsSection>

          <SettingsSection title="Legal">
            <SettingsItem
              icon={<Shield size={22} color={colors.accent.gold} />}
              title="Privacy Policy"
              onPress={() => openURL(PRIVACY_URL)}
            />
            <SettingsItem
              icon={<FileText size={22} color={colors.accent.gold} />}
              title="Terms of Service"
              onPress={() => openURL(TERMS_URL)}
            />
          </SettingsSection>

          {!isAuthenticated && (
            <SettingsSection title="">
              <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth/login')}>
                <LogIn size={20} color={colors.accent.gold} />
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            </SettingsSection>
          )}

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>PokerPro AI v{appVersion}</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingTop: 16,
  } as ViewStyle,
  section: {
    marginBottom: 24,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginBottom: 8,
  } as TextStyle,
  sectionContent: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  } as ViewStyle,
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  settingsItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  settingsItemContent: {
    flex: 1,
  } as ViewStyle,
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text.primary,
  } as TextStyle,
  settingsItemSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  } as TextStyle,
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  } as ViewStyle,
  signInText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.accent.gold,
  } as TextStyle,
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  } as ViewStyle,
  versionText: {
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
});
