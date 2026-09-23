# V1 Backend -- 5-Member Team Split
**By: Prajeeth**

---

## How This Split Works

Each member owns a complete feature layer. The dependency flows downward -- members at the bottom can start first, members at the top build on what's below. Each member makes 3-4 PRs to incrementally build their feature.

```
A1 (Foundation)  ──  No dependencies, starts day 1
A2 (Auth + DB)   ──  No dependencies, starts day 1
A3 (LLM + AI)    ──  Depends on A1 config only
A4 (Voice)       ──  Depends on A2 auth
A5 (API + Glue)  ──  Depends on all above (starts last, wires everything together)
```

---

## Member A1 -- Foundation & Config

**What they build:** App setup, config, utilities, middleware, session management -- the base everything else runs on.

### Files

```
backend/main.py                              -- FastAPI app, lifespan, CORS, router registration
backend/config.py                            -- App config, env loading, logger setup
backend/.env.example                         -- Environment variable template
backend/requirements.txt                     -- Python dependencies
backend/__init__.py                          -- Package init

backend/middleware/__init__.py               -- Package init
backend/middleware/session_middleware.py      -- Session auto-save middleware

backend/services/__init__.py                 -- Service initialization (initialize_services)
backend/services/rate_limiting.py            -- Token bucket rate limiter
backend/services/session_manager.py          -- Thread-safe session registry

backend/utils/__init__.py                    -- Package init
backend/utils/common.py                      -- Shared utilities (timestamps, safe_get)
backend/utils/event_bus.py                   -- Event bus for agent communication
backend/utils/time_manager.py                -- Interview time tracking
backend/utils/file_utils.py                  -- File handling utilities
backend/utils/file_validator.py              -- File validation
backend/utils/llm_chain_processor.py         -- LLM chain processing helpers
backend/utils/llm_utils.py                   -- LLM output parsing utilities

backend/schemas/__init__.py                  -- Package init
backend/schemas/session.py                   -- Pydantic session models

backend/config/__init__.py                   -- Package init
backend/config/file_processing_config.py     -- File processing config
```

**Total: 22 files**

### PRs

| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(foundation): add FastAPI app setup, config, and env template` | main.py skeleton (no routers yet), config.py, .env.example, requirements.txt |
| 2 | `feat(foundation): add utilities, event bus, and session schemas` | All utils/ files, schemas/, event bus |
| 3 | `feat(foundation): add middleware, rate limiter, and session registry` | middleware/, rate_limiting.py, session_manager.py, services/__init__.py |
| 4 | `test(foundation): add utility and config tests` | tests/utils/, tests/config/ |

### Tests they own
```
backend/tests/utils/__init__.py
backend/tests/utils/test_common.py
backend/tests/utils/test_file_validator.py
backend/tests/utils/test_llm_chain_processor.py
backend/tests/config/__init__.py
backend/tests/config/test_file_processing_config.py
```

### Dependencies
None. This is the foundation. Starts day 1.

---

## Member A2 -- Auth & Database

**What they build:** User authentication (register, login, JWT), database layer (Supabase), schema, migrations, file upload endpoint.

### Files

```
backend/database/__init__.py                 -- Package init
backend/database/db_manager.py               -- Supabase client, CRUD operations
backend/database/mock_db_manager.py          -- Mock DB for testing
backend/database/schema.sql                  -- Full database schema + RLS policies
backend/database/migrations/001_update_to_time_based_interviews.sql  -- Migration

backend/api/__init__.py                      -- Package init
backend/api/auth_api.py                      -- Register, login, JWT, refresh, get_current_user
backend/api/file_processing_api.py           -- Resume file upload (PDF/DOCX/TXT to text)
```

**Total: 8 files**

### PRs

| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(db): add Supabase database manager, schema, and migrations` | database/ folder -- db_manager.py, mock, schema.sql, migration |
| 2 | `feat(auth): add user registration, login, JWT, and refresh endpoints` | auth_api.py with all 5 auth endpoints |
| 3 | `feat(upload): add resume file upload endpoint (PDF/DOCX/TXT)` | file_processing_api.py |
| 4 | `test(auth): add auth and database tests` | Tests for auth + DB operations |

