/**
 * Real-time Voice Hook for OpenAI Realtime API
 *
 * Provides real-time voice conversation with natural interruption support.
 * Uses WebSocket for bidirectional audio streaming with server-side VAD.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
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
  initialVolume?: number; // 0-1, applied when audio player initializes
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
  const isDisconnectingRef = useRef(false);

  // Buffer for accumulating user transcripts until turn is complete
  const transcriptBufferRef = useRef<string>('');
  // Buffer for AI message that arrived before user transcript
  const pendingAIMessageRef = useRef<string>('');
  // Flag to track if we're waiting for user transcript after they spoke
  const awaitingUserTranscriptRef = useRef(false);

  // Refs for stable callback access (avoid stale closures)
  const voiceStateRef = useRef(voiceState);
  const messagesRef = useRef<Message[]>([]);
  const onUserTranscriptRef = useRef(onUserTranscript);
  const onAITranscriptRef = useRef(onAITranscript);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);

  // Keep refs in sync with values
  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { onUserTranscriptRef.current = onUserTranscript; }, [onUserTranscript]);
  useEffect(() => { onAITranscriptRef.current = onAITranscript; }, [onAITranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  // Update state and notify callback (uses refs to avoid stale closures)
  const updateState = useCallback((newState: RealtimeVoiceState) => {
    console.log('[RealtimeVoice] State change:', voiceStateRef.current, '->', newState);
    setVoiceState(newState);
    voiceStateRef.current = newState;
    onStateChangeRef.current?.(newState);
  }, []);

  // Add message to conversation history (with deduplication)
  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages(prev => {
      // Prevent duplicate consecutive messages with same role and content
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === role && lastMessage.content === content) {
        console.log('[RealtimeVoice] Skipping duplicate message');
        return prev;
      }
      return [...prev, { role, content, timestamp: Date.now() }];
    });
  }, []);

  // Initialize audio player and recorder
  useEffect(() => {
    audioPlayerRef.current = new PCMAudioPlayer();
    audioRecorderRef.current = new PCMAudioRecorder();

    // Apply saved volume if provided
    if (options.initialVolume !== undefined) {
      audioPlayerRef.current.setVolume(options.initialVolume);
    }

    return () => {
      audioPlayerRef.current?.stop();
      audioRecorderRef.current?.stop();
    };
  }, []);

  // Start streaming audio to the realtime service
  const startAudioStreaming = useCallback(async () => {
    console.log('[RealtimeVoice] startAudioStreaming() called');

    // Stop any existing recording first
    if (audioRecorderRef.current?.active) {
      console.log('[RealtimeVoice] Stopping existing recording first...');
      await audioRecorderRef.current.stop();
    }

    // Longer delay to ensure any previous recording is fully released
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!audioRecorderRef.current) {
      console.error('[RealtimeVoice] No audio recorder available');
      return;
    }
    if (!serviceRef.current) {
      console.error('[RealtimeVoice] No realtime service available');
      return;
    }

    try {
      // Reset audio mode first (this can help clear stale audio state)
      console.log('[RealtimeVoice] Resetting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      await new Promise(resolve => setTimeout(resolve, 50));

      // Now configure for recording
      console.log('[RealtimeVoice] Setting audio mode for recording...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('[RealtimeVoice] Audio mode set successfully');

      // Start recording with callback for each audio chunk
      console.log('[RealtimeVoice] Starting audio recorder...');
      let chunksSent = 0;
      await audioRecorderRef.current.start((base64Chunk: string) => {
        // Send audio chunk to OpenAI Realtime
        chunksSent++;
        if (chunksSent <= 3) {
          console.log('[RealtimeVoice] Sending audio chunk #' + chunksSent + ', length:', base64Chunk.length);
        }
        serviceRef.current?.sendAudioChunk(base64Chunk);
      });

      console.log('[RealtimeVoice] Audio streaming started successfully');
    } catch (error) {
      console.error('[RealtimeVoice] Failed to start audio streaming:', error);
      onErrorRef.current?.(error);
    }
  }, []);

  // Ref for startAudioStreaming to use in callbacks
  const startAudioStreamingRef = useRef(startAudioStreaming);
  useEffect(() => { startAudioStreamingRef.current = startAudioStreaming; }, [startAudioStreaming]);

  // Setup realtime callbacks - uses refs for stable access
  const setupCallbacks = useCallback((): RealtimeCallbacks => ({
    onSessionCreated: () => {
      console.log('[RealtimeVoice] Session created, ready to listen');

      // Replay conversation history to give AI context when reconnecting
      const currentMessages = messagesRef.current;
      if (currentMessages.length > 0) {
        console.log('[RealtimeVoice] Replaying', currentMessages.length, 'messages for context');
        currentMessages.forEach(msg => {
          serviceRef.current?.sendConversationItem(msg.role, msg.content);
        });
      }

      updateState('listening');
      // Start recording and streaming audio
      startAudioStreamingRef.current();
    },

    onSpeechStarted: () => {
      console.log('[RealtimeVoice] User started speaking');
      // If AI is speaking, this is an interruption
      if (voiceStateRef.current === 'speaking') {
        console.log('[RealtimeVoice] Interruption detected!');
        serviceRef.current?.cancelResponse();
        audioPlayerRef.current?.stop();
        // Clear buffer for new turn after interruption
        transcriptBufferRef.current = '';
      }
      updateState('listening');
    },

    onSpeechStopped: () => {
      console.log('[RealtimeVoice] User stopped speaking');
      // Mark that we're waiting for the user transcript to arrive
      awaitingUserTranscriptRef.current = true;
      updateState('processing');
    },

    onUserTranscript: (transcript: string) => {
      console.log('[RealtimeVoice] User said:', transcript);
      // Accumulate transcripts
      if (transcriptBufferRef.current) {
        transcriptBufferRef.current += ' ' + transcript;
      } else {
        transcriptBufferRef.current = transcript;
      }
      // Show in live transcript view
      setCurrentUserTranscript(transcriptBufferRef.current);
      onUserTranscriptRef.current?.(transcript);

      // User transcript has arrived - add it to messages NOW
      if (transcriptBufferRef.current) {
        addMessage('user', transcriptBufferRef.current);
        console.log('[RealtimeVoice] Added user message:', transcriptBufferRef.current);
        transcriptBufferRef.current = '';
        setCurrentUserTranscript('');
      }

      // No longer waiting for user transcript
      awaitingUserTranscriptRef.current = false;

      // If there's a pending AI message that arrived before this, add it now
      if (pendingAIMessageRef.current) {
        addMessage('assistant', pendingAIMessageRef.current);
        console.log('[RealtimeVoice] Added buffered AI message');
        pendingAIMessageRef.current = '';
      }
    },

    onTranscript: (transcript: string, isFinal: boolean) => {
      console.log('[RealtimeVoice] AI transcript:', transcript, 'final:', isFinal);
      onAITranscriptRef.current?.(transcript, isFinal);

      if (isFinal) {
        // Clear streaming transcript - it's now going into messages
        setCurrentAITranscript('');

        // If we're still waiting for user transcript, buffer this AI message
        if (awaitingUserTranscriptRef.current) {
          console.log('[RealtimeVoice] Buffering AI message until user transcript arrives');
          pendingAIMessageRef.current = transcript;
        } else {
          // User transcript already arrived, add AI message directly
          addMessage('assistant', transcript);
        }
      } else {
        // Only update streaming transcript for non-final (partial) updates
        setCurrentAITranscript(transcript);
      }
    },

    onAudioResponse: (audioBase64: string) => {
      // Play audio chunk immediately for low latency
      // User message is now added in onTranscript to ensure correct ordering
      audioPlayerRef.current?.playChunk(audioBase64);
      if (voiceStateRef.current !== 'speaking') {
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
      onErrorRef.current?.(error);
    },
  }), [updateState, addMessage]);  // Only stable refs used, no stale closures

  // Connect to OpenAI Realtime
  const connect = useCallback(async () => {
    if (isConnected || voiceStateRef.current === 'connecting') {
      console.log('[RealtimeVoice] Already connected or connecting');
      return;
    }

    if (!openaiApiKey) {
      console.error('[RealtimeVoice] No OpenAI API key provided');
      const error = new Error('OpenAI API key is required');
      onErrorRef.current?.(error);
      return;
    }

    console.log('[RealtimeVoice] Connecting... (API key exists:', !!openaiApiKey, ')');
    updateState('connecting');
    isActiveRef.current = true;
    isDisconnectingRef.current = false;

    try {
      // Request microphone permission using expo-av
      console.log('[RealtimeVoice] Requesting microphone permission...');
      const permissionResponse = await Audio.requestPermissionsAsync();
      console.log('[RealtimeVoice] Permission status:', permissionResponse.status);
      if (permissionResponse.status !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      // Get or create service instance
      console.log('[RealtimeVoice] Getting realtime service...');
      serviceRef.current = getRealtimeService(openaiApiKey);

      // Connect with callbacks
      console.log('[RealtimeVoice] Connecting to OpenAI Realtime API...');
      await serviceRef.current.connect(setupCallbacks());

      setIsConnected(true);
      console.log('[RealtimeVoice] Connected successfully');
    } catch (error) {
      console.error('[RealtimeVoice] Connection failed:', error);
      updateState('error');
      onErrorRef.current?.(error);
      isActiveRef.current = false;
    }
  }, [isConnected, openaiApiKey, updateState, setupCallbacks]);

  // Disconnect from OpenAI Realtime
  const disconnect = useCallback(async () => {
    // Prevent double disconnect
    if (isDisconnectingRef.current) {
      console.log('[RealtimeVoice] Already disconnecting, skipping');
      return;
    }
    isDisconnectingRef.current = true;

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
    transcriptBufferRef.current = '';

    isDisconnectingRef.current = false;
    console.log('[RealtimeVoice] Disconnected');
  }, [updateState]);

  // Toggle connection (tap to start/stop)
  const toggle = useCallback(async () => {
    if (isConnected || voiceStateRef.current === 'connecting') {
      await disconnect();
    } else {
      await connect();
    }
  }, [isConnected, connect, disconnect]);

  // Interrupt current AI response
  const interrupt = useCallback(() => {
    if (voiceStateRef.current === 'speaking') {
      console.log('[RealtimeVoice] Manual interruption');
      serviceRef.current?.cancelResponse();
      audioPlayerRef.current?.stop();
      updateState('listening');
    }
  }, [updateState]);

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

  // Volume control
  const setVolume = useCallback((volume: number) => {
    audioPlayerRef.current?.setVolume(volume);
  }, []);

  const getVolume = useCallback(() => {
    return audioPlayerRef.current?.getVolume() ?? 0.8;
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

    // Volume control
    setVolume,
    getVolume,

    // Clear conversation
    clearMessages: () => setMessages([]),
  };
}
