# PolyVoice

A macOS productivity app that helps users speak instead of typing.

## Project Structure

```
polyvoice/
├── macos-app/          # macOS app (Swift/SwiftUI)
├── backend/            # Python backend API
├── shared/             # Shared schemas and configurations
├── docs/               # Documentation
└── scripts/            # Build and deployment scripts
```

## Development

### macOS App
- Open `macos-app/PolyVoice.xcodeproj` in Xcode
- Requires macOS 12.0+ and Xcode 14+

### Backend
- Python-based API server
- Requirements in `backend/requirements.txt`

## Getting Started

1. Clone the repository
2. Set up the backend: `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
3. Open the macOS app in Xcode from `macos-app/`