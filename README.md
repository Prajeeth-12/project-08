# Member 9: Turn-by-Turn Rubric Scoring & Performance Scorecard
**Branch:** `feat/ai-rubric-evaluator`  
**Module:** AI Live Interview Track (Module 2B: AI Interview Agent)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the **Candidate Rubric Evaluation & Performance Analytics Subsystem** for Project 08. This engine evaluates candidate responses turn-by-turn against the industry-standard STAR methodology (Situation, Task, Action, Result) and technical depth criteria, calculates dimensional grades across 4 categories (Communication, Technical Depth, Problem Solving, System Design), and renders an executive, publication-grade candidate performance scorecard with radar chart visualizations.

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_b/ScorecardView.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_b/ScorecardView.tsx)
2. **Backend API Router:** [`backend/api/evaluations.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/evaluations.py)
3. **Database Model:** [`backend/models/rubric.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/rubric.py)
4. **Pytest Suite:** [`backend/tests/test_evaluations.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_evaluations.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `POST /api/v1/evaluations/turn` — Scores a single interview turn based on candidate answer, returns STAR dimension scores (0-100), and generates a constructive coaching tip.
  - `GET /api/v1/evaluations/{session_id}/summary` — Returns the overall candidate scorecard aggregating total interview score, category percentiles (Technical Depth, Problem Solving, Architecture, Communication), and personalized 30-day preparation roadmap recommendations.
- **Frontend UI (`ScorecardView.tsx`):**
  - Executive candidate scorecard with circular overall score gauge.
  - Interactive dimensional radar/bar breakdown across Communication, Technical Depth, and Problem Solving.
  - Turn-by-turn feedback timeline showing strengths, weaknesses, and coaching suggestions.
- **Database Model (`rubric.py`):**
  - Table `interview_rubrics` tracking `session_id`, `overall_score`, `technical_score`, `communication_score`, `problem_solving_score`, `coaching_notes`, and timestamps.

---

## 🔗 How Your Feature Integrates
- **Master Agent Loop (`develop` / `feat/ai-agent-core`):** Feeds candidate questions and responses into your `POST /evaluations/turn` endpoint as turns occur.
- **Interview Cockpit (Member 8 - `feat/ai-interview-cockpit`):** Transitions the candidate to your `ScorecardView.tsx` component when the interview session ends.

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_evaluations.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_b/ScorecardView.tsx
   git add backend/api/evaluations.py
   git add backend/models/rubric.py
   git add backend/tests/test_evaluations.py
   git commit -m "feat(rubric): implement STAR evaluation engine, category scoring, and scorecard view"
   git push origin feat/ai-rubric-evaluator
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-b/integration`). Attach your passing `pytest` terminal output and a screenshot of the `ScorecardView.tsx` UI for our mentor's review.
