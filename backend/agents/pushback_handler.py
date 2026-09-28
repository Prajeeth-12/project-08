"""
Pushback detector.

A candidate "pushes back" when they dispute the interviewer's question or
correct a perceived mischaracterisation.  Detecting this matters because
the engine should soften its verdict and give credit for confident, reasoned
disagreement rather than penalising it.
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Dispute phrase patterns (case-insensitive substring match)
# ---------------------------------------------------------------------------

_DISPUTE_PATTERNS: list[str] = [
    r"\bi\s+disagree\b",
    r"\bactually\b",
    r"\bthat['']s\s+not\s+quite\s+right\b",
    r"\bthat\s+is\s+not\s+quite\s+right\b",
    r"\bno,?\s+what\s+i\s+meant\b",
    r"\bno,?\s+that['']s\s+not\b",
    r"\bi\s+think\s+you['']re\s+(mischaracteris|incorrect|wrong)\b",
    r"\bwith\s+respect,?\s+(i|that)\b",
    r"\bnot\s+exactly\b",
    r"\byou(?:'re|\s+are)\s+(mistaken|incorrect|misunderstanding)\b",
    r"\bi\s+would\s+push\s+back\b",
    r"\bthat('s| is)\s+not\s+(accurate|correct|right)\b",
    r"\bi('d| would)\s+(challenge|dispute|correct|clarify)\s+that\b",
]

_DISPUTE_RE = re.compile("|".join(_DISPUTE_PATTERNS), re.IGNORECASE)


def detect_pushback(response: str) -> bool:
    """Return True if *response* contains a candidate pushback / dispute signal.

    Parameters
    ----------
    response:
        The raw candidate response string.

    Returns
    -------
    bool
        ``True`` when a dispute phrase is detected, ``False`` otherwise.
    """
    if not response or not response.strip():
        return False
    return bool(_DISPUTE_RE.search(response))
