import Foundation
import AppKit

protocol FnKeyMonitorDelegate: AnyObject {
    func fnKeyLongPressDetected()
    func fnKeyShortPressDetected()
}

class FnKeyMonitor: ObservableObject {
    weak var delegate: FnKeyMonitorDelegate?
    
    @Published var isMonitoring: Bool = false
    @Published var lastPressTime: Date?
    
    private var fnPressStartTime: Date?
    private var eventMonitor: Any?
    private let longPressDuration: TimeInterval = 0.5 // 500ms threshold
    
    deinit {
        stopMonitoring()
    }
    
    func startMonitoring() {
        guard !isMonitoring else { 
            print("⚠️ POLYVOICE: FnKeyMonitor already monitoring")
            return 
        }
        
        eventMonitor = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            self?.handleFlagChangedEvent(event)
        }
        
        isMonitoring = true
        print("✅ POLYVOICE: FnKeyMonitor started monitoring fn key events")
        print("✅ POLYVOICE: Event monitor installed for .flagsChanged events")
    }
    
    func stopMonitoring() {
        guard isMonitoring, let monitor = eventMonitor else { return }
        
        NSEvent.removeMonitor(monitor)
        eventMonitor = nil
        isMonitoring = false
        fnPressStartTime = nil
        
        print("FnKeyMonitor: Stopped monitoring fn key events")
    }
    
    private func handleFlagChangedEvent(_ event: NSEvent) {
        // Debug: Log all flag change events to see what we're getting
        if event.keyCode == 63 {
            print("⌨️ POLYVOICE: Received flagsChanged event - keyCode: \(event.keyCode), flags: \(event.modifierFlags)")
        }
        
        // Check if this is the fn key (keyCode 63)
        guard event.keyCode == 63 else { return }
        
        if event.modifierFlags.intersection(.deviceIndependentFlagsMask).contains(.function) {
            // Fn key pressed
            handleFnKeyPressed()
        } else {
            // Fn key released
            handleFnKeyReleased()
        }
    }
    
    private func handleFnKeyPressed() {
        fnPressStartTime = Date()
        lastPressTime = Date()
        
        print("🟢 POLYVOICE: Fn key PRESSED at \(Date())")
        print("🟢 POLYVOICE: Fn press start time recorded")
    }
    
    private func handleFnKeyReleased() {
        guard let startTime = fnPressStartTime else { 
            print("🔴 POLYVOICE: Fn key released but no start time recorded!")
            return 
        }
        
        let pressDuration = Date().timeIntervalSince(startTime)
        fnPressStartTime = nil
        
        print("🔴 POLYVOICE: Fn key RELEASED after \(String(format: "%.3f", pressDuration))s")
        
        if pressDuration >= longPressDuration {
            // Long press detected
            print("🎉 POLYVOICE: LONG PRESS detected (\(String(format: "%.3f", pressDuration))s) - calling delegate")
            delegate?.fnKeyLongPressDetected()
        } else {
            // Short press detected
            print("⚡ POLYVOICE: SHORT PRESS detected (\(String(format: "%.3f", pressDuration))s) - calling delegate")
            delegate?.fnKeyShortPressDetected()
        }
    }
    
    // Public method to check current fn key state
    func isFnKeyCurrentlyPressed() -> Bool {
        return fnPressStartTime != nil
    }
    
    // Public method to get current press duration (if pressed)
    func getCurrentPressDuration() -> TimeInterval? {
        guard let startTime = fnPressStartTime else { return nil }
        return Date().timeIntervalSince(startTime)
    }
}