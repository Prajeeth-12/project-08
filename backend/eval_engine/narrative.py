# module-2-ai-interview-agent/eval_engine/narrative.py
"""Deterministic narrative assembly — Task 9.

Assembles a human-readable performance summary from a completed
``InterviewReport`` without invoking an LLM.  The output is fully
reproducible given the same report inputs.

Pattern adapted from ``generate_match_narrative()`` in
``cloned_repos/ai-resume-matcher/app/matching/scorer.py`` — changed from
job-match scoring to interview-performance framing.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from eval_engine.reporter import InterviewReport

# Thresholds are evaluated in descending order; first match wins.
_MASTERY_THRESHOLDS: list[tuple[float, str]] = [
    (80.0, "strong mastery"),
    (60.0, "solid understanding"),
    (40.0, "developing proficiency"),
    (0.0,  "early-stage skills"),
]

# Maximum number of strengths / weaknesses named in the narrative.
_MAX_AREAS = 3


def _mastery_label(score: float) -> str:
    """Map a numeric overall score to a human-readable mastery label."""
    for threshold, label in _MASTERY_THRESHOLDS:
        if score >= threshold:
            return label
    return "early-stage skills"


def generate_narrative(report: "InterviewReport") -> str:
    """Build a deterministic narrative paragraph for the interview report.

    Only segments with available data are included.  At most
    :data:`_MAX_AREAS` (3) strengths and weaknesses are named.

    Args:
        report: A fully-populated
                :class:`~eval_engine.reporter.InterviewReport` that already
                has ``readiness_score`` and ``coverage_pct`` set.

    Returns:
        A single human-readable paragraph string.
    """
    parts: list[str] = []

    strong_areas = report.key_strengths[:_MAX_AREAS]
    weak_areas = report.areas_for_improvement[:_MAX_AREAS]
    mastery = _mastery_label(report.overall_score)

    if strong_areas:
        area_names = ", ".join(s.replace("_", " ") for s in strong_areas)
        parts.append(
            f"The candidate demonstrated {mastery} in {area_names}."
        )

    if weak_areas:
        weak_names = ", ".join(w.replace("_", " ") for w in weak_areas)
        parts.append(f"Areas needing attention: {weak_names}.")

    parts.append(
        f"Overall readiness: {report.readiness_score:.0f}% "
        f"with {report.coverage_pct:.0f}% topic coverage."
    )

    if report.recommendations:
        first_rec = report.recommendations[0].rstrip(".")
        parts.append(f"{first_rec}.")

    return " ".join(parts)
