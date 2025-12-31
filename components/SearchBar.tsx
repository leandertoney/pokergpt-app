import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, onSubmit, placeholder = 'Search your hands...' }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View style={[styles.container, isFocused && styles.containerFocused]}>
      <Search size={18} color={isFocused ? colors.accent.primary : colors.text.muted} style={styles.searchIcon} />

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

      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton} activeOpacity={0.7}>
          <X size={16} color={colors.text.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  } as ViewStyle,
  containerFocused: {
    borderColor: colors.accent.primary,
  } as ViewStyle,
  searchIcon: {
    marginRight: 10,
  } as ViewStyle,
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    paddingVertical: 0,
  } as TextStyle,
  clearButton: {
    padding: 4,
    marginLeft: 8,
  } as ViewStyle,
});
