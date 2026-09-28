# Member 4: Judge0 Execution Sandbox & Runner API
**Branch:** `feat/fc-judge0-sandbox`  
**Module:** Formal Coding Track (Module 1)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the **Judge0 Sandbox Execution Engine & Interactive Runner Console** for Project 08. This engine takes candidate code and standard input (stdin), dispatches an isolated execution request to the Judge0 CE API sandbox, enforces strict resource constraints (2.0-second CPU execution timeout, 128MB RAM limit), polls the execution status asynchronously, and formats the output (stdout, stderr, runtime, memory) back to the candidate's terminal console.

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_a/TestConsole.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_a/TestConsole.tsx)
2. **Backend API Router:** [`backend/api/execution.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/execution.py)
3. **Database Model:** [`backend/models/submission.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/submission.py)
4. **Pytest Suite:** [`backend/tests/test_execution.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_execution.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `POST /api/v1/execution/run` — Format submission payload, set resource limits (`cpu_time_limit: 2.0`, `memory_limit: 128000`), dispatch to Judge0 CE, and return an async token.
  - `GET /api/v1/execution/status/{token}` — Poll Judge0 status with exponential backoff until status is completed (Status ID 3 for Accepted, or error codes).
- **Frontend UI (`TestConsole.tsx`):**
  - Terminal-style test console tabs: "Custom Input", "Sample Testcase 1", "Sample Testcase 2".
  - Execution status indicators: "Running in Sandbox...", "Completed in 42ms", "Memory: 18MB".
  - Clean error styling for compilation errors (`stderr`), runtime exceptions, and timeout alerts.
- **Database Model (`submission.py`):**
  - Table `execution_jobs` with `token`, `language_id`, `source_code`, `stdin`, `stdout`, `stderr`, `time_taken`, `memory_used`, and `status`.

---

## 🔗 How Your Feature Integrates
- **Monaco Editor (Member 3 - `feat/fc-monaco-editor`):** Passes the live code string into your execution payload.
- **Problem Bank (Member 1 - `feat/fc-problem-blueprints`):** Populates the sample testcase tabs in your `TestConsole.tsx`.
- **Verdict Engine (Member 5 - `feat/fc-verdict-engine`):** Uses your sandbox execution engine to run all hidden test cases in parallel during final exam grading.

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_execution.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_a/TestConsole.tsx
   git add backend/api/execution.py
   git add backend/models/submission.py
   git add backend/tests/test_execution.py
   git commit -m "feat(sandbox): implement Judge0 CE runner API, resource limits, and interactive test console"
   git push origin feat/fc-judge0-sandbox
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-a/integration`). Attach your passing `pytest` terminal output and a screenshot of the `TestConsole.tsx` UI for our mentor's review.
