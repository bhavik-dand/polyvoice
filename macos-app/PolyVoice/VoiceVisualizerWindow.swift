import SwiftUI
import AppKit

class VoiceVisualizerWindow: NSPanel {
    private var hostingView: NSHostingView<VoiceVisualizerView>?
    
    override init(contentRect: NSRect, styleMask style: NSWindow.StyleMask, backing backingStoreType: NSWindow.BackingStoreType, defer flag: Bool) {
        super.init(contentRect: contentRect, styleMask: [.borderless, .nonactivatingPanel], backing: backingStoreType, defer: flag)
        
        setupWindow()
    }
    
    convenience init() {
        let windowSize = CGSize(width: 400, height: 80)
        let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 1920, height: 1080)
        let windowRect = NSRect(
            x: (screenSize.width - windowSize.width) / 2,
            y: (screenSize.height - windowSize.height) / 2 + 100, // Slightly above center
            width: windowSize.width,
            height: windowSize.height
        )
        
        self.init(contentRect: windowRect, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    }
    
    private func setupWindow() {
        // Window properties
        self.level = NSWindow.Level.floating
        self.backgroundColor = NSColor.clear
        self.isOpaque = false
        self.hasShadow = true
        self.ignoresMouseEvents = true
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        
        // Create SwiftUI content
        let visualizerView = VoiceVisualizerView()
        hostingView = NSHostingView(rootView: visualizerView)
        hostingView?.frame = self.contentView?.bounds ?? .zero
        hostingView?.autoresizingMask = [.width, .height]
        
        self.contentView = hostingView
        
        print("🎨 POLYVOICE: VoiceVisualizerWindow created and configured")
    }
    
    func show() {
        self.orderFront(nil)
        print("🎨 POLYVOICE: VoiceVisualizerWindow shown")
    }
    
    func hide() {
        self.orderOut(nil)
        print("🎨 POLYVOICE: VoiceVisualizerWindow hidden")
    }
    
    func updateAudioLevel(_ level: Float) {
        if let _ = hostingView {
            // Update the audio level in the SwiftUI view
            DispatchQueue.main.async {
                // Audio level updates are handled by the AudioLevelMonitor inside VoiceVisualizerView
                print("🎨 POLYVOICE: Updating audio level: \(level)")
            }
        }
    }
}

// MARK: - SwiftUI Voice Visualizer View
struct VoiceVisualizerView: View {
    @StateObject private var audioMonitor = AudioLevelMonitor()
    
    var body: some View {
        ZStack {
            // Background with rounded corners and blur
            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
            
            VStack(spacing: 12) {
                // Title
                HStack {
                    Image(systemName: "waveform")
                        .foregroundColor(.blue)
                        .font(.system(size: 16, weight: .medium))
                    
                    Text("PolyVoice Listening...")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.primary)
                    
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                
                // Waveform visualization
                LinearWaveformView(audioLevels: audioMonitor.audioLevels)
                    .frame(height: 30)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            audioMonitor.startMonitoring()
            print("🎨 POLYVOICE: VoiceVisualizerView appeared, audio monitoring started")
        }
        .onDisappear {
            audioMonitor.stopMonitoring()
            print("🎨 POLYVOICE: VoiceVisualizerView disappeared, audio monitoring stopped")
        }
    }
}

#Preview {
    VoiceVisualizerView()
        .frame(width: 400, height: 80)
}