# Project 08: AI Mock Interview & Assessment Platform
**Lead Architect & Team Lead:** Prajeeth  
**Milestone:** Version 1.0 (V1 Full-Stack Release)  
**Tech Stack:** Python 3.11, FastAPI, Next.js 14, PostgreSQL, SQLAlchemy, Judge0 CE, Tailwind CSS, Monaco Editor  

---

## 🏛️ System Architecture Overview
Project 08 is a modern, full-stack technical assessment ecosystem engineered with a **two-track architecture**:

1. **Module 1: Formal Coding Track** — Scheduled, proctored examinations featuring problem blueprints, multi-language Monaco IDE, Safe Exam Browser (SEB) lockdown security, Judge0 CE sandbox execution, and automated submission grading.
2. **Module 2: AI Live Interview Track** — Conversational AI mock interview powered by candidate resume intelligence (RAG), a stateful agent loop (**Observe -> Reason -> Decide -> Act**), a live interview room cockpit, and turn-by-turn rubric evaluations.

---

## 🌳 10-Member Feature Allocation & Branch Matrix

| # | Student Role | Module | Assigned Branch | Frontend Component | Backend API Router | DB Model | Pytest Suite |
|---|---|---|---|---|---|---|---|
| **1** | Problem Blueprints | Formal Coding | `feat/fc-problem-blueprints` | `components/team_b/QuestionBank.tsx` | `api/questions.py` | `models/blueprint.py` | `tests/test_questions.py` |
| **2** | SEB Exam Portal | Formal Coding | `feat/fc-exam-portal-seb` | `components/team_b/ExamPortal.tsx` | `api/exams.py` | `models/formal_exam.py` | `tests/test_exams.py` |
| **3** | Monaco Code Editor | Formal Coding | `feat/fc-monaco-editor` | `components/team_a/MonacoEditor.tsx` | `api/drafts.py` | `models/draft.py` | `tests/test_drafts.py` |
| **4** | Judge0 Sandbox | Formal Coding | `feat/fc-judge0-sandbox` | `components/team_a/TestConsole.tsx` | `api/execution.py` | `models/submission.py` | `tests/test_execution.py` |
| **5** | Verdict & Review | Formal Coding | `feat/fc-verdict-engine` | `components/team_a/CodeReviewCard.tsx` | `api/code_review.py` | `models/review.py` | `tests/test_code_review.py` |
| **6** | Resume Claim Parser | AI Interview (RAG) | `feat/ai-resume-claim-parser` | `components/team_b/ResumeViewer.tsx` | `api/resumes.py` | `models/resume_claim.py` | `tests/test_resumes.py` |
| **7** | RAG Vector Engine | AI Interview (RAG) | `feat/ai-resume-rag-retrieval` | `components/team_b/AuthModal.tsx` | `api/auth.py` | `models/user.py` | `tests/test_auth.py` |
| **8** | Interview Cockpit | AI Interview (Agent) | `feat/ai-interview-cockpit` | `components/team_a/LiveCockpit.tsx` | `api/sessions.py` | `models/session.py` | `tests/test_sessions.py` |
| **9** | Rubric Evaluator | AI Interview (Agent) | `feat/ai-rubric-evaluator` | `components/team_b/ScorecardView.tsx` | `api/evaluations.py` | `models/rubric.py` | `tests/test_evaluations.py` |
| **10**| **Lead Architect (Me)**| Master Orchestration | `feat/ai-agent-core` & `develop` | `app/page.tsx` & Layout | `main.py` & Agent Core | All Schemas | Full Integration Test |

---

## 🚀 Getting Started for Teammates

### 1. Check out your assigned branch
```bash
git checkout feat/<your-assigned-branch>
```
Each branch has its own tailored `README.md` (student instructions) and `AGENT.md` (prompt file for AI copilots) at the root.

### 2. Verify Your Module
```bash
# Backend pytest suite
pytest backend/tests/<your_test_file>.py -v

# Frontend build
cd frontend && npm run build
```

### 3. Submit Pull Request
Push only your assigned 4 files to your branch and open a PR targeting `develop` for mentor evaluation.
