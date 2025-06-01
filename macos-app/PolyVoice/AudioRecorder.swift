import Foundation
import AVFoundation
import AppKit

class AudioRecorder: NSObject, ObservableObject {
    @Published var isRecording: Bool = false
    @Published var recordingDuration: TimeInterval = 0.0
    @Published var lastTranscription: String = ""
    @Published var isTranscribing: Bool = false
    
    private var audioRecorder: AVAudioRecorder?
    private var recordingTimer: Timer?
    private var currentRecordingURL: URL?
    private let apiBaseURL = "http://localhost:6000"
    
    override init() {
        super.init()
        setupAudioSession()
    }
    
    private func setupAudioSession() {
        // macOS doesn't use AVAudioSession like iOS - AVAudioRecorder handles this automatically
        print("🎙️ POLYVOICE: AudioRecorder initialized for macOS")
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
        
        // M4A recording settings (AAC format)
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
            AVEncoderBitRateKey: 64000 // 64 kbps - good quality for speech
        ]
        
        do {
            audioRecorder = try AVAudioRecorder(url: recordingURL, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.isMeteringEnabled = true
            
            let success = audioRecorder?.record() ?? false
            if success {
                isRecording = true
                recordingDuration = 0.0
                startTimer()
                print("🎙️ POLYVOICE: Started recording to temporary file")
            } else {
                print("❌ POLYVOICE: Failed to start recording")
            }
        } catch {
            print("❌ POLYVOICE: Recording setup failed: \(error)")
        }
    }
    
    func stopRecording() {
        guard isRecording else {
            print("⚠️ POLYVOICE: Not currently recording")
            return
        }
        
        audioRecorder?.stop()
        stopTimer()
        isRecording = false
        
        if let url = currentRecordingURL {
            print("✅ POLYVOICE: Recording completed, sending to transcription API")
            
            // Send to transcription API
            transcribeAudio(fileURL: url)
        }
        
        currentRecordingURL = nil
    }
    
    private func startTimer() {
        recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            guard let self = self, let recorder = self.audioRecorder else { return }
            
            DispatchQueue.main.async {
                self.recordingDuration = recorder.currentTime
            }
        }
    }
    
    private func stopTimer() {
        recordingTimer?.invalidate()
        recordingTimer = nil
    }
    
    // MARK: - Public Methods
    
    func getCurrentAudioLevel() -> Float {
        guard let recorder = audioRecorder, recorder.isRecording else { return 0.0 }
        
        recorder.updateMeters()
        let averagePower = recorder.averagePower(forChannel: 0)
        let normalizedLevel = pow(10, averagePower / 20) // Convert dB to linear scale
        return min(max(normalizedLevel, 0.0), 1.0)
    }
    
    // MARK: - Transcription API
    
    private func transcribeAudio(fileURL: URL) {
        isTranscribing = true
        print("🌐 POLYVOICE: Starting transcription for \(fileURL.lastPathComponent)")
        
        guard let url = URL(string: "\(apiBaseURL)/api/v1/transcribe") else {
            print("❌ POLYVOICE: Invalid API URL")
            isTranscribing = false
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        do {
            let audioData = try Data(contentsOf: fileURL)
            let httpBody = createMultipartBody(boundary: boundary, audioData: audioData, filename: fileURL.lastPathComponent)
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
                        if let transcriptionText = json["text"] as? String {
                            DispatchQueue.main.async {
                                self?.lastTranscription = transcriptionText
                                print("✅ POLYVOICE: Transcription received: \(transcriptionText)")
                                
                                // Insert text at cursor
                                self?.insertTextAtCursor(text: transcriptionText)
                            }
                        } else if let errorMessage = json["error"] as? String {
                            print("❌ POLYVOICE: API error: \(errorMessage)")
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
    
    private func createMultipartBody(boundary: String, audioData: Data, filename: String) -> Data {
        var body = Data()
        
        // Add audio file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/m4a\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)
        
        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        return body
    }
    
    private func insertTextAtCursor(text: String) {
        // First copy text to clipboard for fallback
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        
        // Use AppleScript to simulate typing the text
        let script = """
        tell application "System Events"
            keystroke "\(text.replacingOccurrences(of: "\"", with: "\\\""))"
        end tell
        """
        
        var error: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&error)
            if let error = error {
                print("❌ POLYVOICE: AppleScript error: \(error)")
                print("📋 POLYVOICE: Fallback - text copied to clipboard")
            } else {
                print("⌨️ POLYVOICE: Text inserted at cursor location")
            }
        } else {
            print("❌ POLYVOICE: Failed to create AppleScript")
            print("📋 POLYVOICE: Fallback - text copied to clipboard")
        }
    }
}

// MARK: - AVAudioRecorderDelegate
extension AudioRecorder: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if flag {
            print("✅ POLYVOICE: Recording finished successfully")
        } else {
            print("❌ POLYVOICE: Recording failed to finish properly")
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.isRecording = false
        }
    }
    
    func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        print("❌ POLYVOICE: Recording encode error: \(error?.localizedDescription ?? "Unknown")")
        
        DispatchQueue.main.async { [weak self] in
            self?.isRecording = false
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