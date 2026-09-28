"""
Blueprint API — V2.
POST /api/blueprints/create   generate blueprint from profile + role
GET  /api/blueprints/{id}     fetch stored blueprint
"""

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.blueprint import generate_blueprint, InterviewBlueprint
from backend.api.auth_api import get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/blueprints", tags=["blueprints"])

# In-memory store until proper DB persistence is wired (Phase 0 migrations)
_blueprint_store: dict = {}


class BlueprintCreateRequest(BaseModel):
    role: str
    seniority: str = "mid"
    duration_minutes: int = 30
    skills: list = []
    claims: list = []


class BlueprintResponse(BaseModel):
    id: str
    blueprint: dict


@router.post("/create", response_model=BlueprintResponse)
async def create_blueprint(
    body: BlueprintCreateRequest,
    user: Optional[dict] = Depends(get_current_user_optional),
):
    try:
        llm_service = None
        try:
            from backend.services import get_llm_service
            llm_service = get_llm_service()
        except Exception:
            pass

        blueprint = generate_blueprint(
            role=body.role,
            skills=body.skills,
            claims=body.claims,
            seniority=body.seniority,
            duration_minutes=body.duration_minutes,
            llm_service=llm_service,
        )
        bp_id = str(uuid.uuid4())
        _blueprint_store[bp_id] = blueprint.dict()
        return BlueprintResponse(id=bp_id, blueprint=blueprint.dict())
    except Exception as e:
        logger.error(f"Blueprint generation failed: {type(e).__name__}")
        raise HTTPException(status_code=500, detail="Blueprint generation failed")


@router.get("/{blueprint_id}", response_model=BlueprintResponse)
async def get_blueprint(blueprint_id: str):
    bp = _blueprint_store.get(blueprint_id)
    if not bp:
        raise HTTPException(status_code=404, detail="Blueprint not found")
    return BlueprintResponse(id=blueprint_id, blueprint=bp)


def create_blueprint_api(app):
    app.include_router(router)
    logger.info("Blueprint API routes registered")
