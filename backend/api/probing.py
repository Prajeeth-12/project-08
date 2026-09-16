from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db
from backend.models.agent_turn import AgentTurn

router = APIRouter(prefix="/ai", tags=["Dynamic Probing Agent (Member A4)"])

class LiveProbeRequest(BaseModel):
    session_id: str
    candidate_response: str
    claim_context: Optional[str] = None
    turn_index: int = 1

class LiveProbeResponse(BaseModel):
    turn_id: str
    session_id: str
    observation: str
    reasoning: str
    decision: str  # PROBE_DEEPER, PIVOT, INVOKE_CODING
    probe_question: str
    difficulty: str
    confidence_score: float

def generate_heuristic_probe(candidate_response: str, turn_index: int, claim_context: Optional[str]) -> tuple[str, str, str, str, str, float]:
    """Stateful heuristic fallback implementing our Observe -> Reason -> Decide -> Act loop."""
    response_lower = candidate_response.lower()
    
    # Observe
    if turn_index >= 3:
        observation = "Candidate successfully demonstrated conceptual and architectural foundation across previous probing rounds."
        difficulty = "INTERMEDIATE"
        decision = "INVOKE_CODING"
        reasoning = "Candidate has completed initial conceptual probing. Ready to transition to the in-interview Monaco coding challenge."
        probe_question = "Great explanation. Let's translate these concepts into code. I'm opening the live coding workspace for you now."
        confidence = 0.95
    elif len(candidate_response.split()) < 10:
        observation = "Candidate provided an overly brief answer with limited technical depth."
        difficulty = "SURFACE"
        decision = "PROBE_DEEPER"
        reasoning = "Response lacks concrete architectural specifics, metrics, or trade-off analysis."
        probe_question = "Could you elaborate with a specific technical challenge you solved, and how you measured its success?"
        confidence = 0.82
    elif "sql" in response_lower or "database" in response_lower or "index" in response_lower:
        observation = "Candidate referenced database and persistence mechanisms."
        difficulty = "INTERMEDIATE"
        decision = "PROBE_DEEPER"
        reasoning = "Need to verify index tuning understanding and query optimization trade-offs."
        probe_question = "When dealing with high write throughput, how did you balance index maintenance overhead against read query latency?"
        confidence = 0.89
    elif "scale" in response_lower or "concurrency" in response_lower or "async" in response_lower:
        observation = "Candidate touched on concurrency and scaling primitives."
        difficulty = "DEEP"
        decision = "PROBE_DEEPER"
        reasoning = "Strong opportunity to probe race conditions, locking strategies, or event loops."
        probe_question = "How did you prevent race conditions and ensure idempotency across concurrent request workers?"
        confidence = 0.92
    else:
        observation = "Candidate gave a structured answer covering implementation steps."
        difficulty = "INTERMEDIATE"
        decision = "PROBE_DEEPER"
        reasoning = "Investigating edge-case handling and system failure recovery mechanisms."
        probe_question = "What failure modes did you anticipate during deployment, and what fallback mechanisms were implemented?"
        confidence = 0.86

    return observation, reasoning, decision, probe_question, difficulty, confidence

@router.post("/live-probe", response_model=LiveProbeResponse)
async def live_probe(req: LiveProbeRequest, db: AsyncSession = Depends(get_db)):
    """Dynamic Probing Agent: Observe candidate input -> Reason on technical depth -> Decide -> Act."""
    # Observe -> Reason -> Decide -> Act
    observation, reasoning, decision, probe_question, difficulty, confidence = generate_heuristic_probe(
        req.candidate_response, req.turn_index, req.claim_context
    )

    turn = AgentTurn(
        session_id=req.session_id,
        turn_index=req.turn_index,
        candidate_input=req.candidate_response,
        observation=observation,
        reasoning=reasoning,
        decision=decision,
        probe_output=probe_question,
        difficulty=difficulty,
        confidence_score=confidence,
    )
    db.add(turn)
    await db.flush()

    return LiveProbeResponse(
        turn_id=turn.id,
        session_id=turn.session_id,
        observation=turn.observation,
        reasoning=turn.reasoning,
        decision=turn.decision,
        probe_question=turn.probe_output,
        difficulty=turn.difficulty,
        confidence_score=turn.confidence_score,
    )
