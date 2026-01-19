// Unified Text-to-Speech Service
// Provides a single interface for TTS with automatic fallback

import type { VoiceSettings, OpenAIVoice } from '@/types/voice';
import { generateSpeech as elevenLabsGenerateSpeech } from './elevenLabsTTS';

export interface TTSResult {
  audioBase64: string;
  provider: 'openai' | 'elevenlabs';
  usedFallback: boolean;
}

/**
 * Check if ElevenLabs is properly configured
 */
export function isElevenLabsConfigured(settings: VoiceSettings): boolean {
  return !!(
    settings.elevenlabsApiKey &&
    settings.elevenlabsApiKey.trim() &&
    settings.elevenlabsVoiceId &&
    settings.elevenlabsVoiceId.trim()
  );
}

/**
 * Generate speech using OpenAI TTS API
 */
async function generateOpenAISpeech(
  text: string,
  voice: OpenAIVoice,
  apiKey: string
): Promise<string> {
  console.log('[OpenAI TTS] Generating speech with voice:', voice);

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice,
      speed: 1.0,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OpenAI TTS] API error:', response.status, errorText);
    throw new Error(`OpenAI TTS API error: ${response.status}`);
  }

  // Convert blob to base64
  const audioBlob = await response.blob();
  const base64 = await blobToBase64(audioBlob);

  console.log('[OpenAI TTS] Speech generated successfully');
  return base64;
}

/**
 * Generate speech using configured provider with automatic fallback
 */
export async function speak(
  text: string,
  settings: VoiceSettings,
  openaiApiKey: string
): Promise<TTSResult> {
  // If ElevenLabs is selected and configured, try it first
  if (settings.provider === 'elevenlabs' && isElevenLabsConfigured(settings)) {
    console.log('[TTS] Attempting ElevenLabs...');

    const result = await elevenLabsGenerateSpeech(text, {
      apiKey: settings.elevenlabsApiKey!,
      voiceId: settings.elevenlabsVoiceId!,
      stability: settings.elevenlabsStability,
      similarityBoost: settings.elevenlabsSimilarityBoost,
    });

    if (result.success) {
      return {
        audioBase64: result.audioBase64,
        provider: 'elevenlabs',
        usedFallback: false,
      };
    }

    // Log error and fallback to OpenAI
    console.warn('[TTS] ElevenLabs failed, falling back to OpenAI:', result.error);
  }

  // Use OpenAI TTS (default or fallback)
  console.log('[TTS] Using OpenAI TTS...');
  const audioBase64 = await generateOpenAISpeech(text, settings.openaiVoice, openaiApiKey);

  return {
    audioBase64,
    provider: 'openai',
    usedFallback: settings.provider === 'elevenlabs',
  };
}

// Helper to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
