"""
Database package for handling all database operations.
"""

from .db_manager import DatabaseManager

# ── SQLAlchemy async engine for team-B platform endpoints ──
import os
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

_db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./project08.db")
_qb_url = os.getenv("QUESTION_BANK_DATABASE_URL", "")

_engine = create_async_engine(_db_url, echo=False, future=True)
_AsyncSessionLocal = async_sessionmaker(
    bind=_engine, class_=AsyncSession,
    expire_on_commit=False, autocommit=False, autoflush=False,
)

_qb_engine = create_async_engine(_qb_url, echo=False, pool_pre_ping=True) if _qb_url else None
_QuestionBankSessionLocal = (
    async_sessionmaker(bind=_qb_engine, class_=AsyncSession,
                       expire_on_commit=False, autoflush=False)
    if _qb_engine else None
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def get_question_bank_db() -> AsyncGenerator[AsyncSession, None]:
    if _QuestionBankSessionLocal is None:
        raise RuntimeError("QUESTION_BANK_DATABASE_URL not configured")
    async with _QuestionBankSessionLocal() as session:
        yield session

async def init_db() -> None:
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

__all__ = ["DatabaseManager", "get_db", "get_question_bank_db", "init_db", "Base"]