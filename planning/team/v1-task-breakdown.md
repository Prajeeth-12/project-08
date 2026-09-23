# Module 2: AI Interview Agent -- Version Plan & Task Breakdown
**By: Prajeeth**

---

## Current State

Our AI mock interview engine works end-to-end:
- Resume upload & parsing (PDF/DOCX/TXT -> skills + claims)
- Interview blueprint generation (engineering/PM/design)
- Live AI interview via WebSocket (agent loop: Observe -> Reason -> Decide -> Act)
- Post-interview evaluation (5-component scoring, coaching, prep list)
- Next.js frontend with all pages connected

Not built yet: auth, code editor, cloud LLM, vector embeddings.

---

## Three-Version Roadmap

| Version | Focus | What gets built |
|---------|-------|-----------------|
| **v1.0** | Foundation & Pipeline | Database, resume pipeline, LLM gateway, interview engine, evaluation -- each cleaned up and demo-ready |
| **v2.0** | Intelligence & Integration | Cloud LLM (Gemini/OpenAI), vector embeddings, improved scoring, full API integration, frontend polish |
| **v3.0** | Platform Features | Auth, code editor + Judge0, system design tool, voice, admin dashboard |

---

## Repo Folder Structure

This is how the main repo looks. Module 2 sits inside as one module alongside the shared project files.

```
project-08/                              <-- main repo (GitHub)
|
|-- CLAUDE.md                            <-- project-wide agent config
|-- AGENTS.md                            <-- agent rules
|-- GEMINI.md                            <-- gemini rules
|-- .gitignore
|
|-- module-2-ai-interview-agent/         <-- this module
|   |
|   |-- backend/                         <-- all Python backend code
|   |   |-- api/                         <-- FastAPI route handlers
|   |   |-- core/                        <-- interview engine (the brain)
|   |   |-- rag/                         <-- resume parsing & retrieval
|   |   |-- eval_engine/                 <-- scoring, coaching, reports
|   |   |-- llm/                         <-- LLM gateway, providers, prompts
|   |   |-- blueprint/                   <-- interview planning & role configs
|   |   |-- models/                      <-- database layer
|   |   |-- voice/                       <-- audio state management
|   |   |-- tests/                       <-- all backend tests
|   |   |-- config.py                    <-- app settings
|   |   |-- run.py                       <-- server entry point
|   |   |-- requirements.txt             <-- Python deps
|   |   |-- pytest.ini                   <-- test config
|   |
|   |-- frontend-app/                    <-- Next.js 16 frontend
|   |   |-- app/                         <-- pages (landing, interview, report, dashboard)
|   |   |-- components/                  <-- UI components (interview, report, layout, ui)
|   |   |-- lib/                         <-- API client, types
|   |   |-- public/                      <-- static assets
|   |   |-- package.json
|   |
|   |-- docs/                            <-- all documentation
|   |-- reference/                        <-- cloned repos, old code (not shipped)
|
|-- backend/                             <-- shared backend scaffold (future modules)
|   |-- api/
|   |-- models/
|   |-- tests/
|
|-- frontend/                            <-- shared frontend scaffold (future modules)
|   |-- components/
|       |-- team_a/
|       |-- team_b/
|
|-- planning/                            <-- project docs (gitignored, local only)
```

---

## Branching Strategy for V1.0

```
develop
  |-- team-a/integration
       |-- feat/a1-database-foundation
       |-- feat/a2-resume-pipeline
       |-- feat/a3-llm-gateway
       |-- feat/a4-interview-engine
       |-- feat/a5-eval-frontend
```

Each member works on their feature branch, opens PRs to `team-a/integration`. I review and merge. Once all 5 are merged, I merge `team-a/integration` into `develop`.

---

## V1.0 -- PR Breakdown Per Member

Each member splits their work into 3-4 PRs. This way each PR is reviewable, testable, and tells a clear story.

---

### A1: Database & Config Foundation

**Module:** `backend/models/` + `backend/config.py`