### Tests they own
```
(auth tests -- create new if not existing)
```

### Dependencies
None. Fully independent -- only uses Supabase SDK. Starts day 1.

---

## Member A3 -- AI Interview Engine (LLM + Agents)

**What they build:** The core AI -- LLM service, interviewer agent, coach agent, orchestrator, prompt templates, interview state, search integration.

### Files

```
backend/services/llm_service.py              -- Google Gemini via LangChain

backend/agents/__init__.py                   -- Package init
backend/agents/base.py                       -- BaseAgent abstract class + AgentContext
backend/agents/config_models.py              -- SessionConfig, InterviewStyle, difficulty
backend/agents/constants.py                  -- Shared constants
backend/agents/interview_state.py            -- InterviewState, InterviewPhase (4 phases)
backend/agents/interviewer.py                -- InterviewerAgent (question gen, follow-ups, adaptation)
backend/agents/agentic_coach.py              -- AgenticCoachAgent (per-turn eval, final summary, resources)
backend/agents/orchestrator.py               -- AgentSessionManager (lifecycle, routing, state)

backend/agents/templates/__init__.py         -- Package init
backend/agents/templates/interviewer_templates.py  -- Interviewer prompt templates
backend/agents/templates/coach_templates.py        -- Coach prompt templates

backend/agents/tools/__init__.py             -- Package init
backend/agents/tools/search_tool.py          -- LearningResourceSearchTool

backend/services/search_service.py           -- Serper web search
backend/services/search_helpers.py           -- Resource classification + relevance scoring
backend/services/search_config.py            -- Search API config
```

**Total: 17 files**

### PRs

| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(llm): add LLM service, base agent, config models, and constants` | llm_service.py, base.py, config_models.py, constants.py, interview_state.py |
| 2 | `feat(agents): add interviewer agent with prompt templates` | interviewer.py, interviewer_templates.py |
| 3 | `feat(agents): add coach agent with search tool and prompt templates` | agentic_coach.py, coach_templates.py, search_tool.py, search_service.py, search_helpers.py, search_config.py |
| 4 | `feat(agents): add orchestrator and agent integration tests` | orchestrator.py + tests |

### Tests they own
```
backend/tests/__init__.py
backend/tests/agents/__init__.py
backend/tests/agents/test_agentic_coach.py
backend/tests/agents/test_constants.py
backend/tests/agents/test_interview_state.py
backend/tests/agents/test_question_templates.py
backend/tests/agents/test_refactored_functionality.py
backend/tests/test_agentic_coach_integration.py
backend/tests/test_interviewer_fix.py
backend/tests/services/__init__.py
backend/tests/services/test_search_config.py
backend/tests/services/test_search_helpers.py
```

### Dependencies
Uses A1's config.py and utils. Can mock LLM for testing (no Gemini API key needed to run tests).

---

## Member A4 -- Voice Pipeline (STT + TTS + WebSocket)

**What they build:** Real-time speech -- Deepgram STT, Amazon Polly TTS, WebSocket transport, connection management.

### Files

```
backend/api/speech/__init__.py               -- Package init
backend/api/speech/stt_service.py            -- Deepgram real-time STT
backend/api/speech/tts_service.py            -- Amazon Polly TTS (SSML + caching)
backend/api/speech/connection_manager.py     -- WebSocket connection lifecycle
backend/api/speech/deepgram_handlers.py      -- Deepgram event handlers
backend/api/speech/websocket_processor.py    -- WebSocket message processing

