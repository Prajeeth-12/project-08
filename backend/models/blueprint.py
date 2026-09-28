from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, Integer, String, Text
from backend.database import Base

class Question(Base):
    """Algorithmic coding problem entity with test cases, starter code, and constraints."""
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    difficulty = Column(String(50), default="MEDIUM", nullable=False)  # EASY, MEDIUM, HARD
    category = Column(String(100), default="DSA", nullable=False)  # Arrays, Dynamic Programming, Graphs
    description = Column(Text, nullable=False)
    starter_code = Column(Text, default="", nullable=False)
    test_cases = Column(Text, default="[]", nullable=False)  # JSON array of {input, expected_output}
    hidden_test_cases = Column(Text, default="[]", nullable=False)
    time_limit_sec = Column(Integer, default=2, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class InterviewBlueprint(Base):
    """Targeted blueprint pairing questions, role competencies, and company archetypes."""
    __tablename__ = "interview_blueprints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    target_role = Column(String(100), nullable=False)
    company_style = Column(String(100), default="General Tech", nullable=False)  # Amazon, Google, Startup
    question_ids = Column(Text, default="[]", nullable=False)  # JSON array of Question UUIDs
    duration_minutes = Column(Integer, default=45, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
