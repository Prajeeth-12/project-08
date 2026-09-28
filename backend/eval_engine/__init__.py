"""
Eval engine — V2 quantitative scoring.
Runs alongside agentic_coach.py qualitative evaluation.
"""

from .scoring import calculate_interview_score, ScoreBreakdown
from .rubric import level_for_score
from .readiness import calculate_readiness
from .verdict import assign_verdict
from .narrative import generate_narrative
from .prep_list import generate_prep_list, PrepItem
from .coaching import CoachingCard

# V3 integrity + evidence
try:
    from .integrity import validate_evidence, apply_anti_flattery_cap
    from .star_evaluator import STAREvaluator
    _V3_AVAILABLE = True
except ImportError:
    _V3_AVAILABLE = False

__all__ = [
    "calculate_interview_score", "ScoreBreakdown",
    "level_for_score",
    "calculate_readiness",
    "assign_verdict",
    "generate_narrative",
    "generate_prep_list", "PrepItem",
    "CoachingCard",
    "validate_evidence", "apply_anti_flattery_cap", "STAREvaluator",
]
