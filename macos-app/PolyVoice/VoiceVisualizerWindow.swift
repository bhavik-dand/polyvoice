import SwiftUI
import AppKit

class VoiceVisualizerWindow: NSPanel {
    private var hostingView: NSHostingView<VoiceVisualizerView>?
    private let audioRecorder: AudioRecorder
    
    init(audioRecorder: AudioRecorder, contentRect: NSRect, styleMask style: NSWindow.StyleMask, backing backingStoreType: NSWindow.BackingStoreType, defer flag: Bool) {
        self.audioRecorder = audioRecorder
        super.init(contentRect: contentRect, styleMask: [.borderless, .nonactivatingPanel], backing: backingStoreType, defer: flag)
        
        setupWindow()
    }
    
    convenience init(audioRecorder: AudioRecorder) {
        let windowSize = CGSize(width: 400, height: 80)
        let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 1920, height: 1080)
        let windowRect = NSRect(
            x: (screenSize.width - windowSize.width) / 2,
            y: (screenSize.height - windowSize.height) / 2 + 100, // Slightly above center
            width: windowSize.width,
            height: windowSize.height
        )
        
        self.init(audioRecorder: audioRecorder, contentRect: windowRect, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    }
    
    private func setupWindow() {
        // Window properties
        self.level = NSWindow.Level.floating
        self.backgroundColor = NSColor.clear
        self.isOpaque = false
        self.hasShadow = true
        self.ignoresMouseEvents = true
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        
        // Create SwiftUI content with shared AudioRecorder
        let visualizerView = VoiceVisualizerView(audioRecorder: audioRecorder)
        hostingView = NSHostingView(rootView: visualizerView)
        hostingView?.frame = self.contentView?.bounds ?? .zero
        hostingView?.autoresizingMask = [.width, .height]
        
        self.contentView = hostingView
        
        print("🎨 POLYVOICE: VoiceVisualizerWindow created with shared AudioRecorder")
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
    @ObservedObject var audioRecorder: AudioRecorder
    @State private var audioLevels: [Float] = Array(repeating: 0.0, count: 40)
    
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
                LinearWaveformView(audioLevels: audioLevels)
                    .frame(height: 30)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onReceive(audioRecorder.$currentAudioLevel) { level in
            updateAudioLevels(with: level)
        }
        .onAppear {
            print("🎨 POLYVOICE: VoiceVisualizerView appeared - using shared AudioRecorder")
        }
        .onDisappear {
            // Reset levels when disappearing
            audioLevels = Array(repeating: 0.0, count: 40)
            print("🎨 POLYVOICE: VoiceVisualizerView disappeared - levels reset")
        }
    }
    
    private func updateAudioLevels(with level: Float) {
        // Add new level to the beginning and remove the last one
        audioLevels.insert(level, at: 0)
        if audioLevels.count > 40 {
            audioLevels.removeLast()
        }
    }
}

#Preview {
    VoiceVisualizerView(audioRecorder: AudioRecorder())
        .frame(width: 400, height: 80)
}