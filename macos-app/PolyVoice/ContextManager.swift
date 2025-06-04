import Foundation
import AppKit
import ApplicationServices

struct ContextInfo: Codable {
    let timestamp: String
    let activeApp: ActiveAppInfo
    let window: WindowInfo?
    let browser: BrowserInfo?
    
    struct ActiveAppInfo: Codable {
        let bundleId: String
        let name: String
        let processId: Int32
    }
    
    struct WindowInfo: Codable {
        let title: String
        let focused: Bool
    }
    
    struct BrowserInfo: Codable {
        let type: String
        let tab: TabInfo
        
        struct TabInfo: Codable {
            let title: String
            let url: String?
            let domain: String?
        }
    }
}

class ContextManager {
    static let shared = ContextManager()
    
    private init() {}
    
    func getCurrentContext() -> ContextInfo? {
        guard let activeApp = getActiveApplication() else {
            print("❌ POLYVOICE: Failed to get active application")
            return nil
        }
        
        let windowInfo = getWindowInfo(for: activeApp.processId)
        let browserInfo = getBrowserInfo(for: activeApp, windowTitle: windowInfo?.title)
        
        let context = ContextInfo(
            timestamp: ISO8601DateFormatter().string(from: Date()),
            activeApp: ContextInfo.ActiveAppInfo(
                bundleId: activeApp.bundleId,
                name: activeApp.name,
                processId: activeApp.processId
            ),
            window: windowInfo,
            browser: browserInfo
        )
        
        return context
    }
    
    private func getActiveApplication() -> (bundleId: String, name: String, processId: Int32)? {
        guard let frontmostApp = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        
        guard let bundleId = frontmostApp.bundleIdentifier,
              let name = frontmostApp.localizedName else {
            return nil
        }
        
        return (bundleId: bundleId, name: name, processId: frontmostApp.processIdentifier)
    }
    
    private func getWindowInfo(for processId: Int32) -> ContextInfo.WindowInfo? {
        // Check if accessibility is enabled
        guard AXIsProcessTrusted() else {
            print("⚠️ POLYVOICE: Accessibility not enabled, cannot get window title")
            return nil
        }
        
        let appRef = AXUIElementCreateApplication(processId)
        var focusedWindow: AnyObject?
        
        let result = AXUIElementCopyAttributeValue(appRef, kAXFocusedWindowAttribute as CFString, &focusedWindow)
        
        guard result == .success, let windowElement = focusedWindow else {
            print("⚠️ POLYVOICE: Could not get focused window for process \(processId)")
            return nil
        }
        
        var titleValue: AnyObject?
        let titleResult = AXUIElementCopyAttributeValue(windowElement as! AXUIElement, kAXTitleAttribute as CFString, &titleValue)
        
        guard titleResult == .success, let title = titleValue as? String else {
            print("⚠️ POLYVOICE: Could not get window title for process \(processId)")
            return nil
        }
        
        return ContextInfo.WindowInfo(title: title, focused: true)
    }
    
    private func getBrowserInfo(for app: (bundleId: String, name: String, processId: Int32), windowTitle: String?) -> ContextInfo.BrowserInfo? {
        guard let windowTitle = windowTitle else { return nil }
        
        // Detect browser type and extract tab information
        switch app.bundleId {
        case "com.google.Chrome", "com.google.Chrome.canary":
            return extractChromeTabInfo(windowTitle: windowTitle)
        case "com.apple.Safari", "com.apple.SafariTechnologyPreview":
            return extractSafariTabInfo(windowTitle: windowTitle)
        case "com.microsoft.edgemac", "com.microsoft.edgemac.beta":
            return extractEdgeTabInfo(windowTitle: windowTitle)
        case "org.mozilla.firefox":
            return extractFirefoxTabInfo(windowTitle: windowTitle)
        default:
            return nil
        }
    }
    
