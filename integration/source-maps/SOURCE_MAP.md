# Source Map — What Comes From Where

## Base Project: ai-interview-agent (Project 2)

| What we take | Where it is | Why |
|-------------|------------|-----|
| Multi-agent orchestration pattern | backend/agents/orchestrator.py | Clean separation of interviewer + coach agents |
| Deepgram STT/TTS integration | backend/api/speech/ | Real server-side voice pipeline |
| Supabase auth + PostgreSQL | backend/database/ | Production-ready auth + persistence |
| LangChain + Gemini integration | backend/services/llm_service.py | Working cloud LLM calls |
| Interview config (JD input, style, difficulty, company) | frontend + backend/agents/config_models.py | Features we don't have |
| Web search for resources (Serper) | backend/agents/tools/search_tool.py | Dynamic learning recommendations |
| Docker deployment | Dockerfile | Production deployment ready |

## Feature Source: module-2-ai-interview-agent

| What we take | Where it is | Why |
|-------------|------------|-----|
| ORDA agent loop (Observe/Reason/Decide/Act) | backend/core/agent_loop.py | Code-side decision logic, not just LLM prompts |
| 13-state session FSM | backend/core/state_machine.py | Granular state tracking |
| Resume claim extraction + 58-skill matching | backend/rag/parser.py | Structured resume grounding |
| Follow-up ladder (3 levels) | backend/core/follow_up.py | Systematic depth escalation |
| 9 probing categories | backend/core/probe_taxonomy.py | Diverse question types |
| Quality gate (6 anti-pattern rules) | backend/core/question_quality.py | Prevents bad questions |
| 5-component scoring + 4-band rubric | backend/eval_engine/scoring.py, rubric.py | Structured evaluation |
| Adversarial verification + integrity guardrails | backend/eval_engine/verifier.py, integrity.py | Score accuracy |
| Evidence tracking with transcript refs | backend/core/decisions.py | Per-turn evidence |
| Blueprint generation from resume + role | backend/blueprint/planner.py | Interview planning |
| Session guard (30 min, 60 turns) | backend/core/session_guard.py | Safety limits |
| Transcript checkpointing | backend/core/transcript_flusher.py | Crash recovery |
| Cross-session scorecards | backend/models/scorecard_store.py | Performance history |

## New Features (Not in Either Reference)

| Feature | Version | Why |
|---------|---------|-----|
| Job Description input | V1 | Hyper-relevant questions from real JDs |
| Interview style selection (formal/casual/technical) | V1 | User control over interview tone |
| Starting difficulty selector | V1 | User sets baseline difficulty |
| Company-specific targeting | V2 | "Practice for Google/Amazon" |
| Dynamic web search for resources | V1 | Personalized learning links (from Project 2's Serper integration) |
