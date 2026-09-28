"""
Adaptive interview helpers — difficulty hint and lean prompt (compact summary).

These functions are pure and deterministic; no LLM calls.

Public API
----------
get_difficulty_hint(state, blueprint) -> str
    Returns one of: "easier" | "harder" | "advance" | "wrap"
    based on the average word count of candidate answers in the current section.

compact_summary(profile, max_words=120) -> str
    Returns a lean text summary of the candidate profile, truncated to
    *max_words* words.  Used to keep the live system prompt small.
"""

from __future__ import annotations

from backend.blueprint.models import InterviewBlueprint
from backend.agents.state_machine import InterviewSessionState

# Thresholds (adapted from DeepInterview live/state.py)
_THIN_WORDS: int = 12   # avg words below → candidate is struggling → "easier"
_RICH_WORDS: int = 80   # avg words above → candidate is thriving → "harder"


def get_difficulty_hint(
    state: InterviewSessionState,
    blueprint: InterviewBlueprint,
) -> str:
    """Return a difficulty recommendation string.

    Parameters
    ----------
    state:
        The current interview session state.
    blueprint:
        The interview blueprint for section metadata.

    Returns
    -------
    str
        One of ``"easier"``, ``"harder"``, ``"advance"``, or ``"wrap"``.
    """
    # Check if we're past all sections
    if state.current_section_index >= len(blueprint.sections):
        return "wrap"

    # Collect candidate answers in the current section
    # We identify section boundaries by tracking when section_index would have
    # changed.  Since we don't store per-section turn metadata, we use a simple
    # proxy: candidate turns whose competency matches any competency in the
    # current section.
    section = blueprint.sections[state.current_section_index]
    section_competencies = set(c.lower() for c in section.competencies)

    candidate_turns_in_section = [
        t for t in state.turns
        if t.sender == "CANDIDATE"
        and t.competency
        and t.competency.lower() in section_competencies
    ]

    # Fallback: if no competency-tagged turns, use ALL candidate turns
    if not candidate_turns_in_section:
        candidate_turns_in_section = [t for t in state.turns if t.sender == "CANDIDATE"]

    if not candidate_turns_in_section:
        # No evidence yet — proceed as planned
        return "advance"

    total_words = sum(len(t.content.split()) for t in candidate_turns_in_section)
    avg_words = total_words / len(candidate_turns_in_section)

    if avg_words < _THIN_WORDS:
        return "easier"
    elif avg_words > _RICH_WORDS:
        return "harder"
    else:
        return "advance"


def compact_summary(profile: str | dict, max_words: int = 120) -> str:
    """Return a compact, max-words summary of a candidate profile.

    Parameters
    ----------
    profile:
        Either a plain text string (e.g. resume text / bio) or a dict with
        keys such as ``"name"``, ``"headline"``, ``"skills"``, ``"claims"``.
        When a dict is provided the function assembles a compact narrative.
    max_words:
        Word budget for the returned summary (default 120).

    Returns
    -------
    str
        A truncated summary of at most *max_words* words.
    """
    if isinstance(profile, dict):
        parts: list[str] = []
        if profile.get("name"):
            parts.append(f"Candidate: {profile['name']}.")
        if profile.get("headline"):
            parts.append(profile["headline"] + ".")
        if profile.get("skills"):
            skills = profile["skills"]
            if isinstance(skills, list):
                skills = ", ".join(skills)
            parts.append(f"Skills: {skills}.")
        if profile.get("claims"):
            claims = profile["claims"]
            if isinstance(claims, list):
                claims = "; ".join(claims[:4])
            parts.append(f"Claims: {claims}.")
        text = " ".join(parts)
    elif isinstance(profile, str):
        text = profile
    else:
        text = str(profile)

    words = text.split()
    if len(words) <= max_words:
        return text

    truncated = " ".join(words[:max_words])
    # End at a sentence boundary if possible, otherwise just truncate
    last_period = truncated.rfind(".")
    if last_period > len(truncated) // 2:
        return truncated[: last_period + 1]
    return truncated + "..."
