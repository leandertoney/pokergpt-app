/**
 * The bottom navigation bar.
 *
 * The app was a pure Stack: every surface reached by a push or a header icon,
 * and the most reachable strip of the screen spent on a search field. Speaking
 * a hand -- the product -- had no entry point on the home screen at all.
 *
 * Implemented as a component rendered by each screen rather than as an
 * expo-router (tabs) group. Moving the route files would change every path in
 * the app, and there are router.push calls to these screens throughout, from
 * notification handlers to empty states. This gets the same bar for a fraction
 * of the blast radius.
 *
 * The centre control is the voice coach, raised out of the bar. It is the
 * gesture onboarding now teaches, so the button completes that thought rather
 * than presenting a menu.
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, type ViewStyle, type TextStyle } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Spade, Target, User, Mic } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { trackAppEvent } from '@/services/appAnalytics';

export type NavTab = 'home' | 'daily' | 'profile';

const TABS: { key: NavTab; label: string; route: string; Icon: typeof Spade }[] = [
  { key: 'home', label: 'Home', route: '/', Icon: Spade },
  { key: 'daily', label: 'Daily', route: '/daily-review', Icon: Target },
  { key: 'profile', label: 'Your Game', route: '/profile', Icon: User },
];

export function BottomNav({ active }: { active: NavTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const go = useCallback(
    (route: string, key: string) => {
      if (pathname === route) return;
      Haptics.selectionAsync();
      trackAppEvent('nav_tab', { to: key });
      // replace, not push: tapping between tabs must not build a back stack
      // the player has to unwind to leave.
      router.replace(route as any);
    },
    [router, pathname]
  );

  const openCoach = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackAppEvent('nav_coach_opened');
    router.push('/voice');
  }, [router]);

  const [left, ...rest] = TABS;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Tab tab={left} active={active === left.key} onPress={go} />

      <Pressable
        onPress={openCoach}
        style={({ pressed }) => [styles.fabWrap, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="Talk through a hand"
      >
        <View style={styles.fab}>
          <Mic size={26} color={colors.text.dark} />
        </View>
      </Pressable>

      {rest.map((t) => (
        <Tab key={t.key} tab={t} active={active === t.key} onPress={go} />
      ))}
    </View>
  );
}

function Tab({
  tab,
  active,
  onPress,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  onPress: (route: string, key: string) => void;
}) {
  const { Icon, label, route, key } = tab;
  return (
    <Pressable
      style={styles.tab}
      onPress={() => onPress(route, key)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Icon
        size={24}
        color={active ? colors.accent.gold : colors.text.secondary}
        strokeWidth={active ? 2.4 : 2}
      />
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingHorizontal: 4,
    backgroundColor: colors.background.shadow,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(244,232,216,0.13)',
  } as ViewStyle,

  tab: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 4 } as ViewStyle,
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.text.secondary,
    opacity: 0.8,
  } as TextStyle,
  labelActive: { color: colors.accent.gold, opacity: 1, fontWeight: '700' } as TextStyle,

  // Raised out of the bar, so the product's core action is the one control
  // that does not look like a menu item.
  fabWrap: { width: 76, alignItems: 'center', justifyContent: 'flex-end' } as ViewStyle,
  fabPressed: { opacity: 0.85 } as ViewStyle,
  fab: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    marginTop: -26,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 8 },
    }),
  } as ViewStyle,
});
