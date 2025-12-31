/**
 * Real-time Voice Hook for OpenAI Realtime API
 *
 * Provides real-time voice conversation with natural interruption support.
 * Uses WebSocket for bidirectional audio streaming with server-side VAD.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { setAudioModeAsync, AudioModule } from 'expo-audio';
import {
  OpenAIRealtimeService,
  getRealtimeService,
  resetRealtimeService,
  RealtimeCallbacks
} from '@/services/openAIRealtime';
import { PCMAudioPlayer, PCMAudioRecorder } from '@/utils/pcmAudio';

export type RealtimeVoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'processing'
  | 'error';

interface UseRealtimeVoiceOptions {
  openaiApiKey: string;
  onUserTranscript?: (text: string) => void;
  onAITranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onStateChange?: (state: RealtimeVoiceState) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useRealtimeVoice(options: UseRealtimeVoiceOptions) {
  const {
    openaiApiKey,
    onUserTranscript,
    onAITranscript,
    onError,
    onStateChange
  } = options;

  const [voiceState, setVoiceState] = useState<RealtimeVoiceState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserTranscript, setCurrentUserTranscript] = useState('');
  const [currentAITranscript, setCurrentAITranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const serviceRef = useRef<OpenAIRealtimeService | null>(null);
  const audioPlayerRef = useRef<PCMAudioPlayer | null>(null);
  const audioRecorderRef = useRef<PCMAudioRecorder | null>(null);
  const isActiveRef = useRef(false);

  // Update state and notify callback
  const updateState = useCallback((newState: RealtimeVoiceState) => {
    setVoiceState(newState);
    onStateChange?.(newState);
  }, [onStateChange]);

  // Add message to conversation history
  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
  }, []);

  // Initialize audio player and recorder
  useEffect(() => {
    audioPlayerRef.current = new PCMAudioPlayer();
    audioRecorderRef.current = new PCMAudioRecorder();

    return () => {
      audioPlayerRef.current?.stop();
      audioRecorderRef.current?.stop();
    };
  }, []);

  // Setup realtime callbacks
  const setupCallbacks = useCallback((): RealtimeCallbacks => ({
    onSessionCreated: () => {
      console.log('[RealtimeVoice] Session created, ready to listen');
      updateState('listening');
      // Start recording and streaming audio
      startAudioStreaming();
    },

    onSpeechStarted: () => {
      console.log('[RealtimeVoice] User started speaking');
      // If AI is speaking, this is an interruption
      if (voiceState === 'speaking') {
        console.log('[RealtimeVoice] Interruption detected!');
        serviceRef.current?.cancelResponse();
        audioPlayerRef.current?.stop();
      }
      updateState('listening');
    },

    onSpeechStopped: () => {
      console.log('[RealtimeVoice] User stopped speaking');
      updateState('processing');
    },

    onUserTranscript: (transcript: string) => {
      console.log('[RealtimeVoice] User said:', transcript);
      setCurrentUserTranscript(transcript);
      onUserTranscript?.(transcript);
      addMessage('user', transcript);
    },

    onTranscript: (transcript: string, isFinal: boolean) => {
      console.log('[RealtimeVoice] AI transcript:', transcript, 'final:', isFinal);
      setCurrentAITranscript(transcript);
      onAITranscript?.(transcript, isFinal);
      if (isFinal) {
        addMessage('assistant', transcript);
      }
    },

    onAudioResponse: (audioBase64: string) => {
      // Play audio chunk immediately for low latency
      audioPlayerRef.current?.playChunk(audioBase64);
      if (voiceState !== 'speaking') {
        updateState('speaking');
      }
    },

    onResponseDone: (response: any) => {
      console.log('[RealtimeVoice] Response complete');
      // Wait for audio to finish playing before going back to listening
      audioPlayerRef.current?.onPlaybackComplete(() => {
        if (isActiveRef.current) {
          updateState('listening');
        }
      });
    },

    onError: (error: any) => {
      console.error('[RealtimeVoice] Error:', error);
      updateState('error');
      onError?.(error);
    },
  }), [voiceState, updateState, onUserTranscript, onAITranscript, onError, addMessage]);

  // Start streaming audio to the realtime service
  const startAudioStreaming = useCallback(async () => {
    if (!audioRecorderRef.current || !serviceRef.current) return;

    try {
      // Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Start recording with callback for each audio chunk
      await audioRecorderRef.current.start((base64Chunk: string) => {
        // Send audio chunk to OpenAI Realtime
        serviceRef.current?.sendAudioChunk(base64Chunk);
      });

      console.log('[RealtimeVoice] Audio streaming started');
    } catch (error) {
      console.error('[RealtimeVoice] Failed to start audio streaming:', error);
      onError?.(error);
    }
  }, [onError]);

  // Connect to OpenAI Realtime
  const connect = useCallback(async () => {
    if (isConnected || voiceState === 'connecting') {
      console.log('[RealtimeVoice] Already connected or connecting');
      return;
    }

    if (!openaiApiKey) {
      const error = new Error('OpenAI API key is required');
      onError?.(error);
      return;
    }

    console.log('[RealtimeVoice] Connecting...');
    updateState('connecting');
    isActiveRef.current = true;

    try {
      // Request microphone permission
      const permissionResponse = await AudioModule.requestRecordingPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      // Get or create service instance
      serviceRef.current = getRealtimeService(openaiApiKey);

      // Connect with callbacks
      await serviceRef.current.connect(setupCallbacks());

      setIsConnected(true);
      console.log('[RealtimeVoice] Connected successfully');
    } catch (error) {
      console.error('[RealtimeVoice] Connection failed:', error);
      updateState('error');
      onError?.(error);
      isActiveRef.current = false;
    }
  }, [isConnected, voiceState, openaiApiKey, updateState, setupCallbacks, onError]);

  // Disconnect from OpenAI Realtime
  const disconnect = useCallback(async () => {
    console.log('[RealtimeVoice] Disconnecting...');
    isActiveRef.current = false;

    // Stop audio recording
    await audioRecorderRef.current?.stop();

    // Stop audio playback
    audioPlayerRef.current?.stop();

    // Disconnect from service
    serviceRef.current?.disconnect();
    resetRealtimeService();
    serviceRef.current = null;

    setIsConnected(false);
    updateState('idle');
    setCurrentUserTranscript('');
    setCurrentAITranscript('');

    console.log('[RealtimeVoice] Disconnected');
  }, [updateState]);

  // Toggle connection (tap to start/stop)
  const toggle = useCallback(async () => {
    if (isConnected || voiceState === 'connecting') {
      await disconnect();
    } else {
      await connect();
    }
  }, [isConnected, voiceState, connect, disconnect]);

  // Interrupt current AI response
  const interrupt = useCallback(() => {
    if (voiceState === 'speaking') {
      console.log('[RealtimeVoice] Manual interruption');
      serviceRef.current?.cancelResponse();
      audioPlayerRef.current?.stop();
      updateState('listening');
    }
  }, [voiceState, updateState]);

  // Send text message (for testing or hybrid input)
  const sendText = useCallback((text: string) => {
    if (!serviceRef.current || !isConnected) {
      console.warn('[RealtimeVoice] Not connected, cannot send text');
      return;
    }

    setCurrentUserTranscript(text);
    addMessage('user', text);
    serviceRef.current.sendTextMessage(text);
    updateState('processing');
  }, [isConnected, addMessage, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      audioRecorderRef.current?.stop();
      audioPlayerRef.current?.stop();
      serviceRef.current?.disconnect();
      resetRealtimeService();
    };
  }, []);

  return {
    // State
    voiceState,
    isConnected,
    isActive: isActiveRef.current,
    currentUserTranscript,
    currentAITranscript,
    messages,

    // Computed state
    isIdle: voiceState === 'idle',
    isConnecting: voiceState === 'connecting',
    isListening: voiceState === 'listening',
    isSpeaking: voiceState === 'speaking',
    isProcessing: voiceState === 'processing',
    isError: voiceState === 'error',

    // Actions
    connect,
    disconnect,
    toggle,
    interrupt,
    sendText,

    // Clear conversation
    clearMessages: () => setMessages([]),
  };
}
