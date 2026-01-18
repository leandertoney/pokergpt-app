import { requireNativeModule, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module using requireNativeModule for Expo Modules API
const StreamingAudioPlayerModule = requireNativeModule('StreamingAudioPlayer');
const emitter = new EventEmitter(StreamingAudioPlayerModule);

export interface StreamingAudioPlayerEvents {
  onPlaybackStarted: () => void;
  onPlaybackStopped: () => void;
  onBufferUnderrun: () => void;
  onError: (error: { message: string }) => void;
}

/**
 * Start the streaming audio player
 * Initializes the audio engine and prepares for playback
 */
export function start(): Promise<void> {
  return StreamingAudioPlayerModule.start();
}

/**
 * Stop the streaming audio player
 * Stops playback and releases audio resources
 */
export function stop(): Promise<void> {
  return StreamingAudioPlayerModule.stop();
}

/**
 * Enqueue a PCM16 audio chunk for playback
 * @param base64Chunk - Base64-encoded PCM16 audio data (24kHz mono)
 */
export function enqueuePCM16(base64Chunk: string): void {
  StreamingAudioPlayerModule.enqueuePCM16(base64Chunk);
}

/**
 * Clear all queued audio chunks
 * Used for interruption handling
 */
export function clearQueue(): void {
  StreamingAudioPlayerModule.clearQueue();
}

/**
 * Set the jitter buffer duration in milliseconds
 * @param durationMs - Buffer duration (recommended: 150-300ms)
 */
export function setJitterBuffer(durationMs: number): void {
  StreamingAudioPlayerModule.setJitterBuffer(durationMs);
}

/**
 * Get current playback state
 * @returns 'idle' | 'buffering' | 'playing' | 'stopped'
 */
export function getState(): Promise<string> {
  return StreamingAudioPlayerModule.getState();
}

/**
 * Get the current buffer level in milliseconds
 */
export function getBufferLevel(): Promise<number> {
  return StreamingAudioPlayerModule.getBufferLevel();
}

/**
 * Subscribe to playback started events
 */
export function addPlaybackStartedListener(
  listener: () => void
): Subscription {
  return emitter.addListener('onPlaybackStarted', listener);
}

/**
 * Subscribe to playback stopped events
 */
export function addPlaybackStoppedListener(
  listener: () => void
): Subscription {
  return emitter.addListener('onPlaybackStopped', listener);
}

/**
 * Subscribe to buffer underrun events
 */
export function addBufferUnderrunListener(
  listener: () => void
): Subscription {
  return emitter.addListener('onBufferUnderrun', listener);
}

/**
 * Subscribe to error events
 */
export function addErrorListener(
  listener: (error: { message: string }) => void
): Subscription {
  return emitter.addListener('onError', listener);
}
