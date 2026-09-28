# module-2-ai-interview-agent/eval_engine/language_report.py
"""Language quality assessment for interview transcripts.

Produces a ``LanguageReport`` capturing fluency, clarity, and filler-word
density from the candidate's answers.

Design:
* Filler-word count is computed heuristically (no LLM cost) using a curated
  word list so it is always available even without network access.
* Fluency and clarity scores are requested from the LLM; the function falls
  back to sensible defaults (60.0) when the LLM is unavailable.

Adapted from DeepInterview shared_models.LanguageReport (lines 179-186) and
post/language_coach.py.  Key differences:
  - Our schema uses ``filler_count`` (int) rather than ``filler_word_count``
    to match the task brief.
  - ``notes`` replaces the split ``code_switching_notes`` / ``pronunciation_notes``
    / ``summary`` fields for a leaner report shape.
  - We use ``LLMGateway.complete_json()`` rather than a bespoke deps object.
"""
from __future__ import annotations

import re
from typing import List, TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    pass  # LLMGateway replaced by Base LLMService

# Common spoken filler words and phrases that signal lower fluency.
_FILLER_WORDS: frozenset = frozenset({
    "um", "uh", "like", "you know", "basically", "literally",
    "actually", "sort of", "kind of", "i mean", "right", "so yeah",
    "you see", "well", "okay so", "so basically",
})


def _count_fillers(text: str) -> int:
    """Count filler word occurrences in ``text`` using whole-word matching."""
    lowered = text.lower()
    count = 0
    for filler in _FILLER_WORDS:
        pattern = r"\b" + re.escape(filler) + r"\b"
        count += len(re.findall(pattern, lowered))
    return count


def _build_transcript(turns: list) -> str:
    """Concatenate CANDIDATE turn content into a single transcript block."""
    parts = [
        t.content.strip()
        for t in turns
        if hasattr(t, "sender") and t.sender == "CANDIDATE" and t.content
    ]
    return "\n\n".join(p for p in parts if p)


class LanguageReport(BaseModel):
    """Spoken-language quality assessment for one interview session."""

    fluency_score: float = 0.0
    clarity_score: float = 0.0
    filler_count: int = 0
    notes: str = ""


async def assess_language(turns: list, llm: "LLMGateway") -> LanguageReport:
    """Produce a language quality report from the candidate's turns.

    Heuristically counts filler words, then asks the LLM to rate fluency and
    clarity on a 0-100 scale.  Falls back to conservative defaults (60.0) on
    any LLM failure so the report is always fully populated.

    Args:
        turns: ``List[ConversationTurn]`` from ``InterviewSessionState.turns``.
        llm:   Configured ``LLMGateway`` instance.

    Returns:
        A ``LanguageReport`` with clamped, non-negative numeric fields.
    """
    transcript = _build_transcript(turns)
    filler_count = _count_fillers(transcript)

    system_prompt = (
        "You are a spoken-language quality assessor for technical interviews. "
        "Evaluate the candidate's communication based on the transcript provided. "
        "Respond with JSON only — no markdown, no explanation."
    )
    excerpt = transcript[:1500] if transcript else "(no candidate answers recorded)"
    user_msg = (
        f"Candidate transcript:\n{excerpt}\n\n"
        f"Filler words detected (heuristic count): {filler_count}\n\n"
        "Return JSON with: fluency_score (0-100, higher is better), "
        "clarity_score (0-100, higher is better), "
        "filler_count (integer >= 0), "
        "notes (one sentence summary of language quality)."
    )

    try:
        report = await llm.complete_json(
            system_prompt=system_prompt,
            user_message=user_msg,
            response_model=LanguageReport,
        )
        # Clamp numeric fields into documented ranges.
        return LanguageReport(
            fluency_score=max(0.0, min(100.0, float(report.fluency_score))),
            clarity_score=max(0.0, min(100.0, float(report.clarity_score))),
            filler_count=max(filler_count, max(0, int(report.filler_count))),
            notes=report.notes or "Language assessment completed.",
        )
    except Exception:
        return LanguageReport(
            fluency_score=60.0,
            clarity_score=60.0,
            filler_count=filler_count,
            notes="Language assessment based on heuristic filler-word analysis.",
        )
