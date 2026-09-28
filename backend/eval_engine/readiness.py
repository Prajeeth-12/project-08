# module-2-ai-interview-agent/eval_engine/readiness.py
"""Readiness score calculation — Task 9.

Computes a single readiness percentage for a candidate based on how many of
their assessed competencies received a ``"solid"`` verdict, weighted by each
competency's numeric score.

Formula
-------
    readiness = sum(score_i for solid competencies) /
                sum(score_i for all assessed competencies) * 100

If no competencies are assessed or all scores are zero, returns 0.0.
"""
from __future__ import annotations


def calculate_readiness(
    verdicts: dict[str, str],
    competency_scores: dict,
) -> float:
    """Calculate a score-weighted readiness percentage.

    Args:
        verdicts:          Mapping of competency name → verdict label
                           (``"solid"``, ``"shaky"``, or ``"couldnt_defend"``).
        competency_scores: Mapping of competency name → CompetencyScore
                           (any object with a ``.score`` float attribute).

    Returns:
        Readiness as a float in the range 0.0–100.0 (rounded to 1 decimal
        place).  Returns 0.0 if no competencies are assessed or total score
        is zero.
    """
    if not verdicts or not competency_scores:
        return 0.0

    total_score = sum(
        competency_scores[comp].score
        for comp in verdicts
        if comp in competency_scores
    )

    if total_score == 0.0:
        return 0.0

    solid_score = sum(
        competency_scores[comp].score
        for comp, verdict in verdicts.items()
        if verdict == "solid" and comp in competency_scores
    )

    return round(solid_score / total_score * 100, 1)
