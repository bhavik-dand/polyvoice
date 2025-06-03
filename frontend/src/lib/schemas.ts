import { ObjectId } from 'mongodb'

// User interface based on our architecture document
export interface User {
  _id?: ObjectId
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

// Session interface
export interface UserSession {
  _id?: ObjectId
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

// Helper functions for creating new documents
export function createNewUser(googleProfile: {
  id: string
  email: string
  name: string
  picture?: string
}): Omit<User, '_id'> {
  const now = new Date()
  
  return {
    googleId: googleProfile.id,
    email: googleProfile.email,
    name: googleProfile.name,
    avatar: googleProfile.picture,
    platforms: {
      web: {
        sessionCount: 0
      },
      macos: {
        sessionCount: 0
      }
    },
    status: {
      hasDownloadedApp: false,
      hasCompletedOnboarding: false,
      isActive: true
    },
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now
  }
}

export function createNewSession(
  userId: ObjectId,
  platform: 'web' | 'macos',
  accessToken: string,
  expiresAt: Date,
  deviceInfo?: UserSession['deviceInfo'],
  refreshToken?: string
): Omit<UserSession, '_id'> {
  const now = new Date()
  
  return {
    userId,
    platform,
    accessToken,
    refreshToken,
    expiresAt,
    deviceInfo,
    createdAt: now,
    lastUsedAt: now,
    isRevoked: false
  }
}