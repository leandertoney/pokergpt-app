import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, type ViewStyle, type TextStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Mail,
  Calendar,
  RefreshCw,
  LogOut,
  Camera,
  ChevronRight,
  Trash2,
  Settings,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { resetOnboarding } from '@/components/Onboarding';
import { colors } from '@/constants/colors';

interface ProfileItemProps {
  icon: React.ReactNode;
  title: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function ProfileItem({ icon, title, value, onPress, showChevron = false, danger = false }: ProfileItemProps) {
  const content = (
    <View style={styles.profileItem}>
      <View style={[styles.profileItemIcon, danger && styles.profileItemIconDanger]}>{icon}</View>
      <View style={styles.profileItemContent}>
        <Text style={[styles.profileItemTitle, danger && styles.profileItemTitleDanger]}>{title}</Text>
        {value && <Text style={styles.profileItemValue}>{value}</Text>}
      </View>
      {showChevron && <ChevronRight size={20} color={colors.text.muted} />}
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

function ProfileSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: authUser, signOut, deleteAccount } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get user data from auth context
  const user = {
    name: authUser?.user_metadata?.full_name || 'Poker Player',
    email: authUser?.email || 'Not signed in',
    memberSince: authUser?.created_at
      ? new Date(authUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Unknown',
    avatarUrl: authUser?.user_metadata?.avatar_url || null,
  };

  const handleRestartOnboarding = useCallback(() => {
    Alert.alert(
      'Restart Onboarding',
      'This will reset the app introduction. You\'ll see the welcome screens again next time you open the app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: async () => {
            setIsResetting(true);
            try {
              await resetOnboarding();
              Alert.alert('Done', 'Onboarding will appear on your next app launch.', [
                { text: 'OK' }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to reset onboarding. Please try again.');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  }, []);

  const handleSignOut = useCallback(() => {
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
            // Router will automatically redirect to login via auth state change
          },
        },
      ]
    );
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently delete all your data including saved hands and chat history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { error } = await deleteAccount();
              if (error) {
                Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
              } else {
                Alert.alert('Account Deleted', 'Your account has been successfully deleted.', [
                  { text: 'OK', onPress: () => router.replace('/auth/login') },
                ]);
              }
            } catch (err) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [deleteAccount, router]);

  const handleEditAvatar = useCallback(() => {
    // TODO: Implement avatar editing (camera/gallery picker)
    Alert.alert('Coming Soon', 'Profile photo editing will be available soon.');
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600' as const,
            fontSize: 18,
          },
          headerBackTitle: '',
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
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handleEditAvatar} activeOpacity={0.8}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={colors.gradients.premium}
                  style={styles.avatarGradient}
                >
                  <User size={48} color={colors.text.primary} />
                </LinearGradient>
                <View style={styles.cameraButton}>
                  <Camera size={14} color={colors.text.primary} />
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>

          {/* Account Info */}
          <ProfileSection title="Account Information">
            <ProfileItem
              icon={<User size={20} color={colors.accent.primary} />}
              title="Name"
              value={user.name}
            />
            <ProfileItem
              icon={<Mail size={20} color={colors.accent.secondary} />}
              title="Email"
              value={user.email}
            />
            <ProfileItem
              icon={<Calendar size={20} color={colors.accent.primary} />}
              title="Member Since"
              value={user.memberSince}
            />
          </ProfileSection>

          {/* Settings */}
          <ProfileSection title="Preferences">
            <ProfileItem
              icon={<Settings size={20} color={colors.accent.primary} />}
              title="Settings"
              onPress={() => router.push('/settings')}
              showChevron
            />
          </ProfileSection>

          {/* App Actions */}
          <ProfileSection title="App">
            <ProfileItem
              icon={<RefreshCw size={20} color={colors.accent.secondary} />}
              title="Restart Onboarding"
              onPress={handleRestartOnboarding}
              showChevron
            />
          </ProfileSection>

          {/* Account Actions */}
          <ProfileSection title="Account Actions">
            <ProfileItem
              icon={<LogOut size={20} color={colors.text.primary} />}
              title="Sign Out"
              onPress={handleSignOut}
              showChevron
            />
            <ProfileItem
              icon={isDeleting ? <ActivityIndicator size="small" color={colors.utility.error} /> : <Trash2 size={20} color={colors.utility.error} />}
              title={isDeleting ? "Deleting..." : "Delete Account"}
              onPress={isDeleting ? undefined : handleDeleteAccount}
              danger
            />
          </ProfileSection>
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
    paddingTop: 24,
  } as ViewStyle,
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  } as ViewStyle,
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  } as ViewStyle,
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background.primary,
  } as ViewStyle,
  userName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text.primary,
    marginBottom: 4,
  } as TextStyle,
  userEmail: {
    fontSize: 14,
    color: colors.text.muted,
  } as TextStyle,
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
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  profileItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  } as ViewStyle,
  profileItemIconDanger: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  } as ViewStyle,
  profileItemContent: {
    flex: 1,
  } as ViewStyle,
  profileItemTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text.primary,
  } as TextStyle,
  profileItemTitleDanger: {
    color: colors.utility.error,
  } as TextStyle,
  profileItemValue: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  } as TextStyle,
});
