import { TranscriptionModelStrategy, TranscriptionOptions, TranscriptionResult, ModelKey } from './types'
import { GroqWhisperLargeV3Strategy, GroqWhisperLargeV3TurboStrategy, GroqDistilWhisperLargeV3Strategy } from './groq'
import { OpenAIWhisperStrategy, OpenAIGPT4oMiniTranscribeStrategy } from './openai'
import { DeepgramNova3Strategy, DeepgramNova2Strategy, DeepgramNova1Strategy } from './deepgram'
import { GeminiFlash25ThinkingStrategy, Gemini20FlashStrategy, Gemini20FlashLiteStrategy } from './gemini'

// Strategy manager with priority fallbacks
export class TranscriptionStrategyManager {
  private strategies: Map<ModelKey, TranscriptionModelStrategy> = new Map()
  
  constructor() {
    // Register all available strategies
    this.strategies.set('groq-whisper-large-v3', new GroqWhisperLargeV3Strategy())
    this.strategies.set('groq-whisper-large-v3-turbo', new GroqWhisperLargeV3TurboStrategy())
    this.strategies.set('groq-distil-whisper-large-v3', new GroqDistilWhisperLargeV3Strategy())
    this.strategies.set('openai-whisper-1', new OpenAIWhisperStrategy())
    this.strategies.set('openai-gpt-4o-mini-transcribe', new OpenAIGPT4oMiniTranscribeStrategy())
    this.strategies.set('deepgram-nova-3', new DeepgramNova3Strategy())
    this.strategies.set('deepgram-nova-2', new DeepgramNova2Strategy())
    this.strategies.set('deepgram-nova-1', new DeepgramNova1Strategy())
    this.strategies.set('gemini-flash-25-thinking', new GeminiFlash25ThinkingStrategy())
    this.strategies.set('gemini-2.0-flash', new Gemini20FlashStrategy())
    this.strategies.set('gemini-2.0-flash-lite', new Gemini20FlashLiteStrategy())
  }
  
  getStrategy(modelKey: ModelKey): TranscriptionModelStrategy | undefined {
    return this.strategies.get(modelKey)
  }
  
  getAllStrategies(): Array<{key: ModelKey, strategy: TranscriptionModelStrategy}> {
    return Array.from(this.strategies.entries()).map(([key, strategy]) => ({
      key,
      strategy
    }))
  }
  
  async transcribeWithFallbacks(
    audioFile: File,
    priorityOrder: ModelKey[],
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const errors: Array<{model: ModelKey, error: Error}> = []
    
    for (const modelKey of priorityOrder) {
      const strategy = this.strategies.get(modelKey)
      if (!strategy) {
        console.warn(`Strategy not found: ${modelKey}`)
        continue
      }
      
      try {
        // Check if strategy is available
        const isAvailable = await strategy.isAvailable()
        if (!isAvailable) {
          console.warn(`Strategy ${modelKey} is not available (missing API key or service down)`)
          continue
        }
        
        console.log(`🎯 Attempting transcription with ${strategy.displayName}...`)
        const result = await strategy.transcribe(audioFile, options)
        console.log(`✅ Successfully transcribed with ${strategy.displayName}`)
        return result
        
      } catch (error) {
        console.warn(`❌ ${strategy.displayName} failed:`, error)
        errors.push({ model: modelKey, error: error as Error })
      }
    }
    
    // All strategies failed
    const errorSummary = errors.map(e => `${e.model}: ${e.error.message}`).join('; ')
    throw new Error(`All transcription strategies failed. Errors: ${errorSummary}`)
  }
}