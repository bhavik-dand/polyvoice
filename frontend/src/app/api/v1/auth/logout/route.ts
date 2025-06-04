import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, AuthenticationError, createErrorResponse } from '@/lib/auth-middleware'
import { SessionService } from '@/lib/user-service'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request to get session info
    const authData = await authenticateRequest(request)
    
    // Get request body
    const body = await request.json().catch(() => ({}))
    const platform = body.platform || 'unknown'
    
    console.log(`🚪 Logout request from ${authData.email} (${platform})`)
    
    // Revoke the current session
    await SessionService.revokeSession(new ObjectId(authData.sessionId))
    
    console.log(`✅ Session revoked for user ${authData.userId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Successfully logged out'
    })
    
  } catch (error: unknown) {
    console.log(`❌ Logout error: ${error}`)
    
    // Handle authentication errors
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      )
    }
    
    // Handle other errors
    return NextResponse.json(
      {
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Failed to logout',
          type: 'LogoutError'
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}