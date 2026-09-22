# AI Interview Agent — Integrated System

## Project Context
- Combined system built from two reference projects
- Backend: Python 3.11 + FastAPI + Pydantic v2
- Frontend: Next.js + Tailwind CSS
- LLM: Provider-agnostic (local Qwen3-4B, Groq, Gemini, Mock)
- Database: SQLite (dev) / PostgreSQL (prod)

## Directory Structure
- `backend/` — All Python backend code
- `frontend/` — Next.js frontend
- `docs/` — Architecture docs, module docs, API docs, decision records
- `planning/` — Version scopes, task breakdowns, team allocation
- `integration/` — Source maps, migration notes, integration tests
- `scripts/` — Dev scripts

## Development Rules
- Each team member works on their assigned module only
- PRs go to team integration branch, not develop
- Commit messages: feat/fix/test(module): description
- Don't use git add . — add files by name
