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

// react-native-incall-manager owns the platform audio route. It is a native
// module, so binaries built before it was added (<= 1.2.0) return null here and
// we fall back to the expo-audio routing below.
function inCallManager(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-incall-manager');
    return mod?.default ?? mod;
  } catch {
    return null;
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
  // _setVolume takes a gain in 0-10 where 1.0 is unity. The old 1.5 never took
  // effect (it was pushed through applyConstraints, which rejects audio tracks),
  // so this is the first value that actually reaches the track.
  private volumeMultiplier: number = 3.0;

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

    // Holding a mic capture puts iOS in play-and-record, which routes output to
    // the EARPIECE by default — the coach is then correct but barely audible.
    // react-native-webrtc 124 exposes no routing API, so drive the shared
    // AVAudioSession through expo-audio instead.
    await this.routeToSpeaker();

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

    // WebRTC configures AVAudioSession itself when its audio unit starts
    // (play-and-record + voice-chat mode = earpiece, quiet). Anything set before
    // this point gets overridden, so force the speaker now and again once the
    // connection reports connected.
    this.forceSpeaker();
    (pc as any).onconnectionstatechange = () => {
      if ((pc as any).connectionState === 'connected') this.forceSpeaker();
    };

    return remoteStream;
  }

  private forceSpeaker(): void {
    const icm = inCallManager();
    if (icm) {
      try {
        icm.start({ media: 'audio', auto: false });
        icm.setForceSpeakerphoneOn(true);
        return;
      } catch (e) {
        console.log('[RealtimeWebRTC] InCallManager speaker routing failed:', e);
      }
    }
    // Older binaries without the native module: best effort via expo-audio.
    void this.routeToSpeaker();
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

  private async routeToSpeaker(): Promise<void> {
    try {
      const { setAudioModeAsync } = require('expo-audio');
      await setAudioModeAsync({
        // The mic is owned by the WebRTC peer connection, not expo-audio, so
        // this only steers routing: on iOS `allowsRecording: false` moves the
        // session off the earpiece to the speaker, and on Android the
        // earpiece flag does the same explicitly.
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
        playsInSilentMode: true,
      });
    } catch (e) {
      console.log('[RealtimeWebRTC] Could not force speaker output:', e);
    }
  }

  setVolume(volume: number): void {
    // UI 0-1 maps onto gain 0.5-5.0, so the slider's midpoint lands near the
    // 3.0 default rather than below it.
    this.volumeMultiplier = 0.5 + (volume * 4.5);

    // Apply to existing remote audio tracks
    this.remoteStream?.getAudioTracks().forEach((track) => {
      this.applyVolumeToTrack(track);
    });
  }

  private applyVolumeToTrack(track: any): void {
    // `volume` is not a supported constraint for a REMOTE WebRTC track, so the
    // old applyConstraints() call silently rejected and the coach was never
    // boosted. react-native-webrtc exposes a real per-track output gain via
    // _setVolume; keep applyConstraints as a web fallback.
    try {
      if (typeof track._setVolume === 'function') {
        track._setVolume(this.volumeMultiplier);
        return;
      }
      track.applyConstraints?.({ volume: this.volumeMultiplier }).catch(() => {
        console.log('[RealtimeWebRTC] No output gain control on this platform');
      });
    } catch {
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
    const icm = inCallManager();
    try {
      icm?.setForceSpeakerphoneOn(false);
      icm?.stop();
    } catch {}
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
