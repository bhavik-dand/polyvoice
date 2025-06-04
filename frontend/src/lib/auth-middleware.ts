import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { SessionService } from '@/lib/user-service'

// Rate limiting storage (in-memory)
interface RateLimitData {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitData>()

// Constants
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10

export interface AuthenticatedRequest {
  userId: string
  sessionId: string
  email: string
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'AUTHENTICATION_ERROR'
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public statusCode: number = 429,
    public code: string = 'RATE_LIMIT_EXCEEDED',
    public retryAfter: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * Validates JWT token and returns user information
 */
export async function validateJWTToken(token: string): Promise<AuthenticatedRequest> {
  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as jwt.JwtPayload
    
    if (!decoded.sub || !decoded.email || !decoded.sessionId) {
      throw new AuthenticationError(
        'Invalid token: Missing required claims',
        401,
        'INVALID_TOKEN_CLAIMS'
      )
    }

    // Verify session exists in database
    const session = await SessionService.findByAccessToken(token)
    if (!session) {
      throw new AuthenticationError(
        'Invalid token: Session not found',
        401,
        'SESSION_NOT_FOUND'
      )
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      throw new AuthenticationError(
        'Token expired: Please sign in again',
        401,
        'TOKEN_EXPIRED'
      )
    }

    // Update last used timestamp
    await SessionService.updateLastUsed(session._id!)

    return {
      userId: decoded.sub,
      sessionId: decoded.sessionId,
      email: decoded.email
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError(
        'Invalid token: Malformed or corrupted',
        401,
        'INVALID_TOKEN_FORMAT'
      )
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError(
        'Token expired: Please sign in again',
        401,
        'TOKEN_EXPIRED'
      )
    }
    
    throw new AuthenticationError(
      'Authentication failed: Unable to validate token',
      401,
      'TOKEN_VALIDATION_FAILED'
    )
  }
}

/**
 * Checks rate limit for a user
 */
export function checkRateLimit(userId: string): void {
  const now = Date.now()
  const userLimitData = rateLimitStore.get(userId)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupExpiredRateLimits(now)
  }

  if (!userLimitData || now > userLimitData.resetTime) {
    // First request or window expired - create new window
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    })
    return
  }

  // Check if limit exceeded
  if (userLimitData.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((userLimitData.resetTime - now) / 1000)
    throw new RateLimitError(
      `Rate limit exceeded: ${RATE_LIMIT_MAX_REQUESTS} requests per minute allowed`,
      429,
      'RATE_LIMIT_EXCEEDED',
      retryAfterSeconds
    )
  }

  // Increment counter
  userLimitData.count++
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredRateLimits(currentTime: number): void {
  for (const [userId, data] of rateLimitStore.entries()) {
    if (currentTime > data.resetTime) {
      rateLimitStore.delete(userId)
    }
  }
}

/**
 * Get current rate limit status for a user
 */
export function getRateLimitStatus(userId: string): {
  remaining: number
  resetTime: number
  limit: number
} {
  const userLimitData = rateLimitStore.get(userId)
  const now = Date.now()

  if (!userLimitData || now > userLimitData.resetTime) {
    return {
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
      limit: RATE_LIMIT_MAX_REQUESTS
    }
  }

  return {
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - userLimitData.count),
    resetTime: userLimitData.resetTime,
    limit: RATE_LIMIT_MAX_REQUESTS
  }
}

/**
 * Main authentication middleware function
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest> {
  // Extract token from Authorization header
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader) {
    throw new AuthenticationError(
      'Authentication required: Please provide a valid access token',
      401,
      'MISSING_AUTHORIZATION_HEADER'
    )
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError(
      'Invalid authorization format: Expected "Bearer <token>"',
      401,
      'INVALID_AUTHORIZATION_FORMAT'
    )
  }

  const token = authHeader.substring(7) // Remove "Bearer " prefix
  
  if (!token) {
    throw new AuthenticationError(
      'Authentication required: Token cannot be empty',
      401,
      'EMPTY_TOKEN'
    )
  }

  // Validate JWT token and get user info
  const authData = await validateJWTToken(token)

  // Check rate limiting
  checkRateLimit(authData.userId)

  return authData
}

/**
 * Create standardized error response
 */
export function createErrorResponse(error: AuthenticationError | RateLimitError) {
  const response = {
    error: {
      code: error.code,
      message: error.message,
      type: error.name
    },
    timestamp: new Date().toISOString()
  }

  // Add retry information for rate limit errors
  if (error instanceof RateLimitError) {
    return {
      ...response,
      retryAfter: error.retryAfter
    }
  }

  return response
}