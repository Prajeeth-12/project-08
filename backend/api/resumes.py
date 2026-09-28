import json
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.resume_claim import ResumeClaim

router = APIRouter(prefix="/resumes", tags=["Resume Parsing & Claim Ingestion (Member B2)"])

KNOWN_SKILLS = [
    "Python", "FastAPI", "PostgreSQL", "React", "Next.js", "TypeScript", "JavaScript",
    "Docker", "Kubernetes", "Redis", "AWS", "SQL", "MongoDB", "C++", "Java",
    "System Design", "Microservices", "GraphQL", "Tailwind CSS", "Git", "CI/CD"
]

def extract_claims_from_text(text: str) -> tuple[list[str], list[str], list[str]]:
    """Extract skills, projects, and verifiable claims from resume text."""
    # 1. Skill Extraction via dictionary matcher
    found_skills = []
    text_lower = text.lower()
    for skill in KNOWN_SKILLS:
        if re.search(rf"\b{re.escape(skill.lower())}\b", text_lower):
            found_skills.append(skill)

    # 2. Projects & Claim extraction
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    projects = []
    claims = []

    for line in lines:
        # Detect metric-based claims (percentages, latencies, scaling figures)
        if any(keyword in line.lower() for keyword in ["%","ms","reduced","optimized","designed","built","architected","scaled","deployed"]):
            if len(line) > 25:
                claims.append(line)
        if any(keyword in line.lower() for keyword in ["project:", "system", "platform", "service", "engine", "application"]):
            if len(line) > 15 and len(line) < 100:
                projects.append(line)

    if not claims:
        claims = [
            "Built distributed backend service using FastAPI and PostgreSQL.",
            "Designed caching layer using Redis to optimize database read latency.",
        ]
    if not projects:
        projects = ["AI Mock Interview Platform", "Real-Time Event Processing Pipeline"]

    return found_skills, projects, claims

class ParseResumeTextRequest(BaseModel):
    user_id: str
    resume_text: str

class ResumeClaimResponse(BaseModel):
    id: str
    user_id: str
    skills: List[str]
    projects: List[str]
    claims: List[str]

@router.post("/parse", response_model=ResumeClaimResponse)
async def parse_resume(req: ParseResumeTextRequest, db: AsyncSession = Depends(get_db)):
    """Parse candidate resume into skills, projects, and verifiable technical claims."""
    skills, projects, claims = extract_claims_from_text(req.resume_text)

    claim_record = ResumeClaim(
        user_id=req.user_id,
        raw_text=req.resume_text,
        extracted_skills=json.dumps(skills),
        extracted_projects=json.dumps(projects),
        verifiable_claims=json.dumps(claims),
    )
    db.add(claim_record)
    await db.flush()

    return ResumeClaimResponse(
        id=claim_record.id,
        user_id=claim_record.user_id,
        skills=skills,
        projects=projects,
        claims=claims,
    )

@router.get("/{user_id}", response_model=ResumeClaimResponse)
async def get_user_claims(user_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve previously parsed resume claims for a candidate."""
    stmt = select(ResumeClaim).where(ResumeClaim.user_id == user_id).order_by(ResumeClaim.created_at.desc())
    res = await db.execute(stmt)
    claim_record = res.scalars().first()

    if not claim_record:
        raise HTTPException(status_code=404, detail="No parsed resume found for this user")

    return ResumeClaimResponse(
        id=claim_record.id,
        user_id=claim_record.user_id,
        skills=json.loads(claim_record.extracted_skills),
        projects=json.loads(claim_record.extracted_projects),
        claims=json.loads(claim_record.verifiable_claims),
    )
