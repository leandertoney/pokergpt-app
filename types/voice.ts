// Voice provider and settings types

export type VoiceProvider = 'openai' | 'elevenlabs';

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface VoiceSettings {
  provider: VoiceProvider;
  openaiVoice: OpenAIVoice;
  elevenlabsApiKey: string | null;
  elevenlabsVoiceId: string | null;
  elevenlabsStability: number;      // 0-1, default 0.5
  elevenlabsSimilarityBoost: number; // 0-1, default 0.75
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  provider: 'openai',
  openaiVoice: 'nova',
  elevenlabsApiKey: null,
  elevenlabsVoiceId: null,
  elevenlabsStability: 0.5,
  elevenlabsSimilarityBoost: 0.75,
};

export const OPENAI_VOICES: { id: OpenAIVoice; name: string; description: string }[] = [
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm, conversational' },
  { id: 'fable', name: 'Fable', description: 'Expressive, storytelling' },
  { id: 'nova', name: 'Nova', description: 'Friendly, upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear, refined' },
];