    private func extractChromeTabInfo(windowTitle: String) -> ContextInfo.BrowserInfo? {
        // Chrome format: "Page Title - Google Chrome"
        let chromePattern = #"^(.+?) - Google Chrome$"#
        if let regex = try? NSRegularExpression(pattern: chromePattern),
           let match = regex.firstMatch(in: windowTitle, range: NSRange(windowTitle.startIndex..., in: windowTitle)),
           let titleRange = Range(match.range(at: 1), in: windowTitle) {
            
            let pageTitle = String(windowTitle[titleRange])
            let domain = extractDomainFromTitle(pageTitle)
            
            return ContextInfo.BrowserInfo(
                type: "chrome",
                tab: ContextInfo.BrowserInfo.TabInfo(
                    title: pageTitle,
                    url: nil, // URL extraction requires AppleScript
                    domain: domain
                )
            )
        }
        return nil
    }
    
    private func extractSafariTabInfo(windowTitle: String) -> ContextInfo.BrowserInfo? {
        // Safari format: "Page Title — Safari"
        let safariPattern = #"^(.+?) — Safari$"#
        if let regex = try? NSRegularExpression(pattern: safariPattern),
           let match = regex.firstMatch(in: windowTitle, range: NSRange(windowTitle.startIndex..., in: windowTitle)),
           let titleRange = Range(match.range(at: 1), in: windowTitle) {
            
            let pageTitle = String(windowTitle[titleRange])
            let domain = extractDomainFromTitle(pageTitle)
            
            return ContextInfo.BrowserInfo(
                type: "safari",
                tab: ContextInfo.BrowserInfo.TabInfo(
                    title: pageTitle,
                    url: nil,
                    domain: domain
                )
            )
        }
        return nil
    }
    
    private func extractEdgeTabInfo(windowTitle: String) -> ContextInfo.BrowserInfo? {
        // Edge format: "Page Title - Microsoft Edge"
        let edgePattern = #"^(.+?) - Microsoft Edge$"#
        if let regex = try? NSRegularExpression(pattern: edgePattern),
           let match = regex.firstMatch(in: windowTitle, range: NSRange(windowTitle.startIndex..., in: windowTitle)),
           let titleRange = Range(match.range(at: 1), in: windowTitle) {
            
            let pageTitle = String(windowTitle[titleRange])
            let domain = extractDomainFromTitle(pageTitle)
            
            return ContextInfo.BrowserInfo(
                type: "edge",
                tab: ContextInfo.BrowserInfo.TabInfo(
                    title: pageTitle,
                    url: nil,
                    domain: domain
                )
            )
        }
        return nil
    }
    
    private func extractFirefoxTabInfo(windowTitle: String) -> ContextInfo.BrowserInfo? {
        // Firefox format: "Page Title — Mozilla Firefox"
        let firefoxPattern = #"^(.+?) — Mozilla Firefox$"#
        if let regex = try? NSRegularExpression(pattern: firefoxPattern),
           let match = regex.firstMatch(in: windowTitle, range: NSRange(windowTitle.startIndex..., in: windowTitle)),
           let titleRange = Range(match.range(at: 1), in: windowTitle) {
            
            let pageTitle = String(windowTitle[titleRange])
            let domain = extractDomainFromTitle(pageTitle)
            
            return ContextInfo.BrowserInfo(
                type: "firefox",
                tab: ContextInfo.BrowserInfo.TabInfo(
                    title: pageTitle,
                    url: nil,
                    domain: domain
                )
            )
        }
        return nil
    }
    
    private func extractDomainFromTitle(_ title: String) -> String? {
        // Common patterns for extracting domain from page titles
        let commonServices = [
            "Gmail": "mail.google.com",
            "YouTube": "youtube.com",
            "GitHub": "github.com",
            "Stack Overflow": "stackoverflow.com",
            "LinkedIn": "linkedin.com",
            "Twitter": "twitter.com",
            "Facebook": "facebook.com",
            "Instagram": "instagram.com",
            "Reddit": "reddit.com"
        ]
        
        for (service, domain) in commonServices {
            if title.contains(service) {
                return domain
            }
        }
        
        return nil
    }
}