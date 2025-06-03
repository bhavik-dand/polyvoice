# PolyVoice Authentication Architecture

**Document Version:** 1.0  
**Author:** Staff Software Engineer  
**Date:** January 2025  
**Status:** Design Phase  

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Authentication Flows](#authentication-flows)
4. [User Data Model](#user-data-model)
5. [API Endpoints](#api-endpoints)
6. [Token Management & Security](#token-management--security)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Error Handling & Edge Cases](#error-handling--edge-cases)
9. [Security Considerations](#security-considerations)

## Overview

PolyVoice requires a unified authentication system that serves both the web frontend (landing page with app download) and the native macOS application. The system must handle user onboarding, secure token management, and cross-platform user state synchronization.

### Key Goals

- **Unified Identity**: Single user identity across web and macOS platforms
- **Secure Authentication**: Industry-standard OAuth 2.0 implementation
- **Seamless Experience**: Minimal friction for users across platforms
- **State Management**: Track user journey (web signup → app download → app login)
- **Security First**: Secure token storage and refresh mechanisms

## System Requirements

### Functional Requirements

- Google OAuth authentication for both web and macOS
- User registration and profile management
- Secure token storage and refresh
- Download link access control
- Cross-platform user state tracking
- Duplicate user prevention

### Technical Requirements

- **Frontend**: Next.js with NextAuth.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Google OAuth 2.0 + PKCE (for macOS)
- **Token Storage**: Keychain (macOS), httpOnly cookies (web)
- **APIs**: RESTful API with JWT tokens

### Google OAuth Configuration Requirements

**Google Cloud Project**: Single project containing both client configurations

**Client ID #1 - Web Application**:
```
Type: Web Application
Authorized redirect URIs:
  - http://localhost:3000/api/v1/auth/callback (development)
  - https://polyvoice.com/api/v1/auth/callback (production)
Authorized JavaScript origins:
  - http://localhost:3000 (development)
  - https://polyvoice.com (production)
```

**Client ID #2 - Desktop Application (macOS)**:
```
Type: Desktop Application
Authorized redirect URIs:
  - polyvoice://auth/callback (custom URL scheme)
Bundle ID: com.polyvoice.app (for macOS app)
```

**Environment Variables Required**:
```bash
# Frontend (.env.local)
GOOGLE_CLIENT_ID_WEB=your-web-client-id
GOOGLE_CLIENT_SECRET_WEB=your-web-client-secret

# For macOS app API endpoints
GOOGLE_CLIENT_ID_DESKTOP=your-desktop-client-id
GOOGLE_CLIENT_SECRET_DESKTOP=your-desktop-client-secret
```

## Authentication Flows

### 1. Frontend Web Application Flow

```
┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────┐    ┌─────────┐
│  User   │    │ Frontend App │    │ Google OAuth│    │   API   │    │ MongoDB │
└────┬────┘    └──────┬───────┘    └──────┬──────┘    └────┬────┘    └────┬────┘
     │                │                   │                │              │
     │ 1. Visit landing page              │                │              │
     ├───────────────►│                   │                │              │
     │                │                   │                │              │
     │ 2. Click "Sign in with Google"     │                │              │
     ├───────────────►│                   │                │              │
     │                │                   │                │              │
     │                │ 3. Redirect to OAuth               │              │
     │                ├──────────────────►│                │              │
     │                │                   │                │              │
     │ 4. Present consent screen          │                │              │
     │◄──────────────────────────────────┤                │              │
     │                │                   │                │              │
     │ 5. Grant permissions               │                │              │
     ├──────────────────────────────────►│                │              │
     │                │                   │                │              │
     │                │ 6. Redirect with auth code         │              │
     │                │◄──────────────────┤                │              │
     │                │                   │                │              │
     │                │ 7. POST /api/v1/auth/google (code) │              │
     │                ├──────────────────────────────────►│              │
     │                │                   │                │              │
     │                │                   │ 8. Exchange code for tokens   │
     │                │                   │◄───────────────┤              │
     │                │                   │                │              │
     │                │                   │ 9. Return tokens              │
     │                │                   ├───────────────►│              │
     │                │                   │                │              │
     │                │                   │                │ 10. Create/update user
     │                │                   │                ├─────────────►│
     │                │                   │                │              │
     │                │                   │                │ 11. User data │
     │                │                   │                │◄─────────────┤
     │                │                   │                │              │
     │                │ 12. Return user + session token    │              │
     │                │◄──────────────────────────────────┤              │
     │                │                   │                │              │
     │ 13. Show download page with app link               │              │
     │◄───────────────┤                   │                │              │
     │                │                   │                │              │
```

**Implementation Details:**
- Use NextAuth.js with Google provider
- Store session in httpOnly cookies
- Create user record in MongoDB on first login
- Grant access to download page after authentication

### 2. macOS Application Flow

```
┌──────────┐    ┌─────────┐    ┌─────────────┐    ┌─────────┐    ┌─────────┐
│ macOS App│    │ Browser │    │ Google OAuth│    │   API   │    │ MongoDB │
└─────┬────┘    └────┬────┘    └──────┬──────┘    └────┬────┘    └────┬────┘
      │              │                │                │              │
      │ 1. Generate PKCE code challenge               │              │
      ├─────────────►│                │                │              │
      │              │                │                │              │
      │ 2. Open browser with OAuth URL + PKCE         │              │
      ├─────────────►│                │                │              │
      │              │                │                │              │
      │              │ 3. Navigate to Google OAuth    │              │
      │              ├───────────────►│                │              │
      │              │                │                │              │
      │              │ 4. Present consent screen      │              │
      │              │◄───────────────┤                │              │
      │              │                │                │              │
      │              │ 5. User grants permissions     │              │
      │              ├───────────────►│                │              │
      │              │                │                │              │
      │              │ 6. Redirect to polyvoice://auth/callback      │
      │              │◄───────────────┤                │              │
      │              │                │                │              │
      │ 7. Launch app with auth code   │                │              │
      │◄─────────────┤                │                │              │
      │              │                │                │              │
      │ 8. POST /api/v1/auth/macos (code + verifier)   │              │
      ├──────────────────────────────────────────────►│              │
      │              │                │                │              │
      │              │                │ 9. Exchange code for tokens (PKCE)
      │              │                │◄───────────────┤              │
      │              │                │                │              │
      │              │                │ 10. Return tokens             │
      │              │                ├───────────────►│              │
      │              │                │                │              │
      │              │                │                │ 11. Find/create user
      │              │                │                ├─────────────►│
      │              │                │                │              │
      │              │                │                │ 12. User data │
      │              │                │                │◄─────────────┤
      │              │                │                │              │
      │ 13. Return access + refresh tokens             │              │
      │◄──────────────────────────────────────────────┤              │
      │              │                │                │              │
      │ 14. Store tokens in Keychain  │                │              │
      ├─────────────►│                │                │              │
      │              │                │                │              │
```

**Implementation Details:**
- Use OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- Custom URL scheme: `polyvoice://auth/callback`
- Secure token storage in macOS Keychain
- Automatic token refresh mechanism

## User Data Model

### MongoDB User Schema

```typescript
interface User {
  _id: ObjectId
  googleId: string              // Google OAuth subject ID
  email: string                 // Primary email from Google
  name: string                  // Display name
  avatar?: string               // Profile picture URL
  
  // Platform tracking
  platforms: {
    web: {
      firstLoginAt?: Date
      lastLoginAt?: Date
      sessionCount: number
    }
    macos: {
      firstLoginAt?: Date
      lastLoginAt?: Date
      sessionCount: number
      deviceInfo?: {
        deviceId: string        // Unique device identifier
        deviceName: string      // User's device name
        osVersion: string       // macOS version
      }
    }
  }
  
  // User state tracking
  status: {
    hasDownloadedApp: boolean
    hasCompletedOnboarding: boolean
    isActive: boolean
  }
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastSeenAt: Date
}
```

### Session/Token Schema

```typescript
interface UserSession {
  _id: ObjectId
  userId: ObjectId              // Reference to User
  platform: 'web' | 'macos'
  
  // Token information
  accessToken: string           // JWT or reference token
  refreshToken?: string         // For macOS long-lived sessions
  expiresAt: Date
  
  // Session metadata
  deviceInfo?: {
    userAgent?: string          // For web sessions
    deviceId?: string           // For macOS sessions
    ipAddress: string
  }
  
  createdAt: Date
  lastUsedAt: Date
  isRevoked: boolean
}
```

## API Endpoints

### Authentication Endpoints (v1)

#### `POST /api/v1/auth/google`
**Purpose**: Handle Google OAuth callback for web application
```typescript
// Request
{
  code: string,
  state?: string
}

// Response
{
  user: {
    id: string,
    email: string,
    name: string,
    avatar?: string
  },
  sessionToken: string,
  expiresAt: string
}
```

#### `POST /api/v1/auth/macos`
**Purpose**: Handle Google OAuth for macOS application with PKCE
```typescript
// Request
{
  code: string,
  codeVerifier: string,
  deviceInfo: {
    deviceId: string,
    deviceName: string,
    osVersion: string
  }
}

// Response
{
  user: User,
  accessToken: string,
  refreshToken: string,
  expiresAt: string
}
```

#### `POST /api/v1/auth/refresh`
**Purpose**: Refresh access tokens
```typescript
// Request
{
  refreshToken: string,
  platform: 'web' | 'macos'
}

// Response
{
  accessToken: string,
  expiresAt: string,
  refreshToken?: string  // New refresh token (rotation)
}
```

#### `POST /api/v1/auth/logout`
**Purpose**: Logout user and revoke tokens
```typescript
// Request
{
  platform: 'web' | 'macos',
  allDevices?: boolean
}

// Response
{
  success: boolean
}
```

#### `GET /api/v1/auth/status`
**Purpose**: Check authentication status and token validity
```typescript
// Headers: Authorization: Bearer <token>
// Response
{
  isAuthenticated: boolean,
  user?: {
    id: string,
    email: string,
    name: string
  },
  expiresAt?: string,
  needsRefresh?: boolean
}
```

### User Management Endpoints (v1)

#### `GET /api/v1/user/profile`
**Purpose**: Get current user profile
```typescript
// Headers: Authorization: Bearer <token>
// Response
{
  user: User,
  platforms: PlatformInfo
}
```

#### `PUT /api/v1/user/profile`
**Purpose**: Update user profile
```typescript
// Request
{
  name?: string,
  preferences?: UserPreferences
}

// Response
{
  user: User
}
```

#### `POST /api/v1/user/download-tracked`
**Purpose**: Track app download
```typescript
// Request
{
  platform: 'macos',
  version: string
}

// Response
{
  success: boolean,
  downloadInfo: {
    downloadedAt: string,
    version: string,
    downloadCount: number
  }
}
```

#### `GET /api/v1/user/download-link`
**Purpose**: Get authenticated download link for macOS app
```typescript
// Headers: Authorization: Bearer <token>
// Response
{
  downloadUrl: string,
  version: string,
  expiresAt: string,
  checksums: {
    sha256: string,
    md5: string
  }
}
```

### API Versioning Strategy

**Current Version**: v1 (Initial Release)
- All endpoints prefixed with `/api/v1/`
- Semantic versioning for breaking changes
- Backward compatibility maintained for minor updates

**Future Versioning Plan**:
- **v1.x**: Patch updates (bug fixes, security patches)
- **v2.0**: Major updates (breaking changes, new auth methods)
- **Deprecation**: 6-month notice before removing old versions

**Version Headers**:
```typescript
// Optional API version override
Headers: {
  'API-Version': 'v1',
  'Accept': 'application/json'
}
```

**Migration Support**:
- Cross-version compatibility testing
- Migration guides for version updates
- Gradual rollout strategy
- Rollback capabilities

## Token Management & Security

### JWT Token Structure

```typescript
interface JWTPayload {
  sub: string           // User ID
  email: string         // User email
  platform: string     // 'web' | 'macos'
  sessionId: string     // Session reference
  iat: number          // Issued at
  exp: number          // Expires at
  aud: 'polyvoice'     // Audience
  iss: 'polyvoice-api' // Issuer
}
```

### Token Refresh Strategy

**Web Application:**
- Short-lived access tokens (15 minutes)
- Refresh tokens stored in httpOnly cookies
- Automatic refresh using interceptors

**macOS Application:**
- Medium-lived access tokens (1 hour)
- Refresh tokens stored in Keychain
- Background refresh before expiration
- Secure token rotation

### Security Implementation

1. **PKCE for Native Apps**: Prevents authorization code interception
2. **Token Rotation**: New refresh tokens issued on each refresh
3. **Device Binding**: Tokens tied to specific devices
4. **Secure Storage**: Keychain (macOS), httpOnly cookies (web)
5. **Rate Limiting**: Prevent brute force attacks
6. **Token Revocation**: Immediate logout capability

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up MongoDB connection and schemas
- [ ] Install and configure NextAuth.js
- [ ] Create basic Google OAuth configuration
- [ ] Implement user creation and retrieval

### Phase 2: Web Authentication (Week 2)
- [ ] Complete web OAuth flow
- [ ] Implement session management
- [ ] Create protected download page
- [ ] Add user profile management

### Phase 3: macOS Authentication (Week 3)
- [ ] Implement PKCE flow in macOS app
- [ ] Add custom URL scheme handling
- [ ] Implement Keychain token storage
- [ ] Create token refresh mechanism

### Phase 4: Integration & Testing (Week 4)
- [ ] Cross-platform user state sync
- [ ] Comprehensive error handling
- [ ] Security testing and hardening
- [ ] Performance optimization

## Error Handling & Edge Cases

### Common Scenarios

1. **Duplicate User Prevention**
   - Use Google ID as unique identifier
   - Merge accounts if email matches existing user
   - Handle platform state updates for existing users

2. **Token Expiration**
   - Graceful refresh with retry mechanism
   - Fallback to re-authentication if refresh fails
   - Clear local state on permanent failure

3. **Network Connectivity**
   - Offline mode for macOS app
   - Queue authentication requests
   - Sync state when connection restored

4. **Platform Switching**
   - Detect existing user when switching platforms
   - Maintain session continuity where possible
   - Update platform-specific metadata

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string,
    message: string,
    details?: any
  },
  timestamp: string,
  requestId: string
}
```

## Security Considerations

### Data Protection
- Encrypt sensitive data at rest
- Use TLS 1.3 for all communications
- Implement proper CORS policies
- Regular security audits

### Authentication Security
- Implement rate limiting (5 attempts per minute)
- Monitor for suspicious login patterns
- Add optional 2FA for high-value accounts
- Log all authentication events

### Token Security
- Short token lifespans
- Secure token storage
- Regular token rotation
- Immediate revocation capability

### Privacy Compliance
- Minimal data collection
- Clear privacy policy
- User data deletion capability
- GDPR/CCPA compliance ready

## Google OAuth Best Practices Implemented

### Why Separate Client IDs Are Required
- **Web apps** use redirect URLs for secure token delivery
- **Native apps** require bundle/package verification and custom schemes
- **Different security properties** per platform mandate separation
- **Google's security model** enforces this architectural pattern

### Cross-Platform Benefits
- **Auto-approval**: User approval on one platform grants auto-approval on others for same scopes
- **Shared identity**: Unified user identity via Google ID across all platforms
- **Seamless experience**: Consistent authentication while maintaining platform security
- **Single project**: Both clients managed under one Google Cloud project

### Security Advantages
1. **Platform-Specific Security**: Each client type optimized for its platform's security model
2. **PKCE for Native Apps**: Enhanced security for macOS application OAuth flow
3. **No Embedded WebViews**: Native OAuth flows prevent token interception
4. **Secure Token Storage**: Platform-appropriate storage (Keychain/httpOnly cookies)
5. **Unified Project Management**: Centralized OAuth client management

---

**Next Steps**: 
1. **Create Google Cloud Project** with both OAuth client configurations as specified
2. **Review architecture document** for any additional requirements
3. **Proceed with Phase 1 implementation** upon approval