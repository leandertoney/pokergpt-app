/**
 * Real-time Voice Hook — WebRTC transport for OpenAI Realtime API
 *
 * Handles peer connection lifecycle, tracks transcripts, mirrors server
 * events to a voiceState state machine. Audio I/O (mic capture, remote
 * playback, echo cancellation, routing) is managed natively by WebRTC —
 * the hook doesn't touch audio modes, PCM, or WAV.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
// react-native-webrtc is a native module with no JS fallback, so importing it
// normally throws "native module doesn't exist" in Expo Go — and because
// app/voice.tsx is an Expo Router route, that throw happens at startup and
// takes the whole app down before any screen renders. Resolve it lazily so the
// app boots in Expo Go; voice itself still requires a dev build to function.
import type { MediaStream } from 'react-native-webrtc';

let RTCViewImpl: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RTCViewImpl = require('react-native-webrtc').RTCView;
} catch {
  RTCViewImpl = null;
}
import {
  RealtimeWebRTCService,
  getRealtimeWebRTCService,
  resetRealtimeWebRTCService,
  RealtimeCallbacks,
} from '@/services/realtimeWebRTC';

export type RealtimeVoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'processing'
  | 'error';

interface UseRealtimeVoiceOptions {
  openaiApiKey: string;
  voice?: string;
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
  const { openaiApiKey, voice = 'cedar', onUserTranscript, onAITranscript, onError, onStateChange } = options;

  const [voiceState, setVoiceState] = useState<RealtimeVoiceState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserTranscript, setCurrentUserTranscript] = useState('');
  const [currentAITranscript, setCurrentAITranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const serviceRef = useRef<RealtimeWebRTCService | null>(null);
  const voiceStateRef = useRef(voiceState);
  const isConnectedRef = useRef(false);
  const disconnectRef = useRef<(() => Promise<void>) | null>(null);

  const onUserTranscriptRef = useRef(onUserTranscript);
  const onAITranscriptRef = useRef(onAITranscript);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => { voiceStateRef.current = voiceState; }, [voiceState]);
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
  useEffect(() => { onUserTranscriptRef.current = onUserTranscript; }, [onUserTranscript]);
  useEffect(() => { onAITranscriptRef.current = onAITranscript; }, [onAITranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  const updateState = useCallback((next: RealtimeVoiceState) => {
    if (voiceStateRef.current === next) return;
    console.log('[RealtimeVoice] State change:', voiceStateRef.current, '->', next);
    voiceStateRef.current = next;
    setVoiceState(next);
    onStateChangeRef.current?.(next);
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.content === content) return prev;
      return [...prev, { role, content, timestamp: Date.now() }];
    });
  }, []);

  const buildCallbacks = useCallback((): RealtimeCallbacks => ({
    onSessionCreated: () => {
      console.log('[RealtimeVoice] Session created');
    },
    onSpeechStarted: () => {
      // Clear stale live transcript from previous turn so the bubble doesn't ghost
      setCurrentUserTranscript('');
      updateState('listening');
    },
    onSpeechStopped: () => {
      updateState('processing');
    },
    onUserTranscript: (text) => {
      addMessage('user', text);
      // Clear the live transcript so the persisted message bubble owns the display
      setCurrentUserTranscript('');
      onUserTranscriptRef.current?.(text);
    },
    onTranscript: (text, isFinal) => {
      setCurrentAITranscript(text);
      if (voiceStateRef.current !== 'speaking') updateState('speaking');
      onAITranscriptRef.current?.(text, isFinal);
      if (isFinal) {
        addMessage('assistant', text);
        setCurrentAITranscript('');
      }
    },
    onResponseDone: () => {
      updateState('listening');
    },
    onError: (err) => {
      console.error('[RealtimeVoice] Error:', err);
      updateState('error');
      onErrorRef.current?.(err);
    },
  }), [updateState, addMessage]);

  const connect = useCallback(async () => {
    // Recover from error state by tearing down stale connection
    if (voiceStateRef.current === 'error' && (isConnectedRef.current || serviceRef.current)) {
      await disconnectRef.current?.();
    }
    if (isConnectedRef.current || voiceStateRef.current === 'connecting') {
      return;
    }
    if (!openaiApiKey) {
      onErrorRef.current?.(new Error('OpenAI API key is required'));
      return;
    }

    updateState('connecting');
    try {
      serviceRef.current = getRealtimeWebRTCService(openaiApiKey);
      const stream = await serviceRef.current.connect(buildCallbacks(), voice);
      setRemoteStream(stream);
      setIsConnected(true);
      updateState('listening');
    } catch (error) {
      console.error('[RealtimeVoice] Connect failed:', error);
      updateState('error');
      onErrorRef.current?.(error);
    }
  }, [openaiApiKey, voice, buildCallbacks, updateState]);

  const disconnect = useCallback(async () => {
    serviceRef.current?.disconnect();
    resetRealtimeWebRTCService();
    serviceRef.current = null;
    setRemoteStream(null);
    setIsConnected(false);
    setCurrentUserTranscript('');
    setCurrentAITranscript('');
    updateState('idle');
  }, [updateState]);

  useEffect(() => { disconnectRef.current = disconnect; }, [disconnect]);

  const toggle = useCallback(async () => {
    if (isConnectedRef.current || voiceStateRef.current === 'connecting') {
      await disconnect();
    } else {
      await connect();
    }
  }, [connect, disconnect]);

  const interrupt = useCallback(() => {
    if (voiceStateRef.current === 'speaking') {
      serviceRef.current?.cancelResponse();
      updateState('listening');
    }
  }, [updateState]);

  const sendText = useCallback((text: string) => {
    if (!serviceRef.current || !isConnectedRef.current) return;
    setCurrentUserTranscript(text);
    addMessage('user', text);
    serviceRef.current.sendUserText(text);
    updateState('processing');
  }, [addMessage, updateState]);

  const setMicEnabled = useCallback((enabled: boolean) => {
    serviceRef.current?.setMicEnabled(enabled);
  }, []);

  useEffect(() => {
    return () => {
      serviceRef.current?.disconnect();
      resetRealtimeWebRTCService();
    };
  }, []);

  // Volume: Apply gain multiplier to remote audio track
  // Default of 1.0 in UI maps to 1.5x multiplier (50% louder)
  const setVolume = useCallback((volume: number) => {
    serviceRef.current?.setVolume(volume);
  }, []);
  const getVolume = useCallback(() => 1.0, []);

  return {
    voiceState,
    isConnected,
    isActive: isConnected,
    currentUserTranscript,
    currentAITranscript,
    messages,
    remoteStream,

    isIdle: voiceState === 'idle',
    isConnecting: voiceState === 'connecting',
    isListening: voiceState === 'listening',
    isSpeaking: voiceState === 'speaking',
    isProcessing: voiceState === 'processing',
    isError: voiceState === 'error',

    connect,
    disconnect,
    toggle,
    interrupt,
    sendText,
    setMicEnabled,

    setVolume,
    getVolume,

    clearMessages: () => setMessages([]),
  };
}

// Re-export for screens that want to render the remote stream as an RTCView.
// Null in Expo Go, where the native module is unavailable — callers should
// guard on it rather than assume a component.
export const RTCView = RTCViewImpl;
