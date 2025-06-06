import { TranscriptionModelStrategy, TranscriptionOptions, TranscriptionResult } from './types'

// Base OpenAI strategy class
abstract class BaseOpenAIStrategy implements TranscriptionModelStrategy {
  abstract modelId: string
  abstract displayName: string
  abstract costPerMinute: number
  abstract avgProcessingTime: number
  
  provider = "openai"
  maxFileSizeMB = 25
  supportedFormats = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.webm'])
  
  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY
  }
  
  async transcribe(audioFile: File, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    const startTime = Date.now()
    
    // Dynamic import to avoid issues if OpenAI is not installed
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: this.modelId,
      response_format: "json",
      prompt: options?.prompt,
      temperature: options?.temperature
    })
    
    const processingTimeMs = Date.now() - startTime
    const text = typeof transcription === 'string' ? transcription : transcription.text
    const duration = typeof transcription === 'object' && 'duration' in transcription ? transcription.duration as number : undefined
    const durationMinutes = duration || 1
    
    return {
      text,
      model_used: this.modelId,
      provider: this.provider,
      duration,
      processingTimeMs,
      estimatedCost: durationMinutes * this.costPerMinute
    }
  }
}

// OpenAI model implementations
export class OpenAIWhisperStrategy extends BaseOpenAIStrategy {
  modelId = "whisper-1"
  displayName = "OpenAI Whisper"
  costPerMinute = 0.006 // $0.006 per minute
  avgProcessingTime = 2.0 // 2 seconds per minute of audio
}

export class OpenAIGPT4oMiniTranscribeStrategy extends BaseOpenAIStrategy {
  modelId = "gpt-4o-mini-transcribe"
  displayName = "OpenAI GPT-4o Mini Transcribe"
  costPerMinute = 0.0015 // $0.0015 per minute (estimated based on token pricing)
  avgProcessingTime = 1.5 // 1.5 seconds per minute of audio
}