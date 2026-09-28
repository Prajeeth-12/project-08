# module-2-ai-interview-agent/core/question_quality.py
"""
Quality Gate & Anti-Pattern Kill List for interviewer questions.

passes_quality_gate(question) — structural validity check.
passes_anti_pattern_check(question, history) — conversational pattern check.
"""

import re
from typing import List

# ---------------------------------------------------------------------------
# Quality Gate
# ---------------------------------------------------------------------------

# Leading words that mark a yes/no question
_YES_NO_STARTERS = (
    "did", "is", "are", "do", "does", "was", "were",
    "can", "could", "would", "has", "have",
)

# Verbs that make a sentence an imperative (and therefore a valid question
# even without a question mark).
_IMPERATIVE_VERBS = (
    "walk", "trace", "describe", "explain", "show", "tell",
    "compare", "outline", "list", "define", "justify",
    "demonstrate", "articulate", "elaborate", "discuss",
)


def passes_quality_gate(question: str) -> bool:
    """Return True if the question meets minimum structural quality standards.

    Rejects:
    - Under 8 words.
    - No question mark AND no imperative verb anywhere.
    - Pure yes/no questions (entire question is a yes/no form).
    """
    stripped = question.strip()
    if not stripped:
        return False

    words = stripped.split()
    if len(words) < 8:
        return False

    has_question_mark = "?" in stripped

    word_set = {w.lower().rstrip(".,!?:;") for w in words}
    has_imperative = bool(word_set & set(_IMPERATIVE_VERBS))

    if not has_question_mark and not has_imperative:
        return False

    first_word = words[0].lower().rstrip(".,!?")
    if first_word in _YES_NO_STARTERS and len(words) < 15:
        return False

    return True


# ---------------------------------------------------------------------------
# Anti-Pattern Check
# ---------------------------------------------------------------------------

# Vague filler phrases that signal an overly broad question
_VAGUE_PHRASES = (
    "tell me about yourself",
    "tell me about your background",
    "what are your strengths",
    "what are your weaknesses",
    "where do you see yourself",
    "why do you want this job",
    "tell me something about yourself",
)

# Phrases that indicate the interviewer is talking about the interview itself
_META_PHRASES = (
    "this interview",
    "our interview process",
    "this assessment",
    "this question",
    "let me ask you",
    "as your interviewer",
    "in this session",
)


def _normalize(text: str) -> str:
    """Lowercase, collapse whitespace, strip punctuation for fuzzy comparison."""
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _word_overlap_ratio(a: str, b: str) -> float:
    """Jaccard-style overlap on word sets."""
    set_a = set(_normalize(a).split())
    set_b = set(_normalize(b).split())
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def passes_anti_pattern_check(question: str, history: List[str]) -> bool:
    """Return True if the question passes all six anti-pattern checks.

    Anti-patterns detected:
    1. Repeats a previous question (fuzzy word-overlap >= 0.7).
    2. Overly vague — matches known filler phrases.
    3. Leading question — answer is embedded in the question.
    4. Multiple questions — more than one "?" in the text.
    5. Meta-question — about the interview itself rather than the candidate.
    6. (reserved for future: trivial / too short — already covered by quality gate)
    """
    if not question or not question.strip():
        return False

    normalized_q = _normalize(question)

    # (1) Repeat check — fuzzy match against history
    for prev in history:
        if _word_overlap_ratio(question, prev) >= 0.7:
            return False

    # (2) Overly vague
    for phrase in _VAGUE_PHRASES:
        if phrase in normalized_q:
            return False

    # (3) Leading question — answer embedded (heuristic: contains "right?",
    #     "correct?", "you did X, didn't you?", or similar affirmation traps)
    leading_patterns = [
        r"\bright\s*\?\s*$",
        r"\bcorrect\s*\?\s*$",
        r"\bdidn[‘’]?t you\s*\?\s*$",
        r"\bwasn[‘’]?t it\s*\?\s*$",
        r"\bisn[‘’]?t it\s*\?\s*$",
    ]
    q_lower = question.lower()
    for pattern in leading_patterns:
        if re.search(pattern, q_lower):
            return False

    # (4) Multiple questions — more than three "?" suggests a question dump
    if question.count("?") > 3:
        return False

    # (5) Meta-question — about the interview itself
    for phrase in _META_PHRASES:
        if phrase in normalized_q:
            return False

    return True
