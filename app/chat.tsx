import React, { useRef, useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Keyboard } from 'lucide-react-native';
import { usePokerFlow } from '@/hooks/usePokerFlow';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { ChatBubble } from '@/components/ChatBubble';
import { InputBar } from '@/components/InputBar';
import { VoiceInput } from '@/components/VoiceInput';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { UpgradeModal } from '@/components/UpgradeModal';
import { colors } from '@/constants/colors';
import { MAX_FREE_HANDS } from '@/types/poker';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export default function ChatScreen() {
  const {
    messages,
    sendMessage,
    isAnalyzing,
    isParsing,
    saveBlocked,
    savedHandCount,
    clearSaveBlocked,
  } = usePokerFlow();
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Show upgrade modal when save is blocked
  useEffect(() => {
    if (saveBlocked) {
      setShowUpgradeModal(true);
    }
  }, [saveBlocked]);

  // Voice input hook
  const {
    voiceState,
    currentTranscript,
    aiTranscript,
    startVoice,
    stopVoice,
    interrupt,
  } = useVoiceInput({
    openaiApiKey: OPENAI_API_KEY,
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        // When we get a final transcript, send it as a message
        sendMessage(text);
      }
    },
    onAIResponse: (text) => {
      // AI response is displayed in the VoiceInput component
      console.log('AI response:', text);
    },
    onError: (error) => {
      console.error('Voice error:', error);
      setInputMode('text'); // Fall back to text on error
    },
  });

  // Check if analysis is complete - navigate back (unless save was blocked)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.analysis && !saveBlocked) {
      // Stop voice if active
      if (voiceState !== 'idle') {
        stopVoice();
      }
      // Small delay to show the result message briefly
      const timer = setTimeout(() => {
        router.back();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [messages, router, voiceState, stopVoice, saveBlocked]);

  // Handle closing upgrade modal
  const handleCloseUpgradeModal = () => {
    setShowUpgradeModal(false);
    clearSaveBlocked();
    // Navigate back after dismissing - user saw the analysis
    router.back();
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const toggleInputMode = () => {
    if (inputMode === 'voice') {
      stopVoice();
      setInputMode('text');
    } else {
      setInputMode('voice');
    }
  };

  const hasVoiceSupport = !!OPENAI_API_KEY;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'New Hand',
          headerStyle: {
            backgroundColor: colors.background.primary,
          },
          headerTintColor: colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600' as const,
            fontSize: 18,
          },
          headerBackTitle: 'Back',
          headerRight: hasVoiceSupport ? () => (
            <TouchableOpacity
              onPress={toggleInputMode}
              style={styles.modeToggle}
              activeOpacity={0.7}
            >
              {inputMode === 'text' ? (
                <Mic size={22} color={colors.accent.primary} />
              ) : (
                <Keyboard size={22} color={colors.accent.primary} />
              )}
            </TouchableOpacity>
          ) : undefined,
        }}
      />

      <LinearGradient
        colors={[colors.background.tertiary, colors.background.secondary, colors.background.primary, '#0D0202']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={
            (isAnalyzing || isParsing) ? (
              <View style={styles.loadingContainer}>
                <LoadingIndicator
                  variant={isAnalyzing ? 4 : 2}
                  size="small"
                  text={isAnalyzing ? 'Analyzing your hand...' : 'Processing...'}
                />
              </View>
            ) : null
          }
        />

        <View style={{ paddingBottom: insets.bottom }}>
          {inputMode === 'voice' && hasVoiceSupport ? (
            <VoiceInput
              voiceState={voiceState}
              transcript={currentTranscript}
              aiTranscript={aiTranscript}
              onStart={startVoice}
              onStop={stopVoice}
              onInterrupt={interrupt}
            />
          ) : (
            <InputBar
              onSendMessage={sendMessage}
              disabled={isAnalyzing || isParsing}
            />
          )}
        </View>
      </LinearGradient>

      {/* Upgrade Modal for free tier limit */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={handleCloseUpgradeModal}
        currentCount={savedHandCount}
        maxCount={MAX_FREE_HANDS}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  messageList: {
    paddingVertical: 16,
  } as ViewStyle,
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  } as ViewStyle,
  modeToggle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  } as ViewStyle,
});
