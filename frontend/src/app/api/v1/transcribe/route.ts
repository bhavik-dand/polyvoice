import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import 'groq-sdk/shims/web'
import Groq from 'groq-sdk'
import { authenticateRequest, AuthenticationError, RateLimitError, createErrorResponse, getRateLimitStatus } from '@/lib/auth-middleware'

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
async function formatTextWithContext(rawText: string, context: unknown): Promise<{ formattedText: string, wasFormatted: boolean }> {
  // Only format if text is longer than 50 words
  const wordCount = rawText.split(' ').filter(word => word.length > 0).length
  if (wordCount < 10) {
    return { formattedText: rawText, wasFormatted: false }
  }

  const appType = detectAppType(context)
  const prompt = buildFormattingPrompt(rawText, context, appType)
  
  try {
    console.log(`🎨 Formatting ${wordCount} words for ${appType} context...`)
    
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0, // Deterministic formatting, no creativity
      response_format: { type: "json_object" }, // Structured output
      max_tokens: Math.min(rawText.length * 2, 4000), // Allow for formatting expansion
    })
    
    console.log("model output: ", response.choices[0]?.message?.content?.trim(), "prompt: ", prompt)
    const rawResponse = response.choices[0]?.message?.content?.trim()
    
    if (!rawResponse) {
      console.warn('⚠️ Model returned empty response, using original text')
      return { formattedText: rawText, wasFormatted: false }
    }
    
    // Parse JSON response
    try {
      const jsonResponse = JSON.parse(rawResponse) as { formatted_text: string }
      
      if (!jsonResponse.formatted_text) {
        console.warn('⚠️ Missing formatted_text field in JSON response')
        return { formattedText: rawText, wasFormatted: false }
      }
      
      // Validate formatting didn't change meaning
      if (validateFormatting(rawText, jsonResponse.formatted_text)) {
        console.log('✅ Text formatting validated and applied')
        return { formattedText: jsonResponse.formatted_text, wasFormatted: true }
      }
      
      console.warn('⚠️ Formatting validation failed, using original text')
      console.warn('📝 Original:', rawText.substring(0, 100) + '...')
      console.warn('🔄 Formatted:', jsonResponse.formatted_text.substring(0, 100) + '...')
      return { formattedText: rawText, wasFormatted: false }
      
    } catch (jsonError) {
      console.warn('⚠️ JSON parsing failed:', jsonError)
      console.warn('📄 Raw response:', rawResponse)
      return { formattedText: rawText, wasFormatted: false }
    }
  } catch (error) {
    console.warn('⚠️ Formatting failed, returning original text:', error)
    return { formattedText: rawText, wasFormatted: false }
  }
}

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
  
  // Code editors
  if (bundleId.includes('code') || bundleId.includes('cursor') || bundleId.includes('sublime') ||
      windowTitle.includes('visual studio code') || windowTitle.includes('cursor') || windowTitle.includes('windsurf')) {
    console.log('💻 Detected: code context')
    return 'code'
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
    
    code: `Input: "This function handles user authentication by first validating the email format, then checking if the user exists in the database, and finally verifying the password hash."

Output: {"formatted_text": "This function handles user authentication by:\\n\\n• First validating the email format\\n• Then checking if the user exists in the database\\n• Finally verifying the password hash"}`,
    
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
      
      // Start transcription
      const startTime = Date.now()
      console.log("🎯 Starting Groq transcription with distil-whisper-large-v3-en...")
      
      const audioFile = await fs.readFile(tempFilePath)
      const transcription = await groq.audio.transcriptions.create({
        file: new File([audioFile], audio.name, { type: audio.type }),
        model: "distil-whisper-large-v3-en",
        response_format: "verbose_json",
        prompt: "You are a helpful assistant that transcribes audio in to text. You always return the text with punctuation and capitalization wherever it is appropriate."
      })
      
      // Calculate processing metrics
      const endTime = Date.now()
      const processingTimeMs = endTime - startTime
      const estimatedCost = estimatedMinutes * 0.003 // $0.003 per minute estimate
      
      console.log(`✅ Transcription completed: '${transcription.text}'`)
      console.log(`⏱️  Processing time: ${processingTimeMs}ms`)
      
      // Apply context-aware formatting
      let finalText = transcription.text
      let formattingApplied = false
      let originalText: string | undefined = undefined
      
      if (context && transcription.text) {
        console.log('🎨 Applying context-aware formatting...')
        const formattingResult = await formatTextWithContext(transcription.text, context)
        finalText = formattingResult.formattedText
        formattingApplied = formattingResult.wasFormatted
        
        if (formattingApplied) {
          originalText = transcription.text // Keep original for debugging
          console.log('✅ Context-aware formatting applied successfully')
        } else {
          console.log('ℹ️  No formatting applied (text too short or formatting failed)')
        }
      } else {
        console.log('ℹ️  No context available, skipping formatting')
      }
      
      // Get updated rate limit status after processing
      const updatedRateLimitStatus = getRateLimitStatus(authData.userId)
      
      const result: TranscriptionResponse = {
        text: finalText,
        model_used: "distil-whisper-large-v3-en",
        processing_time_ms: processingTimeMs,
        estimated_cost: Math.round(estimatedCost * 1000000) / 1000000, // Round to 6 decimal places
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
      
      console.log(`📤 Returning result: ${result.text}...`)
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