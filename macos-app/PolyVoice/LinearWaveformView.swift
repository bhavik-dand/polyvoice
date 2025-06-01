import SwiftUI

struct LinearWaveformView: View {
    let audioLevels: [Float]
    let barCount: Int = 40
    let barSpacing: CGFloat = 2
    
    @State private var animationPhase: CGFloat = 0
    
    private var normalizedLevels: [Float] {
        // If we don't have enough levels, pad with zeros
        if audioLevels.count < barCount {
            return audioLevels + Array(repeating: 0.0, count: barCount - audioLevels.count)
        }
        // If we have too many, take the most recent ones
        return Array(audioLevels.suffix(barCount))
    }
    
    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: barSpacing) {
                ForEach(0..<barCount, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 1)
                        .fill(barColor(for: index))
                        .frame(
                            width: barWidth(for: geometry.size.width),
                            height: barHeight(for: index, maxHeight: geometry.size.height)
                        )
                        .animation(
                            .easeInOut(duration: 0.1)
                            .delay(Double(index) * 0.005), // Slight stagger effect
                            value: normalizedLevels[index]
                        )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
        .onAppear {
            startIdleAnimation()
        }
    }
    
    private func barWidth(for totalWidth: CGFloat) -> CGFloat {
        let totalSpacing = CGFloat(barCount - 1) * barSpacing
        let availableWidth = totalWidth - totalSpacing
        return max(2, availableWidth / CGFloat(barCount))
    }
    
    private func barHeight(for index: Int, maxHeight: CGFloat) -> CGFloat {
        let level = normalizedLevels[index]
        let minHeight: CGFloat = 2
        let maxBarHeight = maxHeight * 0.9
        
        if level > 0.01 {
            // Active audio - use actual level
            return minHeight + (CGFloat(level) * (maxBarHeight - minHeight))
        } else {
            // No audio - show idle animation
            let normalizedIndex = CGFloat(index) / CGFloat(barCount - 1)
            let waveOffset = sin((normalizedIndex * .pi * 2) + animationPhase) * 0.3 + 0.5
            return minHeight + (waveOffset * (maxBarHeight * 0.2))
        }
    }
    
    private func barColor(for index: Int) -> Color {
        let level = normalizedLevels[index]
        
        if level > 0.01 {
            // Active audio - gradient from blue to green based on level
            if level < 0.3 {
                return .blue.opacity(0.7 + Double(level))
            } else if level < 0.7 {
                return .green.opacity(0.7 + Double(level * 0.3))
            } else {
                return .orange.opacity(0.8 + Double(level * 0.2))
            }
        } else {
            // Idle state - subtle blue
            return .blue.opacity(0.3)
        }
    }
    
    private func startIdleAnimation() {
        withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
            animationPhase = .pi * 2
        }
    }
}

// MARK: - Preview with Mock Data
struct LinearWaveformView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            // Idle state
            LinearWaveformView(audioLevels: Array(repeating: 0.0, count: 40))
                .frame(height: 30)
                .background(Color.black.opacity(0.1))
            
            // Low audio
            LinearWaveformView(audioLevels: [
                0.1, 0.2, 0.15, 0.3, 0.25, 0.1, 0.05, 0.2, 0.35, 0.2,
                0.1, 0.15, 0.25, 0.3, 0.2, 0.1, 0.05, 0.15, 0.25, 0.2,
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
            ])
            .frame(height: 30)
            .background(Color.black.opacity(0.1))
            
            // High audio
            LinearWaveformView(audioLevels: [
                0.6, 0.8, 0.7, 0.9, 0.85, 0.6, 0.4, 0.7, 0.95, 0.8,
                0.6, 0.7, 0.8, 0.9, 0.75, 0.6, 0.5, 0.7, 0.85, 0.8,
                0.5, 0.6, 0.7, 0.8, 0.6, 0.4, 0.3, 0.5, 0.7, 0.6,
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
            ])
            .frame(height: 30)
            .background(Color.black.opacity(0.1))
        }
        .padding()
    }
}