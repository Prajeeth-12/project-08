# Lead Architect: Master Stateful Agent Loop & Core Orchestration
**Branch:** `feat/ai-agent-core`  
**Module:** AI Live Interview Track (Module 2B: Core Orchestration)  
**Lead Architect:** Prajeeth  

---

## 🎯 Architecture Mission
This branch houses the central brain of Project 08: the **Stateful Probing Agent Loop**. Built on an **Observe -> Reason -> Decide -> Act** cycle, this orchestrator manages multi-turn conversational mock interviews, queries resume RAG context, dynamically probes candidate answers, and dispatches interactive coding challenges mid-interview when technical depth requires live verification.

---

## 📂 Core Orchestration Files
1. **Frontend App Root & Layout:** [`frontend/app/page.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/app/page.tsx)
2. **Backend Entrypoint & Probing API:** [`backend/main.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/main.py) & [`backend/api/probing.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/probing.py)
3. **Database Model:** [`backend/models/agent_turn.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/agent_turn.py)
4. **Pytest Suite:** [`backend/tests/test_probing.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_probing.py)

---

## 🚀 Key Orchestration Features
- **Stateful Agent Loop (Observe -> Reason -> Decide -> Act):**
  - **Observe:** Receives candidate answer transcript and queries resume claims from Member 7's RAG endpoint.
  - **Reason:** Evaluates factual claim consistency, identifies technical buzzwords without substantiation, and selects next probe depth.
  - **Decide:** Determines whether to ask a clarifying question, dive deeper into architecture, or transition to a live coding round.
  - **Act:** Dispatches streamed response via WebSocket or emits a tool invocation event (`CODING_CHALLENGE`).
- **Dynamic Tool Dispatching:** Automatically activates Member 3's Monaco Editor and Member 4's Judge0 console mid-interview.
- **Rubric Telemetry:** Feeds conversational turn context to Member 9's rubric evaluator for real-time scoring.

---

## 🧪 Testing Protocol
```bash
# Run agent loop tests
pytest backend/tests/test_probing.py -v

# Run full platform integration test suite
pytest backend/tests/ -v
```
