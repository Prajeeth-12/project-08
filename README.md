# Member 5: Assessment Verdict Engine & Static Code Analysis
**Branch:** `feat/fc-verdict-engine`  
**Module:** Formal Coding Track (Module 1)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the **Assessment Submission Verdict Engine & Static Code Review Subsystem** for Project 08. When a candidate submits their final solution in an exam, your pipeline evaluates their code against the complete hidden test suite, computes the canonical competitive programming verdict (`ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `COMPILATION_ERROR`), executes Python AST static analysis to assess cyclomatic complexity and clean code standards, and outputs a comprehensive grading scorecard.

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_a/CodeReviewCard.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_a/CodeReviewCard.tsx)
2. **Backend API Router:** [`backend/api/code_review.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/code_review.py)
3. **Database Model:** [`backend/models/review.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/review.py)
4. **Pytest Suite:** [`backend/tests/test_code_review.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_code_review.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `POST /api/v1/code-review/evaluate` — Evaluates candidate submission across all hidden test cases. Calculates total score percentage, overall verdict (`ACCEPTED` if 100% test cases pass, else `WRONG_ANSWER`), and total execution time.
  - Python AST Analyzer (`backend/api/code_review.py`) — Analyzes code structure, cyclomatic complexity, nested loop depth, and bad practice smells.
- **Frontend UI (`CodeReviewCard.tsx`):**
  - Post-submission verdict card with prominent status badge: `ACCEPTED` (Green), `WRONG ANSWER` (Red), or `TIME LIMIT EXCEEDED` (Orange).
  - Test case pass tally indicator: e.g., "12 / 12 Test Cases Passed (100%)".
  - Code review quality insights: Estimated time complexity, function purity, and code clarity recommendations.
- **Database Model (`review.py`):**
  - Table `assessment_submissions` with `candidate_id`, `problem_id`, `source_code`, `verdict`, `score_percentage`, `test_cases_passed`, `total_test_cases`, and `ast_metrics`.

---

## 🔗 How Your Feature Integrates
- **Exam Portal (Member 2 - `feat/fc-exam-portal-seb`):** Submits final code to your evaluation endpoint upon exam completion.
- **Problem Bank (Member 1 - `feat/fc-problem-blueprints`):** Supplies the hidden test suite used to grade the submission.
- **Execution Sandbox (Member 4 - `feat/fc-judge0-sandbox`):** Dispatches testcase execution tasks to Judge0 CE.

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_code_review.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_a/CodeReviewCard.tsx
   git add backend/api/code_review.py
   git add backend/models/review.py
   git add backend/tests/test_code_review.py
   git commit -m "feat(grading): implement hidden test suite evaluation, verdict calculator, and AST review card"
   git push origin feat/fc-verdict-engine
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-a/integration`). Attach your passing `pytest` terminal output and a screenshot of the `CodeReviewCard.tsx` UI for our mentor's review.
