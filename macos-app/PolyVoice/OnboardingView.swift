import SwiftUI

struct OnboardingView: View {
    @StateObject private var permissionsManager = PermissionsManager()
    @Binding var isOnboardingComplete: Bool
    @State private var currentStep: Int = 0
    @State private var animateWelcome = false
    
    private let totalSteps = 3
    
    var body: some View {
        VStack(spacing: 0) {
            progressHeader
            
            Spacer()
            
            Group {
                switch currentStep {
                case 0:
                    welcomeStep
                case 1:
                    microphonePermissionStep
                case 2:
                    accessibilityPermissionStep
                default:
                    EmptyView()
                }
            }
            .transition(.asymmetric(
                insertion: .move(edge: .trailing).combined(with: .opacity),
                removal: .move(edge: .leading).combined(with: .opacity)
            ))
            
            Spacer()
            
            navigationFooter
        }
        .frame(width: 600, height: 700)
        .background(
            LinearGradient(
                colors: [Color.blue.opacity(0.1), Color.purple.opacity(0.05)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .onAppear {
            withAnimation(.easeInOut(duration: 1.0)) {
                animateWelcome = true
            }
        }
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
    
    private var progressHeader: some View {
        VStack(spacing: 16) {
            HStack {
                Text("Setup PolyVoice")
                    .font(.title2)
                    .fontWeight(.semibold)
                Spacer()
                
                Button("Skip Setup") {
                    completeOnboarding()
                }
                .buttonStyle(.plain)
                .foregroundColor(.secondary)
                .font(.caption)
            }
            
            ProgressView(value: Double(currentStep), total: Double(totalSteps - 1))
                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                .frame(height: 8)
                .background(Color.gray.opacity(0.2))
                .cornerRadius(4)
        }
        .padding(.horizontal, 40)
        .padding(.top, 30)
    }
    
    private var welcomeStep: some View {
        VStack(spacing: 32) {
            VStack(spacing: 16) {
                Text("🎤")
                    .font(.system(size: 80))
                    .scaleEffect(animateWelcome ? 1.0 : 0.8)
                    .animation(.spring(response: 0.8, dampingFraction: 0.6), value: animateWelcome)
                
                Text("Welcome to PolyVoice")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .opacity(animateWelcome ? 1.0 : 0)
                    .animation(.easeInOut(duration: 0.8).delay(0.2), value: animateWelcome)
                
                Text("Speak Instead of Type")
                    .font(.title3)
                    .foregroundColor(.secondary)
                    .opacity(animateWelcome ? 1.0 : 0)
                    .animation(.easeInOut(duration: 0.8).delay(0.4), value: animateWelcome)
            }
            
            VStack(spacing: 20) {
                featureRow(icon: "⚡", title: "System-wide Voice Input", description: "Use voice transcription in any app")
                featureRow(icon: "🎯", title: "Simple Hotkey", description: "Just hold the fn key to record")
                featureRow(icon: "🔒", title: "Privacy First", description: "Audio processed securely via OpenAI")
            }
            .opacity(animateWelcome ? 1.0 : 0)
            .animation(.easeInOut(duration: 0.8).delay(0.6), value: animateWelcome)
        }
        .padding(.horizontal, 60)
    }
    
    private func featureRow(icon: String, title: String, description: String) -> some View {
        HStack(spacing: 16) {
            Text(icon)
                .font(.title2)
                .frame(width: 40)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.medium)
                
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 16)
        .background(Color.white.opacity(0.6))
        .cornerRadius(12)
    }
    
    private var microphonePermissionStep: some View {
        VStack(spacing: 32) {
            VStack(spacing: 16) {
                Text("🎤")
                    .font(.system(size: 60))
                
                Text("Microphone Access")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("PolyVoice needs microphone access to record your voice for transcription")
                    .font(.title3)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            
            permissionCard(
                icon: "🎤",
                title: "Microphone Permission",
                status: permissionsManager.microphonePermissionStatus,
                description: "Required to capture audio for voice transcription",
                buttonTitle: permissionsManager.microphonePermissionStatus == .granted ? "Granted" : "Grant Permission",
                action: permissionsManager.requestMicrophonePermission
            )
        }
        .padding(.horizontal, 60)
    }
    
    private var accessibilityPermissionStep: some View {
        VStack(spacing: 32) {
            VStack(spacing: 16) {
                Text("🔐")
                    .font(.system(size: 60))
                
                Text("Accessibility Access")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("This permission enables global hotkeys and automatic text insertion in any app")
                    .font(.title3)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            
            permissionCard(
                icon: "🔐",
                title: "Accessibility Permission",
                status: permissionsManager.accessibilityPermissionStatus,
                description: "Enables fn key monitoring and text insertion in any application",
                buttonTitle: permissionsManager.accessibilityPermissionStatus == .granted ? "Granted" : "Open System Preferences",
                action: permissionsManager.requestAccessibilityPermission
            )
            
            if permissionsManager.accessibilityPermissionStatus == .granted {
                VStack(spacing: 12) {
                    Text("✅ Setup Complete!")
                        .font(.headline)
                        .foregroundColor(.green)
                    
                    Text("You can now use PolyVoice by holding the fn key")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)
            }
        }
        .padding(.horizontal, 60)
    }
    
    private func permissionCard(icon: String, title: String, status: PermissionStatus, description: String, buttonTitle: String, action: @escaping () -> Void) -> some View {
        VStack(spacing: 20) {
            HStack {
                Text(icon)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .fontWeight(.medium)
                    
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                HStack(spacing: 8) {
                    Text(status.icon)
                        .font(.title3)
                    
                    Text(status.displayText)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(status.color)
                }
            }
            
            if status != .granted {
                Button(buttonTitle) {
                    action()
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .frame(maxWidth: .infinity)
            }
        }
        .padding(24)
        .background(Color.white.opacity(0.8))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(status == .granted ? Color.green.opacity(0.3) : Color.gray.opacity(0.2), lineWidth: 2)
        )
    }
    
    private var navigationFooter: some View {
        HStack {
            if currentStep > 0 {
                Button("Previous") {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        currentStep -= 1
                    }
                }
                .buttonStyle(.bordered)
            }
            
            Spacer()
            
            if canProceedToNext {
                Button(isLastStep ? "Complete Setup" : "Next") {
                    if isLastStep {
                        completeOnboarding()
                    } else {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            currentStep += 1
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.return)
            } else if !isLastStep {
                Button("Next") {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        currentStep += 1
                    }
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(.horizontal, 40)
        .padding(.bottom, 30)
    }
    
    private var canProceedToNext: Bool {
        switch currentStep {
        case 0:
            return true
        case 1:
            return permissionsManager.microphonePermissionStatus == .granted
        case 2:
            return permissionsManager.accessibilityPermissionStatus == .granted
        default:
            return false
        }
    }
    
    private var isLastStep: Bool {
        currentStep == totalSteps - 1
    }
    
    private func completeOnboarding() {
        withAnimation(.easeInOut(duration: 0.5)) {
            isOnboardingComplete = true
        }
        
        // Store onboarding completion in UserDefaults
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
    }
}

#Preview {
    OnboardingView(isOnboardingComplete: .constant(false))
}