import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, type ViewStyle, type TextStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Mail,
  Calendar,
  ChevronRight,
  Settings,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDisplayName, setUserDisplayName } from '@/services/storageService';
import { supabase } from '@/lib/supabase';
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
  const { user: authUser } = useAuth();

  // The name is editable. Onboarding already captures it and writes it to
  // local storage, so the profile reads the same value rather than showing a
  // hardcoded placeholder the user cannot change.
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    getUserDisplayName().then(setDisplayName);
  }, []);

  const saveName = useCallback(async () => {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === displayName) return;

    setDisplayName(next);
    await setUserDisplayName(next);

    // Mirror to the account when there is one, so the name survives a reinstall.
    // Local storage is the source of truth for signed-out users.
    try {
      if (authUser && supabase) {
        await supabase.auth.updateUser({ data: { full_name: next } });
      }
    } catch (e) {
      console.warn('[profile] could not sync name to account', e);
    }
  }, [draft, displayName, authUser]);

  // Get user data from auth context
  const user = {
    name: displayName || authUser?.user_metadata?.full_name || 'Poker Player',
    email: authUser?.email || 'Not signed in',
    memberSince: authUser?.created_at
      ? new Date(authUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Unknown',
    avatarUrl: authUser?.user_metadata?.avatar_url || null,
  };

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
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={colors.gradients.premium}
                style={styles.avatarGradient}
              >
                <User size={48} color={colors.text.primary} />
              </LinearGradient>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>

          {/* Account Info */}
          <ProfileSection title="Account Information">
            {editing ? (
              <View style={styles.profileItem}>
                <View style={styles.profileItemIcon}>
                  <User size={20} color={colors.accent.primary} />
                </View>
                <View style={styles.profileItemContent}>
                  <Text style={styles.profileItemTitle}>Name</Text>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    onSubmitEditing={saveName}
                    onBlur={saveName}
                    autoFocus
                    autoCapitalize="words"
                    maxLength={24}
                    returnKeyType="done"
                    placeholder="Your name"
                    placeholderTextColor={colors.text.muted}
                    style={styles.nameInput}
                    accessibilityLabel="Edit your name"
                  />
                </View>
              </View>
            ) : (
              <ProfileItem
                icon={<User size={20} color={colors.accent.primary} />}
                title="Name"
                value={user.name}
                onPress={() => {
                  setDraft(displayName ?? '');
                  setEditing(true);
                }}
                showChevron
              />
            )}
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
          <ProfileSection title="">
            <ProfileItem
              icon={<Settings size={20} color={colors.accent.primary} />}
              title="Settings"
              onPress={() => router.push('/settings')}
              showChevron
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
  nameInput: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 2,
    marginTop: 2,
  } as TextStyle,
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
