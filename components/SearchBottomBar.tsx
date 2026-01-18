import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { SpeakButton } from './SpeakButton';

interface SearchBottomBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  openaiApiKey?: string;
}

export function SearchBottomBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search hands or tap Speak',
  openaiApiKey = '',
}: SearchBottomBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);

  // Navigate to full voice screen
  const handleSpeakPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/voice');
  }, [router]);

  const hasApiKey = !!openaiApiKey;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Search bar with Speak button inside */}
      <View style={[
        styles.searchBar,
        isFocused && styles.searchBarFocused,
      ]}>
        <Search
          size={18}
          color={isFocused ? colors.accent.gold : colors.text.muted}
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
        {/* Speak button - navigates to voice screen */}
        {hasApiKey && (
          <SpeakButton
            state="idle"
            onPress={handleSpeakPress}
            compact
          />
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  } as ViewStyle,
  searchBarFocused: {
    borderColor: colors.accent.gold,
  } as ViewStyle,
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  } as TextStyle,
});