| PR # | Title | What it does | Files |
|------|-------|-------------|-------|
| PR 1 | `feat(db): add app config and database connection setup` | Sets up config.py with all app settings (ports, timeouts, LLM config). Creates async SQLite engine, session factory, Base class, and init_db(). | `backend/config.py`, `backend/models/__init__.py`, `backend/models/database.py` |
| PR 2 | `feat(db): define all ORM table schemas` | Creates all table definitions -- sessions, blueprints, reports, turns, scorecards. Pydantic models for each. | `backend/models/tables.py` |
| PR 3 | `feat(db): add scorecard store and cross-session persistence` | Implements CRUD operations for cross-session scorecards. Stores candidate performance history across multiple interviews. | `backend/models/scorecard_store.py` |
| PR 4 | `test(db): add persistence and cross-session tests` | Full test coverage for database operations, table creation, scorecard CRUD, edge cases. | `backend/tests/test_persistence.py`, `backend/tests/test_cross_session.py` |

---

### A2: Resume Intelligence Pipeline

**Module:** `backend/rag/` + `backend/api/resumes.py`

| PR # | Title | What it does | Files |
|------|-------|-------------|-------|
| PR 1 | `feat(resume): add PDF parser with skill and claim extraction` | Core resume parser -- extracts text from PDF, matches skills against keyword database, identifies technical claims with categories and metrics. | `backend/rag/__init__.py`, `backend/rag/parser.py`, `backend/rag/pre_validator.py` |
| PR 2 | `feat(resume): add section splitting, experience detection, and DOCX support` | Splits resumes into sections (education, experience, projects, skills). Detects seniority level. Adds DOCX and TXT extraction. File type validation. | `backend/rag/section_extractor.py`, `backend/rag/experience_parser.py`, `backend/rag/docx_extractor.py`, `backend/rag/file_guard.py` |
| PR 3 | `feat(resume): add claim retriever and GitHub enrichment` | Matches conversation topics to resume claims using keyword overlap scoring. Adds GitHub profile enrichment stub. | `backend/rag/retriever.py`, `backend/rag/github_enricher.py` |
| PR 4 | `feat(resume): add upload API endpoint, UI component, and tests` | FastAPI endpoints for resume upload and parsing. Resume upload React component. Full test suite for parser edge cases, format variations, DOCX styles. | `backend/api/resumes.py`, `frontend-app/components/interview/ResumeUpload.tsx`, `backend/tests/test_resume_hardening.py`, `backend/tests/test_advanced_resume.py`, `backend/tests/test_docx_styles.py` |

---

### A3: LLM Gateway & Blueprint Generation

**Module:** `backend/llm/` + `backend/blueprint/` + `backend/api/blueprints.py`

| PR # | Title | What it does | Files |
|------|-------|-------------|-------|
| PR 1 | `feat(llm): add provider abstraction and mock provider` | Base LLMProvider interface. LocalProvider (Qwen3-4B via LM Studio), GroqProvider, MockProvider for testing. Provider factory with get_llm(). | `backend/llm/__init__.py`, `backend/llm/providers.py`, `backend/llm/factory.py` |
| PR 2 | `feat(llm): add gateway with retry logic, rate limiter, and caching` | Main LLM gateway with exponential backoff on 429/5xx. Token bucket rate limiter. Dev-mode response caching. Input junk detection before LLM calls. | `backend/llm/gateway.py`, `backend/llm/rate_limiter.py`, `backend/llm/dev_cache.py`, `backend/llm/input_validator.py`, `backend/llm/dynamic_schema.py`, `backend/llm/bedrock_provider.py` |
| PR 3 | `feat(llm): add Jinja prompt templates and template loader` | Jinja2 prompt templates for interviewer, evaluator, planner. Template loader with validation. Fairness guardrail block. | `backend/llm/templates.py`, `backend/llm/prompts/system_interviewer.jinja`, `backend/llm/prompts/system_evaluator.jinja`, `backend/llm/prompts/system_planner.jinja`, `backend/llm/prompts/fairness_block.jinja` |
| PR 4 | `feat(blueprint): add interview blueprint generation with role configs` | Blueprint planner that generates interview sections and competencies via LLM with static fallback. Role-specific calibration. Engineering/PM/Design JSON configs. Blueprint API endpoint. Tests. | `backend/blueprint/__init__.py`, `backend/blueprint/planner.py`, `backend/blueprint/models.py`, `backend/blueprint/role_calibration.py`, `backend/blueprint/roles/*.json`, `backend/api/blueprints.py`, `backend/tests/test_llm_foundation.py`, `backend/tests/test_gateway.py`, `backend/tests/test_rate_limiter.py`, `backend/tests/test_blueprints.py`, `backend/tests/test_dynamic_roles.py` |

