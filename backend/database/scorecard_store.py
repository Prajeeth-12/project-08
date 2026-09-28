"""
Cross-session scorecard store — V3.6.

Tracks candidate performance across multiple interview sessions.
Allows returning candidates to see their progress over time.
Rewritten from module-2/backend/models/scorecard_store.py for RDS (not SQLite).

Schema: candidate_scorecards table (added via Alembic migration 002).
"""

import uuid
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


async def upsert_scorecard(
    user_id: str,
    session_id: str,
    overall_score: float,
    dimension_scores: dict,
    readiness_score: float,
    rubric_band: str,
    role: str,
) -> Optional[dict]:
    """
    Insert or update the scorecard entry for a user.
    Called at end of each interview after report is generated.
    """
    try:
        from backend.database import get_db
        from sqlalchemy import text as sql_text

        async for db in get_db():
            await db.execute(sql_text("""
                INSERT INTO candidate_scorecards (
                    id, user_id, session_id, overall_score, dimension_scores,
                    readiness_score, rubric_band, role, created_at, updated_at
                ) VALUES (
                    :id, :user_id, :session_id, :overall_score, :dimension_scores::jsonb,
                    :readiness_score, :rubric_band, :role, NOW(), NOW()
                )
                ON CONFLICT (user_id, session_id) DO UPDATE SET
                    overall_score = EXCLUDED.overall_score,
                    dimension_scores = EXCLUDED.dimension_scores,
                    readiness_score = EXCLUDED.readiness_score,
                    rubric_band = EXCLUDED.rubric_band,
                    updated_at = NOW()
            """), {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "session_id": session_id,
                "overall_score": overall_score,
                "dimension_scores": str(dimension_scores),
                "readiness_score": readiness_score,
                "rubric_band": rubric_band,
                "role": role,
            })
            await db.commit()
            return {"user_id": user_id, "session_id": session_id, "overall_score": overall_score}
    except Exception as e:
        logger.error(f"Scorecard upsert failed: {type(e).__name__}: {e}")
        return None


async def get_scorecard_history(user_id: str, limit: int = 10) -> list:
    """
    Get a candidate's scorecard history across sessions, newest first.
    """
    try:
        from backend.database import get_db
        from sqlalchemy import text as sql_text
        import json

        async for db in get_db():
            result = await db.execute(sql_text("""
                SELECT session_id, overall_score, dimension_scores, readiness_score,
                       rubric_band, role, created_at
                FROM candidate_scorecards
                WHERE user_id = :uid
                ORDER BY created_at DESC
                LIMIT :lim
            """), {"uid": user_id, "lim": limit})
            rows = result.fetchall()
            return [
                {
                    "session_id": str(r[0]),
                    "overall_score": r[1],
                    "dimension_scores": r[2] if isinstance(r[2], dict) else {},
                    "readiness_score": r[3],
                    "rubric_band": r[4],
                    "role": r[5],
                    "date": r[6].isoformat() if r[6] else None,
                }
                for r in rows
            ]
    except Exception as e:
        logger.error(f"Scorecard history failed: {type(e).__name__}: {e}")
        return []
