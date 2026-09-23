# Module 2: AI Interview Agent -- V1 Scope
**By: Prajeeth**

---

## What V1 Does

V1 is the simplest version that makes the module actually work end-to-end. A student uploads a resume, the AI reads it, asks questions based on it, follows up on weak answers, and gives a score at the end. That's it. No auth, no code editor, no cloud AI, no fancy voice -- just the core loop working.

```
Upload Resume -> AI Reads It -> AI Asks Questions -> Student Answers
-> AI Follows Up -> Interview Ends -> Score + Feedback
```

If V1 works, everything else (cloud LLM, coding tool, voice, auth) gets added in V2 and V3.

---

## V1 Features -- Only What's Needed to Make It Work

### 1. Resume Upload & Parsing
- Upload a PDF or paste text
- Extract skills and technical claims from it
- Store parsed data so the interview can use it

That's the minimum. No DOCX, no GitHub enrichment, no fancy section splitting -- just PDF in, skills + claims out.

**API:**
| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/resumes/upload` | Upload PDF, get back extracted skills and claims |

---

### 2. Interview Blueprint
- Take the parsed resume + a role (engineering/PM/design)
- Generate a simple interview plan: which topics to cover, how many questions per topic

No LLM needed for this -- use a static template based on the role. LLM-powered blueprints come in V2.

**API:**
| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/blueprints/create` | Generate interview plan from resume + role |

---

### 3. Live Interview (WebSocket)
- Start a session
- AI sends a question
- Student sends an answer
- AI evaluates the answer (keyword heuristics -- not LLM in V1)
- AI decides: probe deeper, ask follow-up, change topic, or end
- Repeat until the interview is done (max 30 min or 20 turns for V1)
- Save the transcript

This is the heart. Even with keyword heuristics instead of real LLM, the loop needs to work: question -> answer -> evaluate -> decide -> next question.

**API:**
| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/interviews/start` | Create session, get first question |
| WebSocket | `/api/interviews/ws/{id}` | Real-time interview loop |
| POST | `/api/interviews/{id}/ping` | Keep session alive |

---

### 4. Scoring & Report
- When interview ends, score the session
- 3 simple dimensions: technical depth, communication, problem-solving
- Overall score (0-100)
- List of strengths and weaknesses
- Basic coaching: "practice these topics"

No adversarial verification, no readiness card, no language analysis -- just score + feedback.

**API:**
| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/api/interviews/{id}/evaluate` | Trigger scoring |
| GET | `/api/interviews/{id}/report` | Get score + feedback |

---

### 5. Frontend
- Landing page (start interview button)
- Interview setup page (upload resume, pick role)
- Live interview page (see questions, type answers, see transcript)
- Report page (see score, strengths, weaknesses, what to practice)

4 pages. No dashboard, no profile, no admin. Just the flow: upload -> interview -> report.

---

## What V1 Does NOT Have

| Feature | Why not in V1 | When |
|---------|--------------|------|
| Auth / user accounts | Not needed to demo the core loop | V3 |
| Cloud LLM (Gemini/OpenAI) | Local Qwen3-4B or MockProvider is enough for V1 | V2 |
| Vector embeddings / RAG | Keyword matching works for V1 demo | V2 |
| Code editor / Judge0 | Separate module, not needed for interview to work | V3 |
| Voice (STT/TTS) | Text-based interview works first | V3 |
| Adversarial score verification | Simple scoring is enough for V1 | V2 |
| Coaching roadmap (4-week plan) | Basic "practice these topics" is enough | V2 |
| Readiness card / PDF export | Report page is enough | V2 |
| Session reconnection | Nice to have, not critical for demo | V2 |
| Admin dashboard | No admin needed for V1 | V3 |

---

## V1 Member Split

### A1: Database & Config

**What they build for V1:**
- App config (port, dev mode flag, local LLM URL)
- SQLite database setup
- 3 tables: `sessions`, `blueprints`, `reports`
- Basic CRUD for storing and retrieving session data

**What makes their work done:** You can create a session in the database, store turns, and retrieve a report. Other members can import and use these tables.

---

### A2: Resume Upload & Parsing

**What they build for V1:**
- PDF text extraction
- Basic skill matching (top 30 keywords: Python, Java, React, SQL, Docker, etc.)
- Claim extraction (lines with action verbs like "built", "designed", "optimized")
- Upload endpoint that takes a PDF and returns JSON with skills + claims
- Basic validation (reject empty files, reject non-PDFs)

