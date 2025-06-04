import Foundation
import AVFoundation
import AppKit

class AudioRecorder: NSObject, ObservableObject {
    @Published var isRecording: Bool = false
    @Published var recordingDuration: TimeInterval = 0.0
    @Published var lastTranscription: String = ""
    @Published var isTranscribing: Bool = false
    @Published var currentAudioLevel: Float = 0.0
    
    private var audioEngine = AVAudioEngine()
    private var audioFile: AVAudioFile?
    private var recordingTimer: Timer?
    private var currentRecordingURL: URL?
    // API configuration is now handled by AppConfig
    private var recordingStartTime: Date?
    
    override init() {
        super.init()
        setupAudioSession()
    }
    
    deinit {
        cleanupRecording()
        print("🗑️ POLYVOICE: AudioRecorder deallocated")
    }
    
    private func setupAudioSession() {
        // macOS doesn't use AVAudioSession like iOS
        // For AVAudioEngine, permission is requested when accessing inputNode
        print("🎙️ POLYVOICE: AudioRecorder initialized for macOS with AVAudioEngine")
    }
    
    func startRecording() {
        guard !isRecording else {
            print("⚠️ POLYVOICE: Already recording")
            return
        }
        
        // Create temporary file for recording
        let tempDir = FileManager.default.temporaryDirectory
        let filename = "PolyVoice_\(UUID().uuidString).m4a"
        currentRecordingURL = tempDir.appendingPathComponent(filename)
        
        guard let recordingURL = currentRecordingURL else {
            print("❌ POLYVOICE: Failed to create recording URL")
            return
        }
        
        do {
            // Stop engine if it's running
            if audioEngine.isRunning {
                audioEngine.stop()
            }
            
            // Configure audio format
            let inputNode = audioEngine.inputNode
            let format = inputNode.outputFormat(forBus: 0)
            
            // Create audio file for recording
            audioFile = try AVAudioFile(forWriting: recordingURL, settings: [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 44100.0,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
                AVEncoderBitRateKey: 64000
            ])
            
            // Install tap on input node to capture audio and calculate levels
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                guard let self = self, let audioFile = self.audioFile else { return }
                
                do {
                    try audioFile.write(from: buffer)
                    
                    // Calculate audio level for visualization
                    self.calculateAudioLevel(from: buffer)
                } catch {
                    print("❌ POLYVOICE: Failed to write audio buffer: \(error)")
                }
            }
            
            // Start the audio engine
            try audioEngine.start()
            
            isRecording = true
            recordingDuration = 0.0
            recordingStartTime = Date()
            startTimer()
            print("🎙️ POLYVOICE: Started recording with AVAudioEngine")
            
        } catch {
            print("❌ POLYVOICE: Recording setup failed: \(error)")
            cleanupRecording()
        }
    }
    
    func stopRecording() {
        guard isRecording else {
            print("⚠️ POLYVOICE: Not currently recording")
            return
        }
        
        // Advanced cleanup sequence for microphone release
        performAdvancedCleanup()
        
        stopTimer()
        isRecording = false
        
        // Reset audio level to zero
        currentAudioLevel = 0.0
        
        // Close the audio file
        audioFile = nil
        
        if let url = currentRecordingURL {
            print("✅ POLYVOICE: Recording completed, sending to transcription API")
            
            // Send to transcription API
            transcribeAudio(fileURL: url)
        }
        
        currentRecordingURL = nil
        print("🎙️ POLYVOICE: Audio engine stopped and microphone released")
    }
    
    private func performAdvancedCleanup() {
        // Step 1: Remove tap first (critical for resource release)
        audioEngine.inputNode.removeTap(onBus: 0)
        
        // Step 2: Stop the engine
        audioEngine.stop()
        
        // Step 3: Reset the engine to fully release resources
        audioEngine.reset()
        
        // Step 4: Force a small delay to allow system cleanup
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            // Step 5: Create a new engine instance to ensure clean state
            self?.audioEngine = AVAudioEngine()
            
            // Step 6: Force system to update microphone status by briefly creating another audio object
            self?.forceSystemMicrophoneUpdate()
            
            print("🔄 POLYVOICE: Audio engine reset and recreated")
        }
        
        print("🧹 POLYVOICE: Advanced cleanup completed")
    }
    
    private func cleanupRecording() {
        if audioEngine.isRunning {
            performAdvancedCleanup()
        } else {
            // Engine not running, just reset
            audioEngine.reset()
            audioEngine = AVAudioEngine()
        }
        audioFile = nil
        isRecording = false
        stopTimer()
    }
    
    private func calculateAudioLevel(from buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }
        
        let channelDataValue = channelData.pointee
        let channelDataValueArray = stride(from: 0, to: Int(buffer.frameLength), by: buffer.stride).map { channelDataValue[$0] }
        
        // Calculate RMS (Root Mean Square) for audio level
        let rms = sqrt(channelDataValueArray.map { $0 * $0 }.reduce(0, +) / Float(channelDataValueArray.count))
        
        // Convert to decibels and normalize
        let decibels = 20 * log10(rms)
        let normalizedLevel = max(0.0, min(1.0, (decibels + 80) / 80)) // Normalize -80dB to 0dB range
        
        DispatchQueue.main.async { [weak self] in
            self?.currentAudioLevel = normalizedLevel
        }
    }
    
    private func forceSystemMicrophoneUpdate() {
        // Create a temporary AVAudioRecorder to force system microphone status update
        // This helps clear the orange indicator on macOS
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("temp_force_update.m4a")
        
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 8000.0, // Low sample rate for minimal resource usage
            AVNumberOfChannelsKey: 1
        ]
        
        do {
            let tempRecorder = try AVAudioRecorder(url: tempURL, settings: settings)
            tempRecorder.record()
            
            // Stop immediately to signal system that microphone usage has ended
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                tempRecorder.stop()
                try? FileManager.default.removeItem(at: tempURL)
                print("🔄 POLYVOICE: Forced microphone status update")
            }
        } catch {
            print("⚠️ POLYVOICE: Could not force microphone update: \(error)")
        }
    }
    
    private func startTimer() {
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.recordingStartTime else { return }
            
            DispatchQueue.main.async {
                self.recordingDuration = Date().timeIntervalSince(startTime)
            }
        }
    }
    
    private func stopTimer() {
        recordingTimer?.invalidate()
        recordingTimer = nil
    }
    
    // MARK: - Public Methods
    
    func getCurrentAudioLevel() -> Float {
        guard isRecording && audioEngine.isRunning else { return 0.0 }
        
        // For AVAudioEngine, we'll return a simple indicator that recording is active
        // You could implement more sophisticated metering by analyzing the audio buffers
        return 0.5 // Placeholder - indicates active recording
    }
    
    // MARK: - Transcription API
    
    private func transcribeAudio(fileURL: URL) {
        isTranscribing = true
        print("🌐 POLYVOICE: Starting transcription for \(fileURL.lastPathComponent)")
        
        // 🔐 Check authentication first
        guard let token = AuthManager.shared.getCurrentToken() else {
            print("❌ POLYVOICE: No valid authentication token available")
            DispatchQueue.main.async {
                self.isTranscribing = false
                // TODO: Show authentication error to user
            }
            return
        }
        
        guard let url = URL(string: AppConfig.transcribeURL) else {
            print("❌ POLYVOICE: Invalid API URL")
            isTranscribing = false
            return
        }
        
        // Capture context
        let context = ContextManager.shared.getCurrentContext()
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        // 🔐 Add authentication header
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        do {
            let audioData = try Data(contentsOf: fileURL)
            let httpBody = createMultipartBody(boundary: boundary, audioData: audioData, filename: fileURL.lastPathComponent, context: context)
            request.httpBody = httpBody
            
            URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
                // Clean up temporary file
                try? FileManager.default.removeItem(at: fileURL)
                print("🗑️ POLYVOICE: Temporary recording file cleaned up")
                
                DispatchQueue.main.async {
                    self?.isTranscribing = false
                }
                
                if let error = error {
                    print("❌ POLYVOICE: Network error: \(error)")
                    return
                }
                
                guard let data = data else {
                    print("❌ POLYVOICE: No response data")
                    return
                }
                
                do {
                    if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                        // Check for successful transcription
                        if let transcriptionText = json["text"] as? String {
                            DispatchQueue.main.async {
                                self?.lastTranscription = transcriptionText
                                print("✅ POLYVOICE: Transcription received: \(transcriptionText)")
                                
                                
                                // Insert text at cursor
                                self?.insertTextAtCursor(text: transcriptionText)
                            }
                        } else if let errorObj = json["error"] as? [String: Any] {
                            // Handle structured error responses
                            let errorCode = errorObj["code"] as? String ?? "UNKNOWN_ERROR"
                            let errorMessage = errorObj["message"] as? String ?? "Unknown error occurred"
                            let errorType = errorObj["type"] as? String ?? "Error"
                            
                            print("❌ POLYVOICE: \(errorType) (\(errorCode)): \(errorMessage)")
                            
                            // Handle specific error types
                            switch errorCode {
                            case "RATE_LIMIT_EXCEEDED":
                                if let retryAfter = json["retryAfter"] as? Int {
                                    print("⏰ POLYVOICE: Rate limit exceeded. Retry in \(retryAfter) seconds")
                                }
                                // TODO: Show rate limit notification to user
                                
                            case "TOKEN_EXPIRED", "SESSION_NOT_FOUND":
                                print("🔐 POLYVOICE: Authentication expired, clearing session")
                                DispatchQueue.main.async {
                                    AuthManager.shared.logout()
                                }
                                
                            case "MISSING_AUTHORIZATION_HEADER", "INVALID_TOKEN_FORMAT":
                                print("🔐 POLYVOICE: Invalid authentication, clearing session")
                                DispatchQueue.main.async {
                                    AuthManager.shared.logout()
                                }
                                
                            default:
                                // TODO: Show generic error notification to user
                                break
                            }
                        } else if let legacyError = json["error"] as? String {
                            // Handle legacy error format
                            print("❌ POLYVOICE: API error: \(legacyError)")
                        }
                    }
                } catch {
                    print("❌ POLYVOICE: Failed to parse response: \(error)")
                }
            }.resume()
            
        } catch {
            print("❌ POLYVOICE: Failed to read audio file: \(error)")
            isTranscribing = false
        }
    }
    
    private func createMultipartBody(boundary: String, audioData: Data, filename: String, context: ContextInfo?) -> Data {
        var body = Data()
        
        // Add audio file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add context if available
        if let context = context {
            do {
                let contextData = try JSONEncoder().encode(context)
                body.append("--\(boundary)\r\n".data(using: .utf8)!)
                body.append("Content-Disposition: form-data; name=\"context\"\r\n".data(using: .utf8)!)
                body.append("Content-Type: application/json\r\n\r\n".data(using: .utf8)!)
                body.append(contextData)
                body.append("\r\n".data(using: .utf8)!)
                print("📍 POLYVOICE: Context data included in request")
            } catch {
                print("❌ POLYVOICE: Failed to encode context: \(error)")
            }
        }
        
        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        return body
    }
    
    private func insertTextAtCursor(text: String) {
        // Convert \n to actual line breaks for proper formatting
        let formattedText = text.replacingOccurrences(of: "\\n", with: "\n")
        
        // Copy formatted text to clipboard
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(formattedText, forType: .string)
        
        // Use Cmd+V to paste - this preserves formatting perfectly
        let script = """
        tell application "System Events"
            keystroke "v" using command down
        end tell
        """
        
        var error: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&error)
            if let error = error {
                print("❌ POLYVOICE: Cmd+V paste failed: \(error)")
                print("📋 POLYVOICE: Text is on clipboard - manually paste with Cmd+V")
            } else {
                print("📋 POLYVOICE: Text pasted with perfect formatting using Cmd+V")
            }
        } else {
            print("❌ POLYVOICE: Failed to create AppleScript")
            print("📋 POLYVOICE: Text is on clipboard - manually paste with Cmd+V")
        }
    }
}


// MARK: - DateFormatter Extension
extension DateFormatter {
    static let filenameFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd_HH-mm-ss"
        return formatter
    }()
}