backend/api/speech_api.py                    -- Speech API router (start, stop, status)
backend/api/speech_api_original.py           -- Original speech API (reference)
```

**Total: 8 files**

### PRs

| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(voice): add STT service with Deepgram real-time transcription` | stt_service.py, deepgram_handlers.py |
| 2 | `feat(voice): add TTS service with Amazon Polly and SSML caching` | tts_service.py |
| 3 | `feat(voice): add WebSocket transport, connection manager, and processor` | connection_manager.py, websocket_processor.py, speech_api.py |
| 4 | `test(voice): add speech API and WebSocket tests` | Tests |

### Tests they own
```
backend/tests/api/__init__.py
backend/tests/api/test_speech_api_helpers.py
backend/tests/test_deepgram.py
backend/tests/test_websocket_endpoint.py
```

### Dependencies
Uses A2's auth (get_current_user_optional for WebSocket auth). Can mock auth for testing.

---

## Member A5 -- Interview API & Integration

**What they build:** The interview API endpoints that wire everything together -- session create, message send, get feedback, end interview. Plus the main app router registration and the run script.

### Files

```
backend/api/agent_api.py                     -- All interview endpoints (15+):
                                             --   POST /sessions/create
                                             --   POST /sessions/{id}/message
                                             --   POST /sessions/{id}/end
                                             --   GET  /sessions/{id}/feedback
                                             --   GET  /sessions/{id}/final-summary
                                             --   GET  /sessions/{id}/conversation
                                             --   GET  /sessions/{id}/coach-feedback
                                             --   GET  /sessions/{id}/status
                                             --   POST /sessions/{id}/update-config
                                             --   GET  /sessions (list)
                                             --   DELETE /sessions/{id}
                                             --   GET  /sessions/{id}/resources
                                             --   POST /sessions/{id}/final-coaching
                                             --   + more

backend/BACKEND_DOCUMENTATION.md             -- API documentation
```

**Total: 2 files (but the heaviest -- agent_api.py is the integration hub)**

### PRs

| PR | Title | What it does |
|----|-------|-------------|
| 1 | `feat(api): add session create, message, and status endpoints` | Core interview flow -- create session, send message, get status |
| 2 | `feat(api): add feedback, coaching, and resource endpoints` | Per-turn feedback, coach feedback, final summary, learning resources |
| 3 | `feat(api): add session management endpoints (list, delete, config update)` | List sessions, delete, update config, conversation history |
| 4 | `feat(api): wire all routers in main.py and add integration tests` | Update main.py to register all routers, run integration tests, update API docs |

### Tests they own
```
backend/tests/run_refactoring_tests.py
(+ integration tests they create)
```

### Dependencies
Depends on everything -- A1 (foundation), A2 (auth + DB), A3 (agents), A4 (voice). Starts last, finishes last. This is the member who proves V1 works end-to-end.

---

## Summary

| Member | Feature | Files | Starts | Dependencies |
|--------|---------|-------|--------|-------------|
| A1 | Foundation & Config | 22 | Day 1 | None |
| A2 | Auth & Database | 8 | Day 1 | None |
| A3 | AI Interview Engine | 17 | Day 1 (mocks config) | A1 config |
| A4 | Voice Pipeline | 8 | Week 2 | A2 auth |
| A5 | Interview API | 2 (heavy) | Week 3 | All above |

**Total: 57 backend files across 5 members, 20 PRs total (4 per member)**

---

## Branching

```
main
 └── develop
      └── team-a/integration
           ├── feat/a1-foundation
           ├── feat/a2-auth-database
           ├── feat/a3-ai-engine
           ├── feat/a4-voice-pipeline
           └── feat/a5-interview-api
```

---

## PR Timeline

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

## How to Test

| Member | Command |
|--------|---------|
| A1 | `cd backend && pytest tests/utils/ tests/config/ -v` |
| A2 | `cd backend && pytest tests/ -k "auth or db" -v` |
| A3 | `cd backend && pytest tests/agents/ tests/services/ -v` |
| A4 | `cd backend && pytest tests/api/ tests/test_deepgram.py tests/test_websocket_endpoint.py -v` |
| A5 | `cd backend && pytest tests/ -v` (runs everything -- integration) |
