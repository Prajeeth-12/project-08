"""Periodic transcript checkpoint for the live interview (durability).

All persistence normally happens when the WebSocket loop ends cleanly. If the
process dies hard (OOM / SIGKILL / container eviction) that path never runs
and the whole transcript is lost. TranscriptFlusher mitigates this: it runs
OFF the turn-critical path as a detached asyncio task and, every ``interval``
seconds, if the transcript has GROWN since the last checkpoint, calls an
injected async ``flush`` callable to persist the current state.

A crash then loses at most one interval of conversation instead of everything.

The ``flush`` callable is duck-typed (``async (state) -> None``) for
testability — tests pass a mock recorder with no DB or WebSocket needed.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.agents.state_machine import InterviewSessionState

log = logging.getLogger(__name__)

FlushFn = Callable[["InterviewSessionState"], Awaitable[None]]


class TranscriptFlusher:
    """Checkpoint the growing transcript at an interval; never blocks a turn."""

    def __init__(
        self,
        state: "InterviewSessionState",
        flush: FlushFn,
        *,
        interval_sec: float = 20.0,
    ) -> None:
        self._state = state
        self._flush = flush
        self._interval = float(interval_sec)
        self._task: asyncio.Task[None] | None = None
        self._last_len: int = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Launch the flusher as a detached background task (idempotent).

        A non-positive interval disables it — start() becomes a no-op.
        """
        if self._interval <= 0:
            return
        if self._task is None:
            self._task = asyncio.create_task(self._run())

    async def aclose(self) -> None:
        """Stop the flusher (idempotent)."""
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _checkpoint(self) -> None:
        """Persist the current state if the transcript grew since the last checkpoint."""
        current_len = len(self._state.turns)
        if current_len <= self._last_len:
            return
        with contextlib.suppress(Exception):
            await self._flush(self._state)
            self._last_len = current_len

    async def _run(self) -> None:
        try:
            while True:
                await asyncio.sleep(self._interval)
                await self._checkpoint()
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("transcript_flusher: checkpoint loop error (ignored)")
