from datetime import datetime
import uuid
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from backend.database import Base

class FormalExam(Base):
    """Formal scheduled coding assessment with strict timing, lockdown, and problem sets."""
    __tablename__ = "formal_exams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text, default="", nullable=False)
    duration_minutes = Column(Integer, default=60, nullable=False)
    seb_required = Column(Boolean, default=True, nullable=False)
    max_infractions = Column(Integer, default=3, nullable=False)
    question_ids = Column(Text, default="[]", nullable=False)  # JSON array of Question UUIDs
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class ExamAttempt(Base):
    """Candidate attempt record tracking integrity events, infractions, code drafts, and final score."""
    __tablename__ = "exam_attempts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id = Column(String(36), index=True, nullable=False)
    candidate_id = Column(String(36), index=True, nullable=False)
    infraction_count = Column(Integer, default=0, nullable=False)
    infraction_log = Column(Text, default="[]", nullable=False)  # JSON array of infraction timestamps & reasons
    status = Column(String(50), default="IN_PROGRESS", nullable=False)  # IN_PROGRESS, SUBMITTED, DISQUALIFIED
    score = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
