import { getDatabase } from './mongodb'

// Initialize database with indexes and collections
export async function initializeDatabase() {
  try {
    const db = await getDatabase()
    
    // Create users collection with indexes
    const users = db.collection('users')
    await users.createIndex({ googleId: 1 }, { unique: true })
    await users.createIndex({ email: 1 }, { unique: true })
    await users.createIndex({ createdAt: 1 })
    await users.createIndex({ lastSeenAt: 1 })
    
    // Create sessions collection with indexes
    const sessions = db.collection('sessions')
    await sessions.createIndex({ userId: 1 })
    await sessions.createIndex({ accessToken: 1 }, { unique: true })
    await sessions.createIndex({ refreshToken: 1 }, { sparse: true })
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    await sessions.createIndex({ platform: 1 })
    await sessions.createIndex({ isRevoked: 1 })
    await sessions.createIndex({ createdAt: 1 })
    
    console.log('✅ Database initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    return false
  }
}

// Health check for database connection
export async function checkDatabaseHealth() {
  try {
    const db = await getDatabase()
    await db.admin().ping()
    console.log('✅ Database connection healthy')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}