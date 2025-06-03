import { ObjectId } from 'mongodb'
import { getUsersCollection, getSessionsCollection } from './mongodb'
import { User, UserSession, createNewUser, createNewSession } from './schemas'

export class UserService {
  
  // Find user by Google ID
  static async findByGoogleId(googleId: string): Promise<User | null> {
    const users = await getUsersCollection()
    return await users.findOne({ googleId }) as User | null
  }
  
  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const users = await getUsersCollection()
    return await users.findOne({ email }) as User | null
  }
  
  // Find user by ID
  static async findById(userId: string | ObjectId): Promise<User | null> {
    const users = await getUsersCollection()
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId
    return await users.findOne({ _id: objectId }) as User | null
  }
  
  // Create new user from Google profile
  static async createFromGoogleProfile(googleProfile: {
    id: string
    email: string
    name: string
    picture?: string
  }, platform: 'web' | 'macos' = 'web'): Promise<User> {
    const users = await getUsersCollection()
    
    // Check if user already exists
    let existingUser = await this.findByGoogleId(googleProfile.id)
    
    if (existingUser) {
      // Update platform info and return existing user
      await this.updatePlatformLogin(existingUser._id!, platform)
      return existingUser
    }
    
    // Create new user
    const newUserData = createNewUser(googleProfile)
    
    // Set initial platform login
    if (platform === 'web') {
      newUserData.platforms.web.firstLoginAt = new Date()
      newUserData.platforms.web.lastLoginAt = new Date()
      newUserData.platforms.web.sessionCount = 1
    } else {
      newUserData.platforms.macos.firstLoginAt = new Date()
      newUserData.platforms.macos.lastLoginAt = new Date()
      newUserData.platforms.macos.sessionCount = 1
    }
    
    const result = await users.insertOne(newUserData)
    
    // Return the created user
    return {
      _id: result.insertedId,
      ...newUserData
    }
  }
  
  // Update platform login info
  static async updatePlatformLogin(
    userId: ObjectId, 
    platform: 'web' | 'macos',
    deviceInfo?: UserSession['deviceInfo']
  ): Promise<void> {
    const users = await getUsersCollection()
    const now = new Date()
    
    const setData: any = {
      updatedAt: now,
      lastSeenAt: now,
      [`platforms.${platform}.lastLoginAt`]: now
    }
    
    const incData: any = {
      [`platforms.${platform}.sessionCount`]: 1
    }
    
    // Set first login if it doesn't exist
    const user = await this.findById(userId)
    if (user && !user.platforms[platform].firstLoginAt) {
      setData[`platforms.${platform}.firstLoginAt`] = now
    }
    
    // Update macOS device info if provided
    if (platform === 'macos' && deviceInfo?.deviceId) {
      setData[`platforms.macos.deviceInfo`] = {
        deviceId: deviceInfo.deviceId,
        deviceName: deviceInfo.deviceName || 'Unknown Device',
        osVersion: deviceInfo.osVersion || 'Unknown'
      }
    }
    
    await users.updateOne(
      { _id: userId },
      { 
        $set: setData,
        $inc: incData
      }
    )
  }
  
  // Update user profile
  static async updateProfile(userId: ObjectId, updates: {
    name?: string
    avatar?: string
  }): Promise<User | null> {
    const users = await getUsersCollection()
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    }
    
    await users.updateOne(
      { _id: userId },
      { $set: updateData }
    )
    
    return await this.findById(userId)
  }
  
  // Mark app as downloaded
  static async markAppDownloaded(userId: ObjectId, version: string): Promise<void> {
    const users = await getUsersCollection()
    
    await users.updateOne(
      { _id: userId },
      { 
        $set: {
          'status.hasDownloadedApp': true,
          updatedAt: new Date()
        }
      }
    )
  }
  
  // Mark onboarding as completed
  static async markOnboardingCompleted(userId: ObjectId): Promise<void> {
    const users = await getUsersCollection()
    
    await users.updateOne(
      { _id: userId },
      { 
        $set: {
          'status.hasCompletedOnboarding': true,
          updatedAt: new Date()
        }
      }
    )
  }
}

export class SessionService {
  
  // Create new session
  static async createSession(
    userId: ObjectId,
    platform: 'web' | 'macos',
    accessToken: string,
    expiresAt: Date,
    deviceInfo?: UserSession['deviceInfo'],
    refreshToken?: string
  ): Promise<UserSession> {
    const sessions = await getSessionsCollection()
    
    const sessionData = createNewSession(
      userId,
      platform,
      accessToken,
      expiresAt,
      deviceInfo,
      refreshToken
    )
    
    const result = await sessions.insertOne(sessionData)
    
    return {
      _id: result.insertedId,
      ...sessionData
    }
  }
  
  // Find session by access token
  static async findByAccessToken(accessToken: string): Promise<UserSession | null> {
    const sessions = await getSessionsCollection()
    return await sessions.findOne({ 
      accessToken,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }) as UserSession | null
  }
  
  // Find session by refresh token
  static async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    const sessions = await getSessionsCollection()
    return await sessions.findOne({ 
      refreshToken,
      isRevoked: false 
    }) as UserSession | null
  }
  
  // Update session last used
  static async updateLastUsed(sessionId: ObjectId): Promise<void> {
    const sessions = await getSessionsCollection()
    
    await sessions.updateOne(
      { _id: sessionId },
      { $set: { lastUsedAt: new Date() } }
    )
  }
  
  // Revoke session
  static async revokeSession(sessionId: ObjectId): Promise<void> {
    const sessions = await getSessionsCollection()
    
    await sessions.updateOne(
      { _id: sessionId },
      { $set: { isRevoked: true } }
    )
  }
  
  // Revoke all sessions for user
  static async revokeAllUserSessions(userId: ObjectId, platform?: 'web' | 'macos'): Promise<number> {
    const sessions = await getSessionsCollection()
    
    const filter: any = { userId, isRevoked: false }
    if (platform) {
      filter.platform = platform
    }
    
    const result = await sessions.updateMany(
      filter,
      { $set: { isRevoked: true } }
    )
    
    return result.modifiedCount
  }
  
  // Get user's active sessions
  static async getUserActiveSessions(userId: ObjectId): Promise<UserSession[]> {
    const sessions = await getSessionsCollection()
    
    return await sessions.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).toArray() as UserSession[]
  }
  
  // Clean up expired sessions
  static async cleanupExpiredSessions(): Promise<number> {
    const sessions = await getSessionsCollection()
    
    const result = await sessions.updateMany(
      { 
        expiresAt: { $lt: new Date() },
        isRevoked: false 
      },
      { $set: { isRevoked: true } }
    )
    
    return result.modifiedCount
  }
}