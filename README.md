# Member 2: Candidate Exam Portal & SEB Lockdown Environment
**Branch:** `feat/fc-exam-portal-seb`  
**Module:** Formal Coding Track (Module 1)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the **Candidate Exam Portal & Safe Exam Browser (SEB) Lockdown Environment** for Project 08. This subsystem acts as the secure examination gatekeeper: verifying student access passkeys, validating Safe Exam Browser security headers, maintaining the official exam countdown timer, and logging real-time anti-cheat telemetry (fullscreen exits, tab switches, window blurs, and unauthorized clipboard attempts).

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_b/ExamPortal.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_b/ExamPortal.tsx)
2. **Backend API Router:** [`backend/api/exams.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/exams.py)
3. **Database Model:** [`backend/models/formal_exam.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/formal_exam.py)
4. **Pytest Suite:** [`backend/tests/test_exams.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_exams.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `POST /api/v1/exams/start` — Validate exam passkey, issue session token, verify Safe Exam Browser (SEB) configuration headers, and initialize the candidate exam window.
  - `POST /api/v1/exams/event` — Telemetry ingest endpoint that logs proctoring security flags (`TAB_SWITCH`, `FULLSCREEN_EXIT`, `WINDOW_BLUR`, `PASTE_ATTEMPT`) with timestamps.
  - `GET /api/v1/exams/{id}/status` — Returns exam duration remaining, active state, and violation strike count.
- **Frontend UI (`ExamPortal.tsx`):**
  - Full-screen examination layout with prominent countdown clock.
  - Security warning status banner showing SEB lockdown status.
  - Violation modal alert triggered when anti-cheat events (tab switch or blur) are detected by the browser window listeners.
- **Database Model (`formal_exam.py`):**
  - Table `formal_exams` and `exam_sessions` tracking scheduled times, passcode hashes, violation counts, and session state (`ACTIVE`, `SUBMITTED`, `TERMINATED`).

---

## 🔗 How Your Feature Integrates
- **Problem Bank (Member 1 - `feat/fc-problem-blueprints`):** Your portal displays the problem blueprint fetched from Member 1's API.
- **Monaco Editor (Member 3 - `feat/fc-monaco-editor`):** Your portal embeds Member 3's Monaco Editor component inside the secure workspace.
- **Verdict Engine (Member 5 - `feat/fc-verdict-engine`):** When the candidate clicks "Submit Exam" or timer expires, your portal triggers Member 5's evaluation pipeline.

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_exams.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_b/ExamPortal.tsx
   git add backend/api/exams.py
   git backend/models/formal_exam.py
   git add backend/tests/test_exams.py
   git commit -m "feat(exams): implement exam session start, SEB header check, and proctoring telemetry"
   git push origin feat/fc-exam-portal-seb
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-b/integration`). Attach your passing `pytest` terminal output and a screenshot of the `ExamPortal.tsx` UI for our mentor's review.
