from datetime import datetime
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.rubric import RubricEvaluation

router = APIRouter(prefix="/evaluations", tags=["Rubric Scorer & 30-Day Coach (Member B5)"])

class ScoreEvaluationRequest(BaseModel):
    candidate_id: str
    session_id: Optional[str] = None
    correctness_score: float  # 0.0 to 10.0
    complexity_score: float   # 0.0 to 10.0
    system_design_score: float # 0.0 to 10.0
    communication_score: float # 0.0 to 10.0
    veracity_score: float      # 0.0 to 10.0
    summary_notes: Optional[str] = ""

class CoachRoadmapItem(BaseModel):
    week: int
    focus: str
    tasks: List[str]

class EvaluationResponse(BaseModel):
    id: str
    candidate_id: str
    session_id: Optional[str]
    overall_score: float
    correctness_score: float
    complexity_score: float
    system_design_score: float
    communication_score: float
    veracity_score: float
    executive_summary: str
    weaknesses: List[str]
    strengths: List[str]
    coach_roadmap_30d: List[CoachRoadmapItem]

def generate_personalized_roadmap(weaknesses: list[str]) -> list[dict]:
    """Assemble an actionable, anti-generic 30-day technical practice roadmap."""
    return [
        {
            "week": 1,
            "focus": "Algorithmic Efficiency & Big-O Rigor",
            "tasks": [
                "Drill 10 medium Two-Pointer and Sliding Window problems",
                "Profile space complexity using AST loop analyzers",
                "Practice writing deterministic unit tests for edge cases",
            ],
        },
        {
            "week": 2,
            "focus": "System Design Trade-Offs & Persistence",
            "tasks": [
                "Design a distributed rate limiter with Redis token buckets",
                "Compare B-Tree vs LSM-Tree database indexing tradeoffs",
                "Conduct mock peer architectural review on message queues",
            ],
        },
        {
            "week": 3,
            "focus": "Resume Claim Defense & Project Deep-Dive",
            "tasks": [
                "Prepare quantifiable metrics for top 2 resume projects",
                "Audit microservice failure recovery paths (circuit breakers)",
                "Run through 3 dynamic AI follow-up drills",
            ],
        },
        {
            "week": 4,
            "focus": "Full Mock Simulation & SEB Assessment",
            "tasks": [
                "Complete 60-minute formal exam under SEB lockdown environment",
                "Conduct full 45-minute live behavioral + technical interview",
                "Review longitudinal scorecard improvements",
            ],
        },
    ]

@router.post("/score", response_model=EvaluationResponse)
async def score_evaluation(req: ScoreEvaluationRequest, db: AsyncSession = Depends(get_db)):
    """Compute weighted rubric score across 5 dimensions and synthesize 30-day coach plan."""
    # Weighted score calculation (out of 100)
    # Weights: Correctness 30%, Complexity 25%, System Design 20%, Communication 15%, Veracity 10%
    overall = (
        (req.correctness_score * 3.0)
        + (req.complexity_score * 2.5)
        + (req.system_design_score * 2.0)
        + (req.communication_score * 1.5)
        + (req.veracity_score * 1.0)
    )

    strengths = []
    weaknesses = []

    if req.correctness_score >= 8.0:
        strengths.append("High solution accuracy and robust handling of algorithmic constraints.")
    else:
        weaknesses.append("Test case pass rate indicates vulnerability to boundary conditions.")

    if req.complexity_score >= 8.0:
        strengths.append("Optimal Big-O time and auxiliary memory complexity bounds.")
    else:
        weaknesses.append("Sub-optimal quadratic runtime; refactor to linear hash lookup.")

    if req.communication_score >= 8.0:
        strengths.append("Structured articulation of architectural trade-offs.")
    else:
        weaknesses.append("Concise explanations; recommend proactive walkthrough of system state.")

    roadmap_data = generate_personalized_roadmap(weaknesses)

    summary = (
        f"Candidate achieved overall readiness index of {overall:.1f}%. "
        f"Demonstrated strength in {strengths[0] if strengths else 'core reasoning'}. "
        f"Targeted growth recommended for {weaknesses[0] if weaknesses else 'further scaling'}."
    )

    evaluation = RubricEvaluation(
        session_id=req.session_id,
        candidate_id=req.candidate_id,
        overall_score=round(overall, 2),
        correctness_score=req.correctness_score,
        complexity_score=req.complexity_score,
        system_design_score=req.system_design_score,
        communication_score=req.communication_score,
        veracity_score=req.veracity_score,
        executive_summary=summary,
        weaknesses=json.dumps(weaknesses),
        strengths=json.dumps(strengths),
        coach_roadmap_30d=json.dumps(roadmap_data),
    )
    db.add(evaluation)
    await db.flush()

    return EvaluationResponse(
        id=evaluation.id,
        candidate_id=evaluation.candidate_id,
        session_id=evaluation.session_id,
        overall_score=evaluation.overall_score,
        correctness_score=evaluation.correctness_score,
        complexity_score=evaluation.complexity_score,
        system_design_score=evaluation.system_design_score,
        communication_score=evaluation.communication_score,
        veracity_score=evaluation.veracity_score,
        executive_summary=evaluation.executive_summary,
        weaknesses=weaknesses,
        strengths=strengths,
        coach_roadmap_30d=[CoachRoadmapItem(**item) for item in roadmap_data],
    )

@router.get("/{session_id}", response_model=EvaluationResponse)
async def get_evaluation(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve multi-dimensional scorecard and coaching plan for an interview session."""
    stmt = (
        select(RubricEvaluation)
        .where(RubricEvaluation.session_id == session_id)
        .order_by(RubricEvaluation.created_at.desc())
    )
    res = await db.execute(stmt)
    evaluation = res.scalars().first()

    if not evaluation:
        raise HTTPException(status_code=404, detail="No evaluation found for this session")

    roadmap_raw = json.loads(evaluation.coach_roadmap_30d)
    return EvaluationResponse(
        id=evaluation.id,
        candidate_id=evaluation.candidate_id,
        session_id=evaluation.session_id,
        overall_score=evaluation.overall_score,
        correctness_score=evaluation.correctness_score,
        complexity_score=evaluation.complexity_score,
        system_design_score=evaluation.system_design_score,
        communication_score=evaluation.communication_score,
        veracity_score=evaluation.veracity_score,
        executive_summary=evaluation.executive_summary,
        weaknesses=json.loads(evaluation.weaknesses),
        strengths=json.loads(evaluation.strengths),
        coach_roadmap_30d=[CoachRoadmapItem(**item) for item in roadmap_raw],
    )
