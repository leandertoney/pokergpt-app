import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Send } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface InputBarProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function InputBar({ onSendMessage, disabled }: InputBarProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Describe your hand..."
          placeholderTextColor={colors.text.muted}
          multiline
          maxLength={500}
          editable={!disabled}
        />

        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={disabled || !text.trim()}
        >
          <Send size={22} color={text.trim() ? colors.text.primary : colors.text.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
  } as ViewStyle,
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  } as ViewStyle,
  input: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 16,
    maxHeight: 100,
  } as TextStyle,
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  sendButtonDisabled: {
    backgroundColor: colors.background.tertiary,
  } as ViewStyle,
});
