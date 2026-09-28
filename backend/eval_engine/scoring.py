# module-2-ai-interview-agent/eval_engine/scoring.py
"""Five-component weighted interview scoring with dual weight profiles.

Adapted from ai-resume-matcher/app/matching/scorer.py (FULL_WEIGHTS,
NEUTRAL_WEIGHTS, lines 14-29). Component names re-mapped to interview context:

  skill_overlap    → technical_depth   (largest weight; core signal)
  role_alignment   → problem_solving   (second-largest)
  language_fit     → communication     (adjusted upward in neutral profile)
  seniority_fit    → behavioral        (stable across both profiles)
  experience_fit   → coverage          (session completeness proxy)

Adaptive redistribution (Feature #44): when one or more components are absent
from the input dict (or explicitly set to ``None``), their base weights are
proportionally spread across the present components so the total still reaches
0–100 rather than being silently depressed by missing data.
"""
from __future__ import annotations

from pydantic import BaseModel


# Max contribution per component when the interview is fully covered
FULL_WEIGHTS: dict[str, float] = {
    "technical_depth": 0.40,
    "problem_solving": 0.25,
    "communication": 0.15,
    "behavioral": 0.10,
    "coverage": 0.10,
}

# Softer distribution when coverage is thin (aborted / short session)
NEUTRAL_WEIGHTS: dict[str, float] = {
    "technical_depth": 0.35,
    "problem_solving": 0.25,
    "communication": 0.20,
    "behavioral": 0.10,
    "coverage": 0.10,
}

# Switch to NEUTRAL_WEIGHTS when coverage component is below this threshold
NEUTRAL_COMPONENT_RATIO = 0.5


class ScoreBreakdown(BaseModel):
    """Five-component score breakdown for a completed interview session."""
    technical_depth: float = 0.0
    problem_solving: float = 0.0
    communication: float = 0.0
    behavioral: float = 0.0
    coverage: float = 0.0
    total: float = 0.0
    weights_used: str = "full"


def weighted_sum(components: dict[str, float], weights: dict[str, float]) -> float:
    """Compute a weighted sum; components missing from the dict contribute 0."""
    return sum(components.get(k, 0.0) * w for k, w in weights.items())


def redistribute_weights(
    present_keys: set[str],
    base_weights: dict[str, float],
) -> dict[str, float]:
    """Proportionally redistribute absent-component weights to present ones.

    Adapted from ai-resume-matcher NEUTRAL_WEIGHTS sparse-data guard pattern
    (scorer.py lines 24-31).  When some components have no data, their base
    weight is spread proportionally over the components that *do* have data so
    the weighted sum still reflects a fair 0–100 range.

    Args:
        present_keys: Set of component keys that have actual score data.
        base_weights: Base weight dict (e.g. :data:`FULL_WEIGHTS`).

    Returns:
        New weight dict where absent components have weight ``0.0`` and
        present components absorb the freed-up mass proportionally.
        Returns ``base_weights`` unchanged if nothing is missing.
    """
    missing_keys = set(base_weights.keys()) - present_keys
    if not missing_keys:
        return base_weights

    missing_weight = sum(base_weights[k] for k in missing_keys)
    present_base_total = sum(base_weights[k] for k in present_keys if k in base_weights)

    if not present_base_total:
        return {k: 0.0 for k in base_weights}

    return {
        k: (
            w + missing_weight * (w / present_base_total)
            if k in present_keys
            else 0.0
        )
        for k, w in base_weights.items()
    }


def calculate_interview_score(
    components: dict[str, float | None],
    use_full_weights: bool = True,
) -> ScoreBreakdown:
    """Compute a ScoreBreakdown from up to five component scores (0-100 each).

    Args:
        components: Dict mapping component name to a 0-100 score.  A component
            is considered *missing* when its key is absent from the dict or its
            value is ``None``.  Missing components trigger adaptive weight
            redistribution; a component set to ``0.0`` is treated as present.
        use_full_weights: True → FULL_WEIGHTS (rich coverage);
            False → NEUTRAL_WEIGHTS (thin/aborted session).

    Returns:
        ScoreBreakdown with per-component values and a weighted total.
        ``weights_used`` is ``"adaptive"`` when redistribution occurred,
        ``"full"`` or ``"neutral"`` otherwise.
    """
    base_weights = FULL_WEIGHTS if use_full_weights else NEUTRAL_WEIGHTS

    # Determine which components are missing (absent from dict or explicitly None)
    all_keys = set(base_weights.keys())
    absent_keys = all_keys - set(components.keys())
    none_keys = {k for k, v in components.items() if v is None and k in all_keys}
    missing_keys = absent_keys | none_keys
    present_keys = all_keys - missing_keys

    if missing_keys:
        weights = redistribute_weights(present_keys, base_weights)
        weights_label = "adaptive"
    else:
        weights = base_weights
        weights_label = "full" if use_full_weights else "neutral"

    total = sum(
        (components.get(k) or 0.0) * w
        for k, w in weights.items()
        if k in present_keys
    )

    return ScoreBreakdown(
        technical_depth=components.get("technical_depth") or 0.0,
        problem_solving=components.get("problem_solving") or 0.0,
        communication=components.get("communication") or 0.0,
        behavioral=components.get("behavioral") or 0.0,
        coverage=components.get("coverage") or 0.0,
        total=round(total, 2),
        weights_used=weights_label,
    )
