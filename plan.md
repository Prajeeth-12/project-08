# Module 2: AI Interview Agent — V1 Team Execution Plan
**Author:** Prajeeth (Team Lead & Lead Architect)
**Module:** AI-Powered Mock Interview System
**Date:** September 23, 2026
**Target:** V1 Backend — Complete working AI interview product

---

## 1. What We're Building

An AI mock interview system where a user can: register/login, configure an interview (role, JD, resume, style, difficulty, duration), conduct a voice interview with an adaptive AI interviewer, receive per-turn coaching in real time, end the interview and get a final summary with scores, strengths, weaknesses, improvement plan, and curated learning resources.

### Architecture

```
FastAPI Backend (Python 3.11)
├── Supabase PostgreSQL (auth, persistence, RLS)
├── Google Gemini via LangChain (AI engine)
├── Deepgram (real-time STT via WebSocket)
├── Amazon Polly (TTS with SSML + caching)
└── Serper API (learning resource search)
```

### Agent Loop: Observe → Reason → Decide → Act

```
Candidate speaks → Deepgram STT → Orchestrator receives text
  → Interviewer Agent generates adaptive follow-up
  → Coach Agent evaluates response quality per-turn
  → Polly TTS → Audio streamed back to candidate
```

---

## 2. 5-Member Team Split

Each member owns a complete feature layer. Dependencies flow downward.

```
A1 (Foundation)  ──  No dependencies, starts day 1
A2 (Auth + DB)   ──  No dependencies, starts day 1
A3 (LLM + AI)    ──  Depends on A1 config only
A4 (Voice)       ──  Depends on A2 auth
A5 (API + Glue)  ──  Depends on all above (starts last)
```

---

### Member A1 — Foundation & Config

**What they build:** App setup, config, utilities, middleware, session management.

**Files (28):**
```
backend/main.py                              — FastAPI app, lifespan, CORS, router registration
backend/config.py                            — App config, env loading, logger setup
backend/.env.example                         — Environment variable template
backend/requirements.txt                     — Python dependencies
backend/__init__.py                          — Package init

backend/middleware/__init__.py
backend/middleware/session_middleware.py      — Session auto-save middleware

backend/services/__init__.py                 — Service initialization (initialize_services)
backend/services/rate_limiting.py            — Token bucket rate limiter
backend/services/session_manager.py          — Thread-safe session registry

backend/utils/__init__.py
backend/utils/common.py                      — Shared utilities (timestamps, safe_get)
backend/utils/event_bus.py                   — Event bus for agent communication
backend/utils/time_manager.py                — Interview time tracking
backend/utils/file_utils.py                  — File handling utilities
backend/utils/file_validator.py              — File validation
backend/utils/llm_chain_processor.py         — LLM chain processing helpers
backend/utils/llm_utils.py                   — LLM output parsing utilities

backend/schemas/__init__.py
backend/schemas/session.py                   — Pydantic session models

backend/config/__init__.py
backend/config/file_processing_config.py     — File processing config
```

**PRs:**
| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(foundation): add FastAPI app setup, config, and env template` | main.py, config.py, .env.example, requirements.txt |
| 2 | `feat(foundation): add utilities, event bus, and session schemas` | All utils/ files, schemas/ |
| 3 | `feat(foundation): add middleware, rate limiter, and session registry` | middleware/, rate_limiting.py, session_manager.py |
| 4 | `test(foundation): add utility and config tests` | tests/utils/, tests/config/ |

**Tests:** `pytest tests/utils/ tests/config/ -v`

**Dependencies:** None. Starts day 1.

---

### Member A2 — Auth & Database

**What they build:** User authentication, Supabase database layer, schema, migrations, file upload.

**Files (8):**
```
backend/database/__init__.py
backend/database/db_manager.py               — Supabase client, CRUD operations
backend/database/mock_db_manager.py          — Mock DB for testing
backend/database/schema.sql                  — Full database schema + RLS policies
backend/database/migrations/001_update_to_time_based_interviews.sql

backend/api/__init__.py
backend/api/auth_api.py                      — Register, login, JWT, refresh, get_current_user
backend/api/file_processing_api.py           — Resume file upload (PDF/DOCX/TXT to text)
```

**PRs:**
| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(db): add Supabase database manager, schema, and migrations` | database/ folder |
| 2 | `feat(auth): add user registration, login, JWT, and refresh endpoints` | auth_api.py |
| 3 | `feat(upload): add resume file upload endpoint (PDF/DOCX/TXT)` | file_processing_api.py |
| 4 | `test(auth): add auth and database tests` | Tests for auth + DB |

**Tests:** `pytest tests/ -k "auth or db" -v`

**Dependencies:** None. Starts day 1.

---

### Member A3 — AI Interview Engine (LLM + Agents)

**What they build:** Core AI — LLM service, interviewer agent, coach agent, orchestrator, prompt templates, search integration.

**Files (29):**
```
backend/services/llm_service.py              — Google Gemini via LangChain

backend/agents/__init__.py
backend/agents/base.py                       — BaseAgent abstract class + AgentContext
backend/agents/config_models.py              — SessionConfig, InterviewStyle, difficulty
backend/agents/constants.py                  — Shared constants
backend/agents/interview_state.py            — InterviewState, InterviewPhase (4 phases)
backend/agents/interviewer.py                — InterviewerAgent (question gen, follow-ups)
backend/agents/agentic_coach.py              — AgenticCoachAgent (per-turn eval, resources)
backend/agents/orchestrator.py               — AgentSessionManager (lifecycle, routing)

backend/agents/templates/__init__.py
backend/agents/templates/interviewer_templates.py
backend/agents/templates/coach_templates.py

backend/agents/tools/__init__.py
backend/agents/tools/search_tool.py          — LearningResourceSearchTool

backend/services/search_service.py           — Serper web search
backend/services/search_helpers.py           — Resource classification + relevance scoring
backend/services/search_config.py            — Search API config
```

