# module-2-ai-interview-agent/eval_engine/rubric.py
"""Weighted rubric: 4-band mastery mapping, competency merging, and coverage metric.

Adapted from DeepInterview evaluator.py (level_for_score, _merge_by_competency)
and report.py (_coverage_pct). Re-scaled to our 0-100 scoring axis and
blueprint-section denominator.
"""
from __future__ import annotations

from typing import Dict, List, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.blueprint.models import InterviewBlueprint


def level_for_score(score: float) -> str:
    """Map a 0-100 score to a 4-band mastery label.

    Adapted from DeepInterview evaluator.level_for_score (original 0-5 scale)
    and re-mapped to our 0-100 axis:

      >=80  mastery
      >=65  proficient
      >=45  developing
       <45  novice
    """
    if score >= 80.0:
        return "mastery"
    if score >= 65.0:
        return "proficient"
    if score >= 45.0:
        return "developing"
    return "novice"


def merge_by_competency(scores: List[Tuple[str, float]]) -> Dict[str, float]:
    """Average raw (competency, score) pairs for duplicate competencies.

    Adapted from DeepInterview evaluator._merge_by_competency(). Returns a
    name-keyed dict of averaged scores in first-seen order. Useful when
    multiple interview questions target the same competency.
    """
    buckets: Dict[str, List[float]] = {}
    order: List[str] = []
    for comp, score in scores:
        if comp not in buckets:
            buckets[comp] = []
            order.append(comp)
        buckets[comp].append(score)
    return {
        comp: round(sum(buckets[comp]) / len(buckets[comp]), 1)
        for comp in order
    }


def coverage_pct(assessed_competencies: List[str], blueprint: "InterviewBlueprint") -> float:
    """Fraction of blueprint competencies that received at least one evidence item.

    Adapted from DeepInterview report._coverage_pct() — uses blueprint sections
    as the denominator rather than planned questions.

    Returns 1.0 when the blueprint declares no competencies (vacuously complete).
    """
    all_comps: set = set()
    for section in blueprint.sections:
        all_comps.update(section.competencies)
    if not all_comps:
        return 1.0
    assessed = set(assessed_competencies)
    return len(assessed & all_comps) / len(all_comps)
