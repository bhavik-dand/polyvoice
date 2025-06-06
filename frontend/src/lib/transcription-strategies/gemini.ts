import { GoogleGenAI } from '@google/genai'
import { TranscriptionModelStrategy, TranscriptionOptions, TranscriptionResult } from './types'

// Base Gemini strategy class
abstract class BaseGeminiStrategy implements TranscriptionModelStrategy {
  abstract modelId: string
  abstract displayName: string
  abstract costPerMinute: number
  abstract avgProcessingTime: number
  
  provider = "gemini"
  maxFileSizeMB = 20 // Conservative estimate for audio files
  supportedFormats = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.webm', '.flac'])
  
  protected genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })
  
  async isAvailable(): Promise<boolean> {
    return !!process.env.GOOGLE_API_KEY
  }
  
  async transcribe(audioFile: File, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    const startTime = Date.now()
    
    try {
      // Convert audio file to base64 for sending to Gemini
      const arrayBuffer = await audioFile.arrayBuffer()
      const base64Audio = Buffer.from(arrayBuffer).toString('base64')
      
      // Create the multimodal content for Gemini
      const prompt = `Please transcribe the following audio content. Provide only the transcribed text without any additional commentary or formatting.`
      
      const response = await this.genai.models.generateContent({
        model: this.modelId,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: audioFile.type || 'audio/wav'
                }
              }
            ]
          }
        ],
        config: {
          maxOutputTokens: 1000,
          temperature: options?.temperature || 0.1,
          // Setting thinking budget to zero as requested
          candidateCount: 1
        }
      })
      
      const processingTimeMs = Date.now() - startTime
      const text = response.text || ''
      const durationMinutes = 1 // Default duration estimate
      console.log(`🔍 Gemini transcription response: ${JSON.stringify(response)}`)
      return {
        text: text.trim(),
        model_used: this.modelId,
        provider: this.provider,
        duration: durationMinutes * 60,
        processingTimeMs,
        estimatedCost: durationMinutes * this.costPerMinute,
        metadata: {
          candidateCount: 1,
          temperature: options?.temperature || 0.1
        }
      }
      
    } catch (error) {
      throw new Error(`Gemini transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Gemini 2.2 Flash implementation with zero thinking budget, named as "Gemini 2.5 flash thinking"
export class GeminiFlash25ThinkingStrategy extends BaseGeminiStrategy {
  modelId = "gemini-2.5-flash-preview-05-20" // Using the latest available model
  displayName = "Gemini 2.5 flash thinking"
  costPerMinute = 0.001 // Estimated cost - adjust based on actual pricing
  avgProcessingTime = 2.0 // Estimated processing time in seconds per minute of audio
}

// Gemini 2.0 Flash implementation - fast and versatile multimodal model
export class Gemini20FlashStrategy extends BaseGeminiStrategy {
  modelId = "gemini-2.0-flash-001" // Using the stable Gemini 2.0 Flash model
  displayName = "Gemini 2.0 Flash"
  costPerMinute = 0.0005 // Lower cost than 2.5 flash thinking
  avgProcessingTime = 1.5 // Faster processing time due to optimizations
}

// Gemini 2.0 Flash Lite implementation - optimized for cost efficiency and low latency
export class Gemini20FlashLiteStrategy extends BaseGeminiStrategy {
  modelId = "gemini-2.0-flash-lite-001" // Using the stable Gemini 2.0 Flash Lite model
  displayName = "Gemini 2.0 Flash Lite"
  costPerMinute = 0.0003 // Most cost-effective option
  avgProcessingTime = 1.0 // Fastest processing time for high-volume tasks
} 