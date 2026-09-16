from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from backend.database import Base

class Submission(Base):
    """Execution sandbox submission record tracking stdout, stderr, and resource bounds."""
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), index=True, nullable=True)
    question_id = Column(String(36), index=True, nullable=True)
    language = Column(String(50), nullable=False)
    source_code = Column(Text, nullable=False)
    stdin = Column(Text, default="", nullable=False)
    stdout = Column(Text, default="", nullable=True)
    stderr = Column(Text, default="", nullable=True)
    status = Column(String(50), default="ACCEPTED", nullable=False)  # ACCEPTED, ERROR, TIMEOUT, OOM
    execution_time = Column(Float, default=0.0, nullable=False)  # in seconds
    memory_used = Column(Integer, default=0, nullable=False)  # in KB
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
