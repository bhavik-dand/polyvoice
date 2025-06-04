import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { UserService } from '@/lib/user-service'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { platform, version } = await request.json()
    
    if (!platform || !version) {
      return NextResponse.json(
        { error: 'Platform and version are required' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await UserService.findByEmail(session.user?.email!)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Mark app as downloaded
    await UserService.markAppDownloaded(user._id!, version)

    return NextResponse.json({
      success: true,
      downloadInfo: {
        downloadedAt: new Date().toISOString(),
        version,
        downloadCount: 1 // You could track this more sophisticatedly
      }
    })

  } catch (error) {
    console.error('Download tracking error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to track download',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}