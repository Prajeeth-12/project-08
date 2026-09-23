# V1 -- Core Product Foundation
**By: Prajeeth**

---

## Objective

Establish a complete, working AI interview product using the Base project's strongest existing functionality. A user can configure an interview, conduct it with voice, receive coaching feedback, and get a final summary with learning resources. Authentication works. Data persists. The product is deployable.

---

## What V1 Delivers

A user can: register/login, configure an interview (role, JD, resume, style, difficulty, duration), conduct a voice interview with an adaptive AI interviewer, receive per-turn coaching in real time, end the interview and get a final summary with scores, strengths, weaknesses, improvement plan, and curated learning resources.

---

## Features Included

### Foundation Layer

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| FastAPI backend setup | Base | backend/main.py | Foundation | Port to integrated project |
| CORS, middleware, structured logging | Base | backend/main.py | Foundation | Port as-is |
| Supabase PostgreSQL database | Base | backend/database/db_manager.py, schema.sql | Production persistence from day 1 | Port + verify |
| Docker deployment | Base | Dockerfile, start.sh | Production deploy | Port as-is |
| Service warmup on startup | Base | backend/main.py | Reduce cold-start latency | Port as-is |

### Authentication

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| User auth (register, login, JWT, refresh) | Base | backend/api/auth_api.py | Users need accounts | Port as-is |
| Row Level Security policies | Base | backend/database/schema.sql | Data isolation | Port with schema |
| Auth API endpoints (5) | Base | backend/api/auth_api.py | User management | Port as-is |

### Interview Configuration

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| Session config (role, JD, resume, style, difficulty, duration) | Base | backend/agents/config_models.py | Core customization | Port as-is |
| Interview styles (Formal/Casual/Aggressive/Technical) | Base | backend/agents/config_models.py | User customization | Port as-is |
| Time-based interview management | Base | backend/utils/time_manager.py | Session pacing | Port as-is |
| Resume file upload (PDF/DOCX/TXT to text) | Base | backend/api/file_processing_api.py | Resume input | Port as-is |

### AI Interview Engine

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| Multi-agent orchestrator | Base | backend/agents/orchestrator.py | Core agent pattern | Port as-is |
| Interviewer agent (LangChain + Gemini) | Base | backend/agents/interviewer.py | Core interview capability | Port as-is |
| Interview state (4 phases) | Base | backend/agents/interview_state.py | Session state tracking | Port as-is |
| LLM service (Google Gemini via LangChain) | Base | backend/services/llm_service.py | All AI calls | Port as-is |
| Prompt templates (interviewer + coach) | Base | backend/agents/templates/ | Question/evaluation quality | Port as-is |
| Event bus | Base | backend/utils/event_bus.py | Agent communication | Port as-is |

### Coaching & Evaluation

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| Coach agent (per-turn eval + final summary) | Base | backend/agents/agentic_coach.py | Coaching feedback | Port as-is |
| Web search (Serper) for learning resources | Base | backend/services/search_service.py, search_helpers.py | Post-interview resources | Port as-is |
| Resource classification + relevance scoring | Base | backend/services/search_helpers.py | Quality resources | Port as-is |
| Search tool for coach agent | Base | backend/agents/tools/search_tool.py | Coach uses search | Port as-is |

### Voice

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| Deepgram real-time STT (WebSocket) | Base | backend/api/speech/stt_service.py | Voice input | Port as-is |
| Amazon Polly TTS (SSML + caching) | Base | backend/api/speech/tts_service.py | Voice output | Port as-is |
| Speech WebSocket endpoint | Base | backend/api/speech_api.py | Voice transport | Port as-is |
| Speech API endpoints (3) | Base | backend/api/speech_api.py | Voice API | Port as-is |

### Session Management

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| Rate limiting (token bucket) | Base | backend/services/rate_limiting.py | API protection | Port as-is |
| Thread-safe session registry | Base | backend/services/session_manager.py | Multi-session support | Port as-is |
| Session auto-save middleware | Base | backend/middleware/session_middleware.py | Persistence reliability | Port as-is |

### API Endpoints

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| All interview API endpoints (15+) | Base | backend/api/agent_api.py | Core API | Port as-is |
| Health check + metrics endpoints | Base | backend/main.py | Monitoring | Port as-is |

### Frontend

| Feature | Source | Source Path | Why V1 | Work |
|---------|--------|------------|--------|------|
| React frontend (interview config, voice panel, coaching, results, auth) | Base | frontend/src/ | User-facing product | Port as-is |

---

## Features Explicitly Deferred from V1

| Feature | Why deferred |
|---------|-------------|
| Structured resume parsing (M2) | Base's raw-text-to-prompt works for V1. Structured parsing adds complexity without changing core flow |
| Interview blueprints (M2) | Base generates questions via LLM directly. Blueprints add planning layer not needed for V1 |
| ORDA agent loop (M2) | Base's LLM-driven agent works. ORDA is an architectural change requiring careful integration |
| Probing taxonomy (M2) | Base's LLM handles follow-ups. Structured probing is V3 sophistication |
| Quality gate (M2) | Base trusts LLM quality. Gate adds filtering complexity |
| Numeric scoring rubric (M2) | Base's qualitative scoring works. Numeric rubric is a scoring system rewrite |
| Integrity guardrails (M2) | Only useful after numeric scoring exists |
| Cross-session scorecards (M2) | Requires user accounts + multiple sessions first. V1 establishes accounts, V3 adds cross-session |
| WebSocket interview (M2) | Base uses REST per-turn. WebSocket is an API pattern change -- evaluate in V2 |
| Next.js frontend (M2) | Base's React SPA works. Framework migration is separate from feature work |

---

## Completion Criteria

- User can register, login, and maintain a session
- User can configure interview (role, JD, resume, style, difficulty, duration)
- AI interviewer conducts adaptive voice interview with Gemini
- Per-turn coaching feedback displayed during interview
- Final summary generated with scores, strengths, weaknesses, improvement plan
- Learning resources found via web search and presented
- Session data persists to Supabase
- Docker container builds and runs
- All Base project tests pass in integrated project
