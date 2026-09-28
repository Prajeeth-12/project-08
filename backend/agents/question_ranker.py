"""
Three-axis question ranker.

Scores a candidate question on three axes and returns a weighted float [0, 1].
Axes:
  1. load_bearing    — is the competency core to the blueprint section?
  2. likelihood      — does the question match the candidate's claimed skills?
  3. non_obviousness — is the question specific enough to not be a trivial lookup?

Weights: load_bearing=0.50, likelihood=0.30, non_obviousness=0.20
"""

from __future__ import annotations

import re

from backend.blueprint.models import InterviewBlueprint
from backend.agents.state_machine import InterviewSessionState


# ---------------------------------------------------------------------------
# Obvious / trivial question patterns — these signal low non-obviousness
# ---------------------------------------------------------------------------

_OBVIOUS_PATTERNS: list[str] = [
    r"\bwhat is\b",
    r"\bdefine\b",
    r"\bwhat does\b",
    r"\bexplain\s+\w+\s+in\s+simple",
    r"\blist\s+\w+\s+(advantages|disadvantages|features|types)\b",
    r"\bwhat are\s+(the\s+)?(benefits|advantages|features)\b",
    r"\bwhat\s+is\s+(rest|sql|oop|mvc|crud|api|http|https|json|xml)\b",
    r"\bcan you\s+name\b",
    r"\bname\s+(three|five|some|a few)\b",
]

_OBVIOUS_RE = re.compile("|".join(_OBVIOUS_PATTERNS), re.IGNORECASE)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def rank_question(
    question: str,
    blueprint: InterviewBlueprint,
    state: InterviewSessionState,
) -> float:
    """Return a [0.0, 1.0] quality score for *question*.

    Parameters
    ----------
    question:
        The candidate question string to evaluate.
    blueprint:
        The interview blueprint providing section metadata and candidate skills.
    state:
        Current session state indicating which section and competency are active.

    Returns
    -------
    float
        Weighted composite score in [0.0, 1.0].  Higher is better.
    """
    non_obviousness_score = _score_non_obviousness(question)

    # Trivially obvious questions (definitions, "what is X") should not receive
    # full load-bearing credit even when they mention a core competency.
    # A depth-free "What is REST?" is far less valuable than a probing question
    # that challenges implementation trade-offs.
    load_score = _score_load_bearing(question, blueprint, state)
    if non_obviousness_score <= 0.1:
        load_score *= 0.2

    likelihood_score = _score_likelihood(question, blueprint)

    return 0.50 * load_score + 0.30 * likelihood_score + 0.20 * non_obviousness_score


# ---------------------------------------------------------------------------
# Axis helpers
# ---------------------------------------------------------------------------


def _score_load_bearing(
    question: str,
    blueprint: InterviewBlueprint,
    state: InterviewSessionState,
) -> float:
    """Axis 1: Is the question aligned with the current section's core competencies?

    Returns 1.0 if any core competency term from the current section appears in
    the question, 0.5 if it matches a competency anywhere in the blueprint, and
    0.0 otherwise.
    """
    if state.current_section_index < len(blueprint.sections):
        section = blueprint.sections[state.current_section_index]
        core_competencies = section.competencies
    else:
        core_competencies = []

    question_lower = question.lower()

    # Core section match (full score)
    for comp in core_competencies:
        if _term_in_text(comp, question_lower):
            return 1.0

    # Any blueprint competency match (partial)
    all_competencies = [
        c for s in blueprint.sections for c in s.competencies
    ]
    for comp in all_competencies:
        if _term_in_text(comp, question_lower):
            return 0.5

    return 0.0


def _score_likelihood(question: str, blueprint: InterviewBlueprint) -> float:
    """Axis 2: Does the question relate to the candidate's claimed skills?

    Returns a value in [0.0, 1.0] proportional to the fraction of candidate
    skills/claims touched by the question.
    """
    claimed = blueprint.candidate_skills + blueprint.candidate_claims
    if not claimed:
        return 0.5  # neutral — no claims to check against

    question_lower = question.lower()
    matches = sum(
        1 for skill in claimed if _term_in_text(skill, question_lower)
    )
    # Cap at 1.0
    return min(1.0, matches / max(len(claimed), 1))


def _score_non_obviousness(question: str) -> float:
    """Axis 3: Is the question non-trivial?

    Penalises generic definition-style phrasing.  Returns 0.1 for an obviously
    trivial question and 1.0 for a specific/probing question.
    """
    if _OBVIOUS_RE.search(question):
        return 0.1
    # Specificity signals: long questions (>10 words), contain numbers or
    # technical jargon, or include "how did you / why did you" phrasing.
    word_count = len(question.split())
    has_how_why = bool(re.search(r"\b(how|why)\s+(did|do|does|would|could)\s+you\b", question, re.IGNORECASE))
    has_technical_detail = bool(re.search(r"\b(latency|throughput|bottleneck|trade.off|partition|shard|cache|index|lock|concurrency|algorithm|complexity|schema|migration|replication|failover)\b", question, re.IGNORECASE))

    score = 0.5
    if word_count > 10:
        score += 0.2
    if has_how_why:
        score += 0.2
    if has_technical_detail:
        score += 0.1
    return min(1.0, score)


def _term_in_text(term: str, text: str) -> bool:
    """Return True if every token in *term* appears as a substring in *text*."""
    tokens = term.lower().split()
    return all(token in text for token in tokens)
