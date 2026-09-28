from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.draft import CodeDraft

router = APIRouter(prefix="/code", tags=["Code Workspace & Drafts (Member A1)"])

class SaveDraftRequest(BaseModel):
    session_id: str
    candidate_id: Optional[str] = None
    language: str = "python"
    code_content: str

class DraftResponse(BaseModel):
    id: str
    session_id: str
    candidate_id: Optional[str]
    language: str
    code_content: str
    updated_at: datetime

@router.post("/drafts", response_model=DraftResponse)
async def save_or_update_draft(req: SaveDraftRequest, db: AsyncSession = Depends(get_db)):
    """Auto-save debounced code draft state during live interview or coding session."""
    stmt = (
        select(CodeDraft)
        .where(CodeDraft.session_id == req.session_id)
        .order_by(desc(CodeDraft.updated_at))
    )
    result = await db.execute(stmt)
    draft = result.scalars().first()

    if draft:
        draft.language = req.language
        draft.code_content = req.code_content
        draft.updated_at = datetime.utcnow()
    else:
        draft = CodeDraft(
            session_id=req.session_id,
            candidate_id=req.candidate_id,
            language=req.language,
            code_content=req.code_content,
        )
        db.add(draft)

    await db.flush()
    return DraftResponse(
        id=draft.id,
        session_id=draft.session_id,
        candidate_id=draft.candidate_id,
        language=draft.language,
        code_content=draft.code_content,
        updated_at=draft.updated_at,
    )

@router.get("/drafts/{session_id}", response_model=DraftResponse)
async def get_latest_draft(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve the latest code draft snapshot for a session."""
    stmt = (
        select(CodeDraft)
        .where(CodeDraft.session_id == session_id)
        .order_by(desc(CodeDraft.updated_at))
    )
    result = await db.execute(stmt)
    draft = result.scalars().first()

    if not draft:
        raise HTTPException(status_code=404, detail="No code draft found for this session")

    return DraftResponse(
        id=draft.id,
        session_id=draft.session_id,
        candidate_id=draft.candidate_id,
        language=draft.language,
        code_content=draft.code_content,
        updated_at=draft.updated_at,
    )
