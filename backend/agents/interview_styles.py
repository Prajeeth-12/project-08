"""
interview_styles.py — InterviewStyle enum and prompt modifier resolution.

Lifted and adapted from:
cloned_repos/AI-Interview-Agent/backend/agents/config_models.py
"""
from __future__ import annotations

import enum


class InterviewStyle(enum.Enum):
    """Four canonical interview tone/pressure modes."""

    FORMAL = "formal"
    CASUAL = "casual"
    AGGRESSIVE = "aggressive"
    TECHNICAL = "technical"


_STYLE_MODIFIERS: dict[InterviewStyle, str] = {
    InterviewStyle.FORMAL: (
        "Maintain a structured, professional tone. Use formal language. "
        "Follow a clear question-answer sequence and avoid colloquialisms."
    ),
    InterviewStyle.CASUAL: (
        "Be conversational and approachable. Use natural, friendly language. "
        "Treat this as a relaxed technical chat, not a high-stakes interrogation."
    ),
    InterviewStyle.AGGRESSIVE: (
        "Challenge every answer. Apply pressure. Ask rapid follow-ups immediately "
        "after each response. Simulate a high-pressure FAANG interview where "
        "vague or shallow answers are not accepted."
    ),
    InterviewStyle.TECHNICAL: (
        "Focus purely on technical depth. Skip pleasantries. Go deep on "
        "implementation details, algorithmic complexity, and architecture "
        "trade-offs. Do not waste time on soft-skill framing."
    ),
}


def get_style_modifier(style: InterviewStyle) -> str:
    """Return the prompt modifier string for the given interview style.

    Args:
        style: One of the four InterviewStyle variants.

    Returns:
        A short instruction paragraph to be appended to the system prompt.
    """
    return _STYLE_MODIFIERS[style]
