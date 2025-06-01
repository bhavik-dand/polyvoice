# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PolyVoice is a macOS productivity app that enables system-wide voice-to-text. Users hold the `fn` key to record audio, which is transcribed via a FastAPI backend using OpenAI's GPT-4o-mini-transcribe model.

## Architecture

- **macOS App** (`/macos-app/`): Swift/SwiftUI native app
  - `FnKeyMonitor`: Monitors fn key events using IOKit
  - `AudioRecorder`: AVAudioRecorder-based recording to M4A format
  - `VoiceVisualizerWindow`: NSWindow subclass for visual feedback
  - Requires microphone and accessibility permissions

- **Backend API** (`/backend/`): FastAPI service
  - RESTful API at `/api/v1/`
  - Supports M4A, MP3, WAV, OGG, WEBM audio formats
  - Async processing with proper error handling
  - OpenAPI docs at `/docs`

## Essential Commands

### Backend Development

```bash
cd backend

# Setup
make install        # Install dependencies
cp .env.example .env  # Configure environment (add OPENAI_API_KEY)

# Development
make dev           # Start dev server (hot reload on :6000)
make docs          # Open API documentation

# Production
make prod          # Start production server
make restart       # Restart server
make status        # Check server status

# Code Quality
make lint          # Run flake8 (install separately)
make format        # Run black (install separately)

# Testing
make test-api      # Basic API endpoint tests
```

### macOS App Development

Build via Xcode:
1. Open `macos-app/PolyVoice.xcodeproj`
2. Configure signing & capabilities
3. Build and run (requires macOS 12.0+)

## API Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/transcribe` - Audio transcription
  - Accepts multipart form data with `audio` file
  - Returns: `{"text": "transcribed text", "duration": 0.5}`

## Testing Approach

Currently no automated tests exist. When implementing tests:
- Python: Use pytest for backend tests
- Swift: Use XCTest for macOS app tests
- API: Test with curl or httpie

## Environment Configuration

Backend requires `.env` file:
```
OPENAI_API_KEY=your-api-key
PORT=6000  # Optional, defaults to 6000
```

## Key Implementation Details

- Audio recording uses M4A format (MPEG-4 AAC)
- Backend handles temporary file cleanup automatically
- API uses proper HTTP status codes and error messages
- macOS app requires entitlements for microphone and accessibility