import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { UserService } from '@/lib/user-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json({
        isAuthenticated: false
      })
    }

    // Get user details from database
    const user = await UserService.findByEmail(session.user?.email!)
    
    if (!user) {
      return NextResponse.json({
        isAuthenticated: false
      })
    }

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar
      },
      platforms: user.platforms,
      status: user.status
    })

  } catch (error) {
    console.error('Auth status error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get authentication status',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}