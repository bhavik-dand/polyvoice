import { TranscriptionModelStrategy, TranscriptionOptions, TranscriptionResult } from './types'
import { createClient, PrerecordedSchema } from '@deepgram/sdk'

// Base Deepgram strategy class using official SDK
abstract class BaseDeepgramStrategy implements TranscriptionModelStrategy {
  abstract modelId: string
  abstract displayName: string
  abstract costPerMinute: number
  abstract avgProcessingTime: number
  
  provider = "deepgram"
  maxFileSizeMB = 2000 // Deepgram supports larger files
  supportedFormats = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.webm', '.flac'])
  
  private client = createClient(process.env.DEEPGRAM_API_KEY || '')
  
  async isAvailable(): Promise<boolean> {
    return !!process.env.DEEPGRAM_API_KEY
  }
  
  async transcribe(audioFile: File, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    const startTime = Date.now()
    
    try {
      console.log(`🎤 Starting Deepgram transcription with ${this.modelId}...`)
      
      // Convert File to Buffer for the SDK
      const audioBuffer = await audioFile.arrayBuffer()
      const audioBufferNode = Buffer.from(audioBuffer)
      
      // Configure transcription options
      const transcriptionOptions: PrerecordedSchema = {
        model: this.modelId,
        punctuate: true,
        smart_format: true,
        language: options?.language || 'en',
        // Enable additional features for better results
        diarize: false, // Can be enabled based on use case
        utterances: true,
        paragraphs: true,
      }
      
      console.log(`📋 Deepgram options:`, transcriptionOptions)
      
      // Perform transcription using SDK
      const { result, error } = await this.client.listen.prerecorded.transcribeFile(
        audioBufferNode,
        transcriptionOptions
      )
      
      if (error) {
        console.error('❌ Deepgram API error:', error)
        throw new Error(`Deepgram API error: ${error.message || 'Unknown error'}`)
      }
      
      const processingTimeMs = Date.now() - startTime
      
      // Extract transcript from the result
      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
      const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence
      const durationSeconds = result?.metadata?.duration || 60
      const durationMinutes = durationSeconds / 60
      
      console.log(`✅ Deepgram transcription completed: "${transcript.substring(0, 50)}..."`)
      console.log(`🎯 Confidence: ${confidence?.toFixed(4) || 'N/A'}, Duration: ${durationSeconds.toFixed(2)}s`)
      
      return {
        text: transcript,
        model_used: this.modelId,
        provider: this.provider,
        duration: durationSeconds,
        confidence,
        processingTimeMs,
        estimatedCost: durationMinutes * this.costPerMinute,
        metadata: result?.metadata as unknown as Record<string, unknown>
      }
    } catch (error) {
      console.error(`❌ Deepgram ${this.modelId} transcription failed:`, error)
      throw error
    }
  }
}

// Nova-3 - Latest and most advanced model
export class DeepgramNova3Strategy extends BaseDeepgramStrategy {
  modelId = "nova-3"
  displayName = "Deepgram Nova-3"
  costPerMinute = 0.0077 // $0.0077 per minute for streaming (best performance)
  avgProcessingTime = 0.4 // ~0.4 seconds per minute of audio (fastest)
}

// Nova-2 - Previous generation with excellent accuracy
export class DeepgramNova2Strategy extends BaseDeepgramStrategy {
  modelId = "nova-2"
  displayName = "Deepgram Nova-2"
  costPerMinute = 0.0043 // $0.0043 per minute (cost-effective)
  avgProcessingTime = 0.5 // 0.5 seconds per minute of audio
}

// Nova-1 (Legacy) - Original Nova model
export class DeepgramNova1Strategy extends BaseDeepgramStrategy {
  modelId = "nova"
  displayName = "Deepgram Nova-1"
  costPerMinute = 0.0043 // Same pricing as Nova-2
  avgProcessingTime = 0.7 // Slightly slower than Nova-2
}