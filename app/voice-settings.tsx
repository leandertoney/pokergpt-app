import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import {
  Volume2,
  Check,
  Play,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { speak } from '@/services/ttsService';
import { Audio } from 'expo-av';
import { setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import type { VoiceProvider, OpenAIVoice } from '@/types/voice';
import { OPENAI_VOICES } from '@/types/voice';
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function VoiceSettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    resetToDefaults,
    validateElevenLabs,
    isElevenLabsConfigured,
  } = useVoiceSettings();

  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleProviderChange = async (provider: VoiceProvider) => {
    setValidationError(null);
    await updateSettings({ provider });
  };

  const handleOpenAIVoiceChange = async (voice: OpenAIVoice) => {
    await updateSettings({ openaiVoice: voice });
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationError(null);

    const result = await validateElevenLabs();

    if (result.valid) {
      Alert.alert('Success', 'Your ElevenLabs credentials are valid!');
    } else {
      setValidationError(result.error || 'Validation failed');
    }

    setIsValidating(false);
  };

  const handleTestVoice = async () => {
    if (isTesting) return;

    console.log('[VoiceSettings] Test voice pressed');
    console.log('[VoiceSettings] API Key exists:', !!OPENAI_API_KEY);
    console.log('[VoiceSettings] Settings:', JSON.stringify(settings, null, 2));

    if (!OPENAI_API_KEY) {
      Alert.alert('Error', 'OpenAI API key not found. Check your environment variables.');
      return;
    }

    setIsTesting(true);
    const testText = "Nice fold on the river. That was a tough spot with top pair.";

    try {
      console.log('[VoiceSettings] Setting audio mode...');
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      console.log('[VoiceSettings] Calling speak()...');
      const result = await speak(testText, settings, OPENAI_API_KEY);
      console.log('[VoiceSettings] Speak result:', result.provider, 'fallback:', result.usedFallback);

      if (result.usedFallback) {
        Alert.alert('Fallback Used', 'ElevenLabs failed. Used OpenAI voice instead.');
      }

      // Save and play audio
      const tempFile = `${FileSystem.cacheDirectory}voice_test.mp3`;
      console.log('[VoiceSettings] Saving audio to:', tempFile);
      await FileSystem.writeAsStringAsync(tempFile, result.audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[VoiceSettings] Creating sound...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempFile },
        { shouldPlay: true }
      );

      console.log('[VoiceSettings] Playing...');
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('[VoiceSettings] Playback finished');
          sound.unloadAsync();
          setIsTesting(false);
        }
      });

    } catch (error) {
      console.error('[VoiceSettings] Test voice error:', error);
      Alert.alert('Error', `Failed to test voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Voice Settings',
      'This will reset all voice settings to defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetToDefaults();
            setValidationError(null);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Voice Settings',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: colors.text.primary,
          headerTitleStyle: { fontWeight: '600', fontSize: 18 },
          headerBackTitle: 'Back',
        }}
      />

      <LinearGradient
        colors={[colors.background.tertiary, colors.background.secondary, colors.background.primary, '#0D0202']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Voice Provider Toggle */}
          <SettingsSection title="Voice Provider">
            <View style={styles.providerToggle}>
              <TouchableOpacity
                style={[
                  styles.providerOption,
                  settings.provider === 'openai' && styles.providerOptionActive,
                ]}
                onPress={() => handleProviderChange('openai')}
              >
                <Text style={[
                  styles.providerOptionText,
                  settings.provider === 'openai' && styles.providerOptionTextActive,
                ]}>
                  OpenAI
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.providerOption,
                  settings.provider === 'elevenlabs' && styles.providerOptionActive,
                ]}
                onPress={() => handleProviderChange('elevenlabs')}
              >
                <Text style={[
                  styles.providerOptionText,
                  settings.provider === 'elevenlabs' && styles.providerOptionTextActive,
                ]}>
                  ElevenLabs
                </Text>
              </TouchableOpacity>
            </View>
          </SettingsSection>

          {/* OpenAI Voice Selection */}
          {settings.provider === 'openai' && (
            <SettingsSection title="OpenAI Voice">
              {OPENAI_VOICES.map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={styles.voiceOption}
                  onPress={() => handleOpenAIVoiceChange(voice.id)}
                >
                  <View style={styles.voiceOptionContent}>
                    <Text style={styles.voiceOptionName}>{voice.name}</Text>
                    <Text style={styles.voiceOptionDesc}>{voice.description}</Text>
                  </View>
                  {settings.openaiVoice === voice.id && (
                    <Check size={20} color={colors.accent.gold} />
                  )}
                </TouchableOpacity>
              ))}
            </SettingsSection>
          )}

          {/* ElevenLabs Configuration */}
          {settings.provider === 'elevenlabs' && (
            <>
              <SettingsSection title="ElevenLabs Configuration">
                {/* API Key */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>API Key</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={settings.elevenlabsApiKey || ''}
                      onChangeText={(text) => updateSettings({ elevenlabsApiKey: text })}
                      placeholder="Enter your ElevenLabs API key"
                      placeholderTextColor={colors.text.muted}
                      secureTextEntry={!showApiKey}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff size={20} color={colors.text.muted} />
                      ) : (
                        <Eye size={20} color={colors.text.muted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Voice ID */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Voice ID</Text>
                  <TextInput
                    style={styles.input}
                    value={settings.elevenlabsVoiceId || ''}
                    onChangeText={(text) => updateSettings({ elevenlabsVoiceId: text })}
                    placeholder="Enter your Voice ID"
                    placeholderTextColor={colors.text.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.inputHint}>
                    Find this in your ElevenLabs voice settings
                  </Text>
                </View>

                {/* Validation Error */}
                {validationError && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={16} color={colors.utility.error} />
                    <Text style={styles.errorText}>{validationError}</Text>
                  </View>
                )}

                {/* Validate Button */}
                <TouchableOpacity
                  style={[styles.validateButton, isValidating && styles.buttonDisabled]}
                  onPress={handleValidate}
                  disabled={isValidating || !settings.elevenlabsApiKey || !settings.elevenlabsVoiceId}
                >
                  {isValidating ? (
                    <ActivityIndicator size="small" color={colors.text.primary} />
                  ) : (
                    <>
                      <Check size={18} color={colors.text.primary} />
                      <Text style={styles.validateButtonText}>Validate Credentials</Text>
                    </>
                  )}
                </TouchableOpacity>
              </SettingsSection>

              {/* Voice Tuning */}
              <SettingsSection title="Voice Tuning">
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Stability</Text>
                    <Text style={styles.sliderValue}>{settings.elevenlabsStability.toFixed(2)}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.05}
                    value={settings.elevenlabsStability}
                    onSlidingComplete={(value) => updateSettings({ elevenlabsStability: value })}
                    minimumTrackTintColor={colors.accent.gold}
                    maximumTrackTintColor={colors.background.tertiary}
                    thumbTintColor={colors.accent.gold}
                  />
                  <Text style={styles.sliderHint}>
                    Higher = more consistent, Lower = more expressive
                  </Text>
                </View>

                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Similarity</Text>
                    <Text style={styles.sliderValue}>{settings.elevenlabsSimilarityBoost.toFixed(2)}</Text>
                  </View>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.05}
                    value={settings.elevenlabsSimilarityBoost}
                    onSlidingComplete={(value) => updateSettings({ elevenlabsSimilarityBoost: value })}
                    minimumTrackTintColor={colors.accent.gold}
                    maximumTrackTintColor={colors.background.tertiary}
                    thumbTintColor={colors.accent.gold}
                  />
                  <Text style={styles.sliderHint}>
                    Higher = closer to original voice
                  </Text>
                </View>
              </SettingsSection>
            </>
          )}

          {/* Test Voice */}
          <SettingsSection title="Preview">
            <TouchableOpacity
              style={[styles.testButton, isTesting && styles.buttonDisabled]}
              onPress={handleTestVoice}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color={colors.background.primary} />
              ) : (
                <Play size={20} color={colors.background.primary} fill={colors.background.primary} />
              )}
              <Text style={styles.testButtonText}>
                {isTesting ? 'Playing...' : 'Test Voice'}
              </Text>
            </TouchableOpacity>

            {settings.provider === 'elevenlabs' && !isElevenLabsConfigured && (
              <Text style={styles.warningText}>
                Configure ElevenLabs above or it will fall back to OpenAI
              </Text>
            )}
          </SettingsSection>

          {/* Reset */}
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <RefreshCw size={18} color={colors.utility.error} />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>

          {isSaving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={colors.text.muted} />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  } as ViewStyle,
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingTop: 16,
  } as ViewStyle,
  section: {
    marginBottom: 24,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginBottom: 8,
  } as TextStyle,
  sectionContent: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
  } as ViewStyle,

  // Provider Toggle
  providerToggle: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 4,
  } as ViewStyle,
  providerOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  } as ViewStyle,
  providerOptionActive: {
    backgroundColor: colors.accent.gold,
  } as ViewStyle,
  providerOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.muted,
  } as TextStyle,
  providerOptionTextActive: {
    color: colors.background.primary,
  } as TextStyle,

  // Voice Options
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  } as ViewStyle,
  voiceOptionContent: {
    flex: 1,
  } as ViewStyle,
  voiceOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  } as TextStyle,
  voiceOptionDesc: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  } as TextStyle,

  // Input Fields
  inputContainer: {
    marginBottom: 16,
  } as ViewStyle,
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  } as TextStyle,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  input: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text.primary,
  } as TextStyle,
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  } as ViewStyle,
  inputHint: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 6,
  } as TextStyle,

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  } as ViewStyle,
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.utility.error,
  } as TextStyle,

  // Validate Button
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  } as ViewStyle,
  validateButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  } as TextStyle,
  buttonDisabled: {
    opacity: 0.5,
  } as ViewStyle,

  // Sliders
  sliderContainer: {
    marginBottom: 20,
  } as ViewStyle,
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  } as TextStyle,
  sliderValue: {
    fontSize: 14,
    color: colors.accent.gold,
    fontWeight: '600',
  } as TextStyle,
  slider: {
    width: '100%',
    height: 40,
  } as ViewStyle,
  sliderHint: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: -4,
  } as TextStyle,

  // Test Button
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.gold,
    borderRadius: 8,
    paddingVertical: 14,
    gap: 8,
  } as ViewStyle,
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  } as TextStyle,
  warningText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 12,
  } as TextStyle,

  // Reset
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  } as ViewStyle,
  resetButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.utility.error,
  } as TextStyle,

  // Saving Indicator
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  } as ViewStyle,
  savingText: {
    fontSize: 13,
    color: colors.text.muted,
  } as TextStyle,
});
