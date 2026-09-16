from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import init_db
from backend.api.auth import router as auth_router
from backend.api.drafts import router as drafts_router
from backend.api.execution import router as execution_router
from backend.api.sessions import router as sessions_router
from backend.api.probing import router as probing_router
from backend.api.code_review import router as code_review_router
from backend.api.resumes import router as resumes_router
from backend.api.questions import router as questions_router
from backend.api.exams import router as exams_router
from backend.api.evaluations import router as evaluations_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler initializing DB tables and startup resources."""
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production API for Project 08 AI Mock Interview & Coding Platform",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers for all 10 member slices across Squad A and Squad B
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(drafts_router, prefix=settings.API_V1_STR)
app.include_router(execution_router, prefix=settings.API_V1_STR)
app.include_router(sessions_router, prefix=settings.API_V1_STR)
app.include_router(probing_router, prefix=settings.API_V1_STR)
app.include_router(code_review_router, prefix=settings.API_V1_STR)
app.include_router(resumes_router, prefix=settings.API_V1_STR)
app.include_router(questions_router, prefix=settings.API_V1_STR)
app.include_router(exams_router, prefix=settings.API_V1_STR)
app.include_router(evaluations_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }
