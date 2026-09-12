# AI Mock Interview, Resume Intelligence & Coding Platform (Project 08)
## Master Architecture Specification & 25-Day Production Roadmap
**Author:** Lead Architect & Engineering Lead

---

## 1. Core Architectural Paradigm: Two Independent Tracks

I have architected the platform around **two distinct assessment tracks** managed under a unified institutional platform layer:

```
                            INSTITUTIONAL PLATFORM
                   (College / Admin / Batch Allocation / RBAC)
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
   TRACK 1: REAL-TIME AI TRACK                           TRACK 2: FORMAL CODING TRACK
   (Conversational & Dynamic Interview)                  (Standalone Formal Examination)
            │                                                     │
     Resume / Role / JD                                  Admin Exam Configuration
            │                                                     │
   Stateful Interview Agent                                Secure Exam (SEB / Lockdown)
  (Observe → Reason → Decide → Act)                               │
            │                                              Monaco Code Editor
   Dynamic Probing & Follow-ups                                   │
            │                                              Judge0 Runner & Test Cases
   ┌────────┴────────┬────────────────┐                           │
   ▼                 ▼                ▼                    Automated Scoring & Report
[Interactive       [System         [Written /
 Coding Tool]       Design Tool]    Notepad Tool]
   │ (Invoked by Agent)
   ▼
Code Execution & AST Review
   │
   └────────┬────────┘
            ▼
Multi-Dimensional AI Evaluation
```

---

## 2. Revised Prioritized Product Scope

| Priority | Module | Core Functionality | Track / Layer |
| :--- | :--- | :--- | :--- |
| 🔴 **P0** | **AI Real-Time Mock Interview** | Resume/role/JD-based interview, dynamic follow-ups, adaptive difficulty, state/context management, weak-area identification, session history. | Track 1 |
| 🔴 **P0** | **Resume Intelligence** | PDF parsing, skill/project/experience extraction, verifiable claim generation feeding the interview agent context. | Track 1 |
| 🔴 **P0** | **Interview Agent (Agentic Loop)** | Stateful orchestration: Observe response $\rightarrow$ Reason on depth $\rightarrow$ Decide next question or tool $\rightarrow$ Act $\rightarrow$ Verify. | Track 1 |
| 🔴 **P0** | **Evaluation & Scoring Engine** | Multi-dimensional scoring with transparent rubrics and session audit trail. | Shared |
| 🟠 **P1** | **Interactive Coding (In-Interview)** | 1-on-1 coding interview tool dynamically invoked by the AI agent; candidate writes code, Judge0 executes, AI reviews logic & Big-O complexity. | Track 1 Tool |
| 🟠 **P1** | **Standalone Coding Assessment** | Formal scheduled exams, problem pool selection, test duration, candidate allocation, multi-language support, public & hidden test cases. | Track 2 |
| 🟠 **P1** | **Secure Exam Environment (SEB)** | Restricted/locked exam window, blur/tab-switch detection, unauthorized access limits. | Track 2 |
| 🟡 **P2** | **System Design Assessment** | AI-led architecture discussion (APIs, DBs, caching, queues, failure modes) via dedicated design workspace. | Track 1 Tool |
| 🟡 **P2** | **Written / Notepad Assessment** | Free-form algorithmic pseudocode, SQL queries, and architecture explanations without execution. | Track 1 Tool |
| 🟡 **P2** | **Voice Interview & Simulation** | Real-time speech-to-text / text-to-speech, company-specific culture & interview simulations. | Track 1 |
| 🟡 **P2** | **Longitudinal Competency Intelligence** | Multi-session skill progression radar, skill-gap analysis, personalized 30-day practice plans. | Analytics |
| 🔵 **Inst.** | **College / Admin Platform** | Placement drive management, student cohort allocation, question pool authoring, faculty audit dashboard. | Admin Layer |

---

## 3. Finalized Production Tech Stack

