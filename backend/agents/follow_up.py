# module-2-ai-interview-agent/core/follow_up.py
"""
FollowUpLadder — tracks per-competency follow-up depth during the interview.

Levels: surface -> push -> floor
After reaching floor (3 probes on the same competency), the engine must move on.
The ladder resets when the competency changes.
"""

from typing import Optional

LEVELS = ["surface", "push", "floor"]


class FollowUpLadder:
    """Tracks how deep we've gone on the current competency.

    Rules:
    - Every new competency starts at "surface".
    - Calling advance() moves to the next level: surface -> push -> floor.
    - Once "floor" is reached, advance() stays at "floor" (no further moves).
    - Switching competency via set_competency() resets the ladder to "surface".
    """

    def __init__(self) -> None:
        self._current_competency: Optional[str] = None
        self._level_index: int = 0  # 0=surface, 1=push, 2=floor

    def set_competency(self, competency: str) -> None:
        """Switch to a new competency and reset the ladder if it changed."""
        if competency != self._current_competency:
            self._current_competency = competency
            self._level_index = 0

    def get_level(self, competency: str) -> str:
        """Return the current depth level for the given competency.

        If the competency is different from the tracked one, this implicitly
        reflects a reset — returns "surface" after updating the tracker.
        """
        if competency != self._current_competency:
            self.set_competency(competency)
        return LEVELS[self._level_index]

    def advance(self, competency: str) -> None:
        """Move one level deeper for this competency.

        If the competency changed, the ladder resets before advancing.
        Once at "floor" it stays there.
        """
        if competency != self._current_competency:
            self.set_competency(competency)

        if self._level_index < len(LEVELS) - 1:
            self._level_index += 1

    def is_at_floor(self, competency: str) -> bool:
        """Return True if we have exhausted follow-up depth for this competency."""
        return self.get_level(competency) == "floor"

    def reset(self) -> None:
        """Hard reset — clears tracked competency and returns to surface."""
        self._current_competency = None
        self._level_index = 0
