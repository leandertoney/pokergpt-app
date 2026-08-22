import type { MediaStream, MediaStreamTrack, RTCPeerConnection } from 'react-native-webrtc';
import { VOICE_COACH_PROMPT } from '@/constants/prompts';

// Loaded lazily: react-native-webrtc has no JS fallback and throws on import in
// Expo Go. This module is reached from app/voice.tsx, an Expo Router route that
// loads at startup, so a top-level import crashes the entire app before it
// renders. Every use below is inside a method, so deferring resolution costs
// nothing — and connect() fails with a clear message instead of a native throw.
function webrtc() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-webrtc');
  } catch {
    throw new Error(
      'Voice chat needs a development build — react-native-webrtc is not available in Expo Go.'
    );
  }
}

// The beta Realtime API was retired. POSTing SDP to /v1/realtime?model=...
// returns 400 beta_api_shape_disabled: "The Realtime Beta API is no longer
// supported. Please use /v1/realtime for the GA API."
//
// GA moves the SDP exchange to /v1/realtime/calls. The model is still passed as
// a query parameter (omitting it returns 400 missing_model) and the body is
// still raw SDP with Content-Type: application/sdp.
//
// Verified against the live API: /v1/realtime/calls?model=gpt-realtime-2.1
// returns 201 with an SDP answer.
const REALTIME_MODEL = 'gpt-realtime-2.1';
const REALTIME_SDP_URL = `https://api.openai.com/v1/realtime/calls?model=${REALTIME_MODEL}`;

export interface RealtimeCallbacks {
  onSessionCreated?: () => void;
  onSpeechStarted?: () => void;
  onSpeechStopped?: () => void;
  onUserTranscript?: (transcript: string) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onResponseDone?: (response: any) => void;
  onError?: (error: any) => void;
}

export class RealtimeWebRTCService {
  private pc: RTCPeerConnection | null = null;
  private dc: any = null; // RTCDataChannel
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callbacks: RealtimeCallbacks = {};
  private apiKey: string;
  private transcriptBuffer = '';
  private volumeMultiplier: number = 1.5; // 50% louder by default

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async connect(callbacks: RealtimeCallbacks, voice: string = 'cedar'): Promise<MediaStream> {
    this.callbacks = callbacks;

    // Ask for mic FIRST so the iOS permission prompt doesn't race the SDP
    // exchange (the prior race was the most likely cause of "Connection error
    // tap to retry" on first launch — the second tap worked because permission
    // was already granted).
    try {
      this.localStream = await webrtc().mediaDevices.getUserMedia({
        audio: true,
        video: false,
      }) as MediaStream;
    } catch (e) {
      console.error('[RealtimeWebRTC] getUserMedia failed:', e);
      throw new Error('Microphone permission required');
    }

    const pc: RTCPeerConnection = new (webrtc().RTCPeerConnection)({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    this.pc = pc;

    const remoteStream = new (webrtc().MediaStream)() as MediaStream;
    this.remoteStream = remoteStream;
    (pc as any).ontrack = (event: any) => {
      event.streams?.[0]?.getTracks().forEach((track: any) => {
        remoteStream.addTrack(track);
        // Apply volume boost to audio tracks
        if (track.kind === 'audio') {
          this.applyVolumeToTrack(track);
        }
      });
    };

    this.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

    this.dc = pc.createDataChannel('oai-events');
    this.dc.onopen = () => {
      this.sendSessionUpdate(voice);
      this.callbacks.onSessionCreated?.();
    };
    this.dc.onmessage = (e: any) => this.handleEvent(e.data);

    const offer = await pc.createOffer({});
    await pc.setLocalDescription(offer);

    let sdpResponse: Response;
    try {
      sdpResponse = await fetch(REALTIME_SDP_URL, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/sdp',
        },
      });
    } catch (e: any) {
      console.error('[RealtimeWebRTC] SDP fetch network error:', e?.message || e);
      throw new Error(`Network error reaching OpenAI Realtime: ${e?.message || 'unknown'}`);
    }

    if (!sdpResponse.ok) {
      const err = await sdpResponse.text();
      console.error('[RealtimeWebRTC] SDP exchange rejected:', sdpResponse.status, err);
      throw new Error(`Realtime SDP exchange failed: ${sdpResponse.status} ${err.slice(0, 200)}`);
    }

    const answerSdp = await sdpResponse.text();
    await pc.setRemoteDescription(new (webrtc().RTCSessionDescription)({ type: 'answer', sdp: answerSdp }));

    return remoteStream;
  }

