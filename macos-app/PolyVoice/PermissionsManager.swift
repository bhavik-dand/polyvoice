import Foundation
import ApplicationServices
import SwiftUI
import AVFoundation

enum PermissionStatus {
    case granted
    case denied
    case notDetermined
    
    var displayText: String {
        switch self {
        case .granted:
            return "Granted"
        case .denied:
            return "Denied"
        case .notDetermined:
            return "Not Requested"
        }
    }
    
    var icon: String {
        switch self {
        case .granted:
            return "✅"
        case .denied:
            return "❌"
        case .notDetermined:
            return "⚠️"
        }
    }
    
    var color: Color {
        switch self {
        case .granted:
            return .green
        case .denied:
            return .red
        case .notDetermined:
            return .orange
        }
    }
}

class PermissionsManager: ObservableObject {
    @Published var microphonePermissionStatus: PermissionStatus = .notDetermined
    @Published var accessibilityPermissionStatus: PermissionStatus = .notDetermined
    @Published var automationPermissionStatus: PermissionStatus = .notDetermined
    @Published var showRestartAlert: Bool = false
    
    private var wasAccessibilityDenied = false
    private let fnKeyMonitor = FnKeyMonitor()
    private var voiceVisualizerWindow: VoiceVisualizerWindow?
    let audioRecorder = AudioRecorder()
    
    init() {
        checkPermissions()
        setupNotifications()
        setupFnKeyMonitor()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
        DistributedNotificationCenter.default().removeObserver(self)
    }
    
    func checkPermissions() {
        checkMicrophonePermission()
        checkAccessibilityPermission()
        checkAutomationPermission()
    }
    
    private func checkMicrophonePermission() {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            microphonePermissionStatus = .granted
        case .denied, .restricted:
            microphonePermissionStatus = .denied
        case .notDetermined:
            microphonePermissionStatus = .notDetermined
        @unknown default:
            microphonePermissionStatus = .notDetermined
        }
    }
    
    private func checkAccessibilityPermission() {
        let accessEnabled = isAccessibilityEnabled()
        
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Check if permission was just granted (was denied, now granted)
            if self.wasAccessibilityDenied && accessEnabled {
                self.showRestartAlert = true
            }
            
            self.accessibilityPermissionStatus = accessEnabled ? .granted : .denied
            self.wasAccessibilityDenied = !accessEnabled
            
            // Update fn key monitoring based on new permission status
            self.updateFnKeyMonitoringState()
        }
    }
    
    private func isAccessibilityEnabled() -> Bool {
        // For debugging, just use AXIsProcessTrusted
        // Note: Accessibility permissions are unreliable when debugging from Xcode
        return AXIsProcessTrusted()
    }
    
    func checkAutomationPermission() {
        let hasPermission = isAutomationEnabled()
        
        DispatchQueue.main.async { [weak self] in
            self?.automationPermissionStatus = hasPermission ? .granted : .denied
            print("🔍 POLYVOICE: Automation permission status updated: \(hasPermission ? "granted" : "denied")")
        }
    }
    
    private func isAutomationEnabled() -> Bool {
        // Test automation permission by attempting a simple AppleScript that requires System Events access
        let script = """
        tell application "System Events"
            keystroke ""
        end tell
        """
        
        var error: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&error)
            if let error = error {
                let errorCode = error["NSAppleScriptErrorNumber"] as? Int
                print("🔍 POLYVOICE: Automation permission check error: \(error)")
                // Error -1743 specifically means "Not authorized to send Apple events"
                return errorCode != -1743
            }
            return true // No error means permission is granted
        }
        return false
    }
    
    func requestMicrophonePermission() {
        // For AVAudioEngine, we need to trigger permission by accessing inputNode
        // This will automatically prompt for microphone permission
        let tempEngine = AVAudioEngine()
        
        // Access inputNode to trigger permission prompt
        let _ = tempEngine.inputNode
        
        // Also use traditional method as backup
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] granted in
            DispatchQueue.main.async {
                self?.microphonePermissionStatus = granted ? .granted : .denied
                if granted {
                    print("🎙️ POLYVOICE: Microphone permission granted")
                } else {
                    print("❌ POLYVOICE: Microphone permission denied")
                }
            }
        }
    }
    
    func requestAccessibilityPermission() {
        let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeRetainedValue() as String: true]
        let accessEnabled = AXIsProcessTrustedWithOptions(options)
        
        DispatchQueue.main.async { [weak self] in
            self?.accessibilityPermissionStatus = accessEnabled ? .granted : .denied
        }
    }
    
    func requestAutomationPermission() {
        // Trigger the automation permission dialog by attempting to use System Events
        let script = """
        tell application "System Events"
            return true
        end tell
        """
        
        var error: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&error)
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                // Recheck permission status after attempt
                self?.checkAutomationPermission()
            }
            
            if error != nil {
                // If there's still an error, open System Preferences as fallback
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.openAutomationPreferences()
                }
            }
        }
    }
    
    private func openAccessibilityPreferences() {
        let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
        NSWorkspace.shared.open(url)
    }
    
    private func openAutomationPreferences() {
        let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation")!
        NSWorkspace.shared.open(url)
    }
    
    private func setupNotifications() {
        // Listen for app becoming active
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(applicationDidBecomeActive),
            name: NSApplication.didBecomeActiveNotification,
            object: nil
        )
        
        // Listen for accessibility permission changes (real-time)
        DistributedNotificationCenter.default().addObserver(
            self,
            selector: #selector(accessibilityPermissionChanged),
            name: NSNotification.Name("com.apple.accessibility.api"),
            object: nil
        )
    }
    
    @objc private func applicationDidBecomeActive() {
        checkPermissions()
        
        // Also recheck automation permission specifically as it might have changed
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.checkAutomationPermission()
        }
    }
    
    @objc private func accessibilityPermissionChanged() {
        // Add small delay as permission changes take time to reflect
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.checkAccessibilityPermission()
        }
    }
    
    func restartApp() {
        let url = URL(fileURLWithPath: Bundle.main.resourcePath!)
        let path = url.deletingLastPathComponent().deletingLastPathComponent().absoluteString
        let task = Process()
        task.launchPath = "/usr/bin/open"
        task.arguments = [path]
        task.launch()
        exit(0)
    }
    
    private func setupFnKeyMonitor() {
        print("🔧 POLYVOICE: Setting up FnKeyMonitor")
        fnKeyMonitor.delegate = self
        
        // Start monitoring only if accessibility is granted
        if accessibilityPermissionStatus == .granted {
            print("🔧 POLYVOICE: Accessibility granted, starting fn key monitoring")
            fnKeyMonitor.startMonitoring()
        } else {
            print("🔧 POLYVOICE: Accessibility not granted, fn key monitoring not started")
        }
    }
    
    private func updateFnKeyMonitoringState() {
        print("🔄 POLYVOICE: Updating fn key monitoring state - accessibility: \(accessibilityPermissionStatus)")
        if accessibilityPermissionStatus == .granted {
            if !fnKeyMonitor.isMonitoring {
                print("🔄 POLYVOICE: Starting fn key monitoring (was not monitoring)")
                fnKeyMonitor.startMonitoring()
            } else {
                print("🔄 POLYVOICE: Fn key monitoring already active")
            }
        } else {
            if fnKeyMonitor.isMonitoring {
                print("🔄 POLYVOICE: Stopping fn key monitoring (accessibility denied)")
                fnKeyMonitor.stopMonitoring()
            } else {
                print("🔄 POLYVOICE: Fn key monitoring already stopped")
            }
        }
    }
}

