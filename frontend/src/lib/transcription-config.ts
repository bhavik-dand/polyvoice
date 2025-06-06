import { ModelKey } from './transcription-strategies'

// Different priority configurations for different scenarios
export const TRANSCRIPTION_CONFIGS = {
  // Speed optimized (fastest models first)
  speed_optimized: [
    'groq-distil-whisper-large-v3',
    'gemini-2.0-flash-lite',
    'groq-whisper-large-v3-turbo',
    'gemini-2.0-flash',
    'deepgram-nova-3',
    'deepgram-nova-2',
    'openai-gpt-4o-mini-transcribe',
    'groq-whisper-large-v3',
    'openai-whisper-1'
  ] as ModelKey[],
  
  // Cost optimized (cheapest models first)
  cost_optimized: [
    'groq-distil-whisper-large-v3',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'groq-whisper-large-v3-turbo',
    'groq-whisper-large-v3',
    'openai-gpt-4o-mini-transcribe',
    'deepgram-nova-2',
    'deepgram-nova-1',
    'openai-whisper-1'
  ] as ModelKey[],
  
  // Quality optimized (highest quality models first)
  quality_optimized: [
    'deepgram-nova-3',
    'groq-whisper-large-v3',
    'openai-whisper-1',
    'deepgram-nova-2',
    'openai-gpt-4o-mini-transcribe',
    'groq-whisper-large-v3-turbo',
    'deepgram-nova-1',
    'groq-distil-whisper-large-v3'
  ] as ModelKey[],
  
  // Current default (matches existing behavior)
  default: [
    // 'groq-distil-whisper-large-v3',
    // 'deepgram-nova-3',
    // 'groq-whisper-large-v3-turbo',
    // 'deepgram-nova-2',
    // 'openai-gpt-4o-mini-transcribe',
    // 'openai-whisper-1',
    // 'gemini-flash-25-thinking'
    // 'groq-distil-whisper-large-v3',
    'gemini-2.0-flash-lite'
    // 'gemini-2.0-flash-lite'
  ] as ModelKey[],
  
  // Groq only (for testing Groq models)
  groq_only: [
    'groq-distil-whisper-large-v3',
    'groq-whisper-large-v3-turbo',
    'groq-whisper-large-v3'
  ] as ModelKey[],
  
  // Deepgram preferred (for high accuracy)
  deepgram_preferred: [
    'deepgram-nova-3',
    'deepgram-nova-2',
    'deepgram-nova-1',
    'groq-whisper-large-v3',
    'openai-gpt-4o-mini-transcribe',
    'openai-whisper-1'
  ] as ModelKey[],
  
  // OpenAI preferred (for GPT-4o mini testing)
  openai_preferred: [
    'openai-gpt-4o-mini-transcribe',
    'openai-whisper-1',
    'groq-whisper-large-v3',
    'deepgram-nova-3',
    'deepgram-nova-2',
    'groq-distil-whisper-large-v3'
  ] as ModelKey[],
  
  // Gemini preferred (for Gemini 2.5 flash thinking testing)
  gemini_preferred: [
    'gemini-flash-25-thinking',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'openai-gpt-4o-mini-transcribe',
    'groq-whisper-large-v3',
    'deepgram-nova-3',
    'deepgram-nova-2',
    'openai-whisper-1'
  ] as ModelKey[],
  
  // Gemini 2.0 focused (for testing Gemini 2.0 Flash performance)
  gemini_2_0_focus: [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-25-thinking',
    'groq-whisper-large-v3',
    'openai-gpt-4o-mini-transcribe',
    'deepgram-nova-3',
    'deepgram-nova-2'
  ] as ModelKey[],
  
  // Ultra cost optimized (absolute cheapest models first)
  ultra_cost_optimized: [
    'gemini-2.0-flash-lite',
    'groq-distil-whisper-large-v3',
    'gemini-2.0-flash',
    'groq-whisper-large-v3-turbo',
    'groq-whisper-large-v3',
    'openai-gpt-4o-mini-transcribe'
  ] as ModelKey[]
}

export type TranscriptionMode = keyof typeof TRANSCRIPTION_CONFIGS

// Environment-based configuration
export const getTranscriptionConfig = (): ModelKey[] => {
  const mode = (process.env.TRANSCRIPTION_MODE || 'default') as TranscriptionMode
  const config = TRANSCRIPTION_CONFIGS[mode]
  
  if (!config) {
    console.warn(`Unknown TRANSCRIPTION_MODE: ${mode}, falling back to default`)
    return TRANSCRIPTION_CONFIGS.default
  }
  
  console.log(`📋 Using transcription mode: ${mode}`)
  return config
}

// Get configuration info for debugging/logging
export const getConfigInfo = (mode?: TranscriptionMode) => {
  const configMode = mode || (process.env.TRANSCRIPTION_MODE as TranscriptionMode) || 'default'
  const config = TRANSCRIPTION_CONFIGS[configMode] || TRANSCRIPTION_CONFIGS.default
  
  return {
    mode: configMode,
    models: config,
    count: config.length,
    primary: config[0],
    fallbacks: config.slice(1)
  }
}

// Utility to validate if a mode exists
export const isValidTranscriptionMode = (mode: string): mode is TranscriptionMode => {
  return mode in TRANSCRIPTION_CONFIGS
}

// Get available modes
export const getAvailableModes = (): TranscriptionMode[] => {
  return Object.keys(TRANSCRIPTION_CONFIGS) as TranscriptionMode[]
}