// ElevenLabs Text-to-Speech Service

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  stability?: number;       // 0-1, default 0.5
  similarityBoost?: number; // 0-1, default 0.75
  modelId?: string;
}

export type ElevenLabsErrorCode =
  | 'INVALID_API_KEY'
  | 'INVALID_VOICE_ID'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface ElevenLabsError {
  code: ElevenLabsErrorCode;
  message: string;
}

export type ElevenLabsResult =
  | { success: true; audioBase64: string }
  | { success: false; error: ElevenLabsError };

/**
 * Generate speech using ElevenLabs API
 */
export async function generateSpeech(
  text: string,
  config: ElevenLabsConfig
): Promise<ElevenLabsResult> {
  const {
    apiKey,
    voiceId,
    stability = 0.5,
    similarityBoost = 0.75,
    modelId = 'eleven_monolingual_v1',
  } = config;

  console.log('[ElevenLabs] Generating speech for:', text.substring(0, 50) + '...');

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      console.error('[ElevenLabs] API error:', status);

      if (status === 401) {
        return {
          success: false,
          error: { code: 'INVALID_API_KEY', message: 'Invalid API key' }
        };
      }
      if (status === 404) {
        return {
          success: false,
          error: { code: 'INVALID_VOICE_ID', message: 'Voice not found' }
        };
      }
      if (status === 429) {
        return {
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: 'API quota exceeded' }
        };
      }
      return {
        success: false,
        error: { code: 'UNKNOWN', message: `HTTP ${status}` }
      };
    }

    // Convert blob to base64
    const audioBlob = await response.blob();
    const base64 = await blobToBase64(audioBlob);

    console.log('[ElevenLabs] Speech generated successfully');
    return { success: true, audioBase64: base64 };

  } catch (error) {
    console.error('[ElevenLabs] Network error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error'
      }
    };
  }
}

/**
 * Validate ElevenLabs credentials by making a test request
 */
export async function validateCredentials(
  apiKey: string,
  voiceId: string
): Promise<{ valid: boolean; error?: string }> {
  console.log('[ElevenLabs] Validating credentials...');

  try {
    // First validate API key by fetching user info
    const userResponse = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: false, error: `API error: ${userResponse.status}` };
    }

    // Now validate voice ID by fetching voice details
    const voiceResponse = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!voiceResponse.ok) {
      if (voiceResponse.status === 404) {
        return { valid: false, error: 'Voice not found. Check your Voice ID.' };
      }
      return { valid: false, error: `Voice error: ${voiceResponse.status}` };
    }

    console.log('[ElevenLabs] Credentials valid');
    return { valid: true };

  } catch (error) {
    console.error('[ElevenLabs] Validation error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Get available voices for the API key
 */
export async function getAvailableVoices(
  apiKey: string
): Promise<{ id: string; name: string; category: string }[]> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      console.error('[ElevenLabs] Failed to fetch voices:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.voices || []).map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category || 'unknown',
    }));

  } catch (error) {
    console.error('[ElevenLabs] Error fetching voices:', error);
    return [];
  }
}

// Helper to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/mpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
