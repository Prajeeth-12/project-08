# module-2-ai-interview-agent/core/decisions.py
import enum
from typing import List, Optional
from pydantic import BaseModel, Field


class AgentAction(str, enum.Enum):
    ASK_QUESTION = "ASK_QUESTION"
    ASK_FOLLOWUP = "ASK_FOLLOWUP"
    PROBE_DEEPER = "PROBE_DEEPER"
    CHANGE_DIFFICULTY = "CHANGE_DIFFICULTY"
    CHANGE_TOPIC = "CHANGE_TOPIC"
    END_SECTION = "END_SECTION"
    END_INTERVIEW = "END_INTERVIEW"


class AgentDecision(BaseModel):
    model_config = {"extra": "ignore"}

    action: str = Field(default="ASK_FOLLOWUP", description="One of: ASK_FOLLOWUP, PROBE_DEEPER, CHANGE_DIFFICULTY, CHANGE_TOPIC, END_SECTION, END_INTERVIEW")
    question: str = Field(default="Could you elaborate on that?", description="The next thing the AI interviewer says")
    answer_quality: str = Field(default="partial", description="strong, partial, weak, or off_topic")
    evidence_strength: str = Field(default="moderate", description="strong, moderate, weak, or contradictory")
    competency_coverage: List[str] = Field(default_factory=list)
    missing_evidence: List[str] = Field(default_factory=list)
    difficulty_adjustment: str = Field(default="none", description="up, down, or none")
    reasoning: str = Field(default="", description="Internal decision reasoning — not shown to candidate")
    follow_up_level: str = Field(default="surface", description="Current follow-up depth: surface, push, or floor")
    confidence: Optional[float] = Field(default=None, description="LLM confidence 0-1")


class InterviewEvidence(BaseModel):
    competency: str
    source_turn_index: int
    content_summary: str
    strength: str = "moderate"
