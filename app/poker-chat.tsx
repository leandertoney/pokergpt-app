import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { ChatMessage, TypingIndicator } from '@/components/ChatMessage';
import { SpecialOfferBanner } from '@/components/SpecialOfferBanner';
import { usePokerChat } from '@/hooks/usePokerChat';
import { shouldShowSpecialOffer, markSpecialOfferShown, setUserTier } from '@/services/storageService';
import { colors } from '@/constants/colors';
import type { ChatMessage as ChatMessageType } from '@/services/pokerAI';

export default function PokerChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { heroHand, chatId } = useLocalSearchParams<{ heroHand?: string; chatId?: string }>();

  // Pre-fill input with hole cards if passed from card picker (only for new chats)
  const [inputText, setInputText] = useState(() => {
    if (heroHand && !chatId) {
      return `I had ${heroHand}. `;
    }
    return '';
  });

  // Pass chatId to load existing conversation
  const { messages, isLoading, sendMessage, isInitialized } = usePokerChat(
    chatId ? { chatId } : undefined
  );

  // Special offer state
  const [showSpecialOffer, setShowSpecialOffer] = useState(false);
  const hasCheckedOffer = useRef(false);

  // Check if we should show special offer after first assistant response
  useEffect(() => {
    // Only check once per session and when there's an assistant message
    if (hasCheckedOffer.current) return;

    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0 && !isLoading) {
      hasCheckedOffer.current = true;

      // Check if user qualifies for special offer (skipped paywall, hasn't seen offer)
      (async () => {
        const shouldShow = await shouldShowSpecialOffer();
        if (shouldShow) {
          // Small delay so user can see their analysis first
          setTimeout(() => {
            setShowSpecialOffer(true);
          }, 2000);
        }
      })();
    }
  }, [messages, isLoading]);

  // Handle special offer acceptance
  const handleSpecialOfferAccept = useCallback(async () => {
    console.log('User accepted special offer - lifetime plan at $49');
    await setUserTier('paid');
    await markSpecialOfferShown();
    setShowSpecialOffer(false);
  }, []);

  // Handle special offer dismissal
  const handleSpecialOfferDismiss = useCallback(async () => {
    await markSpecialOfferShown();
    setShowSpecialOffer(false);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isLoading]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  const renderMessage = ({ item }: { item: ChatMessageType }) => (
    <ChatMessage message={item} />
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: chatId ? 'Continue Chat' : 'Poker Assistant',
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600' as const,
            fontSize: 18,
          },
          headerLeft: () => (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={isLoading ? <TypingIndicator /> : null}
      />

      {/* Input Bar */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask a poker question..."
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={1000}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Send
              size={20}
              color={inputText.trim() ? colors.text.primary : colors.text.muted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Special Offer Modal for users who skipped paywall */}
      {showSpecialOffer && (
        <SpecialOfferBanner
          onAccept={handleSpecialOfferAccept}
          onDismiss={handleSpecialOfferDismiss}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  backButton: {
    padding: 8,
    marginLeft: 4,
  } as ViewStyle,
  messagesList: {
    paddingVertical: 16,
    flexGrow: 1,
  } as ViewStyle,
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  } as ViewStyle,
  input: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    maxHeight: 120,
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
