import Foundation
import AVFoundation
import Combine

class AudioLevelMonitor: ObservableObject {
    @Published var audioLevels: [Float] = Array(repeating: 0.0, count: 40)
    @Published var isMonitoring: Bool = false
    @Published var currentLevel: Float = 0.0
    
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var levelTimer: Timer?
    
    private let bufferSize: Int = 40
    private var levelBuffer: [Float] = []
    
    init() {
        setupAudioSession()
    }
    
    deinit {
        stopMonitoring()
    }
    
    private func setupAudioSession() {
        // macOS doesn't use AVAudioSession - AVAudioEngine handles this automatically
        print("🎙️ POLYVOICE: Audio session setup (macOS - handled by AVAudioEngine)")
    }
    
    func startMonitoring() {
        guard !isMonitoring else {
            print("⚠️ POLYVOICE: Audio monitoring already active")
            return
        }
        
        print("🎙️ POLYVOICE: Starting audio level monitoring")
        
        audioEngine = AVAudioEngine()
        guard let audioEngine = audioEngine else {
            print("❌ POLYVOICE: Failed to create audio engine")
            return
        }
        
        inputNode = audioEngine.inputNode
        guard let inputNode = inputNode else {
            print("❌ POLYVOICE: Failed to get input node")
            return
        }
        
        let inputFormat = inputNode.outputFormat(forBus: 0)
        print("🎙️ POLYVOICE: Input format - Sample Rate: \(inputFormat.sampleRate), Channels: \(inputFormat.channelCount)")
        
        // Install tap to monitor audio levels
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, time in
            self?.processAudioBuffer(buffer)
        }
        
        do {
            try audioEngine.start()
            isMonitoring = true
            
            // Start timer for UI updates
            startLevelTimer()
            
            print("✅ POLYVOICE: Audio engine started successfully")
        } catch {
            print("❌ POLYVOICE: Failed to start audio engine: \(error)")
            cleanup()
        }
    }
    
    func stopMonitoring() {
        guard isMonitoring else { return }
        
        print("🎙️ POLYVOICE: Stopping audio level monitoring")
        
        levelTimer?.invalidate()
        levelTimer = nil
        
        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()
        
        cleanup()
        
        // Reset to idle state
        DispatchQueue.main.async { [weak self] in
            self?.audioLevels = Array(repeating: 0.0, count: 40)
            self?.currentLevel = 0.0
            self?.isMonitoring = false
        }
        
        print("✅ POLYVOICE: Audio monitoring stopped")
    }
    
    private func cleanup() {
        audioEngine = nil
        inputNode = nil
        levelBuffer.removeAll()
        isMonitoring = false
    }
    
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }
        
        let channelDataValue = channelData.pointee
        let channelDataValueArray = stride(from: 0, to: Int(buffer.frameLength), by: buffer.stride).map { channelDataValue[$0] }
        
        // Calculate RMS (Root Mean Square) for audio level
        let rms = sqrt(channelDataValueArray.map { $0 * $0 }.reduce(0, +) / Float(channelDataValueArray.count))
        
        // Convert to decibels and normalize
        let decibels = 20 * log10(rms)
        let normalizedLevel = max(0.0, min(1.0, (decibels + 80) / 80)) // Normalize -80dB to 0dB range
        
        // Smooth the level changes
        let smoothedLevel = smoothLevel(normalizedLevel)
        
        DispatchQueue.main.async { [weak self] in
            self?.currentLevel = smoothedLevel
            self?.updateLevelBuffer(smoothedLevel)
        }
    }
    
    private func smoothLevel(_ newLevel: Float) -> Float {
        // Simple exponential smoothing
        let smoothingFactor: Float = 0.3
        return (currentLevel * (1 - smoothingFactor)) + (newLevel * smoothingFactor)
    }
    
    private func updateLevelBuffer(_ level: Float) {
        levelBuffer.append(level)
        
        // Keep only the most recent levels
        if levelBuffer.count > bufferSize {
            levelBuffer.removeFirst()
        }
        
        // Pad with zeros if needed
        let paddedBuffer = levelBuffer + Array(repeating: 0.0, count: max(0, bufferSize - levelBuffer.count))
        audioLevels = Array(paddedBuffer.prefix(bufferSize))
    }
    
    private func startLevelTimer() {
        levelTimer = Timer.scheduledTimer(withTimeInterval: 1.0/30.0, repeats: true) { [weak self] _ in
            // Timer ensures regular UI updates even when audio is very quiet
            // The actual level processing happens in processAudioBuffer
            guard let _ = self else { return }
            // Keep timer alive for UI refresh rate
        }
    }
    
    // MARK: - Public Methods for Testing
    
    func simulateAudioLevel(_ level: Float) {
        // For testing purposes - simulate audio input
        DispatchQueue.main.async { [weak self] in
            self?.currentLevel = level
            self?.updateLevelBuffer(level)
        }
    }
    
    func getAverageLevel() -> Float {
        guard !audioLevels.isEmpty else { return 0.0 }
        return audioLevels.reduce(0, +) / Float(audioLevels.count)
    }
    
    func getPeakLevel() -> Float {
        return audioLevels.max() ?? 0.0
    }
}