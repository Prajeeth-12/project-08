from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from backend.config import settings

# Initialize our primary async database engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

# Async session factory for request dependency injection
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
# Separate database engine for the Supabase question bank
question_bank_engine = create_async_engine(
    settings.QUESTION_BANK_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
) if settings.QUESTION_BANK_DATABASE_URL else None

QuestionBankSessionLocal = (
    async_sessionmaker(
        bind=question_bank_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    if question_bank_engine
    else None
)


async def get_question_bank_db() -> AsyncGenerator[AsyncSession, None]:
    if QuestionBankSessionLocal is None:
        raise RuntimeError("Question bank database URL is not configured")

    async with QuestionBankSessionLocal() as session:
        yield session
# Declarative base model for all our platform entities
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding isolated database sessions per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db() -> None:
    """Initialize database tables for local development and test runners."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
