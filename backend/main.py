"""
PolyVoice FastAPI Transcription Service
A modern, versioned API for audio transcription using OpenAI's GPT models.

API Endpoints:
- GET /api/v1/health - Health check with configuration status
- POST /api/v1/transcribe - Audio transcription service
"""

import os
import tempfile
import time
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import OpenAI
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Supported audio formats
SUPPORTED_FORMATS = {'.m4a', '.mp3', '.wav', '.ogg', '.webm'}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown tasks."""
    # Startup
    print("🚀 PolyVoice Transcription API starting up...")
    if not os.getenv('OPENAI_API_KEY'):
        print("⚠️  WARNING: OPENAI_API_KEY not found in environment")
    else:
        print("✅ OpenAI API key loaded successfully")
    
    yield
    
    # Shutdown
    print("🛑 PolyVoice Transcription API shutting down...")


# Create FastAPI app with versioning
app = FastAPI(
    title="PolyVoice Transcription API",
    description="A FastAPI-based transcription service using OpenAI's GPT models",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for responses
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    openai_configured: bool


class TranscriptionResponse(BaseModel):
    text: str
    model_used: str
    processing_time_ms: int
    estimated_cost: float
    estimated_minutes: float


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


# API v1 routes with /api/v1 prefix
@app.get("/api/v1/health", response_model=HealthResponse, tags=["API v1"])
async def health_check():
    """
    Health check endpoint to verify API status and configuration.
    """
    return HealthResponse(
        status="healthy",
        service="PolyVoice Transcription API",
        version="1.0.0",
        openai_configured=bool(os.getenv('OPENAI_API_KEY'))
    )


@app.post("/api/v1/transcribe", response_model=TranscriptionResponse, tags=["API v1"])
async def transcribe_audio_v1(audio: UploadFile = File(...)):
    """
    Transcribe audio file to text using OpenAI's GPT-4o-mini-transcribe model.
    
    - **audio**: Audio file in M4A, MP3, WAV, OGG, or WEBM format
    - Returns transcription with metadata including processing time and cost estimates
    """
    print("=== V1 TRANSCRIBE ENDPOINT CALLED ===")
    
    try:
        # Validate file presence
        if not audio.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No audio file provided"
            )
        
        print(f"📁 Processing file: {audio.filename}")
        print(f"📋 Content type: {audio.content_type}")
        
        # Validate file format
        file_extension = None
        if audio.filename:
            file_extension = '.' + audio.filename.split('.')[-1].lower()
            if file_extension not in SUPPORTED_FORMATS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported audio format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
                )
        
        if not file_extension:
            file_extension = '.m4a'  # Default for PolyVoice app
        
        print(f"🎵 Using file extension: {file_extension}")
        
        # Read audio data
        audio_data = await audio.read()
        if not audio_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio file"
            )
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
            print(f"💾 Saved to temporary file: {temp_file_path}")
        
        try:
            # Calculate estimates
            file_size_mb = len(audio_data) / (1024 * 1024)
            estimated_minutes = max(file_size_mb / 0.5, 0.1)  # Rough estimate, minimum 0.1 minutes
            print(f"📊 File size: {file_size_mb:.2f}MB, Estimated duration: {estimated_minutes:.2f} minutes")
            
            # Start transcription
            start_time = time.time()
            print("🎯 Starting OpenAI transcription with gpt-4o-mini-transcribe...")
            
            with open(temp_file_path, 'rb') as audio_file_handle:
                transcription = client.audio.transcriptions.create(
                    file=audio_file_handle,
                    model="gpt-4o-mini-transcribe",
                    response_format="json"
                )
            
            # Calculate processing metrics
            end_time = time.time()
            processing_time_ms = int((end_time - start_time) * 1000)
            estimated_cost = estimated_minutes * 0.003  # $0.003 per minute estimate
            
            print(f"✅ Transcription completed: '{transcription.text}'")
            print(f"⏱️  Processing time: {processing_time_ms}ms")
            
            result = TranscriptionResponse(
                text=transcription.text,
                model_used="gpt-4o-mini-transcribe",
                processing_time_ms=processing_time_ms,
                estimated_cost=round(estimated_cost, 6),
                estimated_minutes=round(estimated_minutes, 2)
            )
            
            print(f"📤 Returning result: {result.text[:50]}...")
            return result
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                print("🗑️ Temporary file cleaned up")
                
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler with structured error responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=f"HTTP {exc.status_code}"
        ).dict()
    )


@app.exception_handler(500)
async def internal_server_error_handler(request, exc):
    """Handle internal server errors."""
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail="An unexpected error occurred"
        ).dict()
    )


if __name__ == "__main__":
    port = int(os.getenv('PORT', 6000))
    print(f"🌐 Starting PolyVoice Transcription API on port {port}")
    print(f"📖 API Documentation available at: http://localhost:{port}/docs")
    print(f"📚 ReDoc available at: http://localhost:{port}/redoc")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )