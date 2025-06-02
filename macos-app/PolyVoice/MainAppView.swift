import SwiftUI

struct MainAppView: View {
    @StateObject private var permissionsManager = PermissionsManager()
    @State private var showingSettings = false
    
    var body: some View {
        VStack(spacing: 0) {
            headerSection
            
            Divider()
            
            if !permissionsManager.audioRecorder.lastTranscription.isEmpty {
                latestTranscriptionSection
                Divider()
            }
            
            if permissionsManager.audioRecorder.isTranscribing {
                recordingStatusSection
                Divider()
            }
            
            quickStatsSection
            
            Spacer()
            
            footerSection
        }
        .frame(width: 500, height: 400)
        .background(Color(.windowBackgroundColor))
        .sheet(isPresented: $showingSettings) {
            SettingsView(permissionsManager: permissionsManager)
        }
    }
    
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("PolyVoice")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Hold fn key to speak")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button(action: { showingSettings = true }) {
                Image(systemName: "gear")
                    .font(.title3)
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            .help("Settings")
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
    }
    
    private var latestTranscriptionSection: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Latest Transcription")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("Copy") {
                    copyToClipboard(text: permissionsManager.audioRecorder.lastTranscription)
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
            
            HStack {
                Text(permissionsManager.audioRecorder.lastTranscription)
                    .font(.body)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.textBackgroundColor))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(.separatorColor), lineWidth: 1)
                    )
                
                Spacer()
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
    }
    
    private var recordingStatusSection: some View {
        VStack(spacing: 12) {
            HStack {
                ProgressView()
                    .scaleEffect(0.8)
                    .progressViewStyle(CircularProgressViewStyle())
                
                Text("Transcribing...")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Spacer()
            }
            
            HStack {
                Text("🎤 Recording in progress")
                    .font(.caption)
                    .foregroundColor(.blue)
                
                Spacer()
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Color.blue.opacity(0.05))
    }
    
    private var quickStatsSection: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Quick Stats")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
            }
            
            HStack(spacing: 20) {
                statCard(
                    icon: "🎯",
                    title: "Hotkey",
                    value: "fn",
                    subtitle: "Hold to record"
                )
                
                statCard(
                    icon: permissionsManager.accessibilityPermissionStatus == .granted ? "✅" : "⚠️",
                    title: "Status",
                    value: permissionsManager.accessibilityPermissionStatus == .granted ? "Ready" : "Setup Needed",
                    subtitle: permissionsManager.accessibilityPermissionStatus == .granted ? "All permissions granted" : "Check settings"
                )
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
    }
    
    private func statCard(icon: String, title: String, value: String, subtitle: String) -> some View {
        VStack(spacing: 8) {
            Text(icon)
                .font(.title2)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
            
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
    }
    
    private var footerSection: some View {
        HStack {
            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            
            Spacer()
            
            if permissionsManager.accessibilityPermissionStatus != .granted || permissionsManager.microphonePermissionStatus != .granted {
                Button("Open Settings") {
                    showingSettings = true
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 20)
    }
    
    private func copyToClipboard(text: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
    }
}

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    let permissionsManager: PermissionsManager
    
    var body: some View {
        VStack(spacing: 20) {
            HStack {
                Text("Settings")
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                Button("Done") {
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
            
            Divider()
            
            VStack(spacing: 16) {
                Text("Permissions")
                    .font(.headline)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
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
                    action: permissionsManager.requestAccessibilityPermission
                )
            }
            
            Spacer()
            
            VStack(spacing: 12) {
                HStack {
                    Text("Usage")
                        .font(.headline)
                    Spacer()
                }
                
                Text("Hold the fn key to start recording. Release to stop and transcribe.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(30)
        .frame(width: 500, height: 400)
    }
    
    private func permissionRow(icon: String, title: String, status: PermissionStatus, buttonTitle: String, action: @escaping () -> Void) -> some View {
        HStack {
            Text(icon)
                .font(.title3)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                HStack(spacing: 6) {
                    Text(status.icon)
                        .font(.caption)
                    
                    Text(status.displayText)
                        .font(.caption)
                        .foregroundColor(status.color)
                }
            }
            
            Spacer()
            
            if status != .granted {
                Button(buttonTitle) {
                    action()
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(12)
    }
}

#Preview {
    MainAppView()
}