# Transcription Strategy Implementation

This document explains how to use the new model-level strategy pattern for transcription services.

## Overview

The transcription API now supports multiple providers and models with automatic fallback functionality:

- **Groq**: Whisper Large v3, Whisper Large v3 Turbo, Distil Whisper Large v3
- **OpenAI**: Whisper-1, GPT-4o Mini Transcribe
- **Deepgram**: Nova 2, Nova 2 General, Nova (Legacy)
- **Gemini**: Flash 2.5 Thinking (with zero thinking budget), 2.0 Flash (optimized for speed), 2.0 Flash Lite (optimized for cost efficiency and low latency)

## Configuration

### Environment Variables

Set the transcription mode using the `TRANSCRIPTION_MODE` environment variable:

```bash
# In your .env.local file:
TRANSCRIPTION_MODE=default  # Options: default, speed_optimized, cost_optimized, quality_optimized, groq_only, deepgram_preferred, openai_preferred, gemini_preferred, gemini_2_0_focus, ultra_cost_optimized
```

### Available Modes

1. **`default`** (current behavior):
   ```
   groq-distil-whisper-large-v3 → groq-whisper-large-v3 → deepgram-nova-2 → openai-gpt-4o-mini-transcribe → openai-whisper-1
   ```

2. **`speed_optimized`** (fastest models first):
   ```
   groq-distil-whisper-large-v3 → gemini-2.0-flash-lite → groq-whisper-large-v3-turbo → gemini-2.0-flash → deepgram-nova-2 → openai-gpt-4o-mini-transcribe → groq-whisper-large-v3 → openai-whisper-1
   ```

3. **`cost_optimized`** (cheapest models first):
   ```
   groq-distil-whisper-large-v3 → gemini-2.0-flash-lite → gemini-2.0-flash → groq-whisper-large-v3-turbo → groq-whisper-large-v3 → openai-gpt-4o-mini-transcribe → deepgram-nova-2 → openai-whisper-1
   ```

4. **`quality_optimized`** (highest quality models first):
   ```
   groq-whisper-large-v3 → openai-whisper-1 → deepgram-nova-2 → openai-gpt-4o-mini-transcribe → groq-whisper-large-v3-turbo → groq-distil-whisper-large-v3
   ```

5. **`groq_only`** (only Groq models):
   ```
   groq-distil-whisper-large-v3 → groq-whisper-large-v3-turbo → groq-whisper-large-v3
   ```

6. **`deepgram_preferred`** (Deepgram first):
   ```
   deepgram-nova-2 → deepgram-nova-2-general → deepgram-nova → groq-whisper-large-v3 → openai-gpt-4o-mini-transcribe → openai-whisper-1
   ```

7. **`openai_preferred`** (OpenAI first, GPT-4o mini priority):
   ```
   openai-gpt-4o-mini-transcribe → openai-whisper-1 → groq-whisper-large-v3 → deepgram-nova-2 → groq-distil-whisper-large-v3
   ```

8. **`gemini_preferred`** (Gemini first):
   ```
   gemini-flash-25-thinking → gemini-2.0-flash → gemini-2.0-flash-lite → openai-gpt-4o-mini-transcribe → groq-whisper-large-v3 → deepgram-nova-2 → openai-whisper-1
   ```

9. **`gemini_2_0_focus`** (Gemini 2.0 Flash focused):
   ```
   gemini-2.0-flash → gemini-2.0-flash-lite → gemini-flash-25-thinking → groq-whisper-large-v3 → openai-gpt-4o-mini-transcribe → deepgram-nova-2
   ```

10. **`ultra_cost_optimized`** (Absolute cheapest models):
    ```
    gemini-2.0-flash-lite → groq-distil-whisper-large-v3 → gemini-2.0-flash → groq-whisper-large-v3-turbo → groq-whisper-large-v3 → openai-gpt-4o-mini-transcribe
    ```

## Required API Keys

Add the following API keys to your `.env.local` file:

```bash
# Required for current default behavior
GROQ_API_KEY=your_groq_api_key

# Optional for additional providers
OPENAI_API_KEY=your_openai_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
GEMINI_API_KEY=your_gemini_api_key
```

## How It Works

1. **Automatic Fallback**: If the primary model fails, the system automatically tries the next model in the priority list.

2. **Availability Check**: Before attempting transcription, the system checks if the required API key is available.

3. **Error Handling**: If all models in the priority list fail, the system returns a comprehensive error message.

4. **Logging**: The system logs which model was attempted and which one succeeded.

## Model Specifications

| Model | Provider | Cost/Min | Avg Speed | Max File Size |
|-------|----------|----------|-----------|---------------|
| groq-distil-whisper-large-v3 | Groq | $0.00002 | 0.1s/min | 25MB |
| groq-whisper-large-v3-turbo | Groq | $0.00004 | 0.15s/min | 25MB |
| groq-whisper-large-v3 | Groq | $0.00006 | 0.3s/min | 25MB |
| openai-whisper-1 | OpenAI | $0.006 | 2.0s/min | 25MB |
| openai-gpt-4o-mini-transcribe | OpenAI | $0.0015 | 1.5s/min | 25MB |
| deepgram-nova-2 | Deepgram | $0.0043 | 0.5s/min | 2000MB |
| deepgram-nova-2-general | Deepgram | $0.0043 | 0.5s/min | 2000MB |
| deepgram-nova | Deepgram | $0.0043 | 0.7s/min | 2000MB |
| gemini-flash-25-thinking | Gemini | $0.001 | 2.0s/min | 20MB |
| gemini-2.0-flash | Gemini | $0.0005 | 1.5s/min | 20MB |
| gemini-2.0-flash-lite | Gemini | $0.0003 | 1.0s/min | 20MB |

## Response Changes

The API response now includes additional fields:

```json
{
  "text": "transcribed text",
  "model_used": "groq-distil-whisper-large-v3-en",
  "processing_time_ms": 1500,
  "estimated_cost": 0.00002,
  "estimated_minutes": 1.0,
  "user_id": "user_123",
  "formatting_applied": true,
  "rate_limit": {
    "remaining": 99,
    "reset_time": 1234567890,
    "limit": 100
  }
}
```

The `model_used` field now reflects the actual model that successfully processed the transcription, which may be different from the primary model if fallbacks were used.

## Switching Configurations

To switch between configurations, simply change the `TRANSCRIPTION_MODE` environment variable and restart your application:

```bash
# For development
TRANSCRIPTION_MODE=speed_optimized npm run dev

# For production
TRANSCRIPTION_MODE=quality_optimized npm run start

# To test GPT-4o mini transcribe specifically
TRANSCRIPTION_MODE=openai_preferred npm run dev

# To test Gemini 2.5 flash thinking specifically
TRANSCRIPTION_MODE=gemini_preferred npm run dev

# To test Gemini 2.0 Flash specifically
TRANSCRIPTION_MODE=gemini_2_0_focus npm run dev

# To test ultra cost-optimized models (Gemini 2.0 Flash Lite first)
TRANSCRIPTION_MODE=ultra_cost_optimized npm run dev
```

## Adding New Models

To add a new transcription model:

1. Create a new strategy class implementing `TranscriptionModelStrategy`
2. Register it in the `TranscriptionStrategyManager` constructor
3. Add the model key to the `ModelKey` type
4. Include it in the desired configuration arrays in `transcription-config.ts`