from datetime import datetime
import enum
import uuid
from sqlalchemy import Column, DateTime, Enum, String, Text
from backend.database import Base

class SessionStage(str, enum.Enum):
    WAITING = "WAITING"
    TECH = "TECH"
    CODING_TOOL = "CODING_TOOL"
    SYSTEM_DESIGN = "SYSTEM_DESIGN"
    EVALUATING = "EVALUATING"
    COMPLETED = "COMPLETED"

class InterviewSession(Base):
    """Real-time mock interview session tracking candidate progression and state machine transitions."""
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id = Column(String(36), index=True, nullable=False)
    role_title = Column(String(100), default="Full Stack Software Engineer", nullable=False)
    stage = Column(Enum(SessionStage), default=SessionStage.WAITING, nullable=False)
    transcript = Column(Text, default="[]", nullable=False)  # JSON serialized chat turns
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
