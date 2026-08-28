/**
 * "Your Game" — the profile screen, rebuilt.
 *
 * What was wrong: three rows, two of which read "Not signed in" and "Unknown",
 * a Settings row, and then half a screen of empty red. The title was the root
 * cause — "Profile" promises account fields, so account fields were what got
 * built, and for a signed-out user they are all empty.
 *
 * The screen now leads with what the player has actually done. Every number is
 * read from local storage (see services/profileStats.ts); nothing here needs a
 * migration or a network call. Account details move under Settings, which is
 * now a gear in the nav bar rather than a row competing for attention.
 *
 * No money is shown anywhere. Sessions store a `result`, so a profit total is
 * available and is deliberately omitted: gambling-adjacent app, already
 * rejected once, and "Up $3K this month" was cut for exactly this reason.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import {
  Settings as SettingsIcon,
  ChevronRight,
  Spade,
  Star,
  MessageSquare,
  Check,
  Flame,
} from 'lucide-react-native';
import { getUserDisplayName, setUserDisplayName } from '@/services/storageService';
import { getProfileStats, type ProfileStats } from '@/services/profileStats';
import { colors } from '@/constants/colors';
import { BottomNav } from '@/components/BottomNav';

export default function ProfileScreen() {
  const router = useRouter();

  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');

  // Refetch on focus: hands and sessions change elsewhere in the app, and a
  // profile showing yesterday's counts is worse than one that loads briefly.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const s = await getProfileStats();
        if (!cancelled) setStats(s);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const beginEditName = useCallback(async () => {
    setDraftName((await getUserDisplayName()) ?? '');
    setEditingName(true);
  }, []);

  const commitName = useCallback(async () => {
    const trimmed = draftName.trim();
    if (trimmed) {
      await setUserDisplayName(trimmed);
      setStats((prev) => (prev ? { ...prev, displayName: trimmed } : prev));
    }
    setEditingName(false);
  }, [draftName]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Your Game',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: colors.accent.primary,
          headerTitleStyle: { fontWeight: '700' as const, color: colors.text.primary },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={styles.gear}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              hitSlop={10}
            >
              <SettingsIcon size={19} color={colors.text.secondary} />
            </TouchableOpacity>
          ),
        }}
      />

      {!stats ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity */}
          <View style={styles.ident}>
            <Monogram name={stats.displayName} onPress={beginEditName} />

            <View style={styles.identText}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    onSubmitEditing={commitName}
                    autoFocus
                    placeholder="Your name"
                    placeholderTextColor={colors.text.muted}
                    style={styles.nameInput}
                    returnKeyType="done"
                    maxLength={24}
                  />
                  <TouchableOpacity onPress={commitName} hitSlop={10}>
                    <Check size={20} color={colors.accent.gold} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={beginEditName} activeOpacity={0.7}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{stats.displayName ?? 'Add your name'}</Text>
                    <View style={[styles.pill, stats.tier === 'free' && styles.pillFree]}>
                      <Text
                        style={[
                          styles.pillText,
                          stats.tier === 'free' && styles.pillTextFree,
                        ]}
                      >
                        {stats.tier === 'paid' ? 'PRO' : 'FREE'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              {!!stats.playsLine && <Text style={styles.plays}>{stats.playsLine}</Text>}
            </View>
          </View>

          {stats.isEmpty ? (
            <EmptyState onStart={() => router.push('/voice')} />
          ) : (
            <>
              {/* Streak, as the hero */}
              <View style={[styles.stat, styles.statHero]}>
                <Text style={styles.statKey}>CURRENT STREAK</Text>
                <View style={styles.streakRow}>
                  <Text style={[styles.statValue, styles.statValueHero]}>
                    {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
                  </Text>
                  {stats.currentStreak > 0 && (
                    <Flame size={20} color={colors.accent.gold} />
                  )}
                </View>
                <Text style={styles.statDetail}>
                  {stats.bestStreak > 1 ? `Best ever: ${stats.bestStreak} days` : 'Come back tomorrow to make it two'}
                </Text>
              </View>

              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statKey}>HANDS REVIEWED</Text>
                  <Text style={styles.statValue}>{stats.handsTotal}</Text>
                  <Text style={styles.statDetail}>
                    {stats.handsThisWeek > 0 ? `${stats.handsThisWeek} this week` : 'Bring one this week'}
                  </Text>
                </View>
                {/* A bare 0 on the screen built to show progress reads as a
                    scolding, and says nothing about what a session even is.
                    Until they log one, the tile invites instead of counting. */}
                {stats.sessionsTotal > 0 ? (
                  <View style={styles.stat}>
                    <Text style={styles.statKey}>SESSIONS LOGGED</Text>
                    <Text style={styles.statValue}>{stats.sessionsTotal}</Text>
                    <Text style={styles.statDetail}>
                      {stats.lastSessionLabel ? `Last: ${stats.lastSessionLabel}` : 'None yet'}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.stat, styles.statInvite]}
                    onPress={() => router.push('/')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.statKey}>SESSIONS</Text>
                    <Text style={styles.inviteValue}>Track a night</Text>
                    <Text style={styles.statDetail}>
                      Log a session to group the hands you play
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {!!stats.workingOn && (
                <View style={styles.leak}>
                  <Text style={styles.leakKey}>WORKING ON</Text>
                  <Text style={styles.leakValue}>{stats.workingOn}</Text>
                </View>
              )}

              {stats.activity.some((v) => v > 0) && (
                <View style={styles.activity}>
                  <Text style={styles.statKey}>LAST 12 WEEKS</Text>
                  <View style={styles.weeks}>
                    {stats.activity.map((v, i) => (
                      <View
                        key={i}
                        style={[
                          styles.week,
                          {
                            height: `${Math.max(8, Math.round(v * 100))}%`,
                            backgroundColor:
                              v > 0.66
                                ? colors.accent.gold
                                : v > 0.33
                                  ? 'rgba(232,184,74,0.6)'
                                  : v > 0
                                    ? 'rgba(232,184,74,0.35)'
                                    : 'rgba(244,232,216,0.13)',
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.weekLabels}>
                    <Text style={styles.weekLabel}>12 wks ago</Text>
                    <Text style={styles.weekLabel}>this week</Text>
                  </View>
                </View>
              )}

              <View style={styles.rows}>
                <LinkRow
                  icon={<Spade size={15} color={colors.accent.gold} />}
                  label="Hand history"
                  value={String(stats.handsTotal)}
                  onPress={() => router.push('/history')}
                />
                <LinkRow
                  icon={<Star size={15} color={colors.accent.gold} />}
                  label="Saved hands"
                  value={String(stats.favoritesTotal)}
                  onPress={() => router.push('/history')}
                />
                <LinkRow
                  icon={<MessageSquare size={15} color={colors.accent.gold} />}
                  label="Coach chats"
                  value={String(stats.chatsTotal)}
                  onPress={() => router.push('/poker-chat')}
                />
              </View>
            </>
          )}
        </ScrollView>
      )}

      <BottomNav active="profile" />
    </View>
  );
}

/**
 * Initial-based avatar.
 *
 * A real photo needs expo-image-picker registered as a config plugin plus
 * NSPhotoLibraryUsageDescription in app.json — both native changes, so it
 * cannot ship over the air and is waiting on the next build. Until then this is
 * a deliberate monogram rather than an empty placeholder, and tapping it edits
 * the name so it is never a dead control.
 */
function Monogram({ name, onPress }: { name: string | null; onPress: () => void }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Edit your name"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Nothing here yet.</Text>
      <Text style={styles.emptyBody}>
        Bring one hand you are not sure about. Your streak, your history, and the leak you are
        working on all start filling in from there.
      </Text>
      <TouchableOpacity style={styles.emptyCta} onPress={onStart} activeOpacity={0.85}>
        <Text style={styles.emptyCtaText}>Talk through a hand</Text>
      </TouchableOpacity>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <ChevronRight size={17} color={colors.text.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary } as ViewStyle,
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scroll: { padding: 16, gap: 12 } as ViewStyle,
  gear: { padding: 4 } as ViewStyle,

  ident: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 } as ViewStyle,
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  avatarText: { fontSize: 23, fontWeight: '800', color: colors.text.dark } as TextStyle,
  identText: { flex: 1, minWidth: 0 } as ViewStyle,

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  name: { fontSize: 22, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.4 } as TextStyle,
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  nameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent.gold,
    paddingVertical: 2,
  } as TextStyle,
  plays: { fontSize: 13, color: colors.text.secondary, marginTop: 2 } as TextStyle,

  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.accent.gold,
  } as ViewStyle,
  pillFree: { backgroundColor: 'rgba(244,232,216,0.18)' } as ViewStyle,
  pillText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.9, color: colors.text.dark } as TextStyle,
  pillTextFree: { color: colors.text.secondary } as TextStyle,

  statRow: { flexDirection: 'row', gap: 8 } as ViewStyle,
  stat: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.13)',
  } as ViewStyle,
  statHero: { borderColor: 'rgba(232,184,74,0.45)', backgroundColor: 'rgba(232,184,74,0.1)' } as ViewStyle,
  statInvite: { borderStyle: 'dashed', borderColor: 'rgba(232,184,74,0.35)' } as ViewStyle,
  inviteValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.accent.gold,
    letterSpacing: -0.3,
    marginTop: 5,
  } as TextStyle,
  statKey: {
    fontSize: 9,
    letterSpacing: 1.3,
    fontWeight: '700',
    color: colors.text.secondary,
    opacity: 0.85,
  } as TextStyle,
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.6,
    marginTop: 3,
  } as TextStyle,
  statValueHero: { color: colors.accent.gold, fontSize: 29 } as TextStyle,
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  statDetail: { fontSize: 11.5, color: colors.text.secondary, marginTop: 2 } as TextStyle,

  leak: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.2)',
  } as ViewStyle,
  leakKey: { fontSize: 9, letterSpacing: 1.3, fontWeight: '700', color: colors.accent.gold } as TextStyle,
  leakValue: { fontSize: 17, fontWeight: '800', color: colors.text.primary, marginTop: 3 } as TextStyle,

  activity: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.1)',
  } as ViewStyle,
  weeks: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 44, marginTop: 9 } as ViewStyle,
  week: { flex: 1, borderRadius: 3 } as ViewStyle,
  weekLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 } as ViewStyle,
  weekLabel: { fontSize: 9.5, color: colors.text.secondary, opacity: 0.8 } as TextStyle,

  rows: { borderRadius: 15, overflow: 'hidden', gap: 1, backgroundColor: 'rgba(244,232,216,0.09)' } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(232,184,74,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  rowLabel: { flex: 1, fontSize: 14, color: colors.text.primary, fontWeight: '500' } as TextStyle,
  rowValue: { fontSize: 13, color: colors.text.secondary } as TextStyle,

  empty: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,184,74,0.16)',
  } as ViewStyle,
  emptyTitle: { fontSize: 19, fontWeight: '800', color: colors.text.primary } as TextStyle,
  emptyBody: { fontSize: 14, lineHeight: 20, color: colors.text.secondary } as TextStyle,
  emptyCta: {
    backgroundColor: colors.accent.gold,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  } as ViewStyle,
  emptyCtaText: { fontSize: 15, fontWeight: '700', color: colors.text.dark } as TextStyle,
});
