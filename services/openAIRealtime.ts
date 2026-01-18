/**
 * OpenAI Realtime API Service
 *
 * Provides real-time voice conversation capabilities with natural interruption support.
 * Uses WebSocket connection to OpenAI's Realtime API for bidirectional audio streaming.
 */

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
          console.log('Connected to OpenAI Realtime API');
          this.isConnected = true;
          this.configureSession();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.callbacks.onError?.(error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.ws = null;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private configureSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Configure the session for poker hand analysis - concise coaching style
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are a poker coach helping users review hands they've already played. Keep responses SHORT - 1-2 sentences max.

CRITICAL: Listen carefully. NEVER ask about something the user already told you.

Poker terminology you MUST understand:
- "Folded to me" = no one called or raised before them
- "Limped" or "limpers" = called the big blind
- "3-bet" = re-raised
- "4-bet" = re-raised the 3-bet
- "In position" = acting last
- "Out of position" = acting first
- "Straddle" = blind raise, usually 2x BB
- "It checked around" = no one bet

Your job: Ask ONE clarifying question at a time for MISSING details only:
- Position (if not mentioned)
- Stack sizes or effective stacks
- What action they took or are facing
- Board texture (if postflop)

When you have enough info, give a clear verdict on whether they played it right.
Don't lecture. Don't explain theory. Just help them think through it.

Start by asking: "What hand are we looking at?"`,
        voice: 'echo',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1500,  // 1.5 second pause to detect end of speech
        },
      },
    };

    this.ws.send(JSON.stringify(sessionConfig));
  }

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as RealtimeEvent;

      switch (event.type) {
        case 'session.created':
          console.log('Session created');
          this.callbacks.onSessionCreated?.();
          break;

        case 'input_audio_buffer.speech_started':
          console.log('User started speaking');
          this.callbacks.onSpeechStarted?.();
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('User stopped speaking');
          this.callbacks.onSpeechStopped?.();
          break;

        case 'conversation.item.input_audio_transcription.completed':
          console.log('User transcript:', event.transcript);
          this.callbacks.onUserTranscript?.(event.transcript);
          break;

        case 'response.audio_transcript.delta':
          this.transcriptBuffer += event.delta;
          this.callbacks.onTranscript?.(this.transcriptBuffer, false);
          break;

        case 'response.audio_transcript.done':
          this.transcriptBuffer = event.transcript;
          this.callbacks.onTranscript?.(event.transcript, true);
          this.transcriptBuffer = '';
          break;

        case 'response.audio.delta':
          this.callbacks.onAudioResponse?.(event.delta);
          break;

        case 'response.done':
          this.callbacks.onResponseDone?.(event.response);
          break;

        case 'error':
          console.error('Realtime API error:', event.error);
          this.callbacks.onError?.(event.error);
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
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
