import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Search, Square, Send, AlertCircle, Volume2, VolumeX } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { colors } from '@/constants/colors';
import { VoiceWaveform, PulsingIndicator } from '@/components/VoiceWaveform';
import { UpgradeModal } from '@/components/UpgradeModal';
import { storeHand } from '@/services/supabaseStorage';
import { canSaveHand } from '@/services/storageService';
import type { HandData, AnalysisResult } from '@/types/poker';
import { MAX_FREE_HANDS } from '@/types/poker';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const BACKGROUND_IMAGE_URL = 'https://bollujxjsgahswigmyvq.supabase.co/storage/v1/object/public/assets/chat/poker_table_bg.png?v=2';

// Parse hand data AND generate analysis in one API call (fast)
async function parseAndAnalyzeHand(transcript: string): Promise<{
  handData: Partial<HandData>;
  analysis: Partial<AnalysisResult>;
}> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a poker hand analyzer. Extract hand data and provide strategic analysis from the conversation.

Return JSON only with this structure:
{
  "handData": {
    "heroHand": "cards like A♠ K♠ or pocket tens",
    "heroPosition": "UTG/MP/CO/BTN/SB/BB",
    "villainPosition": "position or null",
    "effectiveStack": number or null,
    "potSize": number or null,
    "flop": ["card1", "card2", "card3"] or null,
    "turn": "card" or null,
    "river": "card" or null,
    "action": "what action hero faces"
  },
  "analysis": {
    "recommendedAction": "clear action like Call, Fold, Raise to $X",
    "confidence": number 60-95,
    "reasoning": "2-3 sentence explanation",
    "gtoLine": "what GTO theory suggests",
    "exploitLine": "exploitative adjustment based on situation",
    "equity": number 0-100 or null,
    "potOdds": number like 2.5 for 2.5:1 or null,
    "riskLevel": "low" | "medium" | "high"
  }
}`,
        },
        { role: 'user', content: transcript },
      ],
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    console.error('[OpenAI] Parse error:', response.status);
    return { handData: {}, analysis: {} };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return {
      handData: parsed.handData || {},
      analysis: parsed.analysis || {},
    };
  } catch {
    console.error('[OpenAI] JSON parse error');
    return { handData: {}, analysis: {} };
  }
}

// Generate a descriptive name for the hand based on parsed data
function generateHandName(handData: Partial<HandData>): string {
  const hand = handData.heroHand || '?? ??';
  const action = handData.action?.toLowerCase() || '';

  if (action.includes('3-bet') || action.includes('3bet')) return `${hand} vs 3-bet`;
  if (action.includes('4-bet') || action.includes('4bet')) return `${hand} vs 4-bet`;
  if (action.includes('all-in') || action.includes('all in')) return `${hand} All-in`;
  if (action.includes('jam') || action.includes('shove')) return `${hand} All-in`;
  if (handData.river) return `${hand} River Decision`;
  if (handData.turn) return `${hand} Turn Decision`;
  if (handData.flop) return `${hand} Postflop`;
  return `${hand} Hand`;
}

export default function VoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [textInput, setTextInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Free tier upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [savedHandCount, setSavedHandCount] = useState(0);

  const hasApiKey = !!OPENAI_API_KEY;

  // Load persisted voice settings (volume, gain)
  const { settings: voiceSettings, updateSettings } = useVoiceSettings();
  const [volume, setVolumeState] = useState(1.0);

  useEffect(() => {
    if (voiceSettings.playbackVolume !== undefined) {
      setVolumeState(voiceSettings.playbackVolume);
    }
  }, [voiceSettings.playbackVolume]);

  const {
    voiceState,
    isConnected,
    currentUserTranscript,
    currentAITranscript,
    messages,
    connect,
    disconnect,
    sendText,
    interrupt,
    setVolume,
  } = useRealtimeVoice({
    openaiApiKey: OPENAI_API_KEY,
    voice: voiceSettings.openaiVoice,
    onUserTranscript: (text) => {
      console.log('[VoiceScreen] User said:', text);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onAITranscript: (text, isFinal) => {
      console.log('[VoiceScreen] AI said:', text, 'final:', isFinal);
    },
    onStateChange: (state) => {
      if (state === 'listening') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (state === 'speaking') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onError: (error) => {
      console.error('[VoiceScreen] Error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      const rawMessage = typeof error === 'string'
        ? error
        : error?.message || error?.code || JSON.stringify(error)?.slice(0, 200) || 'Unknown error';
      setErrorMessage(rawMessage);

      // Hold longer so the user can read it
      setTimeout(() => setErrorMessage(null), 12000);
    },
  });

  // Ref to always access latest connect function (avoids stale closure)
  const connectRef = useRef(connect);
  useEffect(() => { connectRef.current = connect; }, [connect]);

  // Auto-connect when screen opens (runs once on mount)
  useEffect(() => {
    if (hasApiKey) {
      const timer = setTimeout(() => {
        connectRef.current();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasApiKey]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleClose = useCallback(async () => {
    await disconnect();
    router.back();
  }, [disconnect, router]);

  // Stop voice recording but stay on screen
  const handleStop = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await disconnect();
    // Don't navigate - stay on screen so user can type or restart
  }, [disconnect]);

  // Send text message
  const handleSend = useCallback(() => {
    if (!textInput.trim() || !isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendText(textInput.trim());
    setTextInput('');
    setIsTyping(false);
  }, [textInput, isConnected, sendText]);

  // Restart voice after stopping
  const handleRestart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    connect();
  }, [connect]);

  // Interrupt AI when speaking (barge-in)
  const handleInterrupt = useCallback(() => {
    if (voiceState === 'speaking') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      interrupt();
    }
  }, [voiceState, interrupt]);

  // Save conversation and return to home
  const handleSave = useCallback(async () => {
    if (messages.length === 0) {
      await disconnect();
      router.back();
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Check if user can save (free tier limit)
      const { allowed, currentCount } = await canSaveHand();
      setSavedHandCount(currentCount);

      if (!allowed) {
        // User hit free tier limit - show upgrade modal
        setIsSaving(false);
        setShowUpgradeModal(true);
        return;
      }

      // Build transcript from messages
      const transcript = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
        .join('\n');

      console.log('[VoiceScreen] Parsing and analyzing hand...');

      // Parse hand data AND generate analysis in one API call
      const { handData, analysis } = await parseAndAnalyzeHand(transcript);

      // Generate hand ID and metadata
      handData.id = `hand-${Date.now()}`;
      handData.timestamp = Date.now();
      handData.originalNarrative = transcript;
      analysis.timestamp = Date.now();

      console.log('[VoiceScreen] Storing hand...');

      // Store the hand
      await storeHand(handData as HandData, analysis as AnalysisResult);

      console.log('[VoiceScreen] Hand saved successfully:', generateHandName(handData));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[VoiceScreen] Save error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Still navigate back even on error
    }

    setIsSaving(false);
    await disconnect();
    router.back();
  }, [disconnect, router, messages]);

  // Handle closing upgrade modal
  const handleCloseUpgradeModal = useCallback(async () => {
    setShowUpgradeModal(false);
    await disconnect();
    router.back();
  }, [disconnect, router]);

  const getStatusText = () => {
    if (isTyping) return 'Type your question';
    switch (voiceState) {
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return 'Start talking';
      case 'processing':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
      case 'error':
        return 'Tap Speak to retry';
      case 'idle':
      default:
        return messages.length > 0 ? 'Tap Speak to continue' : 'Tap Speak to start';
    }
  };

  // Determine if voice is active (not idle/error)
  const isVoiceActive = voiceState !== 'idle' && voiceState !== 'error';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Background Image */}
      <View style={styles.backgroundContainer}>
        <Image
          source={{ uri: BACKGROUND_IMAGE_URL }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>PokerPro AI</Text>
        {messages.length > 0 && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Conversation Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.conversationArea}
        contentContainerStyle={styles.conversationContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (voiceState === 'idle' || voiceState === 'connecting') && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Tell me about your hand</Text>
            <Text style={styles.emptySubtitle}>Talk like you're with a friend at the table</Text>
          </View>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.role === 'user' ? styles.userText : styles.aiText,
              ]}
            >
              {message.content}
            </Text>
          </View>
        ))}

        {/* Live transcription - show during listening and processing (before AI responds) */}
        {currentUserTranscript && (voiceState === 'listening' || voiceState === 'processing') && (
          <View style={[styles.messageBubble, styles.userBubble, styles.liveTranscript]}>
            <Text style={[styles.messageText, styles.userText]}>
              {currentUserTranscript}
            </Text>
          </View>
        )}

        {/* AI speaking */}
        {(voiceState === 'processing' || voiceState === 'speaking') && currentAITranscript && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <Text style={[styles.messageText, styles.aiText]}>
              {currentAITranscript}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Voice Status Area - Waveform and Status */}
      <Pressable
        style={styles.statusArea}
        onPress={handleInterrupt}
        disabled={voiceState !== 'speaking'}
      >
        {/* Waveform visualization */}
        {isVoiceActive && (
          <View style={styles.waveformContainer}>
            <VoiceWaveform
              state={voiceState as any}
              size="large"
            />
          </View>
        )}

        {/* Connecting indicator */}
        {voiceState === 'connecting' && (
          <View style={styles.connectingContainer}>
            <PulsingIndicator active={true} color={colors.accent.gold} size={16} />
          </View>
        )}

        {/* Volume slider - visible when voice is active */}
        {isVoiceActive && (
          <View style={styles.volumeControl}>
            <VolumeX size={14} color={colors.text.muted} />
            <Slider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={volume}
              onValueChange={(val) => {
                setVolumeState(val);
                setVolume(val);
              }}
              onSlidingComplete={(val) => {
                updateSettings({ playbackVolume: val });
              }}
              minimumTrackTintColor={colors.accent.gold}
              maximumTrackTintColor={colors.background.tertiary}
              thumbTintColor={colors.accent.gold}
            />
            <Volume2 size={14} color={colors.text.muted} />
          </View>
        )}

        {/* Error banner */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color={colors.utility.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Status text */}
        <Text style={styles.statusText}>{getStatusText()}</Text>

        {/* Tap to interrupt hint */}
        {voiceState === 'speaking' && (
          <Text style={styles.interruptHint}>Tap to interrupt</Text>
        )}
      </Pressable>

      {/* Bottom Bar - Same as SearchBottomBar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {!hasApiKey ? (
            <Text style={styles.noApiKeyText}>
              Voice requires OpenAI API key
            </Text>
          ) : (
            <View style={[styles.searchBar, isTyping && styles.searchBarFocused]}>
              <Search size={18} color={isTyping ? colors.accent.gold : colors.text.muted} />
              <TextInput
                style={styles.textInput}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Type or speak..."
                placeholderTextColor={colors.text.muted}
                onFocus={() => setIsTyping(true)}
                onBlur={() => !textInput && setIsTyping(false)}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />

              {/* Show Send button when typing, Stop when voice active, Speak when idle */}
              {textInput.trim() ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleSend}
                  activeOpacity={0.8}
                >
                  <Send size={16} color="#1A1A1A" />
                  <Text style={styles.actionButtonText}>Send</Text>
                </TouchableOpacity>
              ) : isVoiceActive ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleStop}
                  activeOpacity={0.8}
                >
                  <Square size={14} color="#1A1A1A" fill="#1A1A1A" />
                  <Text style={styles.actionButtonText}>Stop</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRestart}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonText}>Speak</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

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
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,
  backgroundImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  } as ViewStyle,
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onboarding.gold,
  } as TextStyle,
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  saveButton: {
    backgroundColor: colors.accent.gold,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  } as ViewStyle,
  saveButtonDisabled: {
    opacity: 0.7,
  } as ViewStyle,
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  } as TextStyle,
  conversationArea: {
    flex: 1,
    paddingHorizontal: 20,
  } as ViewStyle,
  conversationContent: {
    paddingTop: 20,
    paddingBottom: 20,
  } as ViewStyle,
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  } as TextStyle,
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
  } as TextStyle,
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 12,
  } as ViewStyle,
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent.gold,
    borderBottomRightRadius: 4,
  } as ViewStyle,
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.tertiary,
    borderBottomLeftRadius: 4,
  } as ViewStyle,
  liveTranscript: {
    opacity: 0.8,
  } as ViewStyle,
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  } as TextStyle,
  userText: {
    color: '#000',
  } as TextStyle,
  aiText: {
    color: colors.text.primary,
  } as TextStyle,
  statusArea: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  } as ViewStyle,
  waveformContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  connectingContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 4,
    width: '100%',
  } as ViewStyle,
  volumeSlider: {
    flex: 1,
    height: 32,
  } as ViewStyle,
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.muted,
  } as TextStyle,
  interruptHint: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.accent.gold,
    opacity: 0.8,
    marginTop: 4,
  } as TextStyle,
  bottomBar: {
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
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    paddingVertical: 0,
  } as TextStyle,
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.gold,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  } as ViewStyle,
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  } as TextStyle,
  noApiKeyText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  } as TextStyle,
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  } as ViewStyle,
  errorText: {
    color: colors.utility.error,
    fontSize: 14,
    fontWeight: '500',
  } as TextStyle,
});
