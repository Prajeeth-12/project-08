"""
Core domain models for Project 08 interview platform.
12-table schema: users, candidate_profiles, interview_blueprints,
interview_sessions, interview_questions, candidate_answers,
score_dimensions, scores, turn_feedback, interview_reports,
recommended_resources, speech_tasks.
"""

import uuid
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer,
    String, Text, UniqueConstraint, func
)
from sqlalchemy import JSON as JSONB  # JSONB in PostgreSQL, JSON in SQLite (local dev)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


# ── Enums ──────────────────────────────────────────────────────────────────

class AuthProvider(str, enum.Enum):
    COGNITO = "cognito"
    GOOGLE = "google"
    EMAIL = "email"


class SessionStatus(str, enum.Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class QuestionType(str, enum.Enum):
    MAIN = "main"
    FOLLOWUP = "followup"
    PROBE = "probe"
    CODING_INVOKE = "coding_invoke"
    WRAP_UP = "wrap_up"


class TranscriptStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETE = "complete"
    PARTIAL = "partial"


class ReportStatus(str, enum.Enum):
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskType(str, enum.Enum):
    STT = "stt"
    TTS = "tts"
    REPORT_GENERATION = "report_generation"
    COACH_EVALUATION = "coach_evaluation"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Seniority(str, enum.Enum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"


class ResourceType(str, enum.Enum):
    ARTICLE = "article"
    VIDEO = "video"
    COURSE = "course"
    DOCUMENTATION = "documentation"


# ── 1. users ───────────────────────────────────────────────────────────────

class PlatformUser(Base):
    __tablename__ = "platform_users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    auth_provider: Mapped[str] = mapped_column(String(50), default="cognito")
    auth_provider_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    role: Mapped[str] = mapped_column(String(50), default="candidate")
    data_consent_given: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_given_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profiles: Mapped[list["CandidateProfile"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    blueprints: Mapped[list["InterviewBlueprint"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[list["InterviewSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")


# ── 2. candidate_profiles ──────────────────────────────────────────────────

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False)
    resume_hash: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True)  # SHA-256
    raw_text: Mapped[Optional[str]] = mapped_column(Text)
    skills: Mapped[Optional[dict]] = mapped_column(JSONB)          # ["Python", "FastAPI", ...]
    claims: Mapped[Optional[dict]] = mapped_column(JSONB)          # [{text, category, metric, veracity}, ...]
    sections: Mapped[Optional[dict]] = mapped_column(JSONB)        # {experience, education, projects, skills}
    seniority: Mapped[Optional[str]] = mapped_column(String(50))   # junior | mid | senior
    parsed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["PlatformUser"] = relationship(back_populates="profiles")
    blueprints: Mapped[list["InterviewBlueprint"]] = relationship(back_populates="profile")


# ── 3. interview_blueprints ────────────────────────────────────────────────

class InterviewBlueprint(Base):
    __tablename__ = "interview_blueprints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False)
    profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="SET NULL"))
    title: Mapped[Optional[str]] = mapped_column(String(255))
    target_role: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255))
    interview_type: Mapped[str] = mapped_column(String(50), default="technical")   # technical | behavioral | mixed
    interview_style: Mapped[str] = mapped_column(String(50), default="formal")     # formal | casual | aggressive | technical
    difficulty: Mapped[str] = mapped_column(String(50), default="medium")          # easy | medium | hard | adaptive
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    question_count: Mapped[Optional[int]] = mapped_column(Integer)
    topics: Mapped[Optional[dict]] = mapped_column(JSONB)       # [{section, competencies, time_budget, expectations}, ...]
    instructions: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["PlatformUser"] = relationship(back_populates="blueprints")
    profile: Mapped[Optional["CandidateProfile"]] = relationship(back_populates="blueprints")
    sessions: Mapped[list["InterviewSession"]] = relationship(back_populates="blueprint")


# ── 4. interview_sessions ──────────────────────────────────────────────────

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("platform_users.id", ondelete="CASCADE"), nullable=False)
    blueprint_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_blueprints.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(50), default="created")  # created|in_progress|completed|cancelled|failed
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    current_question_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    question_count: Mapped[int] = mapped_column(Integer, default=0)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)   # FSM state, agent state, coverage
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["PlatformUser"] = relationship(back_populates="sessions")
    blueprint: Mapped[Optional["InterviewBlueprint"]] = relationship(back_populates="sessions")
    questions: Mapped[list["InterviewQuestion"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    report: Mapped[Optional["InterviewReport"]] = relationship(back_populates="session", uselist=False, cascade="all, delete-orphan")
    resources: Mapped[list["RecommendedResource"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    speech_tasks: Mapped[list["SpeechTask"]] = relationship(back_populates="session", cascade="all, delete-orphan")


# ── 5. interview_questions ─────────────────────────────────────────────────

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), default="main")  # main|followup|probe|coding_invoke|wrap_up
    topic: Mapped[Optional[str]] = mapped_column(String(255))
    difficulty: Mapped[Optional[str]] = mapped_column(String(50))
    source: Mapped[Optional[str]] = mapped_column(String(100))              # agent|blueprint|followup_ladder
    parent_question_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_questions.id", ondelete="SET NULL"))
    asked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)   # agent action, competency, probe category

    session: Mapped["InterviewSession"] = relationship(back_populates="questions")
    follow_ups: Mapped[list["InterviewQuestion"]] = relationship("InterviewQuestion", foreign_keys=[parent_question_id])
    answer: Mapped[Optional["CandidateAnswer"]] = relationship(back_populates="question", uselist=False, cascade="all, delete-orphan")


# ── 6. candidate_answers ───────────────────────────────────────────────────

class CandidateAnswer(Base):
    __tablename__ = "candidate_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    answer_text: Mapped[Optional[str]] = mapped_column(Text)               # stored encrypted via encrypt_field()
    transcript_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending|complete|partial
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)   # VAD events, turn number, word count

    question: Mapped["InterviewQuestion"] = relationship(back_populates="answer")
    scores: Mapped[list["Score"]] = relationship(back_populates="answer", cascade="all, delete-orphan")
    turn_feedback: Mapped[list["TurnFeedback"]] = relationship(back_populates="answer", cascade="all, delete-orphan")


