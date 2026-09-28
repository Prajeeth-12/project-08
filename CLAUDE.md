# Project 08: AI Mock Interview & Coding Platform
# Claude Code Project Guidelines & Lead Architect Memory

## 1. Project Overview & Architecture
- **Product:** Project 08 — AI Mock Interview, Resume Intelligence & Coding Platform (25-Day Sprint).
- **Core Architecture:** Two Independent Assessment Tracks:
  1. **Track 1 (Real-Time AI Track):** Conversational AI mock interview, resume parsing, stateful agent loop (Observe -> Reason -> Decide -> Act), dynamically invoking interactive coding tools or system design workspaces mid-interview.
  2. **Track 2 (Formal Coding Track):** Standalone scheduled exams with SEB lockdown environment, problem pools, and Judge0 sandbox execution.
  3. **Institutional Layer:** College batch allocation, placement drive management, and faculty analytics dashboards.

## 2. Mandatory Author Voice & Point of View (POV) Protocol
- **Strict User POV:** ALL generated documents, code comments, docstrings, commit messages, PR descriptions, and task sheets MUST be authored strictly from the **USER's Point of View** (First-person: "I", "my", "we", "our team", "I designed", "I architected", "our platform").
- **Zero AI-Referencing:** NEVER write in third-person assistant voice or AI self-referencing tone (e.g., NEVER say "The assistant created this", "This was generated for the team", "As an AI..."). Everything must read as if directly authored and led by the User (Team Lead & Lead Architect).

## 3. Production Tech Stack
- **Backend:** Python 3.11 + FastAPI (Async REST + WebSockets + Pydantic v2)
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + Monaco Editor
- **Execution Sandbox:** Judge0 CE API (2.0s CPU timeout, 128MB RAM bound)
- **Database:** PostgreSQL + SQLAlchemy (Async) + Alembic
- **AI / LLM:** Hybrid / Model-Agnostic (Gemini 1.5 Flash/Pro + OpenAI compatible)
- **Document Engine:** Typst (v0.15+) / LaTeX for clean, anti-AI-slop PDF exports

## 4. 10-Member Task & File Allocation
Each member builds a minimal, isolated vertical slice (1 UI Component + 1 API Endpoint + 1 DB Model + 1 Unit Test):

### Team A (Live Core Engine & Coding Tools):
- **A1 (`feat/a1-editor-workspace`):** Monaco Editor + Auto-save (`POST /api/code/drafts`, `models/draft.py`, `MonacoEditor.tsx`).
- **A2 (`feat/a2-sandbox-judge0`):** Judge0 Sandbox Execution (`POST /api/code/execute`, `models/submission.py`, `TestConsole.tsx`).
- **A3 (`feat/a3-live-interview-room`):** Live Interview Room & WebSocket State (`POST /api/sessions/start`, `models/session.py`, `LiveCockpit.tsx`).
- **A4 (`feat/a4-probing-agent`):** Dynamic Real-Time AI Probing Agent (`POST /api/ai/live-probe`, `models/agent_turn.py`, `ProbingStatus.tsx`).
- **A5 (`feat/a5-code-review-ast`):** AI Code Review & Big-O AST (`POST /api/ai/code-review`, `models/review.py`, `CodeReviewCard.tsx`).

### Team B (Platform, Resume Intelligence & Formal Exam Suite):
- **B1 (`feat/b1-auth-candidate-hub`):** Auth, JWT & Candidate RBAC (`POST /api/auth/login & register`, `models/user.py`, `AuthModal.tsx`).
- **B2 (`feat/b2-resume-claim-parser`):** Resume PDF Parser & Claims (`POST /api/resumes/parse`, `models/resume_claim.py`, `ResumeViewer.tsx`).
- **B3 (`feat/b3-problem-blueprints`):** Question Bank & Blueprints (`POST /api/questions/blueprint`, `models/blueprint.py`, `QuestionBank.tsx`).
- **B4 (`feat/b4-exam-portal-seb`):** Standalone SEB Exam Portal (`POST /api/exams/submit`, `models/formal_exam.py`, `ExamPortal.tsx`).
- **B5 (`feat/b5-analytics-rubric-coach`):** Rubric Scorer & 30-Day Coach (`POST /api/evaluations/score`, `models/rubric.py`, `ScorecardView.tsx`).

## 5. Master Documentation Index in Workspace
- `planning/implementation_plan.md` & `.pdf`: Master architectural blueprint & 25-day roadmap.
- `planning/project_abstract.md` & `.pdf`: Executive abstract & P0/P1/P2/P3 feature tiers.
- `planning/version_roadmap.md` & `.pdf`: Abstract v1.0 to v4.0 evolutionary roadmap.
- `planning/github_v1_plan.md`: Git branching strategy & zero-conflict integration protocol.
- `planning/member_onboarding_guide.md` & `.pdf`: Minimal JSON contracts & setup instructions for all 10 engineers.
- `AGENTS.md` / `GEMINI.md` / `CLAUDE.md`: Persistent workspace rules (root).

