# PolyVoice Transcription API

A modern FastAPI-based transcription service that uses OpenAI's GPT-4o-mini-transcribe model to convert audio files to text. Features proper API versioning, comprehensive documentation, and robust error handling.

## Features

- 🚀 **FastAPI Framework**: Modern, fast, and automatically documented
- 📝 **API Versioning**: Proper v1 endpoints with backward compatibility
- 📊 **Interactive Documentation**: Auto-generated OpenAPI docs at `/docs`
- 🛡️ **Error Handling**: Structured error responses with proper HTTP status codes
- 🎵 **Multi-format Support**: M4A, MP3, WAV, OGG, WEBM audio formats
- ⚡ **Async Processing**: Non-blocking audio transcription
- 🔍 **Health Monitoring**: Comprehensive health check endpoints

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to the `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=6000
```

## Running the API

### Quick Start (Development)
```bash
# Using the main script (recommended for development)
python3 main.py

# Or using Make commands
make dev
```

### Production Deployment

**Option 1: Using the optimized start script**
```bash
python3 start.py
```

**Option 2: Direct uvicorn with custom settings**
```bash
uvicorn main:app --host 0.0.0.0 --port 6000 --workers 2
```

**Option 3: Using Make commands**
```bash
make prod          # Uses start.py with environment-based config
make prod-uvicorn  # Direct uvicorn with production settings
```

**Option 4: Using configuration file**
```bash
gunicorn main:app -c uvicorn.conf.py  # Requires: pip install gunicorn
```

### Environment Configuration

Copy and customize the environment file:
```bash
cp .env.example .env
# Edit .env with your settings
```

Available environment variables:
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Server port (default: 6000)
- `HOST` - Server host (default: 0.0.0.0)
- `WORKERS` - Number of worker processes (default: 1)
- `RELOAD` - Enable hot reload for development (default: true)
- `LOG_LEVEL` - Logging level: debug, info, warning, error (default: info)
- `ENVIRONMENT` - Environment mode: development, production (default: development)

### Make Commands

The project includes a Makefile for convenient commands:

```bash
make help      # Show all available commands
make install   # Install dependencies
make dev       # Start development server
make prod      # Start production server
make docs      # Open API documentation
make stop      # Stop running server
make restart   # Restart server
make status    # Check if server is running
make clean     # Clean up temporary files
```

The API will start on `http://localhost:6000`

## API Documentation

- **Interactive Docs**: http://localhost:6000/docs
- **ReDoc**: http://localhost:6000/redoc

## API Endpoints

### Health Check
- **GET** `/api/v1/health`
- Returns comprehensive service status including OpenAI configuration

```json
{
  "status": "healthy",
  "service": "PolyVoice Transcription API",
  "version": "1.0.0",
  "openai_configured": true
}
```

### Transcribe Audio
- **POST** `/api/v1/transcribe`
- Accepts multipart/form-data with an `audio` file
- Supports M4A, MP3, WAV, OGG, WEBM formats
- Returns JSON with transcription text and detailed metadata

**Request:**
```bash
curl -X POST "http://localhost:6000/api/v1/transcribe" \
     -F "audio=@recording.m4a"
```

**Response:**
```json
{
  "text": "Hello, this is a test transcription.",
  "model_used": "gpt-4o-mini-transcribe",
  "processing_time_ms": 1500,
  "estimated_cost": 0.003,
  "estimated_minutes": 1.0
}
```

**Error Response:**
```json
{
  "error": "Unsupported audio format",
  "detail": "HTTP 400"
}
```

## API Versioning

The API uses modern RESTful versioning with the `/api/v1/` prefix:

- **Health Check**: `/api/v1/health`
- **Transcription**: `/api/v1/transcribe`

This structure makes it easy to add future API versions (v2, v3, etc.) while maintaining clean separation.

## Usage with PolyVoice App

The macOS PolyVoice app automatically sends recorded M4A files to this API when you release the fn key. Transcriptions are automatically typed at the current cursor location using AppleScript automation.

## Development

### Project Structure
```
backend/
├── main.py              # FastAPI application
├── start.py             # Production-ready startup script
├── uvicorn.conf.py      # Uvicorn/Gunicorn configuration
├── requirements.txt     # Python dependencies
├── Makefile            # Development and deployment commands
├── .env.example        # Environment variables template
├── .env               # Environment variables (create from .env.example)
└── README.md           # This file
```

### Running Tests
```bash
# Install test dependencies
pip install pytest httpx

# Run tests (when test files are added)
pytest
```

## Error Handling

The API provides structured error responses with appropriate HTTP status codes:

- **400**: Bad Request (invalid file, unsupported format)
- **500**: Internal Server Error (transcription failures)

All errors include descriptive messages and details for debugging.