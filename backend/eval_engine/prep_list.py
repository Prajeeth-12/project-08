# module-2-ai-interview-agent/eval_engine/prep_list.py
"""Prep punch list generation — Task 9.

Produces an ordered list of concrete study recommendations sorted by
competency gap (lowest-scoring competencies first so the highest-priority
items appear at the top of the list).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from eval_engine.reporter import InterviewReport


_HOURS_BY_VERDICT: dict[str, float] = {
    "couldnt_defend": 4.0,
    "shaky":          2.0,
    "solid":          0.5,
}

_ACTION_TEMPLATES: dict[str, str] = {
    "couldnt_defend": (
        "Study {comp} fundamentals: review theory, work through 3 example "
        "problems, and prepare a clear structured answer."
    ),
    "shaky": (
        "Strengthen {comp}: revisit core concepts, practise explaining with "
        "concrete examples, and rehearse follow-up questions."
    ),
    "solid": (
        "Maintain {comp} edge: explore advanced topics and prepare one "
        "stand-out example from a real project."
    ),
}


class PrepItem(BaseModel):
    """A single prioritised preparation task."""

    priority: int
    competency: str
    action: str
    estimated_hours: float


def generate_prep_list(report: "InterviewReport") -> list[PrepItem]:
    """Generate a prioritised prep punch list sorted by competency gap.

    Competencies with the lowest scores are listed first (priority 1 is the
    biggest gap).  Only competencies that appear in
    ``report.competency_scores`` are included.

    Args:
        report: A fully-populated
                :class:`~eval_engine.reporter.InterviewReport`.

    Returns:
        Ordered list of :class:`PrepItem` instances; ascending by score
        (lowest score = priority 1).
    """
    assessed = [
        (
            comp,
            report.competency_scores[comp].score,
            report.verdicts.get(comp, "couldnt_defend"),
        )
        for comp in report.competency_scores
    ]

    # Sort ascending by score: lowest score → highest priority (first).
    assessed.sort(key=lambda x: x[1])

    items: list[PrepItem] = []
    for priority, (comp, _score, verdict) in enumerate(assessed, start=1):
        template = _ACTION_TEMPLATES.get(verdict, _ACTION_TEMPLATES["couldnt_defend"])
        action = template.format(comp=comp.replace("_", " "))
        hours = _HOURS_BY_VERDICT.get(verdict, 2.0)
        items.append(
            PrepItem(
                priority=priority,
                competency=comp,
                action=action,
                estimated_hours=hours,
            )
        )

    return items
