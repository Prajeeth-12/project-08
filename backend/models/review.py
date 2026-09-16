from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, Integer, String, Text
from backend.database import Base

class CodeReview(Base):
    """AST analysis and AI code review report evaluating Big-O, code smells, and design quality."""
    __tablename__ = "code_reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), index=True, nullable=True)
    session_id = Column(String(36), index=True, nullable=True)
    time_complexity = Column(String(50), default="O(N)", nullable=False)
    space_complexity = Column(String(50), default="O(1)", nullable=False)
    cyclomatic_complexity = Column(Integer, default=1, nullable=False)
    max_loop_depth = Column(Integer, default=1, nullable=False)
    feedback = Column(Text, default="", nullable=False)
    code_smells = Column(Text, default="[]", nullable=False)  # JSON array of strings
    suggestions = Column(Text, default="[]", nullable=False)  # JSON array of strings
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
