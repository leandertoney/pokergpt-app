import { useState, useEffect, useCallback } from 'react';
import type { VoiceSettings } from '@/types/voice';
import { DEFAULT_VOICE_SETTINGS } from '@/types/voice';
import { getVoiceSettings, setVoiceSettings, clearVoiceSettings } from '@/services/storageService';
import { validateCredentials } from '@/services/elevenLabsTTS';
import { isElevenLabsConfigured } from '@/services/ttsService';

export function useVoiceSettings() {
  const [settings, setSettingsState] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loaded = await getVoiceSettings();
        setSettingsState(loaded);
      } catch (error) {
        console.error('Failed to load voice settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update settings (partial updates supported)
  const updateSettings = useCallback(async (updates: Partial<VoiceSettings>) => {
    setIsSaving(true);
    try {
      await setVoiceSettings(updates);
      setSettingsState(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to save voice settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    setIsSaving(true);
    try {
      await clearVoiceSettings();
      setSettingsState(DEFAULT_VOICE_SETTINGS);
    } catch (error) {
      console.error('Failed to reset voice settings:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Validate ElevenLabs credentials
  const validateElevenLabs = useCallback(async (): Promise<{ valid: boolean; error?: string }> => {
    if (!settings.elevenlabsApiKey || !settings.elevenlabsVoiceId) {
      return { valid: false, error: 'API key and Voice ID are required' };
    }

    return validateCredentials(settings.elevenlabsApiKey, settings.elevenlabsVoiceId);
  }, [settings.elevenlabsApiKey, settings.elevenlabsVoiceId]);

  // Computed properties
  const elevenLabsConfigured = isElevenLabsConfigured(settings);
  const canUseElevenLabs = elevenLabsConfigured && settings.provider === 'elevenlabs';

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    resetToDefaults,
    validateElevenLabs,
    isElevenLabsConfigured: elevenLabsConfigured,
    canUseElevenLabs,
  };
}
