"""candidate scorecards for cross-session tracking

Revision ID: 002_candidate_scorecards
Revises: 001_core_schema
Create Date: 2026-09-28
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_candidate_scorecards"
down_revision: Union[str, Sequence[str], None] = "001_core_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_scorecards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("overall_score", sa.Float),
        sa.Column("dimension_scores", postgresql.JSONB),
        sa.Column("readiness_score", sa.Float),
        sa.Column("rubric_band", sa.String(50)),
        sa.Column("role", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "session_id", name="uq_scorecard_user_session"),
    )
    op.create_index("ix_candidate_scorecards_user_id", "candidate_scorecards", ["user_id"])
    op.create_index("ix_candidate_scorecards_created_at", "candidate_scorecards", ["created_at"])


def downgrade() -> None:
    op.drop_table("candidate_scorecards")
