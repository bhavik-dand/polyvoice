#!/usr/bin/env python3
"""
Production-ready startup script for PolyVoice Transcription API
Uses uvicorn with optimized settings for production deployment.
"""

import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    """Start the PolyVoice API server with uvicorn."""
    port = int(os.getenv('PORT', 6000))
    host = os.getenv('HOST', '0.0.0.0')
    workers = int(os.getenv('WORKERS', 1))
    reload = os.getenv('RELOAD', 'false').lower() == 'true'
    log_level = os.getenv('LOG_LEVEL', 'info').lower()
    
    print(f"🚀 Starting PolyVoice Transcription API")
    print(f"🌐 Host: {host}:{port}")
    print(f"👥 Workers: {workers}")
    print(f"🔄 Reload: {reload}")
    print(f"📝 Log Level: {log_level}")
    print(f"📖 API Documentation: http://{host if host != '0.0.0.0' else 'localhost'}:{port}/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        workers=workers,
        reload=reload,
        log_level=log_level,
        access_log=True,
        use_colors=True,
        loop="auto"
    )

if __name__ == "__main__":
    main()