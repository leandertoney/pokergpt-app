// Voice provider and settings types

export type VoiceProvider = 'openai' | 'elevenlabs';

// Realtime API supported voices. Note: 'nova' / 'fable' are NOT supported here
// (they exist in the standard TTS API only). Realtime adds 'marin' and 'cedar'.
export type OpenAIVoice =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'sage'
  | 'shimmer'
  | 'verse'
  | 'marin'
  | 'cedar';

export interface VoiceSettings {
  provider: VoiceProvider;
  openaiVoice: OpenAIVoice;
  elevenlabsApiKey: string | null;
  elevenlabsVoiceId: string | null;
  elevenlabsStability: number;      // 0-1, default 0.5
  elevenlabsSimilarityBoost: number; // 0-1, default 0.75
  playbackVolume: number;           // 0-1, expo-av volume level
  audioGain: number;                // 1-20, PCM software amplification
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  provider: 'openai',
  openaiVoice: 'cedar',
  elevenlabsApiKey: null,
  elevenlabsVoiceId: null,
  elevenlabsStability: 0.5,
  elevenlabsSimilarityBoost: 0.75,
  playbackVolume: 1.0,
  audioGain: 12.0,
};

export const OPENAI_VOICES: { id: OpenAIVoice; name: string; description: string }[] = [
  { id: 'cedar', name: 'Cedar', description: 'Natural, conversational male' },
  { id: 'marin', name: 'Marin', description: 'Natural, conversational female' },
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
  { id: 'ash', name: 'Ash', description: 'Clear, articulate' },
  { id: 'ballad', name: 'Ballad', description: 'Warm, melodic' },
  { id: 'coral', name: 'Coral', description: 'Friendly, upbeat' },
  { id: 'echo', name: 'Echo', description: 'Warm, conversational' },
  { id: 'sage', name: 'Sage', description: 'Calm, measured' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear, refined' },
  { id: 'verse', name: 'Verse', description: 'Expressive, storytelling' },
];

// Voices saved by older app versions that the Realtime API rejects — migrate
// these to a supported voice on read so existing users don't hit invalid_value errors.
const REMOVED_VOICES = new Set(['nova', 'fable', 'onyx']);
export function migrateOpenAIVoice(saved: string | undefined | null): OpenAIVoice {
  if (!saved || REMOVED_VOICES.has(saved)) return DEFAULT_VOICE_SETTINGS.openaiVoice;
  return saved as OpenAIVoice;
}