**What makes their work done:** Upload a PDF, get back `{ skills: [...], claims: [...] }`. The interview engine can use this to ask relevant questions.

**Endpoint:** `POST /api/resumes/upload`

---

### A3: LLM Gateway & Blueprints

**What they build for V1:**
- MockProvider that returns pre-written responses (no real LLM needed)
- LocalProvider that talks to Qwen3-4B on localhost:1234 (for those who have it)
- Simple gateway: send prompt, get response, retry once on failure
- Static blueprint generator: given a role, return a fixed interview plan (3-4 sections, 5-6 questions each)
- Blueprint endpoint

**What makes their work done:** Call `get_llm()` and get a provider that responds. Call `/api/blueprints/create` with a role and get back an interview plan. The interview engine calls this to know what questions to ask.

**Endpoint:** `POST /api/blueprints/create`

---

### A4: Interview Engine

**What they build for V1:**
- Session state machine: WAITING -> ACTIVE -> COMPLETED
- Turn tracking: store each question-answer pair with a turn number
- Simple evaluate logic: check answer length + keyword presence to classify as SOLID / SHAKY / WEAK
- Simple decide logic: if WEAK, probe deeper. If SOLID, move to next topic. After 20 turns, end.
- Generate follow-up from a static question bank (no LLM in V1)
- WebSocket handler: receive answer, run evaluate+decide, send next question
- Start endpoint: create session, return first question
- Ping endpoint: keep alive

**What makes their work done:** Start an interview, send answers over WebSocket, get follow-up questions that make sense, interview ends after 20 turns or 30 minutes. Transcript is saved.

**Endpoints:**
- `POST /api/interviews/start`
- `WebSocket /api/interviews/ws/{id}`
- `POST /api/interviews/{id}/ping`

---

### A5: Scoring & Frontend

**What they build for V1 (backend):**
- Score calculation: count SOLID/SHAKY/WEAK turns, compute 3 dimension scores + overall
- Strengths: topics where most answers were SOLID
- Weaknesses: topics where most answers were WEAK
- Basic coaching: "practice these topics" list based on weaknesses
- Evaluate endpoint: compute and store score
- Report endpoint: return score + feedback JSON
- app.py: wire all routers together, health check

**What they build for V1 (frontend):**
- Landing page: "Start an Interview" button
- Setup page: upload resume (calls A2's endpoint), pick role (calls A3's endpoint)
- Interview page: WebSocket connection to A4's endpoint, show transcript in real time, text input for answers
- Report page: show overall score, dimension scores, strengths, weaknesses, practice topics

**What makes their work done:** You can open the app, upload a resume, do an interview, and see your score at the end. The full loop works.

**Endpoints:**
- `POST /api/interviews/{id}/evaluate`
- `GET /api/interviews/{id}/report`
- `GET /health`

---

## V1 Complete API Summary

| # | Method | Endpoint | Owner | What it does |
|---|--------|----------|-------|-------------|
| 1 | POST | `/api/resumes/upload` | A2 | Upload PDF, get skills + claims |
| 2 | POST | `/api/blueprints/create` | A3 | Generate interview plan from role |
| 3 | POST | `/api/interviews/start` | A4 | Create session, get first question |
| 4 | WS | `/api/interviews/ws/{id}` | A4 | Real-time interview loop |
| 5 | POST | `/api/interviews/{id}/ping` | A4 | Keep session alive |
| 6 | POST | `/api/interviews/{id}/evaluate` | A5 | Trigger scoring |
| 7 | GET | `/api/interviews/{id}/report` | A5 | Get score + feedback |
| 8 | GET | `/health` | A5 | Health check |

8 endpoints. That's all V1 needs.

---

## How You Know V1 is Done

The demo flow works:

1. Open `http://localhost:3000`
2. Click "Start Interview"
3. Upload a resume PDF -- skills and claims extracted
4. Pick "Engineering" role -- blueprint generated
5. Interview starts -- AI asks a question
6. Type an answer -- AI evaluates and follows up
7. After 20 turns -- interview ends
8. See scorecard: overall score, dimension breakdown, strengths, weaknesses, practice topics

If that flow works end-to-end, V1 is shipped.
