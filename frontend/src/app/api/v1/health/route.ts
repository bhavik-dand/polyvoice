import { NextResponse } from 'next/server'

interface HealthResponse {
  status: string
  service: string
  version: string
  groq_configured: boolean
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  return NextResponse.json({
    status: "healthy",
    service: "PolyVoice Transcription API",
    version: "1.0.0",
    groq_configured: Boolean(process.env.GROQ_API_KEY)
  })
}