---

### A4: Interview Engine & Session Management

**Module:** `backend/core/` + `backend/voice/` + `backend/api/interviewer.py`

| PR # | Title | What it does | Files |
|------|-------|-------------|-------|
| PR 1 | `feat(engine): add session state machine and agent decision models` | Session FSM with 5 states (PREP -> TECH -> CODING -> EVAL -> DONE). Turn tracking with depth levels (SURFACE/INTERMEDIATE/DEEP). Verdict classification. Agent decision and evidence models. | `backend/core/__init__.py`, `backend/core/state_machine.py`, `backend/core/decisions.py`, `backend/core/event_bus.py`, `backend/core/interview_styles.py` |
| PR 2 | `feat(engine): add ORDA agent loop with persona and probing` | The brain -- Observe/Reason/Decide/Act cycle. Interviewer persona with question taxonomy. Probing categories. Follow-up ladder. Question quality gate and anti-pattern filter. Pushback detection. Adaptive difficulty. | `backend/core/agent_loop.py`, `backend/core/persona.py`, `backend/core/probe_taxonomy.py`, `backend/core/follow_up.py`, `backend/core/question_quality.py`, `backend/core/question_ranker.py`, `backend/core/pushback_handler.py`, `backend/core/adaptive.py`, `backend/core/persona_handoff.py` |
| PR 3 | `feat(engine): add main engine, session guard, lifecycle, and voice` | StatefulInterviewerEngine that ties everything together. Session guard (30-min, 60-turn). Lifecycle management (ping, cleanup, idle eviction). Transcript flushing. Time management. Audio state management for voice. | `backend/core/engine.py`, `backend/core/session_guard.py`, `backend/core/session_lifecycle.py`, `backend/core/transcript_flusher.py`, `backend/core/time_manager.py`, `backend/voice/__init__.py`, `backend/voice/audio_manager.py`, `backend/voice/stt_handler.py`, `backend/voice/tts_synthesizer.py` |
| PR 4 | `feat(engine): add WebSocket interview endpoint, middleware, and tests` | WebSocket handler with lazy engine init, session middleware, start interview endpoint. Full test suite for engine, adaptive difficulty, session lifecycle, safety, time management, event bus. | `backend/api/interviewer.py`, `backend/api/session_middleware.py`, `backend/tests/test_agent_core_v2.py`, `backend/tests/test_agent_adaptive.py`, `backend/tests/test_interviewer.py`, `backend/tests/test_session_lifecycle.py`, `backend/tests/test_session_safety.py`, `backend/tests/test_time_manager.py`, `backend/tests/test_event_bus.py` |

---

### A5: Evaluation Engine & Frontend

**Module:** `backend/eval_engine/` + `backend/api/reports.py` + `backend/api/app.py` + `frontend-app/`

| PR # | Title | What it does | Files |
|------|-------|-------------|-------|
| PR 1 | `feat(eval): add scoring, rubric, and integrity verification` | 5-component weighted scoring. 4-band rubric. Adversarial score verification. Integrity guardrails (anti-flattery cap). STAR method evaluator. | `backend/eval_engine/__init__.py`, `backend/eval_engine/scoring.py`, `backend/eval_engine/rubric.py`, `backend/eval_engine/verifier.py`, `backend/eval_engine/integrity.py`, `backend/eval_engine/star_evaluator.py` |
| PR 2 | `feat(eval): add coaching, narrative, readiness, and report assembly` | Coaching card generation. 4-week practice roadmap. Communication analysis. Readiness score. Narrative generation. Prep list. Resource search. Full report assembler. Verdict generation. | `backend/eval_engine/verdict.py`, `backend/eval_engine/coaching.py`, `backend/eval_engine/coach_roadmap.py`, `backend/eval_engine/language_report.py`, `backend/eval_engine/readiness.py`, `backend/eval_engine/narrative.py`, `backend/eval_engine/prep_list.py`, `backend/eval_engine/live_coach.py`, `backend/eval_engine/reporter.py`, `backend/eval_engine/resource_search.py`, `backend/eval_engine/resource_config.py` |
| PR 3 | `feat(eval): add report API, app composition, and backend tests` | Report endpoints (evaluate, poll status, get report, readiness card). Main app.py that composes all routers. Full eval test suite. | `backend/api/reports.py`, `backend/api/app.py`, `backend/tests/test_eval_overhaul.py`, `backend/tests/test_coaching_output.py`, `backend/tests/test_report.py`, `backend/tests/test_report_json.py`, `backend/tests/test_readiness_card.py`, `backend/tests/test_readiness_narrative.py`, `backend/tests/test_live_coach.py`, `backend/tests/test_resource_search.py`, `backend/tests/test_async_report.py` |
| PR 4 | `feat(frontend): build all pages, components, and API integration` | Landing page, interview setup, live cockpit, report page, dashboard, profile. All components (interview, report, layout, ui). API client with error handling. Types. Responsive design. | `frontend-app/app/*.tsx`, `frontend-app/app/**/*.tsx`, `frontend-app/components/**/*.tsx`, `frontend-app/lib/api.ts`, `frontend-app/lib/types.ts`, `frontend-app/app/globals.css` |

