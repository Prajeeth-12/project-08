"""institutional layer: organizations, cohorts, placements

Revision ID: 003_institutional_layer
Revises: 002_candidate_scorecards
Create Date: 2026-09-29

Tables added:
  organizations        - colleges / companies
  cohorts              - student batches within an org
  cohort_members       - user ↔ cohort mapping
  placement_drives     - scheduled assessment campaigns
  drive_allocations    - candidate → drive assignment
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003_institutional_layer"
down_revision: Union[str, Sequence[str], None] = "002_candidate_scorecards"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── organizations ────────────────────────────────────────────────────
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), server_default="college"),   # college | company
        sa.Column("domain", sa.String(255)),                          # email domain for auto-join
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("country", sa.String(100), server_default="India"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("metadata", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_organizations_domain", "organizations", ["domain"])

    # link users to org (add column to platform_users)
    op.add_column("platform_users", sa.Column(
        "org_id", postgresql.UUID(as_uuid=True),
        sa.ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    ))

    # ── cohorts ───────────────────────────────────────────────────────────
    op.create_table(
        "cohorts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),            # e.g. "CSE 2026 Batch"
        sa.Column("academic_year", sa.String(20)),
        sa.Column("department", sa.String(100)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_cohorts_org_id", "cohorts", ["org_id"])

    # ── cohort_members ────────────────────────────────────────────────────
    op.create_table(
        "cohort_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cohort_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("cohort_id", "user_id", name="uq_cohort_member"),
    )
    op.create_index("ix_cohort_members_cohort_id", "cohort_members", ["cohort_id"])
    op.create_index("ix_cohort_members_user_id", "cohort_members", ["user_id"])

    # ── placement_drives ──────────────────────────────────────────────────
    op.create_table(
        "placement_drives",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("target_role", sa.String(255)),
        sa.Column("company", sa.String(255)),
        sa.Column("scheduled_at", sa.DateTime(timezone=True)),
        sa.Column("duration_minutes", sa.Integer, server_default="30"),
        sa.Column("interview_style", sa.String(50), server_default="formal"),
        sa.Column("difficulty", sa.String(50), server_default="medium"),
        sa.Column("status", sa.String(50), server_default="draft"),   # draft|active|completed
        sa.Column("created_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("platform_users.id", ondelete="SET NULL")),
        sa.Column("metadata", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_placement_drives_org_id", "placement_drives", ["org_id"])
    op.create_index("ix_placement_drives_status", "placement_drives", ["status"])

    # ── drive_allocations ─────────────────────────────────────────────────
    op.create_table(
        "drive_allocations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("drive_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("placement_drives.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("interview_sessions.id", ondelete="SET NULL")),
        sa.Column("status", sa.String(50), server_default="pending"),   # pending|started|completed
        sa.Column("allocated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("drive_id", "user_id", name="uq_drive_allocation"),
    )
    op.create_index("ix_drive_allocations_drive_id", "drive_allocations", ["drive_id"])
    op.create_index("ix_drive_allocations_user_id", "drive_allocations", ["user_id"])


def downgrade() -> None:
    op.drop_table("drive_allocations")
    op.drop_table("placement_drives")
    op.drop_table("cohort_members")
    op.drop_table("cohorts")
    op.drop_column("platform_users", "org_id")
    op.drop_table("organizations")
