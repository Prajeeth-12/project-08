# Member 1: Problem Blueprints & Testcase Bank
**Branch:** `feat/fc-problem-blueprints`  
**Module:** Formal Coding Track (Module 1)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the **Problem Blueprints & Testcase Management** subsystem for Project 08. This serves as the foundation for the entire coding platform: it allows administrators to create coding challenges with sample test cases (visible to candidates) and hidden test cases (used strictly for grading), and enables candidates to browse and fetch problem statements during scheduled exams.

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_b/QuestionBank.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_b/QuestionBank.tsx)
2. **Backend API Router:** [`backend/api/questions.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/questions.py)
3. **Database Model:** [`backend/models/blueprint.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/blueprint.py)
4. **Pytest Suite:** [`backend/tests/test_questions.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_questions.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `GET /api/v1/questions` — List paginated problems with query filters (`difficulty`, `tag`, `search`).
  - `GET /api/v1/questions/{id}` — Return complete problem specification, constraints (time limit, memory limit), starter boilerplate dict (Python, Java, C++, JS), and public sample test cases. **Important:** Never leak hidden test cases in this public endpoint!
  - `POST /api/v1/questions` — Create a new problem blueprint including both public sample test cases and hidden test cases for final grading.
- **Frontend UI (`QuestionBank.tsx`):**
  - Problem catalog with search input, difficulty badges (`Easy`, `Medium`, `Hard`), and tag filters (`Array`, `Dynamic Programming`, `Graph`, etc.).
  - Problem detail drawer or preview card displaying problem statement, constraints, and sample I/O.
- **Database Model (`blueprint.py`):**
  - Table `problem_blueprints` with `id`, `title`, `slug`, `difficulty`, `description`, `constraints`, `starter_code`, and test case relationships.

---

## 🔗 How Your Feature Integrates
- **Exam Portal (Member 2 - `feat/fc-exam-portal-seb`):** Uses your `GET /api/v1/questions/{id}` to load the problem statement and starter code when a candidate starts an exam.
- **Execution Sandbox (Member 4 - `feat/fc-judge0-sandbox`):** Uses your sample test cases to run custom user tests.
- **Verdict Engine (Member 5 - `feat/fc-verdict-engine`):** Evaluates candidate code against your hidden test cases for final exam scoring.

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_questions.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_b/QuestionBank.tsx
   git add backend/api/questions.py
   git add backend/models/blueprint.py
   git add backend/tests/test_questions.py
   git commit -m "feat(questions): implement blueprint CRUD, sample testcases, and question bank UI"
   git push origin feat/fc-problem-blueprints
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-b/integration`). Attach your passing `pytest` terminal output and a screenshot of the `QuestionBank.tsx` UI for our mentor's review.
