# module-2-ai-interview-agent/rag/experience_parser.py
"""
Years-of-experience extraction and seniority gap scoring.

Regex patterns are lifted from:
    cloned_repos/ai-resume-matcher/app/matching/scorer.py
    ``_parse_years_from_text()``  (lines 99-126)
    ``_seniority_rank()``         (lines 129-139)
    ``_score_seniority_fit()``    (lines 190-224)

Public API
----------
parse_experience(text)              -> Optional[int]
seniority_rank(level)               -> Optional[int]
rank_gap_score(candidate, target)   -> float
"""

import re
from typing import Optional

# ---------------------------------------------------------------------------
# Years-of-experience patterns — lifted from ai-resume-matcher scorer.py:99-126
# ---------------------------------------------------------------------------
_EXPERIENCE_PATTERNS = [
    # "5+ years"
    r"\b(\d+)\+\s*years?\b",
    # "3-5 years" or "3–5 years" — upper bound preferred (returns group 2)
    r"\b(\d+)\s*[-–]\s*(\d+)\s*years?\b",
    # "minimum 3 years" / "at least 3 years"
    r"\b(?:minimum|at\s+least|min\.?)\s+(\d+)\s+years?\b",
    # "3 years of experience" / "3 years experience"
    r"\b(\d+)\s+years?\s+(?:of\s+)?experience\b",
]


def parse_experience(text: str) -> Optional[int]:
    """Return the dominant years-of-experience figure found in *text*.

    For range patterns (e.g. ``"3-5 years"``) the **upper bound** is returned
    because it represents the target/ideal level stated in the document.
    Returns ``None`` when no numeric experience signal is detected.

    Examples::

        >>> parse_experience("5+ years of experience in Python")
        5
        >>> parse_experience("3-5 years experience required")
        5
        >>> parse_experience("minimum 3 years in cloud infrastructure")
        3
        >>> parse_experience("no experience requirement stated")
        None
    """
    if not text or not text.strip():
        return None

    for pattern in _EXPERIENCE_PATTERNS:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        # Range pattern: group(2) is the upper bound — prefer it.
        if match.lastindex and match.lastindex >= 2 and match.group(2):
            try:
                return int(match.group(2))
            except (TypeError, ValueError):
                pass
        try:
            return int(match.group(1))
        except (TypeError, ValueError):
            continue

    return None


# ---------------------------------------------------------------------------
# Seniority rank — lifted from ai-resume-matcher scorer.py:129-139
# ---------------------------------------------------------------------------

def seniority_rank(level: Optional[str]) -> Optional[int]:
    """Map a seniority label to a numeric rank.

    ``junior/entry/intern/graduate`` → 1
    ``mid``                          → 2
    ``senior/lead/principal/staff``  → 3

    Returns ``None`` for ``None`` input; defaults to ``2`` (mid) for unrecognised
    strings to match the upstream scorer's conservative fallback.

    Examples::

        >>> seniority_rank("junior")
        1
        >>> seniority_rank("Senior Engineer")
        3
        >>> seniority_rank(None)
        None
    """
    if not level:
        return None
    normalised = level.strip().lower()
    if any(term in normalised for term in ("senior", "lead", "principal", "staff")):
        return 3
    if any(term in normalised for term in ("junior", "entry", "intern", "graduate")):
        return 1
    if "mid" in normalised:
        return 2
    # Conservative default: treat unknown as mid-level (mirrors scorer.py:139)
    return 2


# ---------------------------------------------------------------------------
# Gap scoring — lifted from ai-resume-matcher scorer.py:190-224
# ---------------------------------------------------------------------------

def rank_gap_score(candidate_level: str, target_level: str) -> float:
    """Score the seniority fit between a candidate and a target role.

    Gap → score mapping (mirrors ``_score_seniority_fit`` from scorer.py):
        gap = 0  →  1.00  (exact match)
        gap = 1  →  0.65  (one level off)
        gap ≥ 2  →  0.25  (significant mismatch)

    Returns ``0.0`` when either level cannot be ranked.

    Examples::

        >>> rank_gap_score("mid", "mid")
        1.0
        >>> rank_gap_score("junior", "senior")
        0.25
        >>> rank_gap_score("junior", "mid")
        0.65
    """
    candidate_rank = seniority_rank(candidate_level)
    target_rank = seniority_rank(target_level)

    if candidate_rank is None or target_rank is None:
        return 0.0

    gap = abs(candidate_rank - target_rank)
    if gap == 0:
        return 1.0
    elif gap == 1:
        return 0.65
    else:
        return 0.25
