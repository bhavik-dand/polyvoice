import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/db-init'

interface HealthResponse {
  status: string
  service: string
  version: string
  groq_configured: boolean
  database_connected: boolean
  auth_configured: boolean
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const dbHealthy = await checkDatabaseHealth()
  
  return NextResponse.json({
    status: dbHealthy ? "healthy" : "degraded",
    service: "PolyVoice API",
    version: "1.0.0",
    groq_configured: Boolean(process.env.GROQ_API_KEY),
    database_connected: dbHealthy,
    auth_configured: Boolean(process.env.GOOGLE_CLIENT_ID_WEB && process.env.NEXTAUTH_SECRET)
  })
}