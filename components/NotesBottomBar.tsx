import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Mic, SquarePen } from 'lucide-react-native';
import { colors } from '@/constants/colors';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

interface NotesBottomBarProps {
  searchValue: string;
  onSearchChange: (text: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  onMicPress: () => void;
  micState?: VoiceState;
  showMic?: boolean;
  onComposePress: () => void;
  composeDisabled?: boolean;
  variant?: 'home' | 'history';
}

export function NotesBottomBar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search',
  onMicPress,
  micState = 'idle',
  showMic = true,
  onComposePress,
  composeDisabled = false,
  variant = 'home',
}: NotesBottomBarProps) {
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Mic pulse animation
  useEffect(() => {
    if (micState === 'listening' || micState === 'speaking') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
        pulseAnim.setValue(1);
      };
    } else {
      pulseAnim.setValue(1);
    }
  }, [micState, pulseAnim]);

  const isMicActive = micState === 'listening' || micState === 'processing' || micState === 'speaking' || micState === 'connecting';

  const getMicColor = () => {
    switch (micState) {
      case 'listening':
        return colors.accent.primary;
      case 'speaking':
        return '#4CAF50';
      case 'processing':
        return colors.accent.gold;
      case 'connecting':
        return '#3B82F6';
      default:
        return colors.text.muted;
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Pill-shaped Search Bar */}
      <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
        <Search
          size={20}
          color={colors.text.muted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.text.muted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={onSearchSubmit}
          returnKeyType={variant === 'home' ? 'send' : 'search'}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Mic Inside Search Bar */}
        {showMic && (
          <TouchableOpacity
            onPress={onMicPress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View style={{ transform: [{ scale: isMicActive ? pulseAnim : 1 }] }}>
              <Mic
                size={20}
                color={getMicColor()}
              />
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* Square Compose Button */}
      <TouchableOpacity
        style={[styles.composeButton, composeDisabled && styles.composeButtonDisabled]}
        onPress={onComposePress}
        disabled={composeDisabled}
        activeOpacity={0.7}
      >
        <SquarePen size={24} color={colors.accent.primary} strokeWidth={1.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  } as ViewStyle,
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E', // iOS dark mode search bar color
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
  } as ViewStyle,
  searchBarFocused: {
    backgroundColor: '#3A3A3C',
  } as ViewStyle,
  searchIcon: {
    marginRight: 6,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: colors.text.primary,
    paddingVertical: 0,
  } as TextStyle,
  composeButton: {
    width: 48,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2C2C2E', // Match search bar
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  composeButtonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
});
