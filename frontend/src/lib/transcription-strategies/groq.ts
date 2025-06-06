import Groq from 'groq-sdk'
import { TranscriptionModelStrategy, TranscriptionOptions, TranscriptionResult } from './types'

// Base Groq strategy class
abstract class BaseGroqStrategy implements TranscriptionModelStrategy {
  abstract modelId: string
  abstract displayName: string
  abstract costPerMinute: number
  abstract avgProcessingTime: number
  
  provider = "groq"
  maxFileSizeMB = 25
  supportedFormats = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.webm'])
  
  protected groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  
  async isAvailable(): Promise<boolean> {
    return !!process.env.GROQ_API_KEY
  }
  
  async transcribe(audioFile: File, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    const startTime = Date.now()
    
    const transcription = await this.groq.audio.transcriptions.create({
      file: audioFile,
      model: this.modelId,
      response_format: options?.responseFormat || "verbose_json",
      prompt: options?.prompt,
      temperature: options?.temperature
    })
    
    const processingTimeMs = Date.now() - startTime
    
    // Handle both verbose_json and text responses
    const text = typeof transcription === 'string' ? transcription : transcription.text
    const duration = typeof transcription === 'object' && 'duration' in transcription ? transcription.duration as number : undefined
    const language = typeof transcription === 'object' && 'language' in transcription ? transcription.language as string : undefined
    const segments = typeof transcription === 'object' && 'segments' in transcription ? transcription.segments : undefined
    
    const durationMinutes = duration || 1
    
    return {
      text,
      model_used: this.modelId,
      provider: this.provider,
      duration,
      language,
      processingTimeMs,
      estimatedCost: durationMinutes * this.costPerMinute,
      metadata: segments ? { segments } : undefined
    }
  }
}

// Groq model implementations
export class GroqWhisperLargeV3Strategy extends BaseGroqStrategy {
  modelId = "whisper-large-v3"
  displayName = "Groq Whisper Large v3"
  costPerMinute = 0.00006 // $0.00006 per minute
  avgProcessingTime = 0.3 // 0.3 seconds per minute of audio
}

export class GroqWhisperLargeV3TurboStrategy extends BaseGroqStrategy {
  modelId = "whisper-large-v3-turbo"
  displayName = "Groq Whisper Large v3 Turbo"
  costPerMinute = 0.00004 // $0.00004 per minute
  avgProcessingTime = 0.15 // 0.15 seconds per minute of audio
}

export class GroqDistilWhisperLargeV3Strategy extends BaseGroqStrategy {
  modelId = "distil-whisper-large-v3-en"
  displayName = "Groq Distil Whisper Large v3 (English)"
  costPerMinute = 0.00002 // $0.00002 per minute
  avgProcessingTime = 0.1 // 0.1 seconds per minute of audio
}