extension PermissionsManager: FnKeyMonitorDelegate {
    func fnKeyPressed() {
        print("📢 POLYVOICE: PermissionsManager received FN PRESSED - starting recording & showing visualizer")
        DispatchQueue.main.async { [weak self] in
            self?.showVoiceVisualizer()
            self?.audioRecorder.startRecording()
            print("📢 POLYVOICE: Voice visualizer shown & recording started")
        }
    }
    
    func fnKeyReleased() {
        print("📢 POLYVOICE: PermissionsManager received FN RELEASED - stopping recording & hiding visualizer")
        DispatchQueue.main.async { [weak self] in
            self?.hideVoiceVisualizer()
            self?.audioRecorder.stopRecording()
            print("📢 POLYVOICE: Voice visualizer hidden & recording stopped")
        }
    }
    
    func fnKeyLongPressDetected() {
        print("📢 POLYVOICE: PermissionsManager received LONG PRESS")
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: .fnKeyLongPress, object: nil)
            print("📢 POLYVOICE: Long press notification posted on main thread")
        }
    }
    
    func fnKeyShortPressDetected() {
        print("📢 POLYVOICE: PermissionsManager received SHORT PRESS")
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: .fnKeyShortPress, object: nil)
            print("📢 POLYVOICE: Short press notification posted on main thread")
        }
    }
    
    // MARK: - Voice Visualizer Management
    
    private func showVoiceVisualizer() {
        // Create window if it doesn't exist
        if voiceVisualizerWindow == nil {
            voiceVisualizerWindow = VoiceVisualizerWindow(audioRecorder: audioRecorder)
            print("🎨 POLYVOICE: Created new VoiceVisualizerWindow with shared AudioRecorder")
        }
        
        // Show the window
        voiceVisualizerWindow?.show()
        print("🎨 POLYVOICE: Voice visualizer window shown")
    }
    
    private func hideVoiceVisualizer() {
        voiceVisualizerWindow?.hide()
        print("🎨 POLYVOICE: Voice visualizer window hidden")
    }
    
    // MARK: - Public Methods
    
    func testAutomation(text: String) {
        let script = """
        tell application "System Events"
            keystroke "\(text.replacingOccurrences(of: "\"", with: "\\\""))"
        end tell
        """
        
        var error: NSDictionary?
        if let appleScript = NSAppleScript(source: script) {
            appleScript.executeAndReturnError(&error)
            if let error = error {
                print("❌ POLYVOICE: Automation test failed: \(error)")
            } else {
                print("✅ POLYVOICE: Automation test succeeded!")
            }
        }
    }
}

extension Notification.Name {
    static let fnKeyLongPress = Notification.Name("fnKeyLongPress")
    static let fnKeyShortPress = Notification.Name("fnKeyShortPress")
}