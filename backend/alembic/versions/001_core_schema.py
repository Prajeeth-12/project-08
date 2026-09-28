"""core 12-table interview platform schema

Revision ID: 001_core_schema
Revises: 888df97370d5
Create Date: 2026-09-28

Tables:
  platform_users, candidate_profiles, interview_blueprints,
  interview_sessions, interview_questions, candidate_answers,
  score_dimensions (+ seed), scores, turn_feedback,
  interview_reports, recommended_resources, speech_tasks

Also adds: consent fields, RLS policies
"""

from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_core_schema"
down_revision: Union[str, Sequence[str], None] = "888df97370d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. platform_users ────────────────────────────────────────────────
    op.create_table(
        "platform_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("name", sa.String(255)),
        sa.Column("auth_provider", sa.String(50), nullable=False, server_default="cognito"),
        sa.Column("auth_provider_id", sa.String(255)),
        sa.Column("role", sa.String(50), nullable=False, server_default="candidate"),
        sa.Column("data_consent_given", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("consent_given_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_platform_users_email", "platform_users", ["email"])
    op.create_index("ix_platform_users_auth_provider_id", "platform_users", ["auth_provider_id"])

    # ── 2. candidate_profiles ─────────────────────────────────────────────
    op.create_table(
        "candidate_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("resume_hash", sa.String(64), unique=True),  # SHA-256
        sa.Column("raw_text", sa.Text),                        # encrypted at app layer in V2
        sa.Column("skills", postgresql.JSONB),
        sa.Column("claims", postgresql.JSONB),
        sa.Column("sections", postgresql.JSONB),
        sa.Column("seniority", sa.String(50)),
        sa.Column("parsed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_candidate_profiles_user_id", "candidate_profiles", ["user_id"])
    op.create_index("ix_candidate_profiles_resume_hash", "candidate_profiles", ["resume_hash"])

    # ── 3. interview_blueprints ───────────────────────────────────────────
    op.create_table(
        "interview_blueprints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="SET NULL")),
        sa.Column("title", sa.String(255)),
        sa.Column("target_role", sa.String(255), nullable=False),
        sa.Column("company", sa.String(255)),
        sa.Column("interview_type", sa.String(50), server_default="technical"),
        sa.Column("interview_style", sa.String(50), server_default="formal"),
        sa.Column("difficulty", sa.String(50), server_default="medium"),
        sa.Column("duration_minutes", sa.Integer, server_default="30"),
        sa.Column("question_count", sa.Integer),
        sa.Column("topics", postgresql.JSONB),
        sa.Column("instructions", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_interview_blueprints_user_id", "interview_blueprints", ["user_id"])

    # ── 4. interview_sessions ─────────────────────────────────────────────
    op.create_table(
        "interview_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("blueprint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_blueprints.id", ondelete="SET NULL")),
        sa.Column("status", sa.String(50), nullable=False, server_default="created"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("duration_seconds", sa.Integer),
        sa.Column("current_question_id", postgresql.UUID(as_uuid=True)),
        sa.Column("question_count", sa.Integer, server_default="0"),
        sa.Column("metadata", postgresql.JSONB),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_interview_sessions_user_id", "interview_sessions", ["user_id"])
    op.create_index("ix_interview_sessions_status", "interview_sessions", ["status"])

    # ── 5. interview_questions ────────────────────────────────────────────
    op.create_table(
        "interview_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence_number", sa.Integer, nullable=False),
        sa.Column("question_text", sa.Text, nullable=False),
        sa.Column("question_type", sa.String(50), server_default="main"),
        sa.Column("topic", sa.String(255)),
        sa.Column("difficulty", sa.String(50)),
        sa.Column("source", sa.String(100)),
        sa.Column("parent_question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_questions.id", ondelete="SET NULL")),
        sa.Column("asked_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metadata", postgresql.JSONB),
    )
    op.create_index("ix_interview_questions_session_id", "interview_questions", ["session_id"])

    # ── 6. candidate_answers ──────────────────────────────────────────────
    op.create_table(
        "candidate_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answer_text", sa.Text),
        sa.Column("transcript_status", sa.String(50), server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("duration_seconds", sa.Integer),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metadata", postgresql.JSONB),
    )
    op.create_index("ix_candidate_answers_session_id", "candidate_answers", ["session_id"])
    op.create_index("ix_candidate_answers_question_id", "candidate_answers", ["question_id"])

    # ── 7. score_dimensions (seed data follows) ───────────────────────────
    op.create_table(
        "score_dimensions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("weight", sa.Float, nullable=False, server_default="0.2"),
        sa.Column("max_score", sa.Integer, nullable=False, server_default="10"),
        sa.Column("evaluation_criteria", sa.Text),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Seed the 5 default dimensions
    op.execute("""
        INSERT INTO score_dimensions (id, name, description, weight, max_score, evaluation_criteria) VALUES
        (gen_random_uuid(), 'Technical Knowledge',
         'Depth and accuracy of technical concepts, tools, and domain expertise',
         0.35, 10, 'Correct use of terminology, understanding of trade-offs, domain-specific accuracy'),
        (gen_random_uuid(), 'Problem Solving',
         'Structured approach to analysing and solving technical or situational problems',
         0.25, 10, 'Problem decomposition, algorithm/approach selection, edge case awareness'),
        (gen_random_uuid(), 'Communication',
         'Clarity, structure, and conciseness of spoken or written responses',
         0.20, 10, 'Clear structure, avoids filler language, explains reasoning step by step'),
        (gen_random_uuid(), 'Depth',
         'Ability to go beyond surface-level answers into implementation details and trade-offs',
         0.10, 10, 'Specificity of examples, willingness to defend or elaborate under follow-up'),
        (gen_random_uuid(), 'Clarity',
         'Logical flow of response, avoidance of contradiction, concise delivery',
         0.10, 10, 'No contradictions, concise sentences, on-topic throughout')
    """)

    # ── 8. scores ─────────────────────────────────────────────────────────
    op.create_table(
        "scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_answers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dimension_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("score_dimensions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("score", sa.Float, nullable=False),
        sa.Column("max_score", sa.Integer, nullable=False),
        sa.Column("justification", sa.Text),
        sa.Column("evidence", postgresql.JSONB),   # [{turn_id, quote, strength}] — populated in V3
        sa.Column("evaluator", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metadata", postgresql.JSONB),
    )
    op.create_index("ix_scores_session_id", "scores", ["session_id"])
    op.create_index("ix_scores_answer_id", "scores", ["answer_id"])

    # ── 9. turn_feedback ──────────────────────────────────────────────────
    op.create_table(
        "turn_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_answers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feedback_type", sa.String(50), server_default="coaching"),
        sa.Column("strengths", sa.Text),
        sa.Column("weaknesses", sa.Text),
        sa.Column("suggestions", sa.Text),
        sa.Column("feedback_text", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metadata", postgresql.JSONB),
    )
    op.create_index("ix_turn_feedback_session_id", "turn_feedback", ["session_id"])
    op.create_index("ix_turn_feedback_answer_id", "turn_feedback", ["answer_id"])

    # ── 10. interview_reports ─────────────────────────────────────────────
    op.create_table(
        "interview_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("overall_score", sa.Float),
        sa.Column("performance_summary", sa.Text),
        sa.Column("strengths", sa.Text),
        sa.Column("weaknesses", sa.Text),
        sa.Column("recommendations", sa.Text),
        sa.Column("dimension_scores", postgresql.JSONB),
        sa.Column("report_status", sa.String(50), server_default="generating"),
        sa.Column("generated_at", sa.DateTime(timezone=True)),
        sa.Column("metadata", postgresql.JSONB),
    )

    # ── 11. recommended_resources ─────────────────────────────────────────
    op.create_table(
        "recommended_resources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("resource_url", sa.Text, nullable=False),
        sa.Column("resource_type", sa.String(50), server_default="article"),
        sa.Column("topic", sa.String(255)),
        sa.Column("reason", sa.Text),
        sa.Column("relevance_score", sa.Float),
        sa.Column("priority", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metadata", postgresql.JSONB),
    )
    op.create_index("ix_recommended_resources_session_id", "recommended_resources", ["session_id"])

    # ── 12. speech_tasks ──────────────────────────────────────────────────
    op.create_table(
        "speech_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_answers.id", ondelete="CASCADE")),
        sa.Column("task_type", sa.String(50), nullable=False),
        sa.Column("provider", sa.String(100)),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("input_url", sa.Text),
        sa.Column("output_url", sa.Text),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("error_message", sa.Text),
        sa.Column("retry_count", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metadata", postgresql.JSONB),
    )
    op.create_index("ix_speech_tasks_session_id", "speech_tasks", ["session_id"])
    op.create_index("ix_speech_tasks_status", "speech_tasks", ["status"])

    # ── RLS policies (PostgreSQL only) ────────────────────────────────────
    # Enable RLS so users can only read their own rows even if app has a bug
    for table in [
        "interview_blueprints", "interview_sessions",
        "interview_reports", "recommended_resources",
    ]:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY {table}_user_isolation ON {table}
            USING (user_id = current_setting('app.current_user_id', true)::uuid)
        """)

    # candidate_profiles isolation
    op.execute("ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY candidate_profiles_user_isolation ON candidate_profiles
        USING (user_id = current_setting('app.current_user_id', true)::uuid)
    """)


def downgrade() -> None:
    # Drop RLS policies first
    for table in ["candidate_profiles", "interview_blueprints", "interview_sessions",
                  "interview_reports", "recommended_resources"]:
        op.execute(f"DROP POLICY IF EXISTS {table}_user_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")

    # Drop tables in reverse FK order
    for table in [
        "speech_tasks", "recommended_resources", "interview_reports",
        "turn_feedback", "scores", "score_dimensions",
        "candidate_answers", "interview_questions", "interview_sessions",
        "interview_blueprints", "candidate_profiles", "platform_users",
    ]:
        op.drop_table(table)
