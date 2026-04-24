/**
 * OpenAI Realtime API Service
 *
 * Provides real-time voice conversation capabilities with natural interruption support.
 * Uses WebSocket connection to OpenAI's Realtime API for bidirectional audio streaming.
 */

import { VOICE_COACH_PROMPT } from '@/constants/prompts';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime';

export type RealtimeEvent =
  | { type: 'session.created'; session: any }
  | { type: 'session.updated'; session: any }
  | { type: 'conversation.item.created'; item: any }
  | { type: 'conversation.item.input_audio_transcription.completed'; transcript: string; item_id: string }
  | { type: 'response.audio.delta'; delta: string }
  | { type: 'response.audio.done' }
  | { type: 'response.audio_transcript.delta'; delta: string }
  | { type: 'response.audio_transcript.done'; transcript: string }
  | { type: 'input_audio_buffer.speech_started' }
  | { type: 'input_audio_buffer.speech_stopped' }
  | { type: 'input_audio_buffer.committed' }
  | { type: 'response.done'; response: any }
  | { type: 'error'; error: any };

export interface RealtimeCallbacks {
  onSessionCreated?: () => void;
  onSpeechStarted?: () => void;
  onSpeechStopped?: () => void;
  onUserTranscript?: (transcript: string) => void;  // What user said
  onTranscript?: (transcript: string, isFinal: boolean) => void;  // AI response
  onAudioResponse?: (audioBase64: string) => void;
  onResponseDone?: (response: any) => void;
  onError?: (error: any) => void;
}

export class OpenAIRealtimeService {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private callbacks: RealtimeCallbacks = {};
  private isConnected = false;
  private transcriptBuffer = '';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async connect(callbacks: RealtimeCallbacks): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to OpenAI Realtime');
      return;
    }

    this.callbacks = callbacks;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${OPENAI_REALTIME_URL}?model=gpt-4o-realtime-preview-2024-12-17`, [
          'realtime',
          `openai-insecure-api-key.${this.apiKey}`,
          'openai-beta.realtime-v1',
        ]);

        this.ws.onopen = () => {
          console.log('[OpenAIRealtime] WebSocket connected to OpenAI Realtime API');
          this.isConnected = true;
          this.configureSession();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[OpenAIRealtime] WebSocket error:', error);
          this.callbacks.onError?.(error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[OpenAIRealtime] WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.ws = null;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private configureSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[OpenAIRealtime] Cannot configure session - WebSocket not open');
      return;
    }

    console.log('[OpenAIRealtime] Configuring session...');

    // Configure the session for poker hand analysis - opinionated buddy style
    // Prompt is imported from @/constants/prompts.ts (single source of truth)
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: VOICE_COACH_PROMPT,
        voice: 'echo',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'gpt-4o-mini-transcribe',
        },
        input_audio_noise_reduction: {
          type: 'near_field',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.65,
          prefix_padding_ms: 500,
          silence_duration_ms: 2000,
        },
      },
    };

    this.ws.send(JSON.stringify(sessionConfig));
    console.log('[OpenAIRealtime] Session configuration sent');
  }

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as any;

      // Log all events for debugging
      if (!['response.audio.delta', 'response.audio_transcript.delta'].includes(event.type)) {
        console.log('[OpenAIRealtime] Event received:', event.type);
      }

      switch (event.type) {
        case 'session.created':
          console.log('[OpenAIRealtime] Session created successfully');
          this.callbacks.onSessionCreated?.();
          break;

        case 'session.updated':
          console.log('[OpenAIRealtime] Session updated');
          break;

        case 'input_audio_buffer.speech_started':
          console.log('[OpenAIRealtime] User started speaking');
          this.callbacks.onSpeechStarted?.();
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('[OpenAIRealtime] User stopped speaking');
          this.callbacks.onSpeechStopped?.();
          break;

        case 'input_audio_buffer.committed':
          console.log('[OpenAIRealtime] Audio buffer committed');
          break;

        case 'conversation.item.created':
          console.log('[OpenAIRealtime] Conversation item created:', event.item?.type);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          console.log('[OpenAIRealtime] User transcript received:', event.transcript);
          this.callbacks.onUserTranscript?.(event.transcript);
          break;

        case 'response.created':
          console.log('[OpenAIRealtime] Response started');
          break;

        case 'response.audio_transcript.delta':
          this.transcriptBuffer += event.delta;
          this.callbacks.onTranscript?.(this.transcriptBuffer, false);
          break;

        case 'response.audio_transcript.done':
          console.log('[OpenAIRealtime] AI transcript complete:', event.transcript);
          this.transcriptBuffer = event.transcript;
          this.callbacks.onTranscript?.(event.transcript, true);
          this.transcriptBuffer = '';
          break;

        case 'response.audio.delta':
          this.callbacks.onAudioResponse?.(event.delta);
          break;

        case 'response.audio.done':
          console.log('[OpenAIRealtime] Audio response complete');
          break;

        case 'response.done':
          console.log('[OpenAIRealtime] Response complete');
          this.callbacks.onResponseDone?.(event.response);
          break;

        case 'error':
          console.error('[OpenAIRealtime] API error:', JSON.stringify(event.error));
          this.callbacks.onError?.(event.error);
          break;

        default:
          console.log('[OpenAIRealtime] Unhandled event type:', event.type);
      }
    } catch (error) {
      console.error('[OpenAIRealtime] Error parsing message:', error);
    }
  }

  sendAudioChunk(base64Audio: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send audio');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    }));
    // Log periodically to avoid spam
    if (Math.random() < 0.1) {
      console.log('[OpenAIRealtime] Sent audio chunk to server');
    }
  }

  commitAudioBuffer(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'input_audio_buffer.commit',
    }));

    // Request a response after committing audio
    this.ws.send(JSON.stringify({
      type: 'response.create',
    }));
  }

  cancelResponse(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'response.cancel',
    }));
  }

  sendTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text,
          },
        ],
      },
    }));

    this.ws.send(JSON.stringify({
      type: 'response.create',
    }));
  }

  sendConversationItem(role: 'user' | 'assistant', content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: role,
        content: [
          {
            type: role === 'user' ? 'input_text' : 'text',
            text: content,
          },
        ],
      },
    }));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.transcriptBuffer = '';
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let realtimeService: OpenAIRealtimeService | null = null;

export function getRealtimeService(apiKey: string): OpenAIRealtimeService {
  if (!realtimeService) {
    realtimeService = new OpenAIRealtimeService(apiKey);
  }
  return realtimeService;
}

export function resetRealtimeService(): void {
  if (realtimeService) {
    realtimeService.disconnect();
    realtimeService = null;
  }
}
