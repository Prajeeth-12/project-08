# Member 8: Live Interview Cockpit UI & WebSocket Client
**Branch:** `feat/ai-interview-cockpit`  
**Module:** AI Live Interview Track (Module 2B: AI Interview Agent)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the **Live Interview Cockpit UI & WebSocket Communication Subsystem** for Project 08. This is the central candidate-facing interview room: providing a live webcam feed placeholder, audio waveform visualizer with microphone mute/unmute toggles, real-time streaming conversation transcript feed, speaking/thinking indicator status, and dynamic interactive prompt cards when the AI interviewer invokes coding challenges or technical probing tools mid-interview.

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_a/LiveCockpit.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_a/LiveCockpit.tsx)
2. **Backend API Router:** [`backend/api/sessions.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/sessions.py)
3. **Database Model:** [`backend/models/session.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/session.py)
4. **Pytest Suite:** [`backend/tests/test_sessions.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_sessions.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `WS /api/v1/sessions/ws/{session_id}` — Bidirectional WebSocket connection endpoint handling live chat turns, heartbeats, and reconnect resilience.
  - `POST /api/v1/sessions/start` — Initializes a new interview session with candidate ID, target role, and default stage (`WAITING` -> `TECH`).
  - `POST /api/v1/sessions/end` — Closes the active interview session, computes total interview duration, and marks stage as `COMPLETED`.
  - `GET /api/v1/sessions/{id}` — Fetches session details and full conversation history log.
- **Frontend UI (`LiveCockpit.tsx`):**
  - Modern video/audio interview room layout with candidate video tile and AI interviewer visual card.
  - Interactive audio visualizer waveform and mic controls (Mute, Unmute, Push-to-Talk).
  - Live conversation transcript stream auto-scrolling to the latest turn.
  - Dynamic action banner: Displays alerts when AI interviewer triggers a coding round ("Switching to Live Coding Environment...").
- **Database Model (`session.py`):**
  - Table `interview_sessions` with `id`, `candidate_id`, `role_title`, `stage` (`WAITING`, `TECH`, `CODING_TOOL`, `SYSTEM_DESIGN`, `EVALUATING`, `COMPLETED`), `transcript` (JSON serialized turns), and timestamps.

---

## 🔗 How Your Feature Integrates
- **Master Agent Loop (`develop` / `feat/ai-agent-core`):** Connects to your WebSocket endpoint to stream AI probe questions and receive candidate answers.
- **Rubric Evaluator (Member 9 - `feat/ai-rubric-evaluator`):** Consumes the conversation transcript generated in your session to score the candidate's performance.
- **Resume Intelligence (Members 6 & 7):** Provides candidate profile context displayed on your interview cockpit header.

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_sessions.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_a/LiveCockpit.tsx
   git add backend/api/sessions.py
   git add backend/models/session.py
   git add backend/tests/test_sessions.py
   git commit -m "feat(cockpit): implement live interview room, WebSocket stream client, and session lifecycle API"
   git push origin feat/ai-interview-cockpit
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-a/integration`). Attach your passing `pytest` terminal output and a screenshot of the `LiveCockpit.tsx` UI for our mentor's review.
