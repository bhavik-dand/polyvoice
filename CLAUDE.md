# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PolyVoice is a macOS productivity app that enables system-wide voice-to-text. Users hold the `fn` key to record audio, which is transcribed via Next.js API routes using Groq's Whisper models.

## Architecture

- **macOS App** (`/macos-app/`): Swift/SwiftUI native app
  - `FnKeyMonitor`: Monitors fn key events using IOKit
  - `AudioRecorder`: AVAudioRecorder-based recording to M4A format
  - `VoiceVisualizerWindow`: NSWindow subclass for visual feedback
  - Requires microphone and accessibility permissions

- **Frontend/API** (`/frontend/`): Next.js application with API routes
  - RESTful API at `/api/v1/` using Next.js API routes
  - Supports M4A, MP3, WAV, OGG, WEBM audio formats
  - Async processing with proper error handling
  - Integrated frontend and backend in single Next.js app

## Essential Commands

### Frontend/API Development

```bash
cd frontend

# Setup
npm install        # Install dependencies
# Add GROQ_API_KEY to .env.local

# Development
npm run dev        # Start dev server (hot reload on :3000)

# Production
npm run build      # Build for production
npm run start      # Start production server

# Code Quality
npm run lint       # Run ESLint
```

### macOS App Development

Build via Xcode:
1. Open `macos-app/PolyVoice.xcodeproj`
2. Configure signing & capabilities
3. Build and run (requires macOS 12.0+)

## API Endpoints

- `GET /api/v1/health` - Health check with Groq configuration status
- `POST /api/v1/transcribe` - Audio transcription using Groq's Whisper model
  - Accepts multipart form data with `audio` file
  - Returns: `{"text": "transcribed text", "model_used": "distil-whisper-large-v3-en", "processing_time_ms": 1500, "estimated_cost": 0.003, "estimated_minutes": 1.0}`

## Testing Approach

Currently no automated tests exist. When implementing tests:
- TypeScript: Use Jest or Vitest for API route tests
- Swift: Use XCTest for macOS app tests
- API: Test with curl or httpie

## Environment Configuration

Frontend requires `.env.local` file:
```
GROQ_API_KEY=your-groq-api-key
```

## Key Implementation Details

- Audio recording uses M4A format (MPEG-4 AAC)
- Next.js API routes handle temporary file cleanup automatically
- API uses proper HTTP status codes and error messages
- macOS app connects to Next.js API on port 3000
- macOS app requires entitlements for microphone and accessibility