# ── 7. score_dimensions ────────────────────────────────────────────────────

class ScoreDimension(Base):
    __tablename__ = "score_dimensions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    weight: Mapped[float] = mapped_column(Float, default=0.2)
    max_score: Mapped[int] = mapped_column(Integer, default=10)
    evaluation_criteria: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    scores: Mapped[list["Score"]] = relationship(back_populates="dimension")


# ── 8. scores ──────────────────────────────────────────────────────────────

class Score(Base):
    __tablename__ = "scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    answer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidate_answers.id", ondelete="CASCADE"), nullable=False)
    dimension_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("score_dimensions.id", ondelete="RESTRICT"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    justification: Mapped[Optional[str]] = mapped_column(Text)
    evidence: Mapped[Optional[dict]] = mapped_column(JSONB)     # [{turn_id, quote, strength}, ...] — V3
    evaluator: Mapped[Optional[str]] = mapped_column(String(100))  # coach_agent|orda_loop|star_evaluator
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)

    answer: Mapped["CandidateAnswer"] = relationship(back_populates="scores")
    dimension: Mapped["ScoreDimension"] = relationship(back_populates="scores")


# ── 9. turn_feedback ───────────────────────────────────────────────────────

class TurnFeedback(Base):
    __tablename__ = "turn_feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    answer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("candidate_answers.id", ondelete="CASCADE"), nullable=False)
    feedback_type: Mapped[str] = mapped_column(String(50), default="coaching")  # coaching|verdict|coaching_card
    strengths: Mapped[Optional[str]] = mapped_column(Text)
    weaknesses: Mapped[Optional[str]] = mapped_column(Text)
    suggestions: Mapped[Optional[str]] = mapped_column(Text)
    feedback_text: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)  # verdict (Solid/Shaky/Couldn't Defend), cards

    answer: Mapped["CandidateAnswer"] = relationship(back_populates="turn_feedback")


# ── 10. interview_reports ──────────────────────────────────────────────────

class InterviewReport(Base):
    __tablename__ = "interview_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    overall_score: Mapped[Optional[float]] = mapped_column(Float)
    performance_summary: Mapped[Optional[str]] = mapped_column(Text)
    strengths: Mapped[Optional[str]] = mapped_column(Text)
    weaknesses: Mapped[Optional[str]] = mapped_column(Text)
    recommendations: Mapped[Optional[str]] = mapped_column(Text)
    dimension_scores: Mapped[Optional[dict]] = mapped_column(JSONB)   # {Technical: 8.2, Communication: 7.1, ...}
    report_status: Mapped[str] = mapped_column(String(50), default="generating")  # generating|completed|failed
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)

    session: Mapped["InterviewSession"] = relationship(back_populates="report")


# ── 11. recommended_resources ─────────────────────────────────────────────

class RecommendedResource(Base):
    __tablename__ = "recommended_resources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    resource_url: Mapped[str] = mapped_column(Text, nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), default="article")  # article|video|course|documentation
    topic: Mapped[Optional[str]] = mapped_column(String(255))
    reason: Mapped[Optional[str]] = mapped_column(Text)
    relevance_score: Mapped[Optional[float]] = mapped_column(Float)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)

    session: Mapped["InterviewSession"] = relationship(back_populates="resources")


# ── 12. speech_tasks ───────────────────────────────────────────────────────

class SpeechTask(Base):
    __tablename__ = "speech_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False)
    answer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("candidate_answers.id", ondelete="CASCADE"))
    task_type: Mapped[str] = mapped_column(String(50), nullable=False)   # stt|tts|report_generation|coach_evaluation
    provider: Mapped[Optional[str]] = mapped_column(String(100))         # deepgram|internal|sqs_worker
    status: Mapped[str] = mapped_column(String(50), default="pending")   # pending|processing|completed|failed
    input_url: Mapped[Optional[str]] = mapped_column(Text)
    output_url: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSONB)

    session: Mapped["InterviewSession"] = relationship(back_populates="speech_tasks")
