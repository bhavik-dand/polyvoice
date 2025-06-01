"""
Uvicorn configuration file for PolyVoice Transcription API
Production-ready settings with proper logging and performance optimizations.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Basic server configuration
bind = f"0.0.0.0:{os.getenv('PORT', 6000)}"
workers = int(os.getenv('WORKERS', 1))

# Application settings
app = "main:app"
worker_class = "uvicorn.workers.UvicornWorker"

# Performance settings
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
preload_app = True
keepalive = 5

# Logging configuration
loglevel = os.getenv('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr

# Security settings
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

# Development vs Production settings
if os.getenv('ENVIRONMENT', 'development').lower() == 'production':
    # Production settings
    workers = max(2, int(os.getenv('WORKERS', 2)))
    worker_connections = 2000
    max_requests = 2000
    preload_app = True
    
    # Disable reload in production
    reload = False
else:
    # Development settings
    workers = 1
    reload = True
    reload_dirs = ["."]
    reload_includes = ["*.py"]