from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, String, Text
from backend.database import Base

class CodeDraft(Base):
    """In-interview live code draft state model with auto-save support."""
    __tablename__ = "code_drafts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), index=True, nullable=False)
    candidate_id = Column(String(36), index=True, nullable=True)
    language = Column(String(50), default="python", nullable=False)
    code_content = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
