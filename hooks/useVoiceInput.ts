import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { getVoiceSettings } from '@/services/storageService';
import { speak } from '@/services/ttsService';
import { withTimeout } from '@/utils/withTimeout';

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking' | 'error';

interface UseVoiceInputOptions {
  openaiApiKey: string;
  onUserTranscript?: (text: string) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAIResponse?: (text: string) => void;
  onError?: (error: any) => void;
}

let currentSound: Audio.Sound | null = null;

export function useVoiceInput(options: UseVoiceInputOptions) {
  const { openaiApiKey, onUserTranscript, onTranscript, onAIResponse, onError } = options;

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [aiTranscript, setAITranscript] = useState('');
  const isActiveRef = useRef(false);

  // Use the new expo-audio recorder hook with HIGH_QUALITY preset
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Cleanup helper
  const cleanup = useCallback(async () => {
    isActiveRef.current = false;
    if (audioRecorder.isRecording) {
      try {
        await audioRecorder.stop();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    await stopSpeaking();
  }, [audioRecorder]);

  // Stop any currently playing TTS audio
  const stopSpeaking = async () => {
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        currentSound = null;
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  };

  // Text-to-Speech using configured provider (OpenAI or ElevenLabs)
  const speakText = async (text: string): Promise<void> => {
    if (!openaiApiKey || !text.trim()) {
      console.log('[TTS] Skipping - no API key or empty text');
      return;
    }

    console.log('[TTS] Generating speech for:', text.substring(0, 50) + '...');
    setVoiceState('speaking');

    try {
      // Stop any currently playing audio
      await stopSpeaking();

      // Configure audio mode for playback
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      // Get voice settings and generate speech using configured provider
      const voiceSettings = await getVoiceSettings();
      const result = await speak(text, voiceSettings, openaiApiKey);

      if (result.usedFallback) {
        console.log('[TTS] Used fallback provider:', result.provider);
      }

      // Save to temp file
      const tempFile = `${FileSystem.cacheDirectory}tts_response.mp3`;
      await FileSystem.writeAsStringAsync(tempFile, result.audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[TTS] Audio saved, playing...');

      // Play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempFile },
        { shouldPlay: true }
      );

      currentSound = sound;

      // Wait for playback to complete
      return new Promise((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('[TTS] Playback finished');
            sound.unloadAsync();
            currentSound = null;
            setVoiceState('idle');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('[TTS] Error:', error);
      setVoiceState('idle');
      throw error;
    }
  };

  // Toggle voice - tap to start, tap again to stop and transcribe
  const toggleVoice = useCallback(async () => {
    console.log('[Voice] Toggle called, isActive:', isActiveRef.current, 'state:', voiceState, 'isRecording:', audioRecorder.isRecording);

    // If speaking, stop and reset
    if (voiceState === 'speaking') {
      await stopSpeaking();
      setVoiceState('idle');
      return;
    }

    // If in error state, reset and try again
    if (voiceState === 'error') {
      await cleanup();
      setVoiceState('idle');
      setTimeout(() => startVoice(), 100);
      return;
    }

    if (audioRecorder.isRecording || isActiveRef.current) {
      await stopAndTranscribe();
    } else {
      await startVoice();
    }
  }, [voiceState, audioRecorder.isRecording]);

  const startVoice = useCallback(async () => {
    // Allow starting from idle or error state
    if (voiceState !== 'idle' && voiceState !== 'error') {
      console.log('[Voice] Not idle, current state:', voiceState);
      return;
    }

    console.log('[Voice] Starting...');

    try {
      // Clean up any previous recording first
      await cleanup();

      isActiveRef.current = true;
      setVoiceState('connecting');
      setCurrentTranscript('');
      setAITranscript('');

      // Request audio permissions using new API
      const permissionResponse = await AudioModule.requestRecordingPermissionsAsync();
      console.log('[Voice] Permission status:', permissionResponse.status);

      if (permissionResponse.status !== 'granted') {
        throw new Error('Audio permission not granted. Please enable microphone access in Settings.');
      }

      console.log('[Voice] Setting audio mode for recording...');

      // Enable recording mode on iOS
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      console.log('[Voice] Starting recording...');

      // Start recording with the new API
      await audioRecorder.record();

      setVoiceState('listening');
      console.log('[Voice] Recording started, now listening');

    } catch (error: any) {
      console.error('[Voice] Failed to start:', error);
      setVoiceState('error');
      isActiveRef.current = false;
      onError?.(error);

      // Auto-reset to idle after error so user can try again
      setTimeout(() => {
        setVoiceState('idle');
      }, 2000);
    }
  }, [voiceState, onError, cleanup, audioRecorder]);

  const stopAndTranscribe = useCallback(async () => {
    console.log('[Voice] Stop and transcribe called');

    if (!audioRecorder.isRecording) {
      console.log('[Voice] No recording to stop');
      setVoiceState('idle');
      isActiveRef.current = false;
      return;
    }

    setVoiceState('processing');

    try {
      // Stop the recording
      console.log('[Voice] Stopping recording...');
      await audioRecorder.stop();

      const uri = audioRecorder.uri;
      console.log('[Voice] Recording stopped, URI:', uri);

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Transcribe using OpenAI Whisper API
      console.log('[Voice] Transcribing...');
      const transcript = await transcribeWithWhisper(uri, openaiApiKey);
      console.log('[Voice] Transcription result:', transcript);

      if (transcript && transcript.trim()) {
        setCurrentTranscript(transcript);
        onUserTranscript?.(transcript);
        onTranscript?.(transcript, true);
      } else {
        console.log('[Voice] Empty transcription');
        setVoiceState('idle');
        isActiveRef.current = false;
      }

    } catch (error) {
      console.error('[Voice] Transcription error:', error);
      setVoiceState('error');
      isActiveRef.current = false;
      onError?.(error);

      // Auto-reset to idle after error
      setTimeout(() => {
        setVoiceState('idle');
      }, 2000);
    }
  }, [openaiApiKey, onUserTranscript, onTranscript, onError, audioRecorder]);

  // Speak AI response (called externally after getting Grok response)
  const speakResponse = useCallback(async (text: string) => {
    setAITranscript(text);
    onAIResponse?.(text);

    try {
      await speakText(text);
    } catch (error) {
      console.error('[Voice] Failed to speak response:', error);
      setVoiceState('idle');
    }

    isActiveRef.current = false;
  }, [onAIResponse, speakText]);

  const stopVoice = useCallback(async () => {
    console.log('[Voice] Stop called');
    await cleanup();
    setVoiceState('idle');
    setCurrentTranscript('');
    setAITranscript('');
  }, [cleanup]);

  const interrupt = useCallback(() => {
    stopVoice();
  }, [stopVoice]);

  const sendTextAsVoice = useCallback((text: string) => {
    setCurrentTranscript(text);
    onUserTranscript?.(text);
    onTranscript?.(text, true);
  }, [onUserTranscript, onTranscript]);

  return {
    voiceState,
    currentTranscript,
    aiTranscript,
    isActive: voiceState !== 'idle' && voiceState !== 'error',
    isListening: voiceState === 'listening',
    isProcessing: voiceState === 'processing',
    isSpeaking: voiceState === 'speaking',
    isConnecting: voiceState === 'connecting',
    toggleVoice,
    startVoice,
    stopVoice,
    interrupt,
    sendTextAsVoice,
    speakResponse,
  };
}

// Transcribe audio using OpenAI Whisper API
async function transcribeWithWhisper(audioUri: string, apiKey: string): Promise<string> {
  console.log('[Whisper] Starting transcription for:', audioUri);

  if (!apiKey) {
    throw new Error('OpenAI API key is not set');
  }

  const startTime = Date.now();
  try {
    // Create form data for the API
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any);
    formData.append('model', 'gpt-4o-mini-transcribe');
    formData.append('language', 'en');

    console.log('[Whisper] Sending request...');
    const response = await withTimeout(
      fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      }),
      15000, // 15 second timeout for voice transcription
      'Whisper transcription'
    );

    console.log('[Whisper] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Whisper] API error:', response.status, errorText);
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log(`[PERF] Whisper transcription completed in ${duration}ms`);
    console.log('[Whisper] Response data:', data);
    return data.text || '';
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PERF] Whisper transcription failed after ${duration}ms:`, error);
    throw error;
  }
}
