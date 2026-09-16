# Member 3: Multi-Language Monaco Code Editor & Draft Persistence
**Branch:** `feat/fc-monaco-editor`  
**Module:** Formal Coding Track (Module 1)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the in-browser **Monaco Code Editor & Draft Persistence Subsystem** for Project 08. Candidates must have a responsive, VS Code-grade coding experience supporting Python, Java, C++, and JavaScript. Crucially, your system must protect candidates from accidental data loss by debouncing code changes and auto-saving drafts every 3 seconds to both backend storage and local storage.

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_a/MonacoEditor.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_a/MonacoEditor.tsx)
2. **Backend API Router:** [`backend/api/drafts.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/drafts.py)
3. **Database Model:** [`backend/models/draft.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/draft.py)
4. **Pytest Suite:** [`backend/tests/test_drafts.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_drafts.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `POST /api/v1/drafts/save` — Debounced endpoint saving candidate code snapshots (`candidate_id`, `problem_id`, `language`, `code_content`).
  - `GET /api/v1/drafts/latest` — Fetches the latest saved draft for a candidate and problem on page refresh or reconnection.
- **Frontend UI (`MonacoEditor.tsx`):**
  - Monaco editor wrapper supporting syntax highlighting for Python (3.11), Java, C++, and JavaScript.
  - Language selector dropdown that updates the editor syntax model and injects default boilerplate starter code.
  - Visual status pill indicating persistence state: "All changes saved" vs "Saving draft...".
  - Font size adjustment and theme toggle (`vs-dark` / `light`).
- **Database Model (`draft.py`):**
  - Table `code_drafts` with `id`, `candidate_id`, `problem_id`, `language`, `code_content`, and auto-updating `updated_at` timestamp.

---

## 🔗 How Your Feature Integrates
- **Exam Portal (Member 2 - `feat/fc-exam-portal-seb`):** Embeds your `MonacoEditor.tsx` in the candidate's main exam workspace.
- **Problem Bank (Member 1 - `feat/fc-problem-blueprints`):** Supplies the starter boilerplate code loaded into your editor when a question is chosen.
- **Execution Sandbox (Member 4 - `feat/fc-judge0-sandbox`):** Passes the live source code string from your editor to Judge0 when the candidate clicks "Run Test Cases".

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_drafts.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_a/MonacoEditor.tsx
   git add backend/api/drafts.py
   git add backend/models/draft.py
   git add backend/tests/test_drafts.py
   git commit -m "feat(editor): implement Monaco IDE wrapper, multi-language boilerplates, and auto-save draft API"
   git push origin feat/fc-monaco-editor
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-a/integration`). Attach your passing `pytest` terminal output and a screenshot of the `MonacoEditor.tsx` UI for our mentor's review.
