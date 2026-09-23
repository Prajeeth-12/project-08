# Module 2: AI Interview Agent -- Project Report
**By: Prajeeth**

---

## What This Module Is

This is an AI-powered mock interview platform. A student uploads their resume, the AI reads it, generates interview questions based on what's in the resume, conducts a live interview over WebSocket, probes weak answers, and at the end gives a detailed scorecard with coaching and a 30-day practice plan.

The goal is to simulate how a real technical interview works -- not just ask random questions, but actually listen, evaluate, follow up, and challenge the candidate.

---

## What We're Building (Features)

### Resume Intelligence
- Accept PDF, DOCX, or plain text resumes
- Extract skills, projects, work experience, and technical claims
- Categorize each claim (Optimization, Database, Concurrency, Architecture)
- Detect seniority level from experience
- Reject non-resumes and block prompt injection attempts
- Cache parsed results so the same resume isn't re-processed

### Interview Blueprint
- Generate an interview plan based on the candidate's resume and target role
- Support 3 role types: Engineering, Product Management, Design
- Plan sections with competencies, question pools, and time budgets
- Calibrate difficulty based on role and seniority

### Live AI Interview (The Core)
- Real-time WebSocket session between candidate and AI interviewer
- Stateful agent loop for every turn: Observe the answer -> Reason about depth -> Decide next action -> Act (follow-up, probe, switch topic, or end)
- Interviewer persona: Skeptical Staff Engineer who doesn't accept buzzwords
- Adaptive difficulty -- scales up when answers are strong, probes deeper when weak
- Follow-up ladder with 3 levels (Surface -> Push -> Floor)
- 9 probing categories (optimization, database, concurrency, architecture, etc.)
- Quality gate that rejects vague or repetitive questions before sending
- Pushback detection -- handles "I don't know" and evasive answers
- Persona handoff between interview rounds (tech -> coding -> HR)
- Session guard: 30-minute wall clock, 60-turn hard limit
- Transcript checkpointing every 20 seconds to SQLite
- Reconnection support if WebSocket drops

### Evaluation & Scoring
- 5-component weighted scoring: technical depth, communication, problem-solving, code quality, adaptability
- 4-band rubric: Exceptional / Strong / Developing / Needs Work
- Adversarial verification pass (catches inflated scores)
- Integrity guardrails (anti-flattery cap, score bounding)
- Three-tier verdict per answer: Solid / Shaky / Couldn't Defend
- Coaching cards with specific improvement advice
- 4-week practice roadmap targeting weak areas
- Communication/language analysis
- Readiness score (0-100)
- Deterministic narrative summary
- Practice topic prep list with resources
- Shareable readiness card (1200x630 HTML)

### LLM Gateway
- Provider-agnostic: works with local Qwen3-4B (LM Studio), Groq cloud, or MockProvider for testing
- Retry with exponential backoff on 429/5xx errors
- Rate limiting with token bucket
- Dev-mode response caching (avoid repeated LLM calls during development)
- Input validation (detect junk before sending to LLM)
- Jinja2 prompt templates for interviewer, evaluator, and planner

### Frontend
- Landing page with stats and recent interviews
- Interview setup: resume upload + role selection
- Live interview cockpit with WebSocket transcript
- Full report page: scorecard, competencies, coaching, prep list, transcript
- Dashboard and profile pages

---

## API Endpoints

These are all the backend endpoints the module exposes.

### Resume

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/resumes/parse` | Parse raw resume text, extract skills and claims |
| POST | `/api/resumes/upload` | Upload a PDF/DOCX/TXT file and parse it |

### Blueprint

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/blueprints/create` | Generate interview blueprint from resume + role |

### Interview

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/interviews/start` | Create a new interview session, get first question |
| GET | `/api/interviews/sessions` | List all sessions |
| GET | `/api/interviews/{id}` | Get session details |
| WebSocket | `/api/interviews/ws/{id}` | Real-time interview (send answers, receive questions) |
| POST | `/api/interviews/{id}/evaluate` | Trigger async report generation (returns 202) |
| GET | `/api/interviews/{id}/report-status` | Poll report generation progress |
| GET | `/api/interviews/{id}/report` | Get full evaluation report |
| GET | `/api/interviews/{id}/per-turn-feedback` | Get per-turn coaching feedback |
| POST | `/api/interviews/{id}/ping` | Keep session alive |
| POST | `/api/interviews/{id}/cleanup` | Clean up finished session |
| GET | `/api/interviews/{id}/time-remaining` | Get remaining time in session |

### Reports

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/api/reports/{id}/card` | Render shareable readiness card (HTML) |

### System

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Python 3.11 + FastAPI | Async REST + WebSocket support, fast, good for AI workloads |
| Frontend | Next.js 16 + Tailwind | App router, server components, easy styling |
| Database | SQLite (async) + SQLAlchemy | Lightweight, no setup needed, good for dev/demo |
| LLM | Qwen3-4B (local) / Groq (cloud) | Local for dev (free), Groq for faster inference |
| PDF Parsing | pypdf | Reliable PDF text extraction |
| Prompts | Jinja2 | Template-based prompt management |

---

## Team & Member Allocation

