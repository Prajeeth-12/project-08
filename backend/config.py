import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Project 08 - AI Mock Interview & Assessment Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database Configuration (PostgreSQL in production, async SQLite fallback for local development)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./project08.db")

    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "project08-super-secure-production-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Code Execution Sandbox (Judge0)
    JUDGE0_URL: str = os.getenv("JUDGE0_URL", "https://judge0-ce.p.rapidapi.com")
    JUDGE0_API_KEY: str = os.getenv("JUDGE0_API_KEY", "")
    EXECUTION_CPU_TIMEOUT: float = 2.0  # seconds
    EXECUTION_MEMORY_LIMIT: int = 128000  # KB (128MB)

    # AI LLM Engine
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

settings = Settings()
