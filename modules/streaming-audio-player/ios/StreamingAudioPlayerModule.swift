import ExpoModulesCore
import AVFoundation

/**
 * StreamingAudioPlayerModule
 *
 * Native iOS module for low-latency streaming PCM16 audio playback.
 * Uses AVAudioEngine + AVAudioPlayerNode for gapless audio streaming.
 *
 * Audio Format: PCM16, 24kHz, Mono (matches OpenAI Realtime API output)
 */
public class StreamingAudioPlayerModule: Module {
    // Audio engine components
    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var audioFormat: AVAudioFormat?

    // Buffer management
    private var audioQueue: [Data] = []
    private let queueLock = NSLock()
    private var isPlaying = false
    private var isStarted = false

    // Jitter buffer settings
    private var jitterBufferMs: Int = 200  // Default 200ms jitter buffer
    private var jitterBufferBytes: Int = 0
    private var bufferedBytes: Int = 0
    private var hasStartedPlayback = false

    // Audio format constants (OpenAI Realtime API format)
    private let sampleRate: Double = 24000
    private let channels: UInt32 = 1
    private let bitsPerSample: Int = 16

    // State enum
    enum PlayerState: String {
        case idle
        case buffering
        case playing
        case stopped
    }
    private var state: PlayerState = .idle

    public func definition() -> ModuleDefinition {
        Name("StreamingAudioPlayer")

        // Events emitted to JavaScript
        Events("onPlaybackStarted", "onPlaybackStopped", "onBufferUnderrun", "onError")

        // Start the audio engine
        AsyncFunction("start") { () -> Void in
            try self.startEngine()
        }

        // Stop the audio engine
        AsyncFunction("stop") { () -> Void in
            self.stopEngine()
        }

        // Enqueue PCM16 audio chunk
        Function("enqueuePCM16") { (base64Chunk: String) in
            self.enqueueAudio(base64: base64Chunk)
        }

        // Clear audio queue
        Function("clearQueue") { () in
            self.clearAudioQueue()
        }

        // Set jitter buffer duration
        Function("setJitterBuffer") { (durationMs: Int) in
            self.setJitterBufferDuration(ms: durationMs)
        }

        // Get current state
        AsyncFunction("getState") { () -> String in
            return self.state.rawValue
        }

        // Get current buffer level in milliseconds
        AsyncFunction("getBufferLevel") { () -> Double in
            return self.getCurrentBufferLevelMs()
        }
    }

    // MARK: - Engine Management

    private func startEngine() throws {
        // Stop any existing engine
        stopEngine()

        // Configure audio session for playback
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playback, mode: .voiceChat, options: [.duckOthers, .allowBluetooth])
        try audioSession.setActive(true)

        // Create audio engine and player node
        audioEngine = AVAudioEngine()
        playerNode = AVAudioPlayerNode()

