# Member 6: Resume Document Ingestion & Structured Claim Extraction
**Branch:** `feat/ai-resume-claim-parser`  
**Module:** AI Live Interview Track (Module 2A: Resume Intelligence)  
**Lead Architect:** Prajeeth  

---

## 🎯 Your Goal & Purpose
Your mission is to build the **Resume Ingestion & Structured Claim Extraction Pipeline** for Project 08. Resumes are the bedrock of realistic technical interviews: your subsystem ingests candidate resumes in PDF format, extracts clean text using `pdfplumber` or `pypdf`, parses the contents into structured claims (technical skills, work experiences, projects, quantified impact metrics), and flags vague or unverifiable claims.

---

## 📂 Your 4 Assigned Files (Work ONLY in these files)
You own and will be graded on these 4 files:
1. **Frontend Component:** [`frontend/components/team_b/ResumeViewer.tsx`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/frontend/components/team_b/ResumeViewer.tsx)
2. **Backend API Router:** [`backend/api/resumes.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/api/resumes.py)
3. **Database Model:** [`backend/models/resume_claim.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/models/resume_claim.py)
4. **Pytest Suite:** [`backend/tests/test_resumes.py`](file:///C:/VsCode/Hope-Elite-Works/Sept-Project/backend/tests/test_resumes.py)

> ⚠️ **Rule:** Do NOT modify files belonging to other teammates. This ensures zero merge conflicts when opening your PR.

---

## 🚀 Key Features to Implement for Version 1
- **API Endpoints:**
  - `POST /api/v1/resumes/upload` — Multipart file upload endpoint accepting `.pdf` resumes, parsing raw text, and extracting structured claims.
  - `GET /api/v1/resumes/{id}/claims` — Returns parsed claims categorized into `skills` (languages, frameworks, tools), `experiences` (company, role, duration, achievements), `projects` (tech stack, metrics), and `verifiable_flags`.
- **Frontend UI (`ResumeViewer.tsx`):**
  - Drag-and-drop resume PDF upload dropzone with upload progress indicator.
  - Interactive parsed claims viewer: Categorized skill chips, highlighted key metrics, and expandable project summary cards.
- **Database Model (`resume_claim.py`):**
  - Table `resume_claims` storing `candidate_id`, `file_name`, `raw_text`, `skills` (JSON), `experiences` (JSON), `projects` (JSON), and timestamps.

---

## 🔗 How Your Feature Integrates
- **RAG Vector Engine (Member 7 - `feat/ai-resume-rag-retrieval`):** Consumes your extracted claim text and sections to generate vector embeddings and index them for semantic search.
- **AI Interview Agent (Track 2B - `develop`):** Uses your parsed skills and claims to dynamically formulate targeted technical interview questions during the live interview.

---

## 🧪 Testing & PR Submission Protocol
Before submitting your Pull Request for our mentor to evaluate:

1. Run your automated backend tests:
   ```bash
   pytest backend/tests/test_resumes.py -v
   ```
2. Verify frontend compilation:
   ```bash
   cd frontend && npm run build
   ```
3. Stage ONLY your assigned files:
   ```bash
   git add frontend/components/team_b/ResumeViewer.tsx
   git add backend/api/resumes.py
   git add backend/models/resume_claim.py
   git add backend/tests/test_resumes.py
   git commit -m "feat(resume): implement PDF ingestion, text parsing, and structured claim extraction"
   git push origin feat/ai-resume-claim-parser
   ```
4. Open your Pull Request on GitHub targeting `develop` (or `team-b/integration`). Attach your passing `pytest` terminal output and a screenshot of the `ResumeViewer.tsx` UI for our mentor's review.
