# module-2-ai-interview-agent/blueprint/models.py
from typing import List, Optional
from pydantic import BaseModel, Field


class EvaluationExpectation(BaseModel):
    competency: str
    description: str = ""
    min_evidence_strength: str = "moderate"


class InterviewSection(BaseModel):
    title: str
    competencies: List[str]
    time_budget_minutes: int = 10
    expectations: List[EvaluationExpectation] = Field(default_factory=list)


class InterviewBlueprint(BaseModel):
    role: str
    seniority: str = "mid"
    duration_minutes: int = 30
    sections: List[InterviewSection]
    candidate_skills: List[str] = Field(default_factory=list)
    candidate_claims: List[str] = Field(default_factory=list)
