import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import 'groq-sdk/shims/web'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// Validate API key
if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY is not set in environment variables')
}

const SUPPORTED_FORMATS = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.webm'])

interface TranscriptionResponse {
  text: string
  model_used: string
  processing_time_ms: number
  estimated_cost: number
  estimated_minutes: number
}

interface ErrorResponse {
  error: string
  detail?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<TranscriptionResponse | ErrorResponse>> {
  console.log("=== V1 TRANSCRIBE ENDPOINT CALLED ===")
  
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File
    
    if (!audio) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      )
    }
    
    console.log(`📁 Processing file: ${audio.name}`)
    console.log(`📋 Content type: ${audio.type}`)
    
    // Validate file format
    let fileExtension: string
    if (audio.name) {
      fileExtension = '.' + audio.name.split('.').pop()?.toLowerCase()
      if (!SUPPORTED_FORMATS.has(fileExtension)) {
        return NextResponse.json(
          { 
            error: `Unsupported audio format. Supported formats: ${Array.from(SUPPORTED_FORMATS).join(', ')}` 
          },
          { status: 400 }
        )
      }
    } else {
      fileExtension = '.m4a' // Default for PolyVoice app
    }
    
    console.log(`🎵 Using file extension: ${fileExtension}`)
    
    // Read audio data
    const audioBuffer = await audio.arrayBuffer()
    const audioData = new Uint8Array(audioBuffer)
    
    if (audioData.length === 0) {
      return NextResponse.json(
        { error: "Empty audio file" },
        { status: 400 }
      )
    }
    
    // Create temporary file
    const tempFileName = `polyvoice-${randomUUID()}${fileExtension}`
    const tempFilePath = join(tmpdir(), tempFileName)
    
    await fs.writeFile(tempFilePath, audioData)
    console.log(`💾 Saved to temporary file: ${tempFilePath}`)
    
    try {
      // Calculate estimates
      const fileSizeMB = audioData.length / (1024 * 1024)
      const estimatedMinutes = Math.max(fileSizeMB / 0.5, 0.1) // Rough estimate, minimum 0.1 minutes
      console.log(`📊 File size: ${fileSizeMB.toFixed(2)}MB, Estimated duration: ${estimatedMinutes.toFixed(2)} minutes`)
      
      // Start transcription
      const startTime = Date.now()
      console.log("🎯 Starting Groq transcription with distil-whisper-large-v3-en...")
      
      const audioFile = await fs.readFile(tempFilePath)
      const transcription = await groq.audio.transcriptions.create({
        file: new File([audioFile], audio.name, { type: audio.type }),
        model: "distil-whisper-large-v3-en",
        response_format: "verbose_json"
      })
      
      // Calculate processing metrics
      const endTime = Date.now()
      const processingTimeMs = endTime - startTime
      const estimatedCost = estimatedMinutes * 0.003 // $0.003 per minute estimate
      
      console.log(`✅ Transcription completed: '${transcription.text}'`)
      console.log(`⏱️  Processing time: ${processingTimeMs}ms`)
      
      const result: TranscriptionResponse = {
        text: transcription.text,
        model_used: "distil-whisper-large-v3-en",
        processing_time_ms: processingTimeMs,
        estimated_cost: Math.round(estimatedCost * 1000000) / 1000000, // Round to 6 decimal places
        estimated_minutes: Math.round(estimatedMinutes * 100) / 100 // Round to 2 decimal places
      }
      
      console.log(`📤 Returning result: ${result.text.substring(0, 50)}...`)
      return NextResponse.json(result)
      
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(tempFilePath)
        console.log("🗑️ Temporary file cleaned up")
      } catch (error) {
        console.warn(`Failed to clean up temporary file: ${error}`)
      }
    }
    
  } catch (error: any) {
    console.log(`❌ Transcription error: ${error}`)
    return NextResponse.json(
      { 
        error: "Transcription failed",
        detail: error.message 
      },
      { status: 500 }
    )
  }
}