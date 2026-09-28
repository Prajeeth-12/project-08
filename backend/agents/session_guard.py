"""Hard duration / turn-count guard for the live interview session.

Runs as a detached asyncio background task off the turn-critical path.
Enforces two ceilings:
  - wall-clock duration (default 30 minutes / 1800 s)
  - total turn count   (default 60 turns)

When either ceiling is hit, sends an INTERVIEW_ENDED message via WebSocket
and marks the session state as COMPLETED so the terminal status guard blocks
any further writes.

``time_fn`` defaults to ``time.monotonic`` and is injectable for deterministic
testing — pass a lambda that returns a controlled float.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from collections.abc import Callable
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import WebSocket
    from backend.agents.state_machine import InterviewSessionState

log = logging.getLogger(__name__)

_WRAP_UP_MESSAGE = (
    "We've reached the time limit for this interview. "
    "Thank you for your time — your feedback report will be ready shortly."
)


class SessionGuard:
    """Enforce hard duration/turn ceilings on a live WebSocket session.

    ``websocket`` only needs an async ``send_json(data)`` method — tests can
    pass a fake that records messages without a real WebSocket.
    ``state`` is the live InterviewSessionState whose ``turn_count`` is polled.
    ``time_fn`` is injectable so tests drive the clock with a fake.
    """

    def __init__(
        self,
        websocket: "WebSocket",
        state: "InterviewSessionState",
        *,
        max_duration_sec: float = 1800.0,
        max_turns: int = 60,
        interval_sec: float = 2.0,
        time_fn: Callable[[], float] | None = None,
    ) -> None:
        self._ws = websocket
        self._state = state
        self._max_duration = float(max_duration_sec)
        self._max_turns = int(max_turns)
        self._interval = interval_sec
        self._time = time_fn or time.monotonic
        self._task: asyncio.Task[None] | None = None
        self._started_at: float = 0.0
        self.tripped: bool = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Launch the guard as a detached background task (idempotent)."""
        if self._task is None:
            self._started_at = self._time()
            self._task = asyncio.create_task(self._run())

    async def aclose(self) -> None:
        """Stop the guard (idempotent)."""
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _limit_reached(self, elapsed: float) -> str | None:
        """Return a human reason if a ceiling is hit, else None."""
        if elapsed >= self._max_duration:
            return f"max duration {self._max_duration:.0f}s reached"
        if self._state.turn_count >= self._max_turns:
            return f"max turns {self._max_turns} reached"
        return None

    async def _wrap_up(self, reason: str) -> None:
        """Send closing INTERVIEW_ENDED message and mark session COMPLETED."""
        from backend.agents.state_machine import SessionState

        log.warning(
            "session_guard: %s — wrapping up session %s",
            reason,
            self._state.session_id,
        )
        with contextlib.suppress(Exception):
            await self._ws.send_json(
                {
                    "type": "INTERVIEW_ENDED",
                    "reason": reason,
                    "summary": _WRAP_UP_MESSAGE,
                }
            )
        with contextlib.suppress(Exception):
            self._state.current_state = SessionState.COMPLETED

    async def _run(self) -> None:
        try:
            while True:
                elapsed = self._time() - self._started_at
                reason = self._limit_reached(elapsed)
                if reason is not None:
                    self.tripped = True
                    await self._wrap_up(reason)
                    return
                await asyncio.sleep(self._interval)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("session_guard: watcher error (ignored)")
