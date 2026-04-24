/**
 * PCM Audio Utilities for OpenAI Realtime API
 *
 * Handles PCM16 audio recording and playback for real-time voice streaming.
 * OpenAI Realtime API requires PCM16 format at 24kHz sample rate.
 */

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

// OpenAI Realtime API expects 24kHz PCM16 mono
const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const CHUNK_DURATION_MS = 100; // Send audio every 100ms for low latency

// Global tracking of active recording to handle expo-av singleton limitation
let globalActiveRecording: Audio.Recording | null = null;

/**
 * Force cleanup of any globally tracked recording
 * Call this before starting a new recording to avoid "Only one Recording" error
 */
async function forceGlobalRecordingCleanup(): Promise<void> {
  if (globalActiveRecording) {
    console.log('[PCMAudio] Force cleaning up global recording');
    try {
      const status = await globalActiveRecording.getStatusAsync();
      if (status.isRecording || status.canRecord) {
        await globalActiveRecording.stopAndUnloadAsync();
      }
    } catch (error) {
      // Recording may already be unloaded, ignore
      console.log('[PCMAudio] Global cleanup: recording already unloaded');
    }
    globalActiveRecording = null;
  }
}

/**
 * Wait for expo-av to settle - used between recording attempts
 */
async function waitForAudioSystemToSettle(ms: number = 100): Promise<void> {
  console.log(`[PCMAudio] Waiting ${ms}ms for audio system to settle...`);
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * PCM Audio Player
 *
 * Plays PCM16 audio chunks received from OpenAI Realtime API.
 * Converts PCM16 to WAV format for playback through expo-av.
 */
// Audio amplification gain - OpenAI's audio is quiet, boost it significantly
let AUDIO_GAIN = 12.0;

/**
 * Set the audio amplification gain at runtime
 * @param gain Number between 1.0 and 20.0
 */
export function setAudioGain(gain: number): void {
  AUDIO_GAIN = Math.max(1, Math.min(20, gain));
}

/**
 * Get the current audio amplification gain
 */
export function getAudioGain(): number {
  return AUDIO_GAIN;
}

export class PCMAudioPlayer {
  private sound: Audio.Sound | null = null;
  private audioQueue: string[] = [];
  private isPlaying = false;
  private onCompleteCallback: (() => void) | null = null;
  private volume: number = 1.0; // Default volume (0.0 to 1.0)

  /**
   * Set playback volume
   * @param volume Number between 0.0 (silent) and 1.0 (full volume)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    // Update current sound if playing
    if (this.sound) {
      this.sound.setVolumeAsync(this.volume).catch(() => {});
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

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

      // Keep allowsRecordingIOS true so the mic stays live across turns —
      // switching to false tears down the recording session and the next
      // listen cycle silently captures nothing. Volume is handled via PCM
      // software gain (AUDIO_GAIN) instead of speaker routing.
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and play sound with volume setting
      const { sound } = await Audio.Sound.createAsync(
        { uri: tempFile },
        { shouldPlay: true, volume: this.volume }
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
   * Convert PCM16 base64 to WAV base64 with amplification
   */
  private pcmToWav(base64PCM: string): string {
    // Decode base64 to binary
    const binaryString = atob(base64PCM);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmData[i] = binaryString.charCodeAt(i);
    }

    // Amplify the PCM audio data (PCM16 is signed 16-bit little-endian)
    const amplifiedData = this.amplifyPCM(pcmData);

    // Create WAV header
    const wavHeader = this.createWavHeader(amplifiedData.length);

    // Combine header and PCM data
    const wavData = new Uint8Array(wavHeader.length + amplifiedData.length);
    wavData.set(wavHeader, 0);
    wavData.set(amplifiedData, wavHeader.length);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < wavData.length; i++) {
      binary += String.fromCharCode(wavData[i]);
    }
    return btoa(binary);
  }

  /**
   * Amplify PCM16 audio data
   * PCM16 is signed 16-bit little-endian (-32768 to 32767)
   */
  private amplifyPCM(pcmData: Uint8Array): Uint8Array {
    const amplified = new Uint8Array(pcmData.length);

    // Process samples (2 bytes per sample for 16-bit)
    for (let i = 0; i < pcmData.length; i += 2) {
      // Read signed 16-bit little-endian sample
      const low = pcmData[i];
      const high = pcmData[i + 1];
      let sample = (high << 8) | low;

      // Convert to signed (two's complement)
      if (sample >= 32768) {
        sample -= 65536;
      }

      // Apply gain
      sample = Math.round(sample * AUDIO_GAIN);

      // Clamp to prevent clipping
      sample = Math.max(-32768, Math.min(32767, sample));

      // Convert back to unsigned for storage
      if (sample < 0) {
        sample += 65536;
      }

      // Write back as little-endian
      amplified[i] = sample & 0xff;
      amplified[i + 1] = (sample >> 8) & 0xff;
    }

    return amplified;
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
   * Clear queued audio without fully stopping
   */
  clearQueue(): void {
    this.audioQueue = [];
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
 * Uses expo-av for recording with chunked output.
 */
export class PCMAudioRecorder {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private chunkCallback: ((base64Chunk: string) => void) | null = null;
  private recordingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Safely cleanup any existing recording before starting a new one
   */
  private async cleanupExistingRecording(): Promise<void> {
    if (this.recording) {
      try {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording) {
          await this.recording.stopAndUnloadAsync();
        } else if (status.canRecord) {
          // Recording is prepared but not recording - try to stop and unload
          try {
            await this.recording.stopAndUnloadAsync();
          } catch {
            // May fail if not actually prepared, ignore
          }
        }
      } catch (error) {
        // Recording may already be unloaded or in invalid state, ignore
        console.log('[PCMAudioRecorder] Cleanup: recording already unloaded or invalid');
      }
      this.recording = null;
    }
  }

  /**
   * Start recording and streaming audio chunks
   * @param onChunk Callback for each audio chunk (base64 PCM16)
   */
  async start(onChunk: (base64Chunk: string) => void): Promise<void> {
    console.log('[PCMAudioRecorder] start() called');

    // Force cleanup of any global recording first (handles expo-av singleton limitation)
    await forceGlobalRecordingCleanup();

    // Clean up any existing recording on this instance
    await this.cleanupExistingRecording();

    // Add delay to ensure system fully releases audio resources
    await waitForAudioSystemToSettle(200);

    if (this.isRecording) {
      console.warn('[PCMAudioRecorder] Already recording');
      return;
    }

    this.chunkCallback = onChunk;
    this.isRecording = true;

    try {
      // Configure audio mode for recording
      // Use DuckOthers instead of DoNotMix to allow VAD to work properly
      console.log('[PCMAudioRecorder] Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('[PCMAudioRecorder] Audio mode set successfully');

      // Start continuous recording with periodic chunk extraction
      await this.startRecordingLoop();

      console.log('[PCMAudioRecorder] Recording started successfully');
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
    console.log('[PCMAudioRecorder] startRecordingLoop() called');

    // Ensure no existing recording before creating new one
    await forceGlobalRecordingCleanup();
    await this.cleanupExistingRecording();
    // Wait for audio system to settle
    await waitForAudioSystemToSettle(150);

    // Try to prepare with retry logic
    let recording: Audio.Recording | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !recording) {
      attempts++;
      console.log(`[PCMAudioRecorder] Preparing recording (attempt ${attempts}/${maxAttempts})...`);

      try {
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
        recording = newRecording;
      } catch (error: any) {
        console.warn(`[PCMAudioRecorder] Attempt ${attempts} failed:`, error?.message);
        if (attempts < maxAttempts) {
          // Wait longer between retries (exponential backoff)
          await waitForAudioSystemToSettle(300 * attempts);
        } else {
          throw error; // Re-throw on final attempt
        }
      }
    }

    if (!recording) {
      throw new Error('Failed to prepare recording after all attempts');
    }

    try {
      console.log('[PCMAudioRecorder] Starting recording...');
      await recording.startAsync();
      this.recording = recording;
      globalActiveRecording = recording; // Track globally
      console.log('[PCMAudioRecorder] Recording active, starting chunk extraction loop');

      // Periodically extract and send audio chunks
      let chunkCount = 0;
      this.recordingInterval = setInterval(async () => {
        if (!this.isRecording || !this.recording) return;

        try {
          const status = await this.recording.getStatusAsync();

          if (status.isRecording && status.durationMillis > 0) {
            chunkCount++;
            if (chunkCount <= 3) {
              console.log('[PCMAudioRecorder] Extracting chunk #' + chunkCount + ', duration:', status.durationMillis + 'ms');
            }
            await this.extractAndSendChunk();
          }
        } catch (error) {
          console.error('[PCMAudioRecorder] Error in recording loop:', error);
        }
      }, CHUNK_DURATION_MS * 2);
    } catch (error) {
      console.error('[PCMAudioRecorder] Failed to start recording loop:', error);
      throw error;
    }
  }

  /**
   * Extract current audio and send as chunk, then restart recording
   */
  private async extractAndSendChunk(): Promise<void> {
    // Capture recording reference to avoid race conditions
    const currentRecording = this.recording;
    if (!currentRecording || !this.chunkCallback) return;

    try {
      // Get URI before stopping (some implementations clear it after unload)
      const uri = currentRecording.getURI();

      // Stop and unload the current recording
      await currentRecording.stopAndUnloadAsync();
      // Clear the reference immediately after stopping
      this.recording = null;

      if (uri) {
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const pcmBase64 = this.extractPCMFromWav(base64Audio);

        if (pcmBase64 && this.chunkCallback) {
          console.log('[PCMAudioRecorder] Sending audio chunk, length:', pcmBase64.length);
          this.chunkCallback(pcmBase64);
        }

        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }

      // Start new recording if still active
      if (this.isRecording) {
        // Ensure cleanup before creating new recording
        await this.cleanupExistingRecording();
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
        globalActiveRecording = newRecording; // Track globally
      }
    } catch (error) {
      console.error('[PCMAudioRecorder] Error extracting chunk:', error);
      // Don't let errors stop the recording loop - try to restart
      if (this.isRecording) {
        // Cleanup any existing recording before restart
        await forceGlobalRecordingCleanup();
        await this.cleanupExistingRecording();
        // Restart recording after error
        try {
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
          globalActiveRecording = newRecording; // Track globally
          console.log('[PCMAudioRecorder] Recording restarted after error');
        } catch (restartError) {
          console.error('[PCMAudioRecorder] Failed to restart recording:', restartError);
        }
      }
    }
  }

  /**
   * Extract raw PCM data from WAV base64 (skip 44-byte header)
   */
  private extractPCMFromWav(wavBase64: string): string | null {
    try {
      const binaryString = atob(wavBase64);

      if (binaryString.length <= 44) {
        return null;
      }

      const pcmBinary = binaryString.slice(44);
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
    console.log('[PCMAudioRecorder] stop() called');
    // Set flag first to prevent recording loop from creating new recordings
    this.isRecording = false;

    // Clear the interval before stopping recording to prevent race conditions
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }

    // Use cleanup helper for proper recording cleanup
    await this.cleanupExistingRecording();

    // Also clear global reference
    globalActiveRecording = null;

    this.chunkCallback = null;

    // Wait for audio system to fully release resources
    await waitForAudioSystemToSettle(100);

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