**PRs:**
| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(llm): add LLM service, base agent, config models, and constants` | llm_service.py, base.py, config_models.py, constants.py |
| 2 | `feat(agents): add interviewer agent with prompt templates` | interviewer.py, interviewer_templates.py |
| 3 | `feat(agents): add coach agent with search tool and templates` | agentic_coach.py, coach_templates.py, search_* |
| 4 | `feat(agents): add orchestrator and agent integration tests` | orchestrator.py + tests |

**Tests:** `pytest tests/agents/ tests/services/ -v`

**Dependencies:** Uses A1's config.py and utils. Can mock LLM for testing.

---

### Member A4 — Voice Pipeline (STT + TTS + WebSocket)

**What they build:** Real-time speech — Deepgram STT, Amazon Polly TTS, WebSocket transport.

**Files (13):**
```
backend/api/speech/__init__.py
backend/api/speech/stt_service.py            — Deepgram real-time STT
backend/api/speech/tts_service.py            — Amazon Polly TTS (SSML + caching)
backend/api/speech/connection_manager.py     — WebSocket connection lifecycle
backend/api/speech/deepgram_handlers.py      — Deepgram event handlers
backend/api/speech/websocket_processor.py    — WebSocket message processing

backend/api/speech_api.py                    — Speech API router (start, stop, status)
backend/api/speech_api_original.py           — Original speech API (reference)
```

**PRs:**
| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(voice): add STT service with Deepgram real-time transcription` | stt_service.py, deepgram_handlers.py |
| 2 | `feat(voice): add TTS service with Amazon Polly and SSML caching` | tts_service.py |
| 3 | `feat(voice): add WebSocket transport and speech API router` | connection_manager.py, websocket_processor.py, speech_api.py |
| 4 | `test(voice): add speech API and WebSocket tests` | Tests |

**Tests:** `pytest tests/api/ tests/test_deepgram.py tests/test_websocket_endpoint.py -v`

**Dependencies:** Uses A2's auth (get_current_user_optional). Starts week 2.

---

### Member A5 — Interview API & Integration

**What they build:** Interview API endpoints that wire everything together. The integration hub.

**Files (4, but heavy):**
```
backend/api/agent_api.py                     — All interview endpoints (15+):
                                             —   POST /sessions/create
                                             —   POST /sessions/{id}/message
                                             —   POST /sessions/{id}/end
                                             —   GET  /sessions/{id}/feedback
                                             —   GET  /sessions/{id}/final-summary
                                             —   GET  /sessions/{id}/conversation
                                             —   GET  /sessions/{id}/coach-feedback
                                             —   GET  /sessions/{id}/status
                                             —   POST /sessions/{id}/update-config
                                             —   GET  /sessions (list)
                                             —   DELETE /sessions/{id}
                                             —   + more

backend/BACKEND_DOCUMENTATION.md             — API documentation
```

**PRs:**
| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(api): add session create, message, and status endpoints` | Core interview flow |
| 2 | `feat(api): add feedback, coaching, and resource endpoints` | Per-turn feedback, coach, resources |
| 3 | `feat(api): add session management endpoints` | List, delete, config update, history |
| 4 | `feat(api): wire all routers in main.py and add integration tests` | Final wiring + integration |

**Tests:** `pytest tests/ -v` (runs everything — integration)

**Dependencies:** Depends on ALL above. Starts last.

---

## 3. PR Timeline

```
Week 1:  A1-PR1, A1-PR2, A2-PR1, A3-PR1
Week 2:  A1-PR3, A2-PR2, A3-PR2, A4-PR1
Week 3:  A1-PR4, A2-PR3, A3-PR3, A4-PR2
Week 4:  A2-PR4, A3-PR4, A4-PR3, A5-PR1
Week 5:  A4-PR4, A5-PR2, A5-PR3, A5-PR4
```

A1, A2, A3 work in parallel from day 1.
A4 starts week 2 (needs auth).
A5 starts week 4 (needs agents + voice ready).

---

## 4. Branching & Git Workflow

```
main
 └── develop
      └── team-a/integration          ← all PRs target here
           ├── feat/a1-foundation
           ├── feat/a2-auth-database
           ├── feat/a3-ai-engine
           ├── feat/a4-voice-pipeline
           └── feat/a5-interview-api
```

### For teammates:

```bash
# Clone and checkout your branch
git clone https://github.com/Prajeeth-12/project-08.git
cd project-08
git checkout feat/a1-foundation   # (or a2, a3, a4, a5)

# Work on your assigned files only
# Stage ONLY your files (never git add . or git add -A)
git add backend/utils/common.py backend/utils/event_bus.py
git commit -m "feat(foundation): add shared utilities and event bus"
git push origin feat/a1-foundation

# Open PR targeting team-a/integration
```

### PR checklist:
1. Summary of what the PR adds
2. Terminal output showing passing pytest results
3. Only your assigned files — never touch other members' files

---

## 5. Local Setup

```bash
# Python environment
cd backend
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Fill in: GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_KEY, DEEPGRAM_API_KEY, AWS keys

# Run your tests
pytest tests/utils/ -v           # A1
pytest tests/ -k "auth" -v       # A2
pytest tests/agents/ -v          # A3
pytest tests/api/ -v             # A4
pytest tests/ -v                 # A5 (everything)
```
