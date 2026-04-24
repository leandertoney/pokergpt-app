import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type FilterOption = 'all' | 'hands' | 'chats' | 'sessions' | 'favorites';

interface FilterChipsProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  counts?: {
    all?: number;
    hands?: number;
    chats?: number;
    sessions?: number;
    favorites?: number;
  };
}

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hands', label: 'Hands' },
  { key: 'chats', label: 'Chats' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'favorites', label: 'Favorites' },
];

export function FilterChips({ activeFilter, onFilterChange, counts }: FilterChipsProps) {
  const handlePress = (filter: FilterOption) => {
    if (filter === activeFilter) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFilterChange(filter);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeFilter === option.key;
          const count = counts?.[option.key];

          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handlePress(option.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {option.label}
              </Text>
              {count !== undefined && count > 0 && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  } as ViewStyle,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: 'rgba(255, 58, 58, 0.15)',
  } as ViewStyle,
  chipActive: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.gold,
  } as ViewStyle,
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  } as TextStyle,
  chipTextActive: {
    color: colors.text.dark,
  } as TextStyle,
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    minWidth: 20,
    alignItems: 'center',
  } as ViewStyle,
  countBadgeActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  } as ViewStyle,
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
  } as TextStyle,
  countTextActive: {
    color: colors.text.dark,
  } as TextStyle,
});

export default FilterChips;
