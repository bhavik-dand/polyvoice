import Foundation

struct AppConfig {
    // MARK: - API Configuration
    
    /// Base URL for the API server
    static var apiBaseURL: String {
        #if DEBUG
            // Development - Local Next.js server
            return "http://localhost:3000"
        #else
            // Production - Vercel deployment
            // TODO: Replace with your actual Vercel URL
            return "https://polyvoice-delta.vercel.app"
        #endif
    }
    
    /// Full URL for transcription endpoint
    static var transcribeURL: String {
        return "\(apiBaseURL)/api/v1/transcribe"
    }
    
    /// Full URL for logout endpoint
    static var logoutURL: String {
        return "\(apiBaseURL)/api/v1/auth/logout"
    }
    
    /// Full URL for desktop OAuth callback
    static var desktopCallbackURL: String {
        return "\(apiBaseURL)/auth/callback/desktop"
    }
    
    // MARK: - OAuth Configuration
    
    /// Google OAuth Client ID (same for both environments)
    static let googleClientId = "965938821958-bmtqtob30ulofmv9nnn35fkb2ctgtao0.apps.googleusercontent.com"
    
    // MARK: - App Configuration
    
    /// Current environment name for debugging
    static var environment: String {
        #if DEBUG
            return "Development"
        #else
            return "Production"
        #endif
    }
    
    /// Whether we're in debug mode
    static var isDebug: Bool {
        #if DEBUG
            return true
        #else
            return false
        #endif
    }
    
    // MARK: - Manual Override (for quick testing)
    
    /// Set this to manually override the API base URL (useful for testing)
    /// Example: AppConfig.manualOverrideURL = "https://your-actual-vercel-url.vercel.app"
    /// Set to nil to use automatic Debug/Release configuration
    static var manualOverrideURL: String? = nil
    
    // MARK: - Quick Switch Helper
    
    /// Quick method to switch to production URL manually
    static func useProductionURL(_ url: String) {
        manualOverrideURL = url
        print("🔄 POLYVOICE: Switched to production URL: \(url)")
    }
    
    /// Quick method to switch back to automatic mode
    static func useAutomaticURL() {
        manualOverrideURL = nil
        print("🔄 POLYVOICE: Switched back to automatic URL selection")
    }
    
    /// Get the actual base URL considering manual override
    static var effectiveBaseURL: String {
        if let override = manualOverrideURL {
            return override
        }
        return apiBaseURL
    }
    
    // MARK: - Debug Helpers
    
    /// Print current configuration (useful for debugging)
    static func printConfiguration() {
        print("🔧 POLYVOICE CONFIG:")
        print("   Environment: \(environment)")
        print("   Base URL: \(effectiveBaseURL)")
        print("   Manual Override: \(manualOverrideURL ?? "None")")
        print("   Client ID: \(googleClientId)")
    }
}

// MARK: - URL Builder Extension

extension AppConfig {
    /// Build a full URL for any API endpoint
    static func buildURL(endpoint: String) -> String {
        let baseURL = effectiveBaseURL
        let cleanEndpoint = endpoint.hasPrefix("/") ? endpoint : "/\(endpoint)"
        return "\(baseURL)\(cleanEndpoint)"
    }
    
    /// Build a URL with query parameters
    static func buildURL(endpoint: String, queryItems: [URLQueryItem]) -> String {
        let baseURLString = buildURL(endpoint: endpoint)
        guard let baseURL = URL(string: baseURLString),
              var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            return baseURLString
        }
        
        components.queryItems = queryItems
        return components.url?.absoluteString ?? baseURLString
    }
}