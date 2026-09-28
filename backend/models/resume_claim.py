from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, String, Text
from backend.database import Base

class ResumeClaim(Base):
    """Extracted resume skills, projects, and verifiable claims used to anchor the probing agent."""
    __tablename__ = "resume_claims"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), index=True, nullable=False)
    raw_text = Column(Text, default="", nullable=False)
    extracted_skills = Column(Text, default="[]", nullable=False)  # JSON array of skill strings
    extracted_projects = Column(Text, default="[]", nullable=False)  # JSON array of project summaries
    verifiable_claims = Column(Text, default="[]", nullable=False)  # JSON array of technical assertions
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
