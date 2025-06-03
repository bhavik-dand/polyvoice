import SwiftUI

@main
struct PolyVoiceApp: App {
    @StateObject private var authManager = AuthManager.shared
    
    var body: some Scene {
        Window("PolyVoice", id: "main") {
            ContentView()
                .onOpenURL { url in
                    // Handle custom URL scheme for auth completion (V2.0)
                    if url.scheme == "polyvoice" && url.host == "auth" {
                        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                           let token = components.queryItems?.first(where: { $0.name == "token" })?.value {
                            print("🔗 Received auth token from web callback: \(token)")
                            authManager.handleAuthToken(token: token)
                            
                            // Bring existing window to front
                            NSApplication.shared.activate(ignoringOtherApps: true)
                        }
                    }
                }
        }
        .windowStyle(.hiddenTitleBar)
    }
}