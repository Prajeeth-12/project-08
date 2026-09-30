# Project 08 — AWS Migration Plan
## Local Docker Compose → Production AWS Architecture

> **Status:** Planning · **Branch:** `integration/full-merge`
> **Goal:** Move every local Docker service to its cloud-managed AWS equivalent with zero feature regression.

---

## Table of Contents
1. [Target AWS Architecture Diagram](#1-target-aws-architecture-diagram)
2. [Component Mapping](#2-component-mapping)
3. [Network & Traffic Flow](#3-network--traffic-flow)
4. [Files That Must Change](#4-files-that-must-change)
5. [Change Details — File by File](#5-change-details--file-by-file)
6. [Migration Phases](#6-migration-phases)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [Environment Variables — Production](#8-environment-variables--production)
9. [Risk Register](#9-risk-register)

---

## 1. Target AWS Architecture Diagram

```
                          ┌─────────────────────┐
                          │   Route 53 (DNS)     │
                          │  interview.example.in │
                          └──────────┬────────────┘
                                     │
                          ┌──────────▼────────────┐
                          │  ACM (SSL/TLS cert)   │
                          └──────────┬────────────┘
                                     │
               ┌─────────────────────┼──────────────────────┐
               │                     │                      │
    ┌──────────▼──────────┐          │           ┌──────────▼──────────┐
    │   CloudFront (CDN)  │          │           │  ALB (port 443)     │
    │   S3 Origin (OAC)   │          │           │                     │
    │   React SPA assets  │          │           │  Listener rules:    │
    │   Monaco chunks     │          │           │  /api/*  → ECS TG   │
    │   Cache-Control     │          │           │  /auth/* → ECS TG   │
    └─────────────────────┘          │           │  /ws/*   → ECS TG   │
                                     │           │  (sticky, 600s)     │
                                     │           └──────────┬──────────┘
                                     │                      │
                          ┌──────────▼──────────────────────▼──────────┐
                          │              VPC (ap-south-1)               │
                          │                                             │
                          │  Public Subnets:  ALB, NAT Gateway          │
                          │  Private Subnets: ECS, RDS, Redis, Judge0   │
                          │                                             │
                          │  ┌─────────────────────────────────────┐   │
                          │  │   ECS Cluster (Fargate)             │   │
                          │  │                                     │   │
                          │  │   ┌──────────────┐  ┌───────────┐  │   │
                          │  │   │ Web Service  │  │  Worker   │  │   │
                          │  │   │ FastAPI:8000 │  │ (SQS      │  │   │
                          │  │   │ 63 routes    │  │  consumer)│  │   │
                          │  │   │ ORDA agents  │  │ scorecard │  │   │
                          │  │   │ WebSocket    │  │ eval gen  │  │   │
                          │  │   └──────┬───────┘  └─────┬─────┘  │   │
                          │  └──────────┼────────────────┼─────────┘   │
                          │             │                │             │
                          │  ┌──────────▼────────┐       │             │
                          │  │ ElastiCache Redis │       │             │
                          │  │ - FSM state       │       │             │
                          │  │ - WS presence     │       │             │
                          │  │ - rate limits     │◄──────┘             │
                          │  │ - SEB tokens      │                     │
                          │  └───────────────────┘                     │
                          │                                             │
                          │  ┌────────────────────┐                    │
                          │  │  RDS PostgreSQL     │                    │
                          │  │  Multi-AZ, 20GB     │                    │
                          │  │  All 12+5 tables    │                    │
                          │  └────────────────────┘                    │
                          │                                             │
                          │  ┌──────────────┐  ┌──────────────────┐   │
                          │  │  S3 Buckets  │  │ Judge0 (EC2/ECS) │   │
                          │  │  - resumes   │  │ private subnet   │   │
                          │  │  - recordings│  │ no RDS access    │   │
                          │  └──────────────┘  └──────────────────┘   │
                          └─────────────────────────────────────────────┘
                                     │
                          ┌──────────▼────────────┐
                          │  Secrets Manager /    │
                          │  SSM Parameter Store  │
                          │  Groq, Deepgram,      │
                          │  DB creds, Cognito    │
                          └───────────────────────┘
                                     │
                          ┌──────────▼────────────┐
                          │  ECR (Docker images)  │
                          │  Built by GitHub      │
                          │  Actions CI/CD        │
                          └───────────────────────┘
```

---

## 2. Component Mapping

| Local | AWS | Notes |
|---|---|---|
| Vite dev server / Nginx `:3000` | **S3 + CloudFront** | Static React SPA; OAC policy; Monaco chunks cached at edge |
| `localhost` | **Route 53 + ACM** | Custom domain, HTTPS, cert auto-renewal |
| Nginx reverse proxy | **ALB + Target Groups** | `/api/*`, `/auth/*`, `/ws/*` → ECS; idle timeout 600s for WS |
| FastAPI container `:8000` | **ECS Fargate (Web Service)** | 2 tasks min, auto-scale on CPU; same Docker image |
| Post-interview eval worker | **ECS Fargate (Worker Service)** | SQS consumer; runs `eval_engine` async |
| `aiosqlite` SQLite file | **RDS PostgreSQL 15** | `asyncpg` driver; Multi-AZ for HA |
| In-memory session dicts | **ElastiCache Redis 7** | FSM state, WS presence, rate limits, SEB tokens |
| Local filesystem (`./uploads`) | **S3** | Presigned upload URLs; resumes + recordings |
| `USE_MOCK_AUTH=true` JWT | **Cognito User Pools** | Already wired in `auth_api.py`; just needs real pool IDs |
| `.env` file | **Secrets Manager + SSM** | ECS task definitions inject at runtime |
| Local Docker Engine | **ECR** | GitHub Actions builds + pushes on merge to `main` |
| `Judge0` localhost | **Judge0 on EC2 / Fargate** | Private subnet; no RDS/metadata access |
| `docker compose up` | **GitHub Actions → ECS deploy** | Blue/green via CodeDeploy or `ecs update-service` |

---

## 3. Network & Traffic Flow

### 3.1 Frontend (Read Path)
```
User browser
  → Route 53 (interview.example.in)
  → CloudFront (edge cache, OAC)
  → S3 bucket (index.html + JS/CSS chunks)
  [cache hit: served from edge — no S3 request]
```

### 3.2 API Calls (Write Path)
```
React axios (Authorization: Bearer <jwt>)
  → CloudFront /api/* forwarded (no cache, origin = ALB)
  OR directly → ALB (api.interview.example.in)
  → Target Group (ECS Fargate tasks)
  → FastAPI route handler
  → RDS PostgreSQL / Redis / S3 / Groq/Deepgram
```

### 3.3 WebSocket (Voice Interview)
```
useVoiceFirstInterview hook
  → WSS wss://api.interview.example.in/ws/interview/{session_id}
  → ALB (sticky session by session_id cookie, idle timeout 600s)
  → ECS Fargate task (same task for duration of interview)
  → Deepgram STT stream → ORDA loop → TTS response
  [Redis: FSM state checkpointed every turn]
```

### 3.4 File Upload (Resume RAG)
```
ProfilePage → POST /files/presigned → S3 presigned URL
  → Frontend PUT directly to S3 (bypasses backend bandwidth)
  → Backend: s3.get_object(bucket, key) → pypdf stream → RAG embed
```

---

## 4. Files That Must Change

### Priority 1 — MUST change before AWS works at all

| File | What breaks without it |
|---|---|
| `backend/config.py` | Still defaults to SQLite; will crash on RDS PostgreSQL if not updated |
| `backend/database.py` | No Redis import; FSM state will be lost on Fargate task replacement |
| `backend/api/auth_api.py` | `USE_MOCK_AUTH` guard is fine; just need real Cognito env vars populated |
| `backend/main.py` | CORS needs production domain added; no wildcard in prod |
| `Dockerfile.backend` | Needs `--workers 2` (Fargate has 2 vCPU); remove `--reload` flag |
| `docker-compose.yml` | Not used in AWS, but add `docker-compose.prod.yml` override |
| `backend/.env.example` → `.env.production` | All secrets must come from Secrets Manager, not file |
| `frontend/src/contexts/AuthContext.tsx` | `VITE_API_BASE_URL` must point to ALB domain, not localhost |
| `frontend/vite.config.ts` | Build output must match S3/CloudFront cache headers |

### Priority 2 — MUST change for stateful features to survive scaling

| File | What breaks without it |
|---|---|
| `backend/services/session_manager.py` | `ThreadSafeSessionRegistry` is in-memory only → lost on task restart |
| `backend/agents/orchestrator.py` | `AgentSessionManager` holds FSM state in Python object → not Redis-backed |
| `backend/api/interview_ws.py` | WebSocket handler needs Redis pub/sub for multi-task WS routing |
| `backend/utils/event_bus.py` | `EventBus` is in-memory → events lost if wrong task handles reconnect |

### Priority 3 — MUST change for file/storage features

| File | What breaks without it |
|---|---|
| `backend/api/file_processing_api.py` | Writes to local filesystem → data lost when Fargate task dies |
| `backend/rag/parser.py` | Reads from local path → won't work in ephemeral container |
| `backend/api/resumes.py` | Resume storage is local → lost on restart |

### Priority 4 — MUST change for post-interview eval async flow

| File | What breaks without it |
|---|---|
| `backend/api/agent_api.py` | `POST /interview/end` triggers eval synchronously → times out on ALB (60s default) |
| `backend/eval_engine/` (all files) | Should run in SQS Worker, not in web request thread |

### Priority 5 — Code execution security

| File | What breaks without it |
|---|---|
| `backend/api/exams.py` | Judge0 URL must point to private EC2, not public internet |
| `backend/config.py` | `JUDGE0_URL` must be internal VPC DNS, not `localhost` |

---

## 5. Change Details — File by File

### `backend/config.py`
**Change:** Remove SQLite default. Add Redis URL, S3 bucket names, prod domain.
```python
# BEFORE
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/project08.db")

# AFTER
DATABASE_URL: str = os.getenv("DATABASE_URL")  # required in prod; fails fast if missing
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
S3_RESUME_BUCKET: str = os.getenv("S3_RESUME_BUCKET", "")
S3_RECORDINGS_BUCKET: str = os.getenv("S3_RECORDINGS_BUCKET", "")
ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "http://localhost:8000").split(",")
```

---

### `backend/main.py`
**Change:** CORS origins from env var (not hardcoded localhost list). Add health route that checks RDS + Redis.
```python
# BEFORE
_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,...")]

# AFTER
_ALLOWED_ORIGINS = settings.ALLOWED_ORIGINS  # comes from SSM/Secrets Manager
# e.g. ["https://interview.example.in", "https://www.interview.example.in"]
```

---

### `backend/services/session_manager.py`
**Change:** Replace in-memory `dict` with Redis-backed session store.
```python
# BEFORE
class ThreadSafeSessionRegistry:
    def __init__(self):
        self._sessions: Dict[str, AgentSessionManager] = {}  # lost on restart

# AFTER
import redis.asyncio as aioredis

class RedisSessionRegistry:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url)

    async def save(self, session_id: str, state: dict):
        await self.redis.setex(f"session:{session_id}", 3600, json.dumps(state))

    async def load(self, session_id: str) -> dict:
        raw = await self.redis.get(f"session:{session_id}")
        return json.loads(raw) if raw else None
```
**New dependency to add to `requirements.txt`:** `redis[asyncio]==5.0.8`

---

### `backend/agents/orchestrator.py`
**Change:** Checkpoint FSM state to Redis after every turn.
```python
# After each ORDA turn in process_message():
state_snapshot = {
    "phase": self._interviewer.state.phase.value,
    "asked_count": self._interviewer.state.asked_question_count,
    "areas_covered": self._interviewer.state.areas_covered,
    "conversation_history": self.conversation_history[-20:],  # last 20 turns
}
await session_registry.save(self.session_id, state_snapshot)
```

---

### `backend/api/interview_ws.py`
**Change:** Add Redis pub/sub so any Fargate task can serve a reconnecting WebSocket.
```python
# On WS connect: subscribe to Redis channel f"ws:{session_id}"
# On WS disconnect: publish reconnect event to channel
# Any task that holds the session picks up the reconnect
```

---

### `backend/api/file_processing_api.py`
**Change:** Replace local disk write with S3 presigned URL flow.
```python
# BEFORE
with open(f"./uploads/{filename}", "wb") as f:
    f.write(await file.read())

# AFTER — two routes needed:
# 1. GET /files/presigned?filename=resume.pdf → s3.generate_presigned_post()
# 2. POST /files/confirm {s3_key} → stream from S3 → pypdf → embed
import boto3
s3 = boto3.client("s3", region_name=settings.AWS_REGION)

def get_presigned_upload(filename: str) -> dict:
    return s3.generate_presigned_post(
        Bucket=settings.S3_RESUME_BUCKET,
        Key=f"resumes/{filename}",
        ExpiresIn=300,
    )
```

---

### `backend/api/agent_api.py` — `POST /interview/end`
**Change:** Offload `eval_engine` to SQS instead of blocking the HTTP response.
```python
# BEFORE (blocks for 10-30s)
summary = await eval_engine.generate_full_report(session)
return EndResponse(summary=summary)

# AFTER (returns instantly, worker processes async)
import boto3
sqs = boto3.client("sqs", region_name=settings.AWS_REGION)
sqs.send_message(
    QueueUrl=settings.EVAL_QUEUE_URL,
    MessageBody=json.dumps({"session_id": session_id, "user_id": user["id"]}),
)
return EndResponse(message="Interview ended. Scorecard generating.", session_id=session_id)
# Client polls GET /interview/final-summary-status
```
**New file needed:** `backend/workers/eval_worker.py` — SQS consumer that runs `eval_engine`.

---

### `Dockerfile.backend`
**Change:** Production CMD — no `--reload`, correct worker count for Fargate (2 vCPU).
```dockerfile
# BEFORE (dev)
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--lifespan", "on"]

# AFTER (prod)
CMD ["python", "-m", "uvicorn", "backend.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2", \
     "--lifespan", "on", \
     "--log-level", "info", \
     "--access-log"]
```
Add `Dockerfile.worker` for the SQS eval consumer (same base image, different CMD).

---

### `frontend/src/contexts/AuthContext.tsx`
**Change:** `VITE_API_BASE_URL` must point to ALB subdomain in prod build.
```typescript
// BEFORE (empty = nginx proxy)
const API_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8010';

// AFTER — set via CloudFront build arg in GitHub Actions:
// VITE_API_BASE_URL=https://api.interview.example.in
// No code change needed — just set the build arg correctly in CI.
```

---

### `frontend/vite.config.ts`
**Change:** Add build output hashing for CloudFront long-cache headers.
```typescript
// AFTER
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
})
// CloudFront rule: Cache-Control: max-age=31536000, immutable on /assets/*
// Cache-Control: no-cache on /index.html (always fresh)
```

---

### `backend/api/exams.py` — SEB headers
**Change:** Validate `X-SafeExamBrowser-RequestHash` header on exam submit.
```python
# AFTER — add to submit endpoint
seb_hash = request.headers.get("X-SafeExamBrowser-RequestHash")
if not seb_hash or not verify_seb_hash(seb_hash, settings.SEB_CONFIG_KEY):
    raise HTTPException(403, "Invalid SEB session")
```

---

### `backend/requirements.txt`
**New packages to add:**
```
redis[asyncio]==5.0.8      # Redis-backed session registry
boto3==1.38.25             # already present — verify S3/SQS usage
aioboto3==12.4.0           # async S3 operations in FastAPI routes
```

---

## 6. Migration Phases

### Phase 0 — Infra Provisioning (Terraform / CloudFormation)
- [ ] VPC with public + private subnets across 2 AZs
- [ ] RDS PostgreSQL 15 (Multi-AZ, t3.medium to start)
- [ ] ElastiCache Redis 7 (t3.micro cluster mode off)
- [ ] ECR repository (`project08-backend`, `project08-worker`)
- [ ] S3 buckets (resumes, recordings, frontend)
- [ ] CloudFront distribution with OAC → S3
- [ ] ALB with HTTPS listener + target groups
- [ ] ECS Cluster (Fargate)
- [ ] Cognito User Pool with `candidate`/`faculty`/`admin` groups
- [ ] Secrets Manager entries for all API keys
- [ ] SQS queue (`project08-eval-queue`)
- [ ] Route 53 hosted zone + ACM certificate

### Phase 1 — Backend: Database Migration
- [ ] Update `config.py` — remove SQLite default
- [ ] Update `database.py` — add Redis client init
- [ ] Run `alembic upgrade head` as one-off ECS task against RDS
- [ ] Verify all 17 tables created in PostgreSQL
- [ ] Smoke test: `POST /auth/login` with Cognito real credentials

### Phase 2 — Backend: State & Storage
- [ ] Implement `RedisSessionRegistry` in `session_manager.py`
- [ ] Checkpoint FSM state in `orchestrator.py`
- [ ] Redis pub/sub for WebSocket routing in `interview_ws.py`
- [ ] S3 presigned upload in `file_processing_api.py`
- [ ] Update `rag/parser.py` to stream from S3

### Phase 3 — Backend: Async Worker
- [ ] Create `backend/workers/eval_worker.py` (SQS consumer)
- [ ] Update `agent_api.py /end` to enqueue SQS message
- [ ] Create `Dockerfile.worker`
- [ ] Deploy Worker ECS service (0 min, auto-scale on SQS depth)

### Phase 4 — Frontend: Build & CDN
- [ ] Set `VITE_API_BASE_URL=https://api.interview.example.in` in CI
- [ ] Add content hash to `vite.config.ts` build output
- [ ] Upload dist to S3, invalidate CloudFront

### Phase 5 — Auth Cutover
- [ ] Set `USE_MOCK_AUTH=false` in ECS task definition
- [ ] Set `COGNITO_USER_POOL_ID` + `COGNITO_CLIENT_ID` in Secrets Manager
- [ ] Test all three roles end-to-end with real Cognito tokens

### Phase 6 — Exam Track (SEB + Judge0)
- [ ] Deploy Judge0 in private subnet EC2 (or Fargate)
- [ ] Set `JUDGE0_URL` to internal VPC DNS
- [ ] Add SEB header validation to `exams.py`
- [ ] Security group: Judge0 SG allows only ECS SG inbound

---

## 7. CI/CD Pipeline

```
GitHub push → main
        │
        ▼
GitHub Actions: .github/workflows/deploy.yml
        │
        ├── 1. Test: pytest backend/tests/
        ├── 2. Build: docker build -f Dockerfile.backend -t backend .
        ├── 3. Build: docker build -f Dockerfile.worker  -t worker  .
        ├── 4. Push:  ECR push backend:$SHA, worker:$SHA
        ├── 5. Migrate: ecs run-task (alembic upgrade head) — wait for exit 0
        ├── 6. Deploy: ecs update-service --image backend:$SHA (Web)
        ├── 7. Deploy: ecs update-service --image worker:$SHA  (Worker)
        └── 8. Frontend:
              npm ci && npm run build
              aws s3 sync dist/ s3://project08-frontend-prod/
              aws cloudfront create-invalidation --paths "/*"
```

**New file needed:** `.github/workflows/deploy.yml`

---

## 8. Environment Variables — Production

All injected via ECS Task Definition → `secretsFrom` (Secrets Manager) or `environment` (SSM plaintext):

```bash
# Runtime
ENVIRONMENT=production
PORT=8000
LOG_LEVEL=info

# Database & Cache
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${RDS_HOST}:5432/project08
REDIS_URL=redis://${REDIS_HOST}:6379/0

# Storage
AWS_REGION=ap-south-1
S3_RESUME_BUCKET=project08-resumes-prod
S3_RECORDINGS_BUCKET=project08-recordings-prod

# Auth
USE_MOCK_AUTH=false
COGNITO_REGION=ap-south-1
COGNITO_USER_POOL_ID=ap-south-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# AI / Voice
DEEPGRAM_API_KEY=<from Secrets Manager>
GROQ_API_KEY=<from Secrets Manager>
GEMINI_API_KEY=<from Secrets Manager>

# Code Execution
JUDGE0_URL=http://judge0.internal.vpc:2358

# Exam Security
SEB_CONFIG_KEY=<from Secrets Manager>

# Async Queue
EVAL_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789/project08-eval-queue

# CORS
ALLOWED_ORIGINS=https://interview.example.in,https://www.interview.example.in
```

---

## 9. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| WebSocket drops on Fargate task replacement | Interview lost mid-session | Redis FSM checkpoint + client reconnect with session_id cookie |
| ALB 60s idle timeout severs quiet interviews | Candidate disconnected | ALB idle timeout → 600s + client ping every 30s |
| Multiple Fargate tasks run Alembic migrations simultaneously | Schema corruption | Run migration as one-off ECS task in CI, before web service update |
| Judge0 untrusted code escapes to internal VPC | RDS/Redis compromised | Judge0 in isolated private subnet, security group allows only ECS inbound, no internet egress |
| Cognito JWKS fetch fails on cold start | All requests 401 | Cache JWKS in Redis with 1hr TTL; fall back to last known key on Cognito outage |
| S3 presigned URL expires before large PDF upload | Resume upload fails | Set presign expiry to 5 min; retry in frontend on 403 |
| CloudFront serves stale `index.html` after deploy | React app loads wrong JS | `Cache-Control: no-cache` on `index.html`; hash-named assets cached indefinitely |
| ECS tasks scale out mid-interview | Session state on wrong task | Redis session store; ALB sticky session to preferred task, Redis as fallback |

---

*Plan authored from `integration/full-merge` codebase · Sep 2026*
