// Core strategy interface
export interface TranscriptionModelStrategy {
  modelId: string
  provider: string
  displayName: string
  costPerMinute: number // USD
  avgProcessingTime: number // seconds per minute of audio
  maxFileSizeMB: number
  supportedFormats: Set<string>
  
  transcribe(audioFile: File, options?: TranscriptionOptions): Promise<TranscriptionResult>
  isAvailable(): Promise<boolean> // Check API key, service health
}

export interface TranscriptionOptions {
  language?: string
  prompt?: string
  responseFormat?: 'text' | 'verbose_json' | 'json'
  temperature?: number
}

export interface TranscriptionResult {
  text: string
  model_used: string
  provider: string
  duration?: number
  language?: string
  confidence?: number
  processingTimeMs: number
  estimatedCost: number
  metadata?: Record<string, unknown>
}

// Model key type
export type ModelKey = 
  | 'groq-whisper-large-v3'
  | 'groq-whisper-large-v3-turbo' 
  | 'groq-distil-whisper-large-v3'
  | 'openai-whisper-1'
  | 'openai-gpt-4o-mini-transcribe'
  // Deepgram Nova models
  | 'deepgram-nova-3'
  | 'deepgram-nova-2'
  | 'deepgram-nova-1'
  // Gemini models
  | 'gemini-flash-25-thinking'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'