---

## PR Order (How It Flows)

Each member submits PRs in order. I merge them sequentially. Here's the recommended timeline:

```
Week 1:
  A1-PR1 (config + db setup)        -- foundation, merge first
  A2-PR1 (PDF parser + validator)   -- independent, can go parallel
  A3-PR1 (providers + factory)      -- independent, can go parallel

Week 2:
  A1-PR2 (table schemas)
  A2-PR2 (sections + DOCX)
  A3-PR2 (gateway + rate limiter)
  A4-PR1 (state machine + decisions) -- depends on nothing

Week 3:
  A1-PR3 (scorecard store)
  A2-PR3 (retriever + GitHub)
  A3-PR3 (prompt templates)
  A4-PR2 (ORDA loop + persona)

Week 4:
  A1-PR4 (tests)
  A2-PR4 (API + upload UI + tests)
  A3-PR4 (blueprints + tests)
  A4-PR3 (engine + guard + voice)
  A5-PR1 (scoring + rubric)

Week 5:
  A4-PR4 (WebSocket + tests)
  A5-PR2 (coaching + reports)
  A5-PR3 (API + app.py + tests)
  A5-PR4 (frontend pages + components)
```

A1, A2, A3 can work fully in parallel from day 1.
A4 starts in week 2 (needs to see A1's table schemas and A3's LLM interface).
A5 starts in week 4 (needs core + LLM merged to wire up eval and frontend).

---

## PR Rules

1. Each member only edits files listed in their PR scope
2. Open PR to `team-a/integration`
3. Commit messages: `feat(resume): ...` / `fix(engine): ...` / `test(eval): ...`
4. Don't use `git add .` -- add files by name
5. I review and merge -- don't merge your own PR
6. Each PR should be testable on its own

---

## How to Run

**Backend:**
```bash
cd module-2-ai-interview-agent/backend
pip install -r requirements.txt
python run.py
# Server on http://localhost:8000
```

**Frontend:**
```bash
cd module-2-ai-interview-agent/frontend-app
npm install
npm run dev
# App on http://localhost:3000
```

**Tests:**
```bash
cd module-2-ai-interview-agent/backend
pytest tests/ -v
```

---

## How Members Test Their PRs

| Member | Test command |
|--------|-------------|
| A1 | `cd backend && pytest tests/test_persistence.py tests/test_cross_session.py -v` |
| A2 | `cd backend && pytest tests/test_resume_hardening.py tests/test_advanced_resume.py tests/test_docx_styles.py -v` |
| A3 | `cd backend && pytest tests/test_llm_foundation.py tests/test_gateway.py tests/test_rate_limiter.py tests/test_blueprints.py -v` |
| A4 | `cd backend && pytest tests/test_agent_core_v2.py tests/test_agent_adaptive.py tests/test_session_lifecycle.py tests/test_session_safety.py -v` |
| A5 (backend) | `cd backend && pytest tests/test_eval_overhaul.py tests/test_report.py tests/test_coaching_output.py -v` |
| A5 (frontend) | `cd frontend-app && npm run dev` then test all pages in browser |
