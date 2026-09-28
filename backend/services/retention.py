"""
Data retention cleanup job — V2.9 / DPDPA compliance.

Deletes interview sessions and all child records for users who have not
logged in for over 1 year. Runs as a scheduled task (monthly via ECS
scheduled task or APScheduler for local dev).

Also cleans up S3 objects referenced by deleted speech_tasks (if S3 is
configured). S3 lifecycle policies provide a secondary safety net.

Usage (called from startup or a scheduler):
    from backend.services.retention import run_retention_cleanup
    await run_retention_cleanup()
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

RETENTION_DAYS = int(os.getenv("DATA_RETENTION_DAYS", "365"))


async def run_retention_cleanup(dry_run: bool = False) -> dict:
    """
    Delete sessions + all child data for users inactive for RETENTION_DAYS.
    Returns a summary dict with counts.
    """
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    summary = {"sessions_deleted": 0, "users_anonymised": 0, "s3_objects_deleted": 0, "dry_run": dry_run}

    try:
        from backend.database import get_db
        from sqlalchemy import text as sql_text

        async for db in get_db():
            # Find users who haven't updated their record in RETENTION_DAYS
            result = await db.execute(
                sql_text("""
                    SELECT id FROM platform_users
                    WHERE updated_at < :cutoff
                    AND id IN (
                        SELECT DISTINCT user_id FROM interview_sessions
                        WHERE updated_at < :cutoff
                    )
                """),
                {"cutoff": cutoff},
            )
            stale_user_ids = [str(row[0]) for row in result.fetchall()]

            if not stale_user_ids:
                logger.info("Retention: no stale users found")
                break

            logger.info(f"Retention: found {len(stale_user_ids)} stale users (dry_run={dry_run})")

            if dry_run:
                summary["users_anonymised"] = len(stale_user_ids)
                break

            # Collect S3 URLs before deleting
            s3_result = await db.execute(
                sql_text("""
                    SELECT output_url FROM speech_tasks
                    WHERE session_id IN (
                        SELECT id FROM interview_sessions WHERE user_id = ANY(:uids)
                    )
                    AND output_url IS NOT NULL
                """),
                {"uids": stale_user_ids},
            )
            s3_urls = [row[0] for row in s3_result.fetchall() if row[0]]

            # Delete sessions cascade (FKs handle children)
            del_result = await db.execute(
                sql_text("DELETE FROM interview_sessions WHERE user_id = ANY(:uids)"),
                {"uids": stale_user_ids},
            )
            summary["sessions_deleted"] = del_result.rowcount

            # Anonymise user records (keep row for audit, strip PII)
            await db.execute(
                sql_text("""
                    UPDATE platform_users
                    SET name = '[deleted]',
                        auth_provider_id = NULL,
                        updated_at = NOW()
                    WHERE id = ANY(:uids)
                """),
                {"uids": stale_user_ids},
            )
            summary["users_anonymised"] = len(stale_user_ids)
            await db.commit()

            # Best-effort S3 cleanup
            if s3_urls:
                summary["s3_objects_deleted"] = await _delete_s3_objects(s3_urls)

            break  # exit the async generator

    except Exception as e:
        logger.error(f"Retention cleanup failed: {type(e).__name__}: {e}")

    logger.info(f"Retention cleanup complete: {summary}")
    return summary


async def _delete_s3_objects(urls: list) -> int:
    """Delete S3 objects by URL. Returns count deleted."""
    bucket = os.getenv("AWS_S3_BUCKET", "")
    if not bucket:
        return 0

    deleted = 0
    try:
        import boto3
        import asyncio
        s3 = boto3.client("s3", region_name=os.getenv("AWS_REGION", "us-east-1"))
        keys = []
        for url in urls:
            # Extract key from s3://bucket/key or https://bucket.s3.amazonaws.com/key
            if url.startswith("s3://"):
                key = url.split("/", 3)[-1]
            elif ".s3." in url:
                key = "/" .join(url.split("/")[3:])
            else:
                continue
            keys.append({"Key": key})

        if keys:
            resp = await asyncio.to_thread(
                s3.delete_objects,
                Bucket=bucket,
                Delete={"Objects": keys[:1000]},  # AWS limit per call
            )
            deleted = len(resp.get("Deleted", []))
    except Exception as e:
        logger.warning(f"S3 cleanup failed: {type(e).__name__}")

    return deleted
