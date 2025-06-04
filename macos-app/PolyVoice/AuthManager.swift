import Foundation
import Security
import CryptoKit
import AppKit

class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isAuthenticated = false
    @Published var currentUser: User? = nil
    @Published var isLoading = false
    
    private let keychainService = "com.polyvoice.app"
    
    // User model
    struct User: Codable {
        let id: String
        let email: String
        let name: String
        let avatar: String?
    }
    
    // Token model for V2.0
    struct AppToken: Codable {
        let token: String
        let expiresAt: String
        let user: User
    }
    
    private init() {
        // Print configuration on startup for debugging
        AppConfig.printConfiguration()
        
        // Use lazy loading - only check UserDefaults, no keychain access on startup
        loadAuthenticationStateFromUserDefaults()
    }
    
    // MARK: - Public Methods
    
    func startAuthentication() {
        isLoading = true
        
        // Generate PKCE parameters (still used for security)
        let codeVerifier = generateCodeVerifier()
        let codeChallenge = generateCodeChallenge(from: codeVerifier)
        
        // Store code verifier for validation (not used in V2.0 but good practice)
        storeCodeVerifier(codeVerifier)
        
        // Build OAuth URL with web-hosted callback
        let authURL = buildAuthURL(codeChallenge: codeChallenge)
        
        // Open OAuth URL in default browser
        if let url = URL(string: authURL) {
            NSWorkspace.shared.open(url)
        }
    }
    
    func handleAuthToken(token: String) {
        print("🔑 Received auth token from web callback")
        
        // Decode JWT to get user info
        if let userInfo = decodeJWT(token) {
            // Debug: Print all available fields in the JWT
            print("🔍 JWT token contains these fields:")
            for (key, value) in userInfo {
                print("  \(key): \(value)")
            }
            
            // Try to construct name from available fields
            let name = extractNameFromJWT(userInfo)
            
            let user = User(
                id: userInfo["sub"] as? String ?? "",
                email: userInfo["email"] as? String ?? "",
                name: name,
                avatar: userInfo["picture"] as? String
            )
            
            print("👤 Created user with name: '\(user.name)'")
            
            let appToken = AppToken(
                token: token,
                expiresAt: ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: userInfo["exp"] as? Double ?? 0)),
                user: user
            )
            
            DispatchQueue.main.async {
                self.handleSuccessfulAuthentication(appToken)
            }
        } else {
            print("❌ Failed to decode JWT token")
            DispatchQueue.main.async {
                self.isLoading = false
            }
        }
    }
    
    func logout() {
        Task {
            await performLogout()
        }
    }
    
    func refreshTokenIfNeeded() {
        // Only access keychain when refresh is actually needed
        guard isAuthenticated else { return }
        
        // First check UserDefaults for expiration (avoid keychain access)
        if let expirationString = UserDefaults.standard.string(forKey: "tokenExpiresAt"),
           let expirationDate = ISO8601DateFormatter().date(from: expirationString),
           expirationDate.timeIntervalSinceNow < 300 { // Refresh if expires in 5 minutes
            
            // Now access keychain to get actual token for refresh
            checkAuthenticationStatus()
        }
    }
    
    // Public method to get current token (lazy keychain access)
    func getCurrentToken() -> String? {
        guard isAuthenticated else { return nil }
        
        // Access keychain only when token is actually needed
        if let appToken = retrieveAppToken() {
            if let expirationDate = ISO8601DateFormatter().date(from: appToken.expiresAt),
               expirationDate > Date() {
                return appToken.token
            } else {
                // Token expired, clear state
                clearAuthentication()
                return nil
            }
        } else {
            // Token not found, clear state
            clearAuthentication()
            return nil
        }
    }
    
    // MARK: - Private Methods
    
    private func extractNameFromJWT(_ userInfo: [String: Any]) -> String {
        // Try to get name from various fields in the JWT
        if let name = userInfo["name"] as? String, !name.isEmpty {
            return name
        }
        
        // Try to construct name from given_name and family_name
        let givenName = userInfo["given_name"] as? String ?? ""
        let familyName = userInfo["family_name"] as? String ?? ""
        
        if !givenName.isEmpty || !familyName.isEmpty {
            return [givenName, familyName].filter { !$0.isEmpty }.joined(separator: " ")
        }
        
        // Fallback to email username if no name fields available
        if let email = userInfo["email"] as? String {
            return String(email.split(separator: "@").first ?? "User")
        }
        
        return "User"
    }
    
    private func loadAuthenticationStateFromUserDefaults() {
        // Only check UserDefaults on startup - no keychain access
        isAuthenticated = UserDefaults.standard.bool(forKey: "isAuthenticated")
        
        if isAuthenticated {
            // Load user info from UserDefaults (non-sensitive data)
            if let userData = UserDefaults.standard.data(forKey: "currentUser"),
               let user = try? JSONDecoder().decode(User.self, from: userData) {
                currentUser = user
                
                // If user name is empty, try to refresh from keychain token
                if user.name.isEmpty {
                    refreshUserInfoFromToken()
                }
            } else {
                // If no user data in UserDefaults, try to get it from keychain token
                refreshUserInfoFromToken()
            }
            
            // Check if token might be expired (basic check without keychain access)
            if let expirationString = UserDefaults.standard.string(forKey: "tokenExpiresAt"),
               let expirationDate = ISO8601DateFormatter().date(from: expirationString),
               expirationDate <= Date() {
                // Token expired, clear auth state but don't access keychain
                clearAuthenticationState()
            }
        }
    }
    
    private func refreshUserInfoFromToken() {
        // Try to get user info from keychain token
        if let appToken = retrieveAppToken() {
            // Check if token is still valid
            if let expirationDate = ISO8601DateFormatter().date(from: appToken.expiresAt),
               expirationDate > Date() {
                // Token is valid, update user info
                currentUser = appToken.user
                
                // Update UserDefaults with the correct user info
                if let userData = try? JSONEncoder().encode(appToken.user) {
                    UserDefaults.standard.set(userData, forKey: "currentUser")
                }
            }
        }
    }
    
    private func checkAuthenticationStatus() {
        // This method now only called when actually needed (lazy keychain access)
        guard isAuthenticated else { return }
        
        if let appToken = retrieveAppToken() {
            // Check if token is still valid
            if let expirationDate = ISO8601DateFormatter().date(from: appToken.expiresAt),
               expirationDate > Date() {
                // Token is valid, ensure UI state is correct
                currentUser = appToken.user
                isAuthenticated = true
            } else {
                // Token expired
                clearAuthentication()
            }
        } else {
            // Token not found in keychain, clear state
            clearAuthentication()
        }
    }
    
    private func generateCodeVerifier() -> String {
        let data = Data((0..<32).map { _ in UInt8.random(in: 0...255) })
        return data.base64URLEncodedString()
    }
    
    private func generateCodeChallenge(from verifier: String) -> String {
        let data = Data(verifier.utf8)
        let hash = SHA256.hash(data: data)
        return Data(hash).base64URLEncodedString()
    }
    
    private func buildAuthURL(codeChallenge: String) -> String {
        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        components.queryItems = [
            URLQueryItem(name: "client_id", value: AppConfig.googleClientId),
            URLQueryItem(name: "redirect_uri", value: AppConfig.desktopCallbackURL),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid email profile"),
            URLQueryItem(name: "access_type", value: "offline"),
            URLQueryItem(name: "prompt", value: "consent"),
            URLQueryItem(name: "state", value: generateState())
        ]
        return components.url!.absoluteString
    }
    
    private func generateState() -> String {
        return UUID().uuidString
    }
    
    private func decodeJWT(_ token: String) -> [String: Any]? {
        let segments = token.components(separatedBy: ".")
        guard segments.count == 3 else { return nil }
        
        var base64String = segments[1]
        // Add padding if needed
        let remainder = base64String.count % 4
        if remainder > 0 {
            base64String += String(repeating: "=", count: 4 - remainder)
        }
        
        // Convert from base64url to base64
        base64String = base64String
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        guard let data = Data(base64Encoded: base64String),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        
        return json
    }
    
    @MainActor
    private func performLogout() async {
        if let appToken = retrieveAppToken() {
            do {
                var request = URLRequest(url: URL(string: AppConfig.logoutURL)!)
                request.httpMethod = "POST"
                request.setValue("Bearer \(appToken.token)", forHTTPHeaderField: "Authorization")
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                
                let requestBody = ["platform": "macos"]
                request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
                
                let (_, _) = try await URLSession.shared.data(for: request)
            } catch {
                print("Logout request failed: \(error)")
            }
        }
        
        clearAuthentication()
    }
    
    private func handleSuccessfulAuthentication(_ appToken: AppToken) {
        // Store sensitive token in keychain
        storeAppToken(appToken)
        
        // Store non-sensitive data in UserDefaults
        storeAuthenticationStateInUserDefaults(appToken)
        
        currentUser = appToken.user
        isAuthenticated = true
        isLoading = false
        clearCodeVerifier()
    }
    
    private func clearAuthentication() {
        clearAppToken()
        clearCodeVerifier()
        clearAuthenticationState()
        currentUser = nil
        isAuthenticated = false
        isLoading = false
    }
    
    private func clearAuthenticationState() {
        // Clear UserDefaults
        UserDefaults.standard.removeObject(forKey: "isAuthenticated")
        UserDefaults.standard.removeObject(forKey: "currentUser")
        UserDefaults.standard.removeObject(forKey: "tokenExpiresAt")
    }
    
    private func storeAuthenticationStateInUserDefaults(_ appToken: AppToken) {
        // Store non-sensitive authentication state
        UserDefaults.standard.set(true, forKey: "isAuthenticated")
        UserDefaults.standard.set(appToken.expiresAt, forKey: "tokenExpiresAt")
        
        // Store user info (non-sensitive)
        if let userData = try? JSONEncoder().encode(appToken.user) {
            UserDefaults.standard.set(userData, forKey: "currentUser")
        }
    }
    
    private func getDeviceInfo() -> [String: Any] {
        return [
            "deviceId": getDeviceIdentifier(),
            "deviceName": Host.current().localizedName ?? "Unknown Mac",
            "osVersion": ProcessInfo.processInfo.operatingSystemVersionString,
            "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        ]
    }
    
    private func getDeviceIdentifier() -> String {
        if let identifier = retrieveDeviceIdentifier() {
            return identifier
        }
        
        let newIdentifier = UUID().uuidString
        storeDeviceIdentifier(newIdentifier)
        return newIdentifier
    }
    
    // MARK: - Keychain Methods
    
    private func storeAppToken(_ appToken: AppToken) {
        if let data = try? JSONEncoder().encode(appToken) {
            storeInKeychain(key: "appToken", data: data)
        }
    }
    
    func retrieveAppToken() -> AppToken? {
        guard let data = retrieveFromKeychain(key: "appToken"),
              let appToken = try? JSONDecoder().decode(AppToken.self, from: data) else {
            return nil
        }
        return appToken
    }
    
    private func clearAppToken() {
        deleteFromKeychain(key: "appToken")
    }
    
    private func storeCodeVerifier(_ verifier: String) {
        storeInKeychain(key: "codeVerifier", data: Data(verifier.utf8))
    }
    
    private func retrieveCodeVerifier() -> String? {
        guard let data = retrieveFromKeychain(key: "codeVerifier") else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    private func clearCodeVerifier() {
        deleteFromKeychain(key: "codeVerifier")
    }
    
    private func storeDeviceIdentifier(_ identifier: String) {
        storeInKeychain(key: "deviceIdentifier", data: Data(identifier.utf8))
    }
    
    private func retrieveDeviceIdentifier() -> String? {
        guard let data = retrieveFromKeychain(key: "deviceIdentifier") else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    private func storeInKeychain(key: String, data: Data) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    private func retrieveFromKeychain(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]
        
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }
    
    private func deleteFromKeychain(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key
        ]
        
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Data Extensions

extension Data {
    func base64URLEncodedString() -> String {
        return base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}