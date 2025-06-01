import SwiftUI

struct ContentView: View {
    @StateObject private var permissionsManager = PermissionsManager()
    @State private var fnKeyStatus: String = "Ready"
    @State private var lastFnPressTime: String = "Never"
    
    var body: some View {
        VStack(spacing: 20)     §§{
            headerSection
            
            Divider()
            
            permissionsSection
            
            Divider()
            
            currentHotkeySection
            
            fnKeyStatusSection
            
            Spacer()
            
            quitButton
        }
        .padding(30)
        .frame(width: 500, height: 600)
        .background(Color(.windowBackgroundColor))
        .alert("Restart Required", isPresented: $permissionsManager.showRestartAlert) {
            Button("Restart Now") {
                permissionsManager.restartApp()
            }
            Button("Later") {
                permissionsManager.showRestartAlert = false
            }
        } message: {
            Text("Accessibility permission was granted. Please restart the app for changes to take effect.")
        }
    }
    
    private var headerSection: some View {
        VStack(spacing: 8) {
            Text("PolyVoice")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Speak Instead of Type")
                .font(.headline)
                .foregroundColor(.secondary)
        }
    }
    
    
    private var permissionsSection: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Permissions")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
            }
            .padding(.bottom, 20)
            
            VStack(spacing: 20) {
                permissionRow(
                    icon: "🎤",
                    title: "Microphone Access",
                    status: permissionsManager.microphonePermissionStatus,
                    buttonTitle: "Request Permission",
                    action: permissionsManager.requestMicrophonePermission
                )
                
                permissionRow(
                    icon: "🔐",
                    title: "Accessibility Access",
                    status: permissionsManager.accessibilityPermissionStatus,
                    buttonTitle: "Open System Preferences",
                    action: permissionsManager.requestAccessibilityPermission,
                    description: "Required for global hotkeys and text insertion"
                )
            }
        }
        .padding(20)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
    }
    
    private func permissionRow(icon: String, title: String, status: PermissionStatus, buttonTitle: String, action: @escaping () -> Void, description: String? = nil) -> some View {
        VStack(spacing: 8) {
            HStack {
                Text(icon)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .medium))
                    
                    HStack(spacing: 6) {
                        Text("Status:")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                        
                        Text(status.displayText)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(status.color)
                        
                        Text(status.icon)
                            .font(.system(size: 12))
                    }
                }
                
                Spacer()
                
                Button(buttonTitle) {
                    action()
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
            
            if let description = description {
                HStack {
                    Text(description)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
        }
    }
    
    private var currentHotkeySection: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Voice Activation")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
            }
            .padding(.bottom, 20)
            
            HStack {
                Text("Configured Hotkey:")
                    .font(.system(size: 14))
                
                Spacer()
                
                Text("fn")
                    .font(.system(size: 14, weight: .medium, design: .monospaced))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.2))
                    .foregroundColor(.blue)
                    .cornerRadius(6)
            }
        }
        .padding(20)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
    }
    
    private var fnKeyStatusSection: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Fn Key Monitoring")
                    .font(.headline)
                    .fontWeight(.semibold)
                Spacer()
            }
            .padding(.bottom, 20)
            
            VStack(spacing: 12) {
                HStack {
                    Text("Status:")
                        .font(.system(size: 14))
                    
                    Spacer()
                    
                    Text(fnKeyStatus)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(fnKeyStatus == "Long Press Detected!" ? .green : .primary)
                }
                
                HStack {
                    Text("Last Press:")
                        .font(.system(size: 14))
                    
                    Spacer()
                    
                    Text(lastFnPressTime)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                }
                
                if permissionsManager.accessibilityPermissionStatus != .granted {
                    HStack {
                        Text("⚠️ Accessibility permission required for fn key monitoring")
                            .font(.system(size: 12))
                            .foregroundColor(.orange)
                        Spacer()
                    }
                }
            }
        }
        .padding(20)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
        .onReceive(NotificationCenter.default.publisher(for: .fnKeyLongPress)) { _ in
            print("🎯 POLYVOICE: ContentView received LONG PRESS notification")
            fnKeyStatus = "Long Press Detected!"
            lastFnPressTime = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
            print("🎯 POLYVOICE: UI updated - Status: \(fnKeyStatus), Time: \(lastFnPressTime)")
            
            // Reset status after 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                fnKeyStatus = "Ready"
                print("🎯 POLYVOICE: Status reset to Ready")
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .fnKeyShortPress)) { _ in
            print("🎯 POLYVOICE: ContentView received SHORT PRESS notification")
            fnKeyStatus = "Short Press"
            lastFnPressTime = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
            print("🎯 POLYVOICE: UI updated - Status: \(fnKeyStatus), Time: \(lastFnPressTime)")
            
            // Reset status after 1 second
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                fnKeyStatus = "Ready"
                print("🎯 POLYVOICE: Status reset to Ready")
            }
        }
    }
    
    
    private var quitButton: some View {
        Button("Quit") {
            NSApplication.shared.terminate(nil)
        }
        .buttonStyle(.bordered)
        .controlSize(.regular)
    }
}

#Preview {
    ContentView()
}
