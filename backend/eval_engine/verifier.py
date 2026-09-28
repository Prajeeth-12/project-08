# module-2-ai-interview-agent/eval_engine/verifier.py
"""Adversarial score verifier: second-pass LLM check on borderline scores.

Adapted from DeepInterview verifier.py (125 lines). Only scores in the
'developing' or 'novice' mastery bands are re-examined; mastery and proficient
scores pass through unchanged.

Safety-first: any LLM failure (timeout, malformed JSON, provider error)
leaves the original score object untouched rather than wiping a valid score.
"""
from __future__ import annotations

from typing import Dict, TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from eval_engine.reporter import CompetencyScore
    from backend.agents.state_machine import InterviewSessionState
    from llm.gateway import LLMGateway

# Only scores in these mastery bands warrant an adversarial second look.
_VERIFY_LEVELS = frozenset({"developing", "novice"})


class _VerifierVerdict(BaseModel):
    """LLM verdict for one adversarial score check."""
    justified: bool
    adjusted_score: float
    reason: str


async def verify_scores(
    scores: "Dict[str, CompetencyScore]",
    state: "InterviewSessionState",
    llm: "LLMGateway",
) -> "Dict[str, CompetencyScore]":
    """Adversarially re-check developing/novice scores; return a refined dict.

    The output preserves all competency keys and their insertion order.
    mastery/proficient scores pass through without any LLM call.

    For developing/novice scores the LLM is asked whether the score is
    justified; if not, the clamped adjusted_score replaces it and mastery_level
    is re-derived. Any exception (timeout, parse error, provider error) keeps
    the original CompetencyScore object.

    Adapted from DeepInterview verifier.verify_scores().
    """
    # Lazy imports to avoid circular dependencies at module load time.
    from eval_engine.reporter import CompetencyScore
    from eval_engine.rubric import level_for_score

    # Build candidate transcript excerpts keyed by competency (from turn.competency).
    transcript_by_comp: Dict[str, str] = {}
    for turn in state.turns:
        if turn.sender != "CANDIDATE":
            continue
        comp = turn.competency or ""
        if not comp:
            continue
        prev = transcript_by_comp.get(comp, "")
        joined = f"{prev}\n\n{turn.content}".strip()
        transcript_by_comp[comp] = joined[:3000]

    verified: Dict[str, "CompetencyScore"] = {}
    for comp, cs in scores.items():
        # mastery / proficient: no adversarial check needed
        if cs.mastery_level not in _VERIFY_LEVELS:
            verified[comp] = cs
            continue

        system_prompt = (
            "You are an adversarial interview score reviewer. "
            "Your job is to catch over-scored or under-scored answers. "
            "Be sceptical. Only mark justified=false when confident the score "
            "is materially wrong. Respond with JSON only."
        )
        transcript_excerpt = transcript_by_comp.get(comp, "(no transcript available)")
        user_msg = (
            f"Competency: {comp}\n"
            f"Proposed score: {cs.score}/100 (band: {cs.mastery_level})\n"
            f"Evidence items: {cs.evidence_count}, strength={cs.strength}\n"
            f"Transcript excerpt:\n{transcript_excerpt}\n\n"
            "Is this score justified? If not, provide an adjusted_score (0-100)."
        )

        try:
            verdict: _VerifierVerdict = await llm.complete_json(
                system_prompt=system_prompt,
                user_message=user_msg,
                response_model=_VerifierVerdict,
            )
            if verdict.justified:
                verified[comp] = cs
            else:
                adjusted = max(0.0, min(100.0, float(verdict.adjusted_score)))
                verified[comp] = CompetencyScore(
                    score=round(adjusted, 1),
                    evidence_count=cs.evidence_count,
                    strength=cs.strength,
                    mastery_level=level_for_score(adjusted),
                )
        except Exception:
            # Any failure → keep original score unchanged (safety-first)
            verified[comp] = cs

    return verified
