package expo.modules.streamingaudioplayer

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

/**
 * StreamingAudioPlayerModule
 *
 * Native Android module for low-latency streaming PCM16 audio playback.
 * Uses AudioTrack in MODE_STREAM for continuous audio streaming.
 *
 * Audio Format: PCM16, 24kHz, Mono (matches OpenAI Realtime API output)
 */
class StreamingAudioPlayerModule : Module() {
    // Audio track
    private var audioTrack: AudioTrack? = null
    private var playbackThread: Thread? = null

    // Buffer management
    private val audioQueue = ConcurrentLinkedQueue<ByteArray>()
    private val isStarted = AtomicBoolean(false)
    private val isPlaying = AtomicBoolean(false)
    private val hasStartedPlayback = AtomicBoolean(false)
    private val bufferedBytes = AtomicInteger(0)

    // Jitter buffer settings
    private var jitterBufferMs: Int = 200  // Default 200ms jitter buffer
    private var jitterBufferBytes: Int = 0

    // Audio format constants (OpenAI Realtime API format)
    private val sampleRate = 24000
    private val channels = 1
    private val bitsPerSample = 16
    private val bytesPerSample = bitsPerSample / 8

    // State
    private var state = "idle"

    override fun definition() = ModuleDefinition {
        Name("StreamingAudioPlayer")

        // Events emitted to JavaScript
        Events("onPlaybackStarted", "onPlaybackStopped", "onBufferUnderrun", "onError")

        // Start the audio engine
        AsyncFunction("start") {
            startEngine()
        }

        // Stop the audio engine
        AsyncFunction("stop") {
            stopEngine()
        }

        // Enqueue PCM16 audio chunk
        Function("enqueuePCM16") { base64Chunk: String ->
            enqueueAudio(base64Chunk)
        }

        // Clear audio queue
        Function("clearQueue") {
            clearAudioQueue()
        }

        // Set jitter buffer duration
        Function("setJitterBuffer") { durationMs: Int ->
            setJitterBufferDuration(durationMs)
        }

        // Get current state
        AsyncFunction("getState") {
            state
        }

        // Get current buffer level in milliseconds
        AsyncFunction("getBufferLevel") {
            getCurrentBufferLevelMs()
        }
    }

    // MARK: - Engine Management

    private fun startEngine() {
        // Stop any existing engine
        stopEngine()

        // Calculate buffer size
        val minBufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        // Use larger buffer for smooth streaming
        val bufferSize = maxOf(minBufferSize * 2, sampleRate * channels * bytesPerSample / 4) // 250ms buffer

        // Calculate jitter buffer size
        jitterBufferBytes = (sampleRate * channels * bytesPerSample * jitterBufferMs) / 1000

        // Create AudioTrack with STREAM mode for continuous playback
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()

        val audioFormat = AudioFormat.Builder()
            .setSampleRate(sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .build()

        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(audioAttributes)
            .setAudioFormat(audioFormat)
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()

        audioTrack?.play()

        isStarted.set(true)
        hasStartedPlayback.set(false)
        bufferedBytes.set(0)
        state = "buffering"

        // Start playback thread
        startPlaybackThread()

        println("[StreamingAudioPlayer] Engine started, jitter buffer: ${jitterBufferMs}ms ($jitterBufferBytes bytes)")
    }

    private fun stopEngine() {
        isStarted.set(false)
        isPlaying.set(false)
        hasStartedPlayback.set(false)

        // Clear queue
        audioQueue.clear()
        bufferedBytes.set(0)

        // Stop playback thread
        playbackThread?.interrupt()
        playbackThread = null

        // Stop and release audio track
        audioTrack?.stop()
        audioTrack?.release()
        audioTrack = null

        state = "stopped"
        sendEvent("onPlaybackStopped")

        println("[StreamingAudioPlayer] Engine stopped")
    }

    private fun startPlaybackThread() {
        playbackThread = thread(start = true, name = "StreamingAudioPlayback") {
            try {
                while (isStarted.get() && !Thread.currentThread().isInterrupted) {
                    if (hasStartedPlayback.get()) {
                        val chunk = audioQueue.poll()
                        if (chunk != null) {
                            audioTrack?.write(chunk, 0, chunk.size)
                        } else {
                            // Buffer underrun - wait for more data
                            if (isPlaying.get()) {
                                sendEvent("onBufferUnderrun")
                            }
                            Thread.sleep(10) // Small sleep to avoid busy loop
                        }
                    } else {
                        // Waiting for jitter buffer to fill
                        Thread.sleep(10)
                    }
                }
            } catch (e: InterruptedException) {
                // Thread was interrupted, exit gracefully
            }
        }
    }

    // MARK: - Audio Queueing

    private fun enqueueAudio(base64: String) {
        if (!isStarted.get()) {
            println("[StreamingAudioPlayer] Warning: Attempting to enqueue audio before start")
            return
        }

        // Decode base64 to PCM data
        val pcmData = try {
            Base64.decode(base64, Base64.DEFAULT)
        } catch (e: Exception) {
            println("[StreamingAudioPlayer] Failed to decode base64 audio: ${e.message}")
            return
        }

        audioQueue.add(pcmData)
        bufferedBytes.addAndGet(pcmData.size)

        // Check if we should start playback (jitter buffer filled)
        if (!hasStartedPlayback.get() && bufferedBytes.get() >= jitterBufferBytes) {
            hasStartedPlayback.set(true)
            isPlaying.set(true)
            state = "playing"
            sendEvent("onPlaybackStarted")
            println("[StreamingAudioPlayer] Jitter buffer filled, starting playback")
        }
    }

    private fun clearAudioQueue() {
        audioQueue.clear()
        bufferedBytes.set(0)
        hasStartedPlayback.set(false)
        isPlaying.set(false)
        state = "buffering"

        // Flush audio track
        audioTrack?.flush()

        println("[StreamingAudioPlayer] Queue cleared")
    }

    // MARK: - Configuration

    private fun setJitterBufferDuration(ms: Int) {
        jitterBufferMs = ms.coerceIn(50, 500)  // Clamp between 50-500ms
        jitterBufferBytes = (sampleRate * channels * bytesPerSample * jitterBufferMs) / 1000
        println("[StreamingAudioPlayer] Jitter buffer set to ${jitterBufferMs}ms ($jitterBufferBytes bytes)")
    }

    private fun getCurrentBufferLevelMs(): Double {
        val bytes = bufferedBytes.get()
        val bytesPerSecond = sampleRate * channels * bytesPerSample
        return (bytes.toDouble() / bytesPerSecond) * 1000
    }
}
