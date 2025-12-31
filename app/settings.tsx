import React, { useState } from 'react';
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
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  CreditCard,
  Bell,
  HelpCircle,
  Shield,
  FileText,
  ChevronRight,
  Mic,
  Info,
  LogOut,
  LogIn,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/colors';
import Constants from 'expo-constants';

// URLs - Replace with your actual URLs
const HELP_URL = 'https://pokergpt.app/help';
const PRIVACY_URL = 'https://pokergpt.app/privacy';
const TERMS_URL = 'https://pokergpt.app/terms';

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
  const { signOut, isAuthenticated } = useAuth();

  // Voice input preference (stored locally for now)
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

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
      'PokerGPT',
      `Version ${appVersion}\n\nYour AI-powered poker coach.\n\nAnalyze hands, calculate odds, and improve your game with expert guidance.`,
      [{ text: 'OK' }]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const handleSubscription = () => {
    Alert.alert(
      'Coming Soon',
      'Subscription management will be available in a future update.',
      [{ text: 'OK' }]
    );
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
              icon={<User size={22} color={colors.accent.primary} />}
              title="Profile"
              subtitle={isAuthenticated ? "Manage your account" : "Sign in to sync across devices"}
              onPress={() => isAuthenticated ? router.push('/profile') : router.push('/auth/login')}
            />
            <SettingsItem
              icon={<CreditCard size={22} color={colors.accent.secondary} />}
              title="Subscription"
              subtitle="Free tier"
              onPress={handleSubscription}
            />
          </SettingsSection>

          <SettingsSection title="Preferences">
            <SettingsItem
              icon={<Mic size={22} color={colors.accent.primary} />}
              title="Voice Input"
              subtitle={voiceEnabled ? 'Enabled' : 'Disabled'}
              showChevron={false}
              rightElement={
                <Switch
                  value={voiceEnabled}
                  onValueChange={setVoiceEnabled}
                  trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                  thumbColor={colors.text.primary}
                />
              }
            />
            <SettingsItem
              icon={<Bell size={22} color={colors.accent.secondary} />}
              title="Notifications"
              subtitle="Manage alerts"
              onPress={openNotificationSettings}
            />
          </SettingsSection>

          <SettingsSection title="Support">
            <SettingsItem
              icon={<HelpCircle size={22} color={colors.accent.primary} />}
              title="Help Center"
              subtitle="FAQs and guides"
              onPress={() => openURL(HELP_URL)}
            />
            <SettingsItem
              icon={<Info size={22} color={colors.accent.secondary} />}
              title="About"
              subtitle={`Version ${appVersion}`}
              onPress={showAbout}
            />
          </SettingsSection>

          <SettingsSection title="Legal">
            <SettingsItem
              icon={<Shield size={22} color={colors.accent.primary} />}
              title="Privacy Policy"
              onPress={() => openURL(PRIVACY_URL)}
            />
            <SettingsItem
              icon={<FileText size={22} color={colors.accent.secondary} />}
              title="Terms of Service"
              onPress={() => openURL(TERMS_URL)}
            />
          </SettingsSection>

          {isAuthenticated ? (
            <SettingsSection title="">
              <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <LogOut size={20} color={colors.utility.error} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </SettingsSection>
          ) : (
            <SettingsSection title="">
              <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth/login')}>
                <LogIn size={20} color={colors.accent.primary} />
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            </SettingsSection>
          )}

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>PokerGPT v{appVersion}</Text>
            <Text style={styles.copyrightText}>Made with AI</Text>
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
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  } as ViewStyle,
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.utility.error,
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
    color: colors.accent.primary,
  } as TextStyle,
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  } as ViewStyle,
  versionText: {
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
  copyrightText: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
    opacity: 0.7,
  } as TextStyle,
});