        guard let engine = audioEngine, let player = playerNode else {
            throw NSError(domain: "StreamingAudioPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to create audio engine"])
        }

        // Create audio format: PCM16, 24kHz, mono
        audioFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: sampleRate,
            channels: channels,
            interleaved: true
        )

        guard let format = audioFormat else {
            throw NSError(domain: "StreamingAudioPlayer", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to create audio format"])
        }

        // Attach and connect player node
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)

        // Calculate jitter buffer size in bytes
        // bytes = (sampleRate * channels * bytesPerSample * durationMs) / 1000
        let bytesPerSample = bitsPerSample / 8
        jitterBufferBytes = Int((sampleRate * Double(channels) * Double(bytesPerSample) * Double(jitterBufferMs)) / 1000)

        // Start the engine
        try engine.start()
        player.play()

        isStarted = true
        hasStartedPlayback = false
        bufferedBytes = 0
        state = .buffering

        print("[StreamingAudioPlayer] Engine started, jitter buffer: \(jitterBufferMs)ms (\(jitterBufferBytes) bytes)")
    }

    private func stopEngine() {
        queueLock.lock()
        audioQueue.removeAll()
        bufferedBytes = 0
        queueLock.unlock()

        playerNode?.stop()
        audioEngine?.stop()

        playerNode = nil
        audioEngine = nil
        audioFormat = nil

        isStarted = false
        isPlaying = false
        hasStartedPlayback = false
        state = .stopped

        sendEvent("onPlaybackStopped")
        print("[StreamingAudioPlayer] Engine stopped")
    }

    // MARK: - Audio Queueing

    private func enqueueAudio(base64: String) {
        guard isStarted else {
            print("[StreamingAudioPlayer] Warning: Attempting to enqueue audio before start")
            return
        }

        // Decode base64 to PCM data
        guard let pcmData = Data(base64Encoded: base64) else {
            print("[StreamingAudioPlayer] Failed to decode base64 audio")
            return
        }

        queueLock.lock()
        audioQueue.append(pcmData)
        bufferedBytes += pcmData.count
        queueLock.unlock()

        // Check if we should start playback (jitter buffer filled)
        if !hasStartedPlayback && bufferedBytes >= jitterBufferBytes {
            hasStartedPlayback = true
            state = .playing
            sendEvent("onPlaybackStarted")
            print("[StreamingAudioPlayer] Jitter buffer filled, starting playback")
        }

        // Schedule audio if playback has started
        if hasStartedPlayback {
            scheduleBufferedAudio()
        }
    }

    private func scheduleBufferedAudio() {
        guard let player = playerNode, let format = audioFormat, isStarted else {
            return
        }

        queueLock.lock()
        let chunksToSchedule = audioQueue
        audioQueue.removeAll()
        bufferedBytes = 0
        queueLock.unlock()

        guard !chunksToSchedule.isEmpty else {
            return
        }

        // Combine all chunks into one buffer for efficiency
        var combinedData = Data()
        for chunk in chunksToSchedule {
            combinedData.append(chunk)
        }

        // Create audio buffer from PCM data
        let frameCount = AVAudioFrameCount(combinedData.count / (Int(channels) * (bitsPerSample / 8)))

        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            print("[StreamingAudioPlayer] Failed to create audio buffer")
            return
        }

        buffer.frameLength = frameCount

        // Copy PCM data to buffer
        combinedData.withUnsafeBytes { rawBufferPointer in
            if let int16Pointer = rawBufferPointer.baseAddress?.assumingMemoryBound(to: Int16.self),
               let channelData = buffer.int16ChannelData {
                memcpy(channelData[0], int16Pointer, combinedData.count)
            }
        }

        // Schedule buffer for playback
        player.scheduleBuffer(buffer, completionHandler: nil)

        if !isPlaying {
            isPlaying = true
        }
    }

    private func clearAudioQueue() {
        queueLock.lock()
        audioQueue.removeAll()
        bufferedBytes = 0
        queueLock.unlock()

        // Stop current playback
        playerNode?.stop()
        playerNode?.play()  // Restart for next audio

        hasStartedPlayback = false
        isPlaying = false
        state = .buffering

        print("[StreamingAudioPlayer] Queue cleared")
    }

    // MARK: - Configuration

    private func setJitterBufferDuration(ms: Int) {
        jitterBufferMs = max(50, min(500, ms))  // Clamp between 50-500ms
        let bytesPerSample = bitsPerSample / 8
        jitterBufferBytes = Int((sampleRate * Double(channels) * Double(bytesPerSample) * Double(jitterBufferMs)) / 1000)
        print("[StreamingAudioPlayer] Jitter buffer set to \(jitterBufferMs)ms (\(jitterBufferBytes) bytes)")
    }

    private func getCurrentBufferLevelMs() -> Double {
        queueLock.lock()
        let bytes = bufferedBytes
        queueLock.unlock()

        let bytesPerSample = bitsPerSample / 8
        let bytesPerSecond = sampleRate * Double(channels) * Double(bytesPerSample)
        return (Double(bytes) / bytesPerSecond) * 1000
    }
}