| Layer | Technology Selected | Responsibility & Role |
| :--- | :--- | :--- |
| **Backend API** | **Python (FastAPI) + Pydantic** | High-throughput async REST endpoints, WebSocket session pipelines, Python AI/ML integration. |
| **Frontend Web App** | **Next.js 14 + Tailwind CSS + Lucide** | SSR for dashboards and exam portals; client hydration for low-latency live cockpit & coding room. |
| **Code Editor** | **Monaco Editor (`@monaco-editor/react`)** | VS Code engine in-browser: Python, Java, C++, JS syntax highlighting, 300ms auto-save debounce. |
| **Code Execution** | **Judge0 CE Worker API** | Isolated execution sandbox: 2.0s CPU timeout, 128MB RAM limit, hidden & public test case runner. |
| **Database & ORM** | **PostgreSQL + SQLAlchemy + Alembic** | ACID persistence for users, sessions, submissions, question pools, and evaluation rubrics. |
| **Real-Time Sync** | **FastAPI WebSockets + Redis** | Low-latency bi-directional sync for live interview state transitions, timers, and streaming AI probes. |
| **AI / LLM Engine** | **Hybrid (Gemini 1.5 Flash/Pro & OpenAI)** | Flash/mini for live $<1$s dynamic probing; Pro/GPT-4o for AST code review & coach roadmaps. |
| **Exam Security** | **SEB Config / Browser Lockdown API** | Fullscreen enforcement, tab-blur tracking, clipboard restrictions for Track 2 formal exams. |
| **Document Processing**| **`pdfplumber` / `pypdf`** | Deterministic resume parsing and verifiable claim extraction. |
| **Testing & CI/CD** | **Pytest, Playwright, GitHub Actions** | Automated unit, contract, sandbox boundary, and E2E browser tests on all PRs. |

---

## 4. Two-Squad 10-Engineer Task Mapping

```
                                    SQUAD OWNERSHIP
          ┌─────────────────────────────────┴─────────────────────────────────┐
          ▼                                                                   ▼
TEAM A: LIVE CORE ENGINE & CODE RUNTIME             TEAM B: PLATFORM, KNOWLEDGE & EXAM SUITE
• A1: Monaco Editor & Interactive Workspace         • B1: Auth, RBAC & Candidate Portal
• A2: Judge0 Sandbox Runner & Test Case Engine      • B2: Resume Parser & Claim Extraction Engine
• A3: Live Interview Cockpit & Session State        • B3: Problem Pool & Blueprint Generator
• A4: Stateful Dynamic AI Probing Agent             • B4: Standalone Exam Suite & SEB Integration
• A5: AI Code Reviewer & Big-O Complexity AST       • B5: Rubric Scorer, Admin Hub & Coach Roadmap
```

### Team A (Live Core Engine & Execution Intelligence):
* **Member A1 (Monaco Editor & Interactive Workspace):**
  * *UI:* Monaco editor, language switcher (Python/Java/C++/JS), auto-save debounce, stdin input console.
  * *API:* `POST /api/code/drafts` (auto-save & session restore).
  * *DB/AI:* `code_drafts` model; AI syntax hint fallback.
* **Member A2 (Code Execution Sandbox & Test Runner):**
  * *UI:* Test case execution console (Input, Expected, Actual, Stdout, Memory, CPU Time, Error logs).
  * *API:* `POST /api/code/execute` via Judge0 with 2.0s timeout & 128MB RAM limit.
  * *DB/AI:* `code_submissions` model; runtime error sanitizer.
* **Member A3 (Live Interview Cockpit & Session State Machine):**
  * *UI:* Live cockpit UI with countdown timer, round switcher (Tech $\rightarrow$ Coding $\rightarrow$ HR), audio recorder.
  * *API:* `/ws/session/{id}` WebSocket lifecycle state machine (`INIT` $\rightarrow$ `TECH` $\rightarrow$ `CODING_TOOL` $\rightarrow$ `DONE`).
  * *DB/AI:* `interview_sessions` model; transcript context aggregator.
