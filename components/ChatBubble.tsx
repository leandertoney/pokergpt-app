import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, type ViewStyle, type TextStyle } from 'react-native';
import type { ConversationMessage } from '@/types/poker';
import { colors } from '@/constants/colors';

interface ChatBubbleProps {
  message: ConversationMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const shadowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isUser) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();

      setTimeout(() => {
        Animated.timing(shadowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, 300);
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, []);

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {isUser && (
        <Animated.View
          style={[
            styles.chipShadow,
            {
              opacity: shadowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
    position: 'relative' as const,
  } as ViewStyle,
  userContainer: {
    alignItems: 'flex-end',
  } as ViewStyle,
  assistantContainer: {
    alignItems: 'flex-start',
  } as ViewStyle,
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  } as ViewStyle,
  userBubble: {
    backgroundColor: colors.accent.primary,
    borderBottomRightRadius: 4,
  } as ViewStyle,
  assistantBubble: {
    backgroundColor: colors.background.tertiary,
    borderBottomLeftRadius: 4,
  } as ViewStyle,
  text: {
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,
  userText: {
    color: colors.text.primary,
    fontWeight: '500' as const,
  } as TextStyle,
  assistantText: {
    color: colors.text.primary,
  } as TextStyle,
  chipShadow: {
    position: 'absolute' as const,
    bottom: -8,
    right: 24,
    width: 80,
    height: 30,
    backgroundColor: colors.accent.primary,
    borderRadius: 15,
    transform: [
      { scaleX: 1.2 },
      { scaleY: 0.3 },
    ],
  } as ViewStyle,
});
