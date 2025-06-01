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
    @Published var showRestartAlert: Bool = false
    
    private var wasAccessibilityDenied = false
    
    init() {
        checkPermissions()
        setupNotifications()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
        DistributedNotificationCenter.default().removeObserver(self)
    }
    
    func checkPermissions() {
        checkMicrophonePermission()
        checkAccessibilityPermission()
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
        }
    }
    
    private func isAccessibilityEnabled() -> Bool {
        // For debugging, just use AXIsProcessTrusted
        // Note: Accessibility permissions are unreliable when debugging from Xcode
        return AXIsProcessTrusted()
    }
    
    func requestMicrophonePermission() {
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] granted in
            DispatchQueue.main.async {
                self?.microphonePermissionStatus = granted ? .granted : .denied
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
    
    private func openAccessibilityPreferences() {
        let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
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
}