* **Member A4 (Real-Time Dynamic AI Probing Agent):**
  * *UI:* Live "Interviewer Thinking" status indicator, difficulty meter, dynamic follow-up badge.
  * *API:* `POST /api/ai/live-probe` (Observe $\rightarrow$ Reason $\rightarrow$ Decide $\rightarrow$ Act follow-up probe).
  * *DB/AI:* `agent_turns` model; prompt injection guardrails.
* **Member A5 (AI Code Review & Big-O Complexity Engine):**
  * *UI:* Inspection drawer with Big-O Time/Space badges, clean code suggestions.
  * *API:* `POST /api/ai/code-review` (evaluates complexity, edge cases, and code smells).
  * *DB/AI:* `code_reviews` model; AST & structured JSON outputs.

### Team B (Platform, Knowledge Infrastructure & Formal Exam Suite):
* **Member B1 (Auth, RBAC & Candidate Management):**
  * *UI:* Login/Register, role management (Student/Trainer/Admin/Faculty), onboarding wizard.
  * *API:* `POST /api/auth/*` JWT auth, RBAC middleware.
  * *DB/AI:* `users` and `student_profiles` tables.
* **Member B2 (Resume Parser & Claim Extraction Engine):**
  * *UI:* Interactive parsed resume viewer with skill pills and flagged verifiable claims.
  * *API:* `POST /api/resumes/parse` (Python PDF claim extraction).
  * *DB/AI:* `resume_claims` model; entity normalization.
* **Member B3 (Question & Problem Pool Management):**
  * *UI:* Question bank explorer, company filter (Amazon, Google), coding problem pool manager.
  * *API:* `POST /api/questions/blueprint` generator.
  * *DB/AI:* `question_bank`, `coding_problem_pool`, and `interview_blueprints` tables.
* **Member B4 (Standalone Coding Assessment & SEB Integration):**
  * *UI:* Formal exam portal, time limit countdown, SEB/lockdown fullscreen wrapper, blur tracker.
  * *API:* `POST /api/exams/create`, `POST /api/exams/submit`, `GET /api/exams/{id}/session`.
  * *DB/AI:* `formal_exams` and `exam_allocations` tables.
* **Member B5 (Rubrics, Admin Analytics & AI Coach Roadmap):**
  * *UI:* Faculty analytics dashboard, candidate competency radar charts, PDF report exporter, 30-day practice checklist.
  * *API:* `POST /api/evaluations/score`, `POST /api/coach/plan`.
  * *DB/AI:* `rubric_scores` and `coach_roadmaps` models; deterministic scoring math.

---

## 5. 25-Day Sprint Execution Timeline

| Timeline | Phase | Key Milestones & Integration Checkpoints |
| :--- | :--- | :--- |
| **Days 1–3** | **Architecture & Contracts** | • Next.js + FastAPI Monorepo initialized; PostgreSQL + Judge0 operational.<br>• Shared types frozen; Track 1 and Track 2 schema models applied; mock APIs live. |
| **Days 4–10** | **P0 Vertical Slices** | • All 10 members complete vertical slices with local Pytest/Jest tests.<br>• Resume Parser (B2), Live Room (A3), Monaco (A1), Sandbox (A2), and Auth (B1) functional. |
| **Days 11–15** | **Integration V1** | • **Milestone 1:** Resume Upload $\rightarrow$ Blueprint $\rightarrow$ Live Cockpit $\rightarrow$ Dynamic AI Probing Agent works end-to-end.<br>• Standalone Exam Portal (B4) connected to Judge0 Sandbox (A2). |
| **Days 16–20** | **Integration V2** | • **Milestone 2:** Live AI Agent dynamically invokes Interactive Coding Tool (A1/A2/A5) mid-interview $\rightarrow$ completes session $\rightarrow$ triggers Rubric Scorer (B5) $\rightarrow$ exports Coach Plan (B5). |
| **Days 21–25** | **Hardening, Cloud Deploy & Viva** | • **Day 25 = Feature Freeze**.<br>• E2E automated test runs, SEB lock validation, cloud deployment (Vercel + Render/AWS), and viva defense prep. |
