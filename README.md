# AI Interview Agent — Integrated Real-Time System
**Lead Architect & Team Lead:** Prajeeth  
**Primary Real-Time Voice Engine:** Amazon Bedrock — Amazon Nova 2 Sonic (`amazon.nova-2-sonic-v1:0`)

An AI-powered mock interview platform that analyzes candidate resumes, conducts full-duplex conversational mock interviews with real-time speech-to-speech interaction, and generates detailed performance scorecards and coach feedback.

---

## 🏛️ System Architecture

Our platform utilizes **Amazon Nova 2 Sonic** as the primary real-time voice and conversation engine:

```text
Browser Microphone (16kHz PCM)
       │
       ▼ (WebSocket streaming)
FastAPI Backend
       │
       ▼ (Bidirectional HTTP/2 CRT Duplex Stream)
Amazon Bedrock: Nova 2 Sonic (amazon.nova-2-sonic-v1:0)
       │
       ▼ (Real-Time 24kHz Audio Chunks + Interim Transcripts)
FastAPI Backend
       │
       ▼ (WebSocket streaming)
Browser Audio Player (Low-latency Web Audio API)
```

### Key Capabilities
- **Bidirectional Streaming**: Single unified speech-to-speech connection handling audio input, conversational reasoning, response generation, and audio output.
- **Native Turn-Taking & Interruption (Barge-In)**: Automatically detects when the candidate interrupts and truncates interviewer speech.
- **8-Minute Stream Renewal**: Proactively renews the Bedrock duplex connection before the 8-minute limit while preserving conversation history and interview context.
- **Resilient Fallback Mode**: When AWS credentials are not configured, provides local real-time emulation for local testing and validation.
- **Background Coach Agent**: Preserves non-blocking post-turn candidate evaluation and scoring without impeding the real-time voice pipeline.

---

## ⚙️ Environment Configuration

Configure `backend/.env`:

```env
# Google Gemini (Summary & Coaching)
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_MODEL_NAME=gemini-2.5-flash-lite-preview-06-17

# Amazon Bedrock: Nova 2 Sonic Real-Time Voice Engine
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
NOVA_SONIC_MODEL_ID=amazon.nova-2-sonic-v1:0
NOVA_SONIC_VOICE_ID=arjun

# Database & Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
USE_MOCK_AUTH=true
```

---

## 🚀 Running Locally

```bash
# 1. Backend Server (FastAPI)
cd integrated-interview-agent
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 2. Frontend Development Server (React / Vite)
cd integrated-interview-agent/frontend
npm run dev -- --port 8080
```

---

## 🧪 Verification & Acceptance Testing

```bash
# Run Nova Sonic WebSocket E2E validation (greeting, speech, barge-in, renewal)
cd integrated-interview-agent/backend
python test_voice_engine.py

# Verify backend health diagnostics
curl http://127.0.0.1:8000/health
```
