# Member 7: Semantic Chunking, Vector Embeddings & RAG Retrieval API
**Branch:** `feat/ai-resume-rag-retrieval`  
**Module:** AI Live Interview Track (Module 2A: Resume Intelligence)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the **RAG Vector Retrieval Engine & Candidate Knowledge Hub** for Project 08. While Member 6 extracts structured text from resumes, your engine takes that content, semantically chunks it, computes vector embeddings, stores them in our vector store, and exposes a high-speed top-k retrieval API (`GET /api/v1/resumes/{id}/query?q=...`). This empowers the AI Interviewer to retrieve relevant project evidence and metrics on-the-fly during multi-turn interviews.

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_b/AuthModal.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_b/AuthModal.tsx) *(Candidate Knowledge & Profile Hub)*
2. **Backend API Router:** [`backend/api/auth.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/auth.py) *(Candidate Knowledge & Retrieval Endpoints)*
3. **Database Model:** [`backend/models/user.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/user.py) *(Candidate Profile & Indexed Knowledge Chunks)*
4. **Pytest Suite:** [`backend/tests/test_auth.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_auth.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `POST /api/v1/resumes/{id}/index` — Splits candidate resume claims into semantic chunks, generates vector embeddings, and stores them in vector storage.
  - `GET /api/v1/resumes/{id}/query?q=...` — Top-K semantic search endpoint that accepts a query (e.g., "PostgreSQL scaling experience") and returns the most relevant resume passages with similarity scores.
  - `POST /api/v1/auth/login` & `POST /api/v1/auth/register` — Candidate authentication and session token generation.
- **Frontend UI (`AuthModal.tsx`):**
  - Candidate profile and authentication modal with sign-in and sign-up tabs.
  - Knowledge indexing status indicator: e.g., "Resume Indexed: 14 Semantic Chunks Ready for AI Interview".
- **Database Model (`user.py`):**
  - Table `users` and related knowledge metadata fields for candidate authentication, role selection, and linked embedding references.

---

## 🔗 How Your Feature Integrates
- **Resume Ingestion (Member 6 - `feat/ai-resume-claim-parser`):** You consume the raw text and structured claims parsed by Member 6 to build the vector knowledge base.
- **AI Interview Agent (Track 2B - `develop`):** The central agentic loop queries your semantic search endpoint (`/query?q=...`) mid-interview to verify candidate answers against their claimed resume experience.

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_auth.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_b/AuthModal.tsx
   git add backend/api/auth.py
   git add backend/models/user.py
   git add backend/tests/test_auth.py
   git commit -m "feat(rag): implement candidate auth, semantic text chunking, and resume vector retrieval API"
   git push origin feat/ai-resume-rag-retrieval
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-b/integration`). Attach your passing `pytest` terminal output and a screenshot of the `AuthModal.tsx` UI for our mentor's review.
