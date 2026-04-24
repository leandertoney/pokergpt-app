import { RTCPeerConnection, RTCSessionDescription, mediaDevices, MediaStream } from 'react-native-webrtc';
import { VOICE_COACH_PROMPT } from '@/constants/prompts';

const REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-12-17';
const REALTIME_SDP_URL = `https://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`;

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
  private callbacks: RealtimeCallbacks = {};
  private apiKey: string;
  private transcriptBuffer = '';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async connect(callbacks: RealtimeCallbacks, voice: string = 'cedar'): Promise<MediaStream> {
    this.callbacks = callbacks;

    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const remoteStream = new MediaStream();
    (this.pc as any).ontrack = (event: any) => {
      event.streams?.[0]?.getTracks().forEach((track: any) => {
        remoteStream.addTrack(track);
      });
    };

    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    }) as MediaStream;

    this.localStream.getTracks().forEach((track) => {
      this.pc?.addTrack(track, this.localStream!);
    });

    this.dc = this.pc.createDataChannel('oai-events');
    this.dc.onopen = () => {
      this.sendSessionUpdate(voice);
      this.callbacks.onSessionCreated?.();
    };
    this.dc.onmessage = (e: any) => this.handleEvent(e.data);

    const offer = await this.pc.createOffer({});
    await this.pc.setLocalDescription(offer);

    const sdpResponse = await fetch(REALTIME_SDP_URL, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/sdp',
      },
    });

    if (!sdpResponse.ok) {
      const err = await sdpResponse.text();
      throw new Error(`Realtime SDP exchange failed: ${sdpResponse.status} ${err}`);
    }

    const answerSdp = await sdpResponse.text();
    await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));

    return remoteStream;
  }

  private sendSessionUpdate(voice: string): void {
    const config = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: VOICE_COACH_PROMPT,
        voice,
        input_audio_transcription: { model: 'gpt-4o-mini-transcribe' },
        input_audio_noise_reduction: { type: 'near_field' },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.4,
          prefix_padding_ms: 500,
          silence_duration_ms: 1200,
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
      case 'response.audio_transcript.delta':
        this.transcriptBuffer += event.delta ?? '';
        this.callbacks.onTranscript?.(this.transcriptBuffer, false);
        break;
      case 'response.audio_transcript.done':
        this.callbacks.onTranscript?.(event.transcript, true);
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
