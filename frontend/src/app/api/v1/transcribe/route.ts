import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import 'groq-sdk/shims/web'
import Groq from 'groq-sdk'
import { authenticateRequest, AuthenticationError, RateLimitError, createErrorResponse, getRateLimitStatus } from '@/lib/auth-middleware'
import { TranscriptionStrategyManager } from '@/lib/transcription-strategies'
import { getTranscriptionConfig, getConfigInfo } from '@/lib/transcription-config'

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
  user_id: string
  rate_limit: {
    remaining: number
    reset_time: number
    limit: number
  }
  formatting_applied: boolean
  original_text?: string
}

interface ErrorResponse {
  error: {
    code: string
    message: string
    type: string
  }
  timestamp: string
  retryAfter?: number
}

// Context-aware formatting functions
// TEMPORARILY DISABLED FORMATTING FUNCTIONS

function detectAppType(context: unknown): string {
  if (!context || typeof context !== 'object' || !('activeApp' in context) || !context.activeApp || typeof context.activeApp !== 'object' || !('bundleId' in context.activeApp)) {
    return 'generic'
  }
  
  const bundleId = String(context.activeApp.bundleId).toLowerCase()
  const windowTitle = (context && typeof context === 'object' && 'window' in context && context.window && typeof context.window === 'object' && 'title' in context.window) ? String(context.window.title).toLowerCase() : ''
  const domain = (context && typeof context === 'object' && 'browser' in context && context.browser && typeof context.browser === 'object' && 'tab' in context.browser && context.browser.tab && typeof context.browser.tab === 'object' && 'domain' in context.browser.tab) ? String(context.browser.tab.domain).toLowerCase() : ''
  
  console.log(`🔍 App detection - bundleId: ${bundleId}, windowTitle: ${windowTitle}, domain: ${domain}`)
  
  // Email apps - check window title for web-based email
  if (bundleId.includes('mail') || 
      domain.includes('gmail') || domain.includes('outlook') ||
      windowTitle.includes('gmail') || windowTitle.includes('outlook') || 
      windowTitle.includes('mail.google') || windowTitle.includes('outlook.live')) {
    console.log('📧 Detected: email context')
    return 'email'
  }
  
  // Chat apps  
  if (bundleId.includes('slack') || bundleId.includes('teams') || bundleId.includes('discord') ||
      windowTitle.includes('slack') || windowTitle.includes('teams') || windowTitle.includes('discord')) {
    console.log('💬 Detected: chat context')
    return 'chat'
  }
  
  // Document apps
  if (bundleId.includes('docs') || bundleId.includes('word') || bundleId.includes('notion') ||
      windowTitle.includes('google docs') || windowTitle.includes('notion') || windowTitle.includes('word')) {
    console.log('📝 Detected: document context')
    return 'document'
  }
  
  // Note-taking apps
  if (bundleId.includes('obsidian') || bundleId.includes('bear') || bundleId.includes('roam') ||
      windowTitle.includes('obsidian') || windowTitle.includes('bear')) {
    console.log('📓 Detected: notes context')
    return 'notes'
  }
  
  // Code editors - these get basic formatting
  if (bundleId.includes('code') || bundleId.includes('cursor') || bundleId.includes('sublime') ||
      bundleId.includes('xcode') || bundleId.includes('intellij') || bundleId.includes('vim') ||
      windowTitle.includes('visual studio code') || windowTitle.includes('cursor') || 
      windowTitle.includes('windsurf') || windowTitle.includes('xcode')) {
    console.log('💻 Detected: code context')
    return 'code'
  }
  
  // Terminal/command line
  if (bundleId.includes('terminal') || bundleId.includes('iterm') || bundleId.includes('zsh') ||
      windowTitle.includes('terminal') || windowTitle.includes('iterm') || windowTitle.includes('zsh')) {
    console.log('⌨️ Detected: terminal context')
    return 'terminal'
  }
  
  console.log('🌐 Detected: generic context')
  return 'generic'
}

function buildFormattingPrompt(rawText: string, context: unknown, appType: string): string {
  const examples = getFormattingExamples(appType)
  
  return `You are a text formatting specialist. Your job is to add structural formatting (line breaks, paragraphs, bullet points) to properly capitalized and punctuated text.

You MUST respond with ONLY a valid JSON object:

{"formatted_text": "Your formatted text here"}

EXAMPLES FOR ${appType.toUpperCase()} CONTEXT:

${examples}

CONTEXT: ${appType}
INPUT TEXT: ${rawText}

RULES:
1. NEVER change, add, or remove words
2. NEVER change capitalization or punctuation
3. ONLY add structural formatting: line breaks, paragraphs, bullet points
4. Keep the exact same meaning and tone
5. Return ONLY the JSON object

JSON RESPONSE:`
}

