# PolyVoice Transcription API Makefile
# Convenient commands for development and deployment

.PHONY: help install dev prod clean test docs lint format

# Default target
help:
	@echo "🎯 PolyVoice Transcription API Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install    - Install dependencies"
	@echo "  make dev        - Start development server with hot reload"
	@echo "  make prod       - Start production server"
	@echo ""
	@echo "Utilities:"
	@echo "  make docs       - Open API documentation"
	@echo "  make test       - Run tests (when available)"
	@echo "  make test-api   - Test API endpoints"
	@echo "  make clean      - Clean up temporary files"
	@echo "  make lint       - Run code linting"
	@echo "  make format     - Format code"
	@echo ""
	@echo "Server Management:"
	@echo "  make stop       - Stop running server"
	@echo "  make restart    - Restart server"
	@echo "  make status     - Check server status"

# Installation
install:
	@echo "📦 Installing dependencies..."
	pip install -r requirements.txt

# Development server
dev:
	@echo "🚀 Starting development server with hot reload..."
	python3 main.py

# Production server using custom start script
prod:
	@echo "🏭 Starting production server..."
	python3 start.py

# Alternative production server using uvicorn directly
prod-uvicorn:
	@echo "🏭 Starting production server with uvicorn..."
	uvicorn main:app --host 0.0.0.0 --port 6000 --workers 2

# Alternative using gunicorn (if installed)
prod-gunicorn:
	@echo "🏭 Starting production server with gunicorn..."
	gunicorn main:app -c uvicorn.conf.py

# Documentation
docs:
	@echo "📖 Opening API documentation..."
	open http://localhost:6000/docs || echo "Server not running. Start with 'make dev' first."

# Testing (placeholder for future tests)
test:
	@echo "🧪 Running tests..."
	@echo "⚠️  No tests configured yet. Add pytest tests in the future."

# Cleanup
clean:
	@echo "🧹 Cleaning up..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache/
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/

# Code quality (if tools are installed)
lint:
	@echo "🔍 Running linter..."
	@command -v flake8 >/dev/null 2>&1 && flake8 . || echo "Install flake8 for linting: pip install flake8"

format:
	@echo "✨ Formatting code..."
	@command -v black >/dev/null 2>&1 && black . || echo "Install black for formatting: pip install black"

# Server management
stop:
	@echo "🛑 Stopping server on port 6000..."
	-lsof -ti:6000 | xargs kill -9
	@echo "✅ Server stopped"

restart: stop dev

status:
	@echo "🔍 Checking server status..."
	@curl -s http://localhost:6000/api/v1/health >/dev/null 2>&1 && \
		echo "✅ Server is running on port 6000" || \
		echo "❌ Server is not running on port 6000"

# Test API endpoints
test-api:
	@echo "🧪 Testing API endpoints..."
	@echo "Testing health endpoint:"
	@curl -s http://localhost:6000/api/v1/health | jq . || echo "Server not running or jq not installed"