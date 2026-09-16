from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from backend.database import Base

class AgentTurn(Base):
    """Agent turn log recording our Observe -> Reason -> Decide -> Act loop transitions."""
    __tablename__ = "agent_turns"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), index=True, nullable=False)
    turn_index = Column(Integer, default=1, nullable=False)
    candidate_input = Column(Text, nullable=False)
    observation = Column(Text, default="", nullable=False)
    reasoning = Column(Text, default="", nullable=False)
    decision = Column(String(100), default="PROBE_DEEPER", nullable=False)  # PROBE_DEEPER, PIVOT, INVOKE_CODING
    probe_output = Column(Text, nullable=False)
    difficulty = Column(String(50), default="INTERMEDIATE", nullable=False)  # SURFACE, INTERMEDIATE, DEEP
    confidence_score = Column(Float, default=0.85, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