  private sendSessionUpdate(voice: string): void {
    // GA session shape: `modalities` became `output_modalities`, and voice,
    // transcription, noise reduction and turn detection all moved under
    // `audio.input` / `audio.output`. Sending the old flat shape is silently
    // ignored, which reads as "the coach never speaks".
    const config = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: REALTIME_MODEL,
        output_modalities: ['audio'],
        instructions: VOICE_COACH_PROMPT,
        audio: {
          input: {
            transcription: { model: 'gpt-4o-mini-transcribe' },
            noise_reduction: { type: 'near_field' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.4,
              prefix_padding_ms: 500,
              silence_duration_ms: 1200,
            },
          },
          output: { voice },
        },
      },
    };
    this.send(config);
  }

  send(payload: any): void {
    if (this.dc?.readyState === 'open') {
      this.dc.send(JSON.stringify(payload));
    }
  }

  cancelResponse(): void {
    this.send({ type: 'response.cancel' });
  }

  sendUserText(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    this.send({ type: 'response.create' });
  }

  setMicEnabled(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  setVolume(volume: number): void {
    // Volume range 0-1, convert to multiplier (0.5-2.0x)
    // User wants 50% louder as default, so 1.0 in UI = 1.5x multiplier
    this.volumeMultiplier = 0.5 + (volume * 1.5);

    // Apply to existing remote audio tracks
    this.remoteStream?.getAudioTracks().forEach((track) => {
      this.applyVolumeToTrack(track);
    });
  }

  private applyVolumeToTrack(track: any): void {
    try {
      // Attempt to apply volume via constraints (may not be supported on all platforms)
      const constraints = {
        volume: this.volumeMultiplier,
        echoCancellation: false, // Already handled by OpenAI's audio processing
      };

      track.applyConstraints?.(constraints).catch((err: any) => {
        console.log('[RealtimeWebRTC] Volume constraint not supported, using default:', err.message);
      });
    } catch (e) {
      console.log('[RealtimeWebRTC] Volume adjustment not available on this platform');
    }
  }

  private handleEvent(raw: string): void {
    let event: any;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        this.callbacks.onSpeechStarted?.();
        break;
      case 'input_audio_buffer.speech_stopped':
        this.callbacks.onSpeechStopped?.();
        break;
      case 'conversation.item.input_audio_transcription.completed':
        this.callbacks.onUserTranscript?.(event.transcript);
        break;
      // GA renamed these to `response.output_audio_transcript.*`. Accept both
      // spellings: the session is GA, but an unhandled name here is silent —
      // the coach still speaks, its words just never reach the screen.
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        this.transcriptBuffer += event.delta ?? '';
        this.callbacks.onTranscript?.(this.transcriptBuffer, false);
        break;
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        this.callbacks.onTranscript?.(event.transcript ?? this.transcriptBuffer, true);
        this.transcriptBuffer = '';
        break;
      case 'response.done':
        this.callbacks.onResponseDone?.(event.response);
        break;
      case 'error': {
        const benign = ['response_cancel_not_active'];
        if (!benign.includes(event.error?.code)) {
          this.callbacks.onError?.(event.error);
        }
        break;
      }
    }
  }

  disconnect(): void {
    this.dc?.close();
    this.dc = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.pc?.close();
    this.pc = null;
    this.transcriptBuffer = '';
  }
}

let instance: RealtimeWebRTCService | null = null;

export function getRealtimeWebRTCService(apiKey: string): RealtimeWebRTCService {
  if (!instance) {
    instance = new RealtimeWebRTCService(apiKey);
  }
  return instance;
}

export function resetRealtimeWebRTCService(): void {
  instance?.disconnect();
  instance = null;
}
