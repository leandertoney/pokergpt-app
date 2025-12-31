import React from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '@/constants/colors';
import type { ChatMessage as ChatMessageType } from '@/services/pokerAI';

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantContainer}>
      <View style={styles.avatarContainer}>
        <Image
          source={require('@/assets/images/pokergpt_logo.png')}
          style={styles.avatar}
          resizeMode="contain"
        />
      </View>
      <View style={styles.assistantBubble}>
        {isLoading ? (
          <View style={styles.typingIndicator}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        ) : (
          <Text style={styles.assistantText}>{message.content}</Text>
        )}
      </View>
    </View>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <View style={styles.assistantContainer}>
      <View style={styles.avatarContainer}>
        <Image
          source={require('@/assets/images/pokergpt_logo.png')}
          style={styles.avatar}
          resizeMode="contain"
        />
      </View>
      <View style={[styles.assistantBubble, styles.typingBubble]}>
        <View style={styles.typingIndicator}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginVertical: 6,
  } as ViewStyle,
  assistantContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginVertical: 6,
  } as ViewStyle,
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  } as ViewStyle,
  avatar: {
    width: 28,
    height: 28,
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: colors.accent.primary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  } as ViewStyle,
  assistantBubble: {
    maxWidth: '75%',
    backgroundColor: colors.background.tertiary,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  } as ViewStyle,
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  } as ViewStyle,
  userText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text.primary,
    fontWeight: '500' as const,
  } as TextStyle,
  assistantText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text.primary,
  } as TextStyle,
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.muted,
  } as ViewStyle,
  dot1: {
    opacity: 0.4,
  } as ViewStyle,
  dot2: {
    opacity: 0.6,
  } as ViewStyle,
  dot3: {
    opacity: 0.8,
  } as ViewStyle,
});

export default ChatMessage;
