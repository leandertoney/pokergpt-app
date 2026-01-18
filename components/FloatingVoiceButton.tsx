import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mic, MicOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/colors';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { routeVoiceIntent } from '@/services/intentRouter';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

interface FloatingVoiceButtonProps {
  onSearchQuery?: (query: string) => void;
}

export function FloatingVoiceButton({ onSearchQuery }: FloatingVoiceButtonProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [statusText, setStatusText] = useState('');

  // Handle voice transcription
  const handleTranscript = useCallback(async (text: string) => {
    if (!text.trim()) {
      setStatusText('');
      return;
    }

    setStatusText('Thinking...');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Route based on intent
      const result = await routeVoiceIntent(text);

      if (result.intent === 'search') {
        // For search, call the callback to populate search
        onSearchQuery?.(result.query);
        setStatusText('');
      } else if (result.intent === 'chat') {
        // Navigate to chat with the question
        router.push({
          pathname: '/poker-chat',
          params: { initialMessage: result.query },
        });
        setStatusText('');
      } else if (result.intent === 'hand_entry') {
        // Navigate to hand analysis chat
        router.push({
          pathname: '/chat',
          params: { initialMessage: result.query },
        });
        setStatusText('');
      } else {
        // Default: treat as chat
        router.push({
          pathname: '/poker-chat',
          params: { initialMessage: result.query },
        });
        setStatusText('');
      }
    } catch (error) {
      console.error('[FloatingVoice] Routing error:', error);
      setStatusText('');
    }
  }, [onSearchQuery, router]);

  // Voice input hook
  const {
    voiceState,
    isListening,
    isProcessing,
    toggleVoice,
  } = useVoiceInput({
    openaiApiKey: OPENAI_API_KEY,
    onUserTranscript: handleTranscript,
    onError: (error) => {
      console.error('[FloatingVoice] Voice error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatusText('');
    },
  });

  // Floating animation
  useEffect(() => {
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floating.start();
    return () => floating.stop();
  }, [floatAnim]);

  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
      setStatusText('Listening...');
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      if (isProcessing) {
        setStatusText('Processing...');
      } else if (!statusText.includes('Thinking')) {
        setStatusText('');
      }
    }
  }, [isListening, isProcessing, pulseAnim, glowAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleVoice();
  }, [toggleVoice]);

  const isActive = isListening || isProcessing;
  const hasApiKey = !!OPENAI_API_KEY;

  // Don't render if no API key
  if (!hasApiKey) return null;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <View style={[styles.container, { bottom: 90 + Math.max(insets.bottom, 16) }]}>
      {/* Status text */}
      {statusText ? (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      ) : null}

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [
              { translateY: isActive ? 0 : floatAnim },
              { scale: isActive ? pulseAnim : 1 },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, isActive && styles.buttonActive]}
          onPress={handlePress}
          activeOpacity={0.9}
        >
          {/* Glow ring */}
          <Animated.View
            style={[
              styles.glowRing,
              isActive && {
                opacity: glowOpacity,
                borderColor: colors.accent.primary,
              },
            ]}
          />

          {/* Icon */}
          {isActive ? (
            <MicOff size={28} color="#fff" />
          ) : (
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/pokergpt_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.micBadge}>
                <Mic size={14} color="#fff" />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Hint text */}
      {!statusText && (
        <Text style={styles.hintText}>Tap to talk</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  } as ViewStyle,
  statusContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  } as ViewStyle,
  statusText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '500',
  } as TextStyle,
  buttonWrapper: {
    width: 64,
    height: 64,
  } as ViewStyle,
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  } as ViewStyle,
  buttonActive: {
    backgroundColor: colors.accent.primary,
  } as ViewStyle,
  glowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0,
  } as ViewStyle,
  logoContainer: {
    position: 'relative',
  } as ViewStyle,
  logo: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  micBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.tertiary,
  } as ViewStyle,
  hintText: {
    marginTop: 6,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  } as TextStyle,
});

export default FloatingVoiceButton;