function getFormattingExamples(appType: string): string {
  const examples: Record<string, string> = {
    email: `Input: "Hey John, I wanted to follow up on our conversation yesterday about the marketing campaign. I think we should definitely move forward with the social media strategy you proposed and also consider adding some influencer partnerships to the mix. What do you think about scheduling a call next week to discuss the budget and timeline?"

Output: {"formatted_text": "Hey John,\\n\\nI wanted to follow up on our conversation yesterday about the marketing campaign. I think we should definitely move forward with the social media strategy you proposed and also consider adding some influencer partnerships to the mix.\\n\\nWhat do you think about scheduling a call next week to discuss the budget and timeline?"}`,
    
    chat: `Input: "Can you check the deployment status? It's been failing for the last hour. I think there might be an issue with the database connection. Let me know what you find and we can troubleshoot together."

Output: {"formatted_text": "Can you check the deployment status? It's been failing for the last hour.\\n\\nI think there might be an issue with the database connection. Let me know what you find and we can troubleshoot together."}`,
    
    document: `Input: "Our Q4 goals include increasing revenue by twenty percent, expanding into two new markets, and improving customer satisfaction scores. We need to focus on product development, marketing campaigns, and customer service training."

Output: {"formatted_text": "Our Q4 goals include:\\n\\n• Increasing revenue by twenty percent\\n• Expanding into two new markets\\n• Improving customer satisfaction scores\\n\\nWe need to focus on:\\n• Product development\\n• Marketing campaigns\\n• Customer service training"}`,
    
    notes: `Input: "Meeting notes from project kickoff. Key decisions made today include choosing React for the frontend, PostgreSQL for the database, and AWS for hosting. Action items are to set up the development environment, create the initial wireframes, and schedule weekly standup meetings."

Output: {"formatted_text": "Meeting notes from project kickoff\\n\\nKey decisions made today:\\n• React for the frontend\\n• PostgreSQL for the database\\n• AWS for hosting\\n\\nAction items:\\n• Set up the development environment\\n• Create the initial wireframes\\n• Schedule weekly standup meetings"}`,
    
    generic: `Input: "I think we should start by reviewing the current process, identifying the main bottlenecks, and then proposing solutions. We also need to consider the budget constraints and timeline requirements."

Output: {"formatted_text": "I think we should start by reviewing the current process, identifying the main bottlenecks, and then proposing solutions.\\n\\nWe also need to consider the budget constraints and timeline requirements."}`
  }
  
  return examples[appType] || examples.generic
}

function validateFormatting(original: string, formatted: string): boolean {
  const originalWords = original.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 0)
  const formattedWords = formatted.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 0)
  
  // Check word count hasn't changed significantly (allow max 3 word difference)
  if (Math.abs(originalWords.length - formattedWords.length) > 3) {
    console.warn(`⚠️ Word count changed too much: ${originalWords.length} -> ${formattedWords.length}`)
    return false
  }
  
  // Basic validation that most words are preserved (85% threshold)
  const commonWords = originalWords.filter(word => formattedWords.includes(word))
  const similarity = commonWords.length / originalWords.length
  
  if (similarity < 0.85) {
    console.warn(`⚠️ Word similarity too low: ${(similarity * 100).toFixed(1)}%`)
    return false
  }
  
  console.log(`✅ Formatting validation passed: ${(similarity * 100).toFixed(1)}% word similarity`)
  return true
}

// Determine if context needs advanced LLM formatting or basic segment formatting
function needsAdvancedFormatting(appType: string): boolean {
  const advancedFormattingContexts = ['email', 'chat', 'document', 'notes', 'generic']
  const basicFormattingContexts = ['code', 'terminal']
  
  if (advancedFormattingContexts.includes(appType)) {
    console.log(`✨ ${appType} context requires ADVANCED LLM formatting`)
    return true
  } else if (basicFormattingContexts.includes(appType)) {
    console.log(`⚡ ${appType} context uses BASIC segment formatting`)
    return false
  }
  
  // Default to advanced for unknown contexts
  console.log(`❓ Unknown context ${appType}, defaulting to ADVANCED formatting`)
  return true
}

