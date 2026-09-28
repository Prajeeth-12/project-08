import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.blueprint import InterviewBlueprint, Question

router = APIRouter(prefix="/questions", tags=["Problem Bank & Blueprints (Member B3)"])

class QuestionCreate(BaseModel):
    title: str
    slug: str
    difficulty: str = "MEDIUM"
    category: str = "DSA"
    description: str
    starter_code: str = "def solve():\n    pass\n"
    test_cases: List[dict] = [{"input": "5", "expected_output": "25"}]
    hidden_test_cases: List[dict] = []
    time_limit_sec: int = 2

class QuestionResponse(BaseModel):
    id: str
    title: str
    slug: str
    difficulty: str
    category: str
    description: str
    starter_code: str
    test_cases: List[dict]
    time_limit_sec: int

class BlueprintCreate(BaseModel):
    title: str
    target_role: str
    company_style: str = "General Tech"
    difficulty: Optional[str] = "MEDIUM"

class BlueprintResponse(BaseModel):
    id: str
    title: str
    target_role: str
    company_style: str
    questions: List[QuestionResponse]
    duration_minutes: int

@router.get("", response_model=List[QuestionResponse])
async def list_questions(
    difficulty: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List algorithmic coding questions with optional difficulty and category filtering."""
    query = select(Question)
    if difficulty:
        query = query.where(Question.difficulty == difficulty.upper())
    if category:
        query = query.where(Question.category == category)

    res = await db.execute(query)
    questions = res.scalars().all()

    return [
        QuestionResponse(
            id=q.id,
            title=q.title,
            slug=q.slug,
            difficulty=q.difficulty,
            category=q.category,
            description=q.description,
            starter_code=q.starter_code,
            test_cases=json.loads(q.test_cases),
            time_limit_sec=q.time_limit_sec,
        )
        for q in questions
    ]

@router.post("", response_model=QuestionResponse)
async def create_question(req: QuestionCreate, db: AsyncSession = Depends(get_db)):
    """Create a new coding problem in the platform question bank."""
    q = Question(
        title=req.title,
        slug=req.slug,
        difficulty=req.difficulty.upper(),
        category=req.category,
        description=req.description,
        starter_code=req.starter_code,
        test_cases=json.dumps(req.test_cases),
        hidden_test_cases=json.dumps(req.hidden_test_cases),
        time_limit_sec=req.time_limit_sec,
    )
    db.add(q)
    await db.flush()

    return QuestionResponse(
        id=q.id,
        title=q.title,
        slug=q.slug,
        difficulty=q.difficulty,
        category=q.category,
        description=q.description,
        starter_code=q.starter_code,
        test_cases=req.test_cases,
        time_limit_sec=q.time_limit_sec,
    )

@router.post("/blueprint", response_model=BlueprintResponse)
async def create_interview_blueprint(req: BlueprintCreate, db: AsyncSession = Depends(get_db)):
    """Assemble a targeted interview blueprint pairing questions to company and role archetypes."""
    res = await db.execute(select(Question).limit(3))
    selected_questions = res.scalars().all()

    q_ids = [q.id for q in selected_questions]
    blueprint = InterviewBlueprint(
        title=req.title,
        target_role=req.target_role,
        company_style=req.company_style,
        question_ids=json.dumps(q_ids),
        duration_minutes=45,
    )
    db.add(blueprint)
    await db.flush()

    return BlueprintResponse(
        id=blueprint.id,
        title=blueprint.title,
        target_role=blueprint.target_role,
        company_style=blueprint.company_style,
        questions=[
            QuestionResponse(
                id=q.id,
                title=q.title,
                slug=q.slug,
                difficulty=q.difficulty,
                category=q.category,
                description=q.description,
                starter_code=q.starter_code,
                test_cases=json.loads(q.test_cases),
                time_limit_sec=q.time_limit_sec,
            )
            for q in selected_questions
        ],
        duration_minutes=blueprint.duration_minutes,
    )
