import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

export type HomeTab = 'hands' | 'chats';

interface HomeTabBarProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  handsCount: number;
  chatsCount: number;
}

export function HomeTabBar({
  activeTab,
  onTabChange,
  handsCount,
  chatsCount,
}: HomeTabBarProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'hands' && styles.activeTab]}
        onPress={() => onTabChange('hands')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'hands' && styles.activeTabText]}>
          Hands
        </Text>
        {handsCount > 0 && (
          <View style={[styles.badge, activeTab === 'hands' && styles.activeBadge]}>
            <Text style={[styles.badgeText, activeTab === 'hands' && styles.activeBadgeText]}>
              {handsCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
        onPress={() => onTabChange('chats')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
          Chats
        </Text>
        {chatsCount > 0 && (
          <View style={[styles.badge, activeTab === 'chats' && styles.activeBadge]}>
            <Text style={[styles.badgeText, activeTab === 'chats' && styles.activeBadgeText]}>
              {chatsCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 4,
  } as ViewStyle,
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  } as ViewStyle,
  activeTab: {
    backgroundColor: colors.accent.primary,
  } as ViewStyle,
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text.muted,
  } as TextStyle,
  activeTabText: {
    color: colors.text.primary,
  } as TextStyle,
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  } as ViewStyle,
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  } as ViewStyle,
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.text.muted,
  } as TextStyle,
  activeBadgeText: {
    color: colors.text.primary,
  } as TextStyle,
});

export default HomeTabBar;