// Simple segment-based formatter (ported from JS algorithm)
function applyBasicSegmentFormatting(text: string): string {
  if (!text || text.trim().length === 0) return text
  
  console.log('⚡ Applying basic segment formatting...')
  
  // Clean up extra spaces
  const cleanedText = text.replace(/\s+/g, ' ').trim()
  
  // Split by sentence-ending punctuation
  const sentences = splitIntoSentences(cleanedText)
  
  // Join with line breaks
  const formatted = sentences.join('\n')
  
  console.log(`⚡ Basic formatting: ${sentences.length} sentences, ${formatted.length} characters`)
  return formatted
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence endings: . ! ?
  const sentencePattern = /([.!?])\s*/g
  
  // Split and keep delimiters
  const parts = text.split(sentencePattern)
  const sentences: string[] = []
  
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i]
    const punctuation = parts[i + 1] || ''
    
    if (sentence.trim()) {
      sentences.push((sentence + punctuation).trim())
    }
  }
  
  // If no sentence endings found, return the whole text as one sentence
  if (sentences.length === 0 && text.trim()) {
    return [text.trim()]
  }
  
  return sentences.filter(s => s.length > 0)
}

export async function POST(request: NextRequest): Promise<NextResponse<TranscriptionResponse | ErrorResponse>> {
  console.log("=== V1 TRANSCRIBE ENDPOINT CALLED ===")
  
  try {
    // 🔐 AUTHENTICATION REQUIRED - All requests must be authenticated
    console.log("🔐 Validating authentication...")
    const authData = await authenticateRequest(request)
    console.log(`✅ Authenticated user: ${authData.email} (${authData.userId})`)
    
    // Get current rate limit status
    const rateLimitStatus = getRateLimitStatus(authData.userId)
    console.log(`📊 Rate limit - Remaining: ${rateLimitStatus.remaining}/${rateLimitStatus.limit}`)
    
    const formData = await request.formData()
    const audio = formData.get('audio') as File
    const contextData = formData.get('context') as string
    
    // Parse context if provided
    let context = null
    if (contextData) {
      try {
        context = JSON.parse(contextData)
        console.log('📍 Context received:', JSON.stringify(context, null, 2))
      } catch (error) {
        console.warn('⚠️ Failed to parse context data:', error)
      }
    }
    
    if (!audio) {
      return NextResponse.json(
        { 
          error: {
            code: 'NO_AUDIO_FILE',
            message: 'No audio file provided',
            type: 'ValidationError'
          },
          timestamp: new Date().toISOString()
        },
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
            error: {
              code: 'UNSUPPORTED_FORMAT',
              message: `Unsupported audio format. Supported formats: ${Array.from(SUPPORTED_FORMATS).join(', ')}`,
              type: 'ValidationError'
            },
            timestamp: new Date().toISOString()
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
        { 
          error: {
            code: 'EMPTY_AUDIO_FILE',
            message: 'Empty audio file',
            type: 'ValidationError'
          },
          timestamp: new Date().toISOString()
        },
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
      
      // Start overall timing
      const overallStartTime = Date.now()
      
      // Initialize strategy manager and get configuration
      const strategyManager = new TranscriptionStrategyManager()
      const priorityOrder = getTranscriptionConfig()
      const configInfo = getConfigInfo()
      
      console.log(`🎯 Using transcription mode: ${configInfo.mode}`)
      console.log(`📋 Priority order: ${priorityOrder.join(' → ')}`)
      console.log(`🎬 Primary model: ${configInfo.primary}, Fallbacks: ${configInfo.fallbacks.length}`)
      
      // Start transcription timing
      const transcriptionStartTime = Date.now()
      
      const audioFile = await fs.readFile(tempFilePath)
      const transcriptionResult = await strategyManager.transcribeWithFallbacks(
        new File([audioFile], audio.name, { type: audio.type }),
        priorityOrder,
        {
          prompt: "You are a helpful assistant that transcribes audio in to text. You always return the text with punctuation and capitalization wherever it is appropriate.",
          responseFormat: "verbose_json"
        }
      )
      
      // Calculate transcription timing
      const transcriptionEndTime = Date.now()
      const transcriptionTimeMs = transcriptionEndTime - transcriptionStartTime
      
      console.log(`✅ Transcription completed with ${transcriptionResult.provider}/${transcriptionResult.model_used}: '${transcriptionResult.text}'`)
      console.log(`⏱️  TRANSCRIPTION TIME: ${transcriptionTimeMs}ms`)
      console.log(`💰 ESTIMATED COST: $${transcriptionResult.estimatedCost.toFixed(6)}`)
      
      // Apply conditional formatting based on context
      const formattingStartTime = Date.now()
      let finalText = transcriptionResult.text
      let formattingApplied = false
      const originalText: string | undefined = undefined
      
      // ===== FORMATTING TEMPORARILY DISABLED =====
      console.log('⚠️  FORMATTING DISABLED - Using raw transcription output')
      finalText = transcriptionResult.text
      formattingApplied = false
      
      /* FORMATTING LOGIC COMMENTED OUT FOR TESTING
      if (context && transcriptionResult.text) {
        const appType = detectAppType(context)
        
        if (needsAdvancedFormatting(appType)) {
          // Use LLM for advanced formatting
          console.log('🎨 Starting context-aware LLM formatting...')
          const formattingResult = await formatTextWithContext(transcriptionResult.text, context)
          finalText = formattingResult.formattedText
          formattingApplied = formattingResult.wasFormatted
          
          if (formattingApplied) {
            originalText = transcriptionResult.text // Keep original for debugging
            console.log('✅ Advanced LLM formatting applied successfully')
          } else {
            console.log('ℹ️  LLM formatting failed, falling back to basic formatting')
            finalText = applyBasicSegmentFormatting(transcriptionResult.text)
            formattingApplied = true
          }
        } else {
          // Use basic segment formatting
          console.log('⚡ Using basic segment formatting for technical context')
          finalText = applyBasicSegmentFormatting(transcriptionResult.text)
          formattingApplied = true
          console.log('✅ Basic segment formatting applied')
        }
      } else {
        console.log('ℹ️  No context available, applying basic formatting')
        finalText = applyBasicSegmentFormatting(transcriptionResult.text)
        formattingApplied = true
      }
      */
      
      const formattingEndTime = Date.now()
      const formattingTimeMs = formattingEndTime - formattingStartTime
      
      // Calculate overall timing
      const overallEndTime = Date.now()
      const overallTimeMs = overallEndTime - overallStartTime
      
      // Get updated rate limit status after processing
      const updatedRateLimitStatus = getRateLimitStatus(authData.userId)
      
      const result: TranscriptionResponse = {
        text: finalText,
        model_used: transcriptionResult.model_used,
        processing_time_ms: overallTimeMs,
        estimated_cost: Math.round(transcriptionResult.estimatedCost * 1000000) / 1000000, // Round to 6 decimal places
        estimated_minutes: Math.round(estimatedMinutes * 100) / 100, // Round to 2 decimal places
        user_id: authData.userId,
        formatting_applied: formattingApplied,
        original_text: originalText,
        rate_limit: {
          remaining: updatedRateLimitStatus.remaining,
          reset_time: updatedRateLimitStatus.resetTime,
          limit: updatedRateLimitStatus.limit
        }
      }
      
      // ===== FINAL TIMING SUMMARY =====
      console.log(`\n🎯 ===== PROCESSING COMPLETED =====`)
      console.log(`⏱️  TRANSCRIPTION TIME: ${transcriptionTimeMs}ms (${(transcriptionTimeMs/1000).toFixed(2)}s)`)
      console.log(`⏱️  FORMATTING TIME: ${formattingTimeMs}ms (${(formattingTimeMs/1000).toFixed(2)}s)`)
      console.log(`⏱️  TOTAL PROCESSING TIME: ${overallTimeMs}ms (${(overallTimeMs/1000).toFixed(2)}s)`)
      console.log(`📊 TIMING BREAKDOWN: Transcription=${((transcriptionTimeMs/overallTimeMs)*100).toFixed(1)}%, Formatting=${((formattingTimeMs/overallTimeMs)*100).toFixed(1)}%`)
      console.log(`🎬 MODEL USED: ${transcriptionResult.provider}/${transcriptionResult.model_used}`)
      console.log(`💰 ESTIMATED COST: $${transcriptionResult.estimatedCost.toFixed(6)}`)
      console.log(`📝 TEXT LENGTH: ${finalText.length} chars, ${finalText.split(' ').length} words`)
      console.log(`🎨 FORMATTING: ${formattingApplied ? 'Applied' : 'Skipped'}`)
      console.log(`=====================================\n`)
      
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
    
  } catch (error: unknown) {
    console.log(`❌ Transcription error: ${error}`)
    
    // Handle authentication and rate limiting errors
    if (error instanceof AuthenticationError || error instanceof RateLimitError) {
      console.log(`🚫 ${error.name}: ${error.message}`)
      return NextResponse.json(
        createErrorResponse(error),
        { 
          status: error.statusCode,
          headers: error instanceof RateLimitError ? {
            'Retry-After': error.retryAfter.toString()
          } : {}
        }
      )
    }
    
    // Handle other errors
    return NextResponse.json(
      {
        error: {
          code: 'TRANSCRIPTION_FAILED',
          message: 'Transcription processing failed',
          type: 'TranscriptionError'
        },
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}