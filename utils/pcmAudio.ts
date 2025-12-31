/**
 * PCM Audio Utilities for OpenAI Realtime API
 *
 * Handles PCM16 audio recording and playback for real-time voice streaming.
 * OpenAI Realtime API requires PCM16 format at 24kHz sample rate.
 *
 * Note: Expo doesn't natively support streaming PCM audio, so we use
 * a chunked recording approach that approximates real-time streaming.
 */

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { setAudioModeAsync, useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// OpenAI Realtime API expects 24kHz PCM16 mono
const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const CHUNK_DURATION_MS = 100; // Send audio every 100ms for low latency

/**
 * PCM Audio Player
 *
 * Plays PCM16 audio chunks received from OpenAI Realtime API.
 * Converts PCM16 to WAV format for playback through expo-av.
 */
export class PCMAudioPlayer {
  private sound: Audio.Sound | null = null;
  private audioQueue: string[] = [];
  private isPlaying = false;
  private onCompleteCallback: (() => void) | null = null;

  /**
   * Queue and play a PCM16 audio chunk
   */
  async playChunk(base64PCM: string): Promise<void> {
    this.audioQueue.push(base64PCM);

    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  /**
   * Process queued audio chunks
   */
  private async processQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.onCompleteCallback?.();
      return;
    }

    this.isPlaying = true;

    try {
      // Collect all available chunks
      const chunks = [...this.audioQueue];
      this.audioQueue = [];

      // Combine chunks
      const combinedPCM = chunks.join('');

      // Convert PCM16 to WAV
      const wavBase64 = this.pcmToWav(combinedPCM);

      // Write to temp file
      const tempFile = `${FileSystem.cacheDirectory}realtime_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(tempFile, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Stop any previous sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempFile },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Wait for playback to finish then process more chunks
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          this.sound = null;
          // Delete temp file
          FileSystem.deleteAsync(tempFile, { idempotent: true }).catch(() => {});
          // Process any remaining chunks
          this.processQueue();
        }
      });
    } catch (error) {
      console.error('[PCMAudioPlayer] Error playing chunk:', error);
      this.isPlaying = false;
      // Continue with remaining chunks
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Convert PCM16 base64 to WAV base64
   */
  private pcmToWav(base64PCM: string): string {
    // Decode base64 to binary
    const binaryString = atob(base64PCM);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmData[i] = binaryString.charCodeAt(i);
    }

    // Create WAV header
    const wavHeader = this.createWavHeader(pcmData.length);

    // Combine header and PCM data
    const wavData = new Uint8Array(wavHeader.length + pcmData.length);
    wavData.set(wavHeader, 0);
    wavData.set(pcmData, wavHeader.length);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < wavData.length; i++) {
      binary += String.fromCharCode(wavData[i]);
    }
    return btoa(binary);
  }

  /**
   * Create WAV file header for PCM16 24kHz mono
   */
  private createWavHeader(dataLength: number): Uint8Array {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // File length minus RIFF header
    view.setUint32(4, 36 + dataLength, true);
    // WAVE identifier
    this.writeString(view, 8, 'WAVE');
    // fmt chunk identifier
    this.writeString(view, 12, 'fmt ');
    // fmt chunk length
    view.setUint32(16, 16, true);
    // Audio format (1 = PCM)
    view.setUint16(20, 1, true);
    // Number of channels
    view.setUint16(22, CHANNELS, true);
    // Sample rate
    view.setUint32(24, SAMPLE_RATE, true);
    // Byte rate (sample rate * channels * bytes per sample)
    view.setUint32(28, SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), true);
    // Block align (channels * bytes per sample)
    view.setUint16(32, CHANNELS * (BITS_PER_SAMPLE / 8), true);
    // Bits per sample
    view.setUint16(34, BITS_PER_SAMPLE, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataLength, true);

    return new Uint8Array(header);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Stop playback and clear queue
   */
  async stop(): Promise<void> {
    this.audioQueue = [];
    this.isPlaying = false;

    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (error) {
        // Ignore cleanup errors
      }
      this.sound = null;
    }
  }

  /**
   * Register callback for when playback completes
   */
  onPlaybackComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }
}

/**
 * PCM Audio Recorder
 *
 * Records audio and provides PCM16 chunks for streaming.
 * Uses expo-audio for recording with chunked output.
 *
 * Note: This is an approximation of streaming - true streaming requires
 * native module access that expo-audio doesn't provide.
 */
export class PCMAudioRecorder {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private chunkCallback: ((base64Chunk: string) => void) | null = null;
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start recording and streaming audio chunks
   * @param onChunk Callback for each audio chunk (base64 PCM16)
   */
  async start(onChunk: (base64Chunk: string) => void): Promise<void> {
    if (this.isRecording) {
      console.warn('[PCMAudioRecorder] Already recording');
      return;
    }

    this.chunkCallback = onChunk;
    this.isRecording = true;

    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Start continuous recording with periodic chunk extraction
      await this.startRecordingLoop();

      console.log('[PCMAudioRecorder] Recording started');
    } catch (error) {
      console.error('[PCMAudioRecorder] Failed to start recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Start the recording loop that extracts chunks periodically
   */
  private async startRecordingLoop(): Promise<void> {
    // Use expo-av Recording API for chunked recording
    const recording = new Audio.Recording();

    try {
      // Prepare with high-quality settings closest to PCM16 24kHz
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: CHANNELS,
          bitRate: SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: CHANNELS,
          bitRate: SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE,
        },
      });

      await recording.startAsync();
      this.recording = recording;

      // Periodically extract and send audio chunks
      // This is a workaround since we can't get streaming PCM from expo-av
      this.recordingInterval = setInterval(async () => {
        if (!this.isRecording || !this.recording) return;

        try {
          // Get current recording status
          const status = await this.recording.getStatusAsync();

          if (status.isRecording && status.durationMillis > 0) {
            // Every interval, we restart the recording and send the previous chunk
            await this.extractAndSendChunk();
          }
        } catch (error) {
          console.error('[PCMAudioRecorder] Error in recording loop:', error);
        }
      }, CHUNK_DURATION_MS * 2); // Extract every 200ms for balance between latency and stability
    } catch (error) {
      console.error('[PCMAudioRecorder] Failed to start recording loop:', error);
      throw error;
    }
  }

  /**
   * Extract current audio and send as chunk, then restart recording
   */
  private async extractAndSendChunk(): Promise<void> {
    if (!this.recording || !this.chunkCallback) return;

    try {
      // Stop current recording
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (uri) {
        // Read the audio file
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Extract PCM data from WAV (skip 44-byte header)
        const pcmBase64 = this.extractPCMFromWav(base64Audio);

        if (pcmBase64) {
          this.chunkCallback(pcmBase64);
        }

        // Clean up file
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }

      // Start new recording if still active
      if (this.isRecording) {
        const newRecording = new Audio.Recording();
        await newRecording.prepareToRecordAsync({
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: SAMPLE_RATE,
            numberOfChannels: CHANNELS,
            bitRate: SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.IOSOutputFormat.LINEARPCM,
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: SAMPLE_RATE,
            numberOfChannels: CHANNELS,
            bitRate: SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/wav',
            bitsPerSecond: SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE,
          },
        });
        await newRecording.startAsync();
        this.recording = newRecording;
      }
    } catch (error) {
      console.error('[PCMAudioRecorder] Error extracting chunk:', error);
    }
  }

  /**
   * Extract raw PCM data from WAV base64 (skip 44-byte header)
   */
  private extractPCMFromWav(wavBase64: string): string | null {
    try {
      // Decode base64
      const binaryString = atob(wavBase64);

      // WAV header is 44 bytes, skip it to get PCM data
      if (binaryString.length <= 44) {
        return null;
      }

      // Extract PCM data (after 44-byte header)
      const pcmBinary = binaryString.slice(44);

      // Re-encode as base64
      return btoa(pcmBinary);
    } catch (error) {
      console.error('[PCMAudioRecorder] Error extracting PCM:', error);
      return null;
    }
  }

  /**
   * Stop recording
   */
  async stop(): Promise<void> {
    this.isRecording = false;

    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    if (this.recording) {
      try {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording) {
          await this.recording.stopAndUnloadAsync();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
      this.recording = null;
    }

    this.chunkCallback = null;
    console.log('[PCMAudioRecorder] Recording stopped');
  }

  /**
   * Check if currently recording
   */
  get active(): boolean {
    return this.isRecording;
  }
}

/**
 * Convert audio buffer to base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to array buffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
