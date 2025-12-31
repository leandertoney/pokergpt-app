import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Send } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { ChatMessage, TypingIndicator } from '@/components/ChatMessage';
import { usePokerChat } from '@/hooks/usePokerChat';
import { colors } from '@/constants/colors';
import type { ChatMessage as ChatMessageType } from '@/services/pokerAI';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.65;

export function FloatingChatWidget() {
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const expandAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const { messages, isLoading, sendMessage } = usePokerChat();

  // Floating animation for FAB
  useEffect(() => {
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    floating.start();
    return () => floating.stop();
  }, [floatAnim]);

  // Animate expand/collapse
  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
  }, [isExpanded, expandAnim]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && messages.length > 0 && isExpanded) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading, isExpanded]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  const renderMessage = ({ item }: { item: ChatMessageType }) => (
    <ChatMessage message={item} />
  );

  // Interpolated values for animation
  const panelHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, EXPANDED_HEIGHT],
  });

  const fabOpacity = expandAnim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
  });

  const panelOpacity = expandAnim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [0, 1],
  });

  const backdropOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsExpanded(false)}
          />
        </Animated.View>
      )}

      {/* FAB (Collapsed State) */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: 80 + Math.max(insets.bottom, 16),
            opacity: fabOpacity,
            transform: [{ translateY: floatAnim }],
          },
        ]}
        pointerEvents={isExpanded ? 'none' : 'auto'}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.9}
        >
          <View style={styles.fabGlow} />
          <Image
            source={require('@/assets/images/pokergpt_logo.png')}
            style={styles.fabLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Expanded Chat Panel */}
      <Animated.View
        style={[
          styles.panelContainer,
          {
            height: panelHeight,
            opacity: panelOpacity,
            bottom: 80 + Math.max(insets.bottom, 16),
          },
        ]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <BlurView intensity={90} tint="dark" style={styles.panelBlur}>
          <View style={styles.panel}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image
                  source={require('@/assets/images/pokergpt_logo.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.headerTitle}>Poker Assistant</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsExpanded(false)}
              >
                <X size={20} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={isLoading ? <TypingIndicator /> : null}
            />

            {/* Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={SCREEN_HEIGHT - EXPANDED_HEIGHT}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask a poker question..."
                  placeholderTextColor={colors.text.muted}
                  multiline
                  maxLength={500}
                  returnKeyType="default"
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !inputText.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isLoading}
                >
                  <Send
                    size={18}
                    color={inputText.trim() ? colors.text.primary : colors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </BlurView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 100,
  } as ViewStyle,
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 101,
  } as ViewStyle,
  fab: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  fabGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  } as ViewStyle,
  fabLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  panelContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 102,
  } as ViewStyle,
  panelBlur: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  } as ViewStyle,
  panel: {
    flex: 1,
    backgroundColor: 'rgba(26, 5, 5, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(230, 51, 51, 0.2)',
    borderRadius: 20,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  } as ViewStyle,
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  headerLogo: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text.primary,
  } as TextStyle,
  closeButton: {
    padding: 6,
  } as ViewStyle,
  messagesList: {
    paddingVertical: 12,
    flexGrow: 1,
  } as ViewStyle,
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  } as ViewStyle,
  input: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text.primary,
    maxHeight: 80,
  } as TextStyle,
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  sendButtonDisabled: {
    backgroundColor: colors.background.tertiary,
  } as ViewStyle,
});

export default FloatingChatWidget;
