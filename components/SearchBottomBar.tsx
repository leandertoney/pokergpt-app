import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, SquarePen } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface SearchBottomBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onCompose?: () => void;
  placeholder?: string;
}

export function SearchBottomBar({
  value,
  onChangeText,
  onSubmit,
  onCompose,
  placeholder = 'Search',
}: SearchBottomBarProps) {
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.row}>
        <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
          <Search
            size={18}
            color={isFocused ? colors.accent.primary : colors.text.muted}
          />
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.text.muted}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={onSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {onCompose && (
          <TouchableOpacity
            style={styles.composeButton}
            onPress={onCompose}
            activeOpacity={0.7}
          >
            <SquarePen size={20} color={colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  } as ViewStyle,
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 40,
    gap: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  } as ViewStyle,
  searchBarFocused: {
    borderColor: colors.accent.primary,
  } as ViewStyle,
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  } as TextStyle,
  composeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
});
