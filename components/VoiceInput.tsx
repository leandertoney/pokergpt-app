import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, type ViewStyle, type TextStyle } from 'react-native';
import { Mic, MicOff, X, Volume2 } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import type { VoiceState } from '@/hooks/useVoiceInput';

interface VoiceInputProps {
  voiceState: VoiceState;
  transcript: string;
  aiTranscript: string;
  onStart: () => void;
  onStop: () => void;
  onInterrupt: () => void;
}

export function VoiceInput({
  voiceState,
  transcript,
  aiTranscript,
  onStart,
  onStop,
  onInterrupt,
}: VoiceInputProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when listening
  useEffect(() => {
    if (voiceState === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Wave animation for audio visualization
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      waveAnim.stopAnimation();
      waveAnim.setValue(0);
    }
  }, [voiceState, pulseAnim, waveAnim]);

  const isActive = voiceState !== 'idle' && voiceState !== 'error';

  const getStatusText = () => {
    switch (voiceState) {
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'AI Speaking';
      case 'error':
        return 'Error - Tap to retry';
      default:
        return 'Tap to speak';
    }
  };

  const handlePress = () => {
    if (isActive) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <View style={styles.container}>
      {/* Transcript display */}
      {isActive && (aiTranscript || transcript) && (
        <View style={styles.transcriptContainer}>
          {transcript && (
            <Text style={styles.userTranscript} numberOfLines={2}>
              You: {transcript}
            </Text>
          )}
          {aiTranscript && (
            <Text style={styles.aiTranscript} numberOfLines={3}>
              {aiTranscript}
            </Text>
          )}
        </View>
      )}

      <View style={styles.controlsRow}>
        {/* Voice button */}
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <Animated.View
            style={[
              styles.voiceButton,
              isActive && styles.voiceButtonActive,
              voiceState === 'listening' && {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {voiceState === 'speaking' ? (
              <Volume2 size={28} color={colors.text.primary} />
            ) : isActive ? (
              <MicOff size={28} color={colors.text.primary} />
            ) : (
              <Mic size={28} color={colors.text.primary} />
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* Interrupt button - only shown when AI is speaking */}
        {voiceState === 'speaking' && (
          <TouchableOpacity
            onPress={onInterrupt}
            style={styles.interruptButton}
            activeOpacity={0.8}
          >
            <X size={20} color={colors.text.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status text */}
      <Text style={styles.statusText}>{getStatusText()}</Text>

      {/* Audio visualization waves */}
      {voiceState === 'listening' && (
        <View style={styles.waveContainer}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  transform: [
                    {
                      scaleY: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.5 + Math.random() * 0.5],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  } as ViewStyle,
  transcriptContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    maxHeight: 100,
  } as ViewStyle,
  userTranscript: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 4,
  } as TextStyle,
  aiTranscript: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 20,
  } as TextStyle,
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  } as ViewStyle,
  buttonWrapper: {
    alignItems: 'center',
  } as ViewStyle,
  voiceButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent.primary,
  } as ViewStyle,
  voiceButtonActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.glow,
    shadowColor: colors.accent.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  } as ViewStyle,
  interruptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.text.muted,
  } as ViewStyle,
  statusText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    height: 24,
  } as ViewStyle,
  waveBar: {
    width: 4,
    height: 24,
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
  } as ViewStyle,
});
