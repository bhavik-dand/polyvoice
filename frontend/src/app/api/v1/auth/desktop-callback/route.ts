import { NextRequest, NextResponse } from 'next/server'
import { UserService, SessionService } from '@/lib/user-service'
import jwt from 'jsonwebtoken'

// Desktop OAuth callback endpoint - handles token exchange for macOS app
export async function POST(request: NextRequest) {
  try {
    const { 
      code, 
      state,
      deviceInfo 
    } = await request.json()
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // Exchange authorization code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID_WEB!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET_WEB!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/callback/desktop`
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for tokens' },
        { status: 400 }
      )
    }

    const tokens = await tokenResponse.json()
    
    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    })

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user information' },
        { status: 400 }
      )
    }

    const googleUser = await userInfoResponse.json()
    
    // Create or update user in database
    const user = await UserService.createFromGoogleProfile({
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture
    }, 'macos')

    // Update platform login with device info
    if (deviceInfo) {
      await UserService.updatePlatformLogin(user._id!, 'macos', deviceInfo)
    }

    // Create session for the macOS app
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000))
    const session = await SessionService.createSession(
      user._id!,
      'macos',
      tokens.access_token,
      expiresAt,
      deviceInfo,
      tokens.refresh_token
    )

    // Generate JWT token for the app
    const appToken = jwt.sign(
      {
        sub: user._id!.toString(),
        email: user.email,
        platform: 'macos',
        sessionId: session._id!.toString(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
        aud: 'polyvoice',
        iss: 'polyvoice-api'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { algorithm: 'HS256' }
    )

    // Update the session with the JWT token (for auth middleware lookup)
    await SessionService.updateAccessToken(session._id!, appToken)

    return NextResponse.json({
      success: true,
      token: appToken,
      redirectUrl: `polyvoice://auth?token=${encodeURIComponent(appToken)}`,
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    })

  } catch (error) {
    console.error('Desktop callback error:', error)
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}