5 members, each owns one independent module. The dependency flows downward -- no circular deps.

### A1: Database & Config

**What they do:** Build the data layer everything else stores data into. Define all table schemas, configure the app, handle cross-session persistence.

**What they deliver:**
- App configuration (ports, LLM settings, timeouts, dev mode flag)
- Async SQLite database engine and session factory
- ORM table definitions for: sessions, blueprints, reports, turns, scorecards
- Cross-session scorecard storage (tracks candidate history)

**Endpoints they support:** None directly -- they build the layer that all other endpoints write to.

**Dependencies:** None. This is the foundation.

---

### A2: Resume Intelligence

**What they do:** Build the entire resume processing pipeline. Take a file in, give structured data out. Parse, validate, extract, categorize.

**What they deliver:**
- PDF, DOCX, TXT text extraction
- Resume validation (reject invoices, block injection)
- SHA-256 dedup caching
- Skill extraction (58 keyword database)
- Technical claim extraction with category and metrics
- Section splitting (education, experience, projects, skills)
- Seniority detection
- Claim retriever for conversation grounding

**Endpoints they own:**
- `POST /api/resumes/parse`
- `POST /api/resumes/upload`

**Dependencies:** None. Fully self-contained -- only uses pypdf and pydantic.

---

### A3: LLM Gateway & Blueprints

**What they do:** Build the AI communication layer. Every LLM call in the system goes through their gateway. Also build the interview blueprint generator that plans the interview structure.

**What they deliver:**
- LLM provider abstraction (local, Groq, mock)
- Gateway with retry, backoff, rate limiting
- Dev-mode caching
- Input validation
- Jinja2 prompt templates (interviewer, evaluator, planner)
- Interview blueprint generation from resume + role
- Role-specific calibration (engineering, PM, design)

**Endpoints they own:**
- `POST /api/blueprints/create`

**Dependencies:** Only `config.py`. Can be fully tested with MockProvider.

---

### A4: Interview Engine

**What they do:** Build the brain. The stateful agent that actually conducts the interview -- listens, evaluates, decides, responds. Plus all session management.

**What they deliver:**
- Session state machine (5 states: PREP -> TECH -> CODING -> EVAL -> DONE)
- ORDA agent loop (Observe -> Reason -> Decide -> Act)
- Interviewer persona (Skeptical Staff Engineer)
- Adaptive difficulty scaling
- Follow-up ladder (3 levels)
- 9 probing categories
- Question quality gate + anti-pattern filter
- Pushback detection
- Persona handoff between rounds
- Session guard (30 min, 60 turns)
- Transcript checkpointing
- Session lifecycle (ping, cleanup, reconnection)
- Audio state management (voice metadata)

**Endpoints they own:**
- `POST /api/interviews/start`
- `WebSocket /api/interviews/ws/{id}`
- `GET /api/interviews/sessions`
- `GET /api/interviews/{id}`
- `POST /api/interviews/{id}/ping`
- `POST /api/interviews/{id}/cleanup`
- `GET /api/interviews/{id}/time-remaining`

**Dependencies:** Uses A3's LLM gateway (can mock it). Uses A1's database for persistence.

---

### A5: Evaluation & Frontend

**What they do:** Build everything after the interview ends -- scoring, coaching, reports. Plus the entire frontend that users actually see and interact with.

**What they deliver (backend):**
- 5-component weighted scoring
- 4-band rubric evaluation
- Adversarial verification
- Integrity guardrails
- Verdict generation
- Coaching cards
- 4-week practice roadmap
- Communication analysis
- Readiness score
- Narrative summary
- Prep list with resources
- Per-turn live coaching
- Full report assembler
- Main app.py that wires all routers together

**Endpoints they own:**
- `POST /api/interviews/{id}/evaluate`
- `GET /api/interviews/{id}/report-status`
- `GET /api/interviews/{id}/report`
- `GET /api/interviews/{id}/per-turn-feedback`
- `GET /api/reports/{id}/card`
- `GET /health`

**What they deliver (frontend):**
- Landing page with recent interviews and stats
- Interview setup (resume upload + role picker)
- Live interview cockpit (WebSocket, transcript, audio)
- Full report page (scorecard, competencies, coaching, prep, transcript)
- Dashboard and profile pages
- API client connecting frontend to all backend endpoints

**Dependencies:** Uses A4's session state models, A3's LLM gateway, A1's database. Can mock all for testing.

---

## How Members Work

1. Each member clones the repo and checks out their feature branch
2. They build their module independently -- each can be tested alone
3. They open PRs (3-4 per member) to `team-a/integration`
4. I review and merge
5. Once all 5 are merged, I integrate into `develop`

A1, A2, A3 work in parallel from day 1.
A4 starts once A1 and A3 have their first PRs merged.
A5 starts once A4 has the engine working.

---

## Running the Project

```bash
# Backend
cd module-2-ai-interview-agent/backend
pip install -r requirements.txt
python run.py                    # starts on http://localhost:8000

# Frontend
cd module-2-ai-interview-agent/frontend-app
npm install
npm run dev                      # starts on http://localhost:3000

# Tests
cd module-2-ai-interview-agent/backend
pytest tests/ -v
```
