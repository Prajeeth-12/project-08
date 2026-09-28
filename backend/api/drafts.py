from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.draft import Draft


router = APIRouter(prefix="/api/code", tags=["code"])


class DraftCreate(BaseModel):
    draft_id: UUID | None = None
    user_id: UUID
    session_id: UUID
    question_id: str
    language: str
    source_code: str


class DraftResponse(BaseModel):
    id: UUID
    user_id: UUID
    session_id: UUID
    question_id: str
    language: str
    source_code: str
    version: int
    saved_at: datetime


@router.post("/drafts", response_model=DraftResponse)
async def create_draft(
    draft_data: DraftCreate,
    db: AsyncSession = Depends(get_db),
):
    if draft_data.draft_id:
        result = await db.execute(
            select(Draft).where(Draft.id == draft_data.draft_id)
        )

        draft = result.scalar_one_or_none()

        if draft is None:
            raise HTTPException(
                status_code=404,
                detail="Draft not found",
            )

        draft.source_code = draft_data.source_code
        draft.version += 1

    else:
        result = await db.execute(
            select(Draft).where(
                Draft.user_id == draft_data.user_id,
                Draft.session_id == draft_data.session_id,
                Draft.question_id == draft_data.question_id,
                Draft.language == draft_data.language,
            )
        )

        draft = result.scalar_one_or_none()

        if draft:
            draft.source_code = draft_data.source_code
            draft.version += 1

        else:
            draft = Draft(
                user_id=draft_data.user_id,
                session_id=draft_data.session_id,
                question_id=draft_data.question_id,
                language=draft_data.language,
                source_code=draft_data.source_code,
                version=1,
            )

            db.add(draft)

    await db.commit()
    await db.refresh(draft)

    return {
        "id": draft.id,
        "user_id": draft.user_id,
        "session_id": draft.session_id,
        "question_id": draft.question_id,
        "language": draft.language,
        "source_code": draft.source_code,
        "version": draft.version,
        "saved_at": draft.saved_at,
    }


@router.get("/drafts", response_model=DraftResponse | None)
async def get_draft(
    user_id: UUID,
    session_id: UUID,
    question_id: str,
    language: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Draft).where(
            Draft.user_id == user_id,
            Draft.session_id == session_id,
            Draft.question_id == question_id,
            Draft.language == language,
        )
    )

    draft = result.scalar_one_or_none()

    if draft is None:
        return None

    return {
        "id": draft.id,
        "user_id": draft.user_id,
        "session_id": draft.session_id,
        "question_id": draft.question_id,
        "language": draft.language,
        "source_code": draft.source_code,
        "version": draft.version,
        "saved_at": draft.saved_at,
    }