from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, Float, String, Text
from backend.database import Base

class RubricEvaluation(Base):
    """Multi-dimensional candidate evaluation scorecard and personalized 30-day coaching roadmap."""
    __tablename__ = "rubric_evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), index=True, nullable=True)
    candidate_id = Column(String(36), index=True, nullable=False)
    overall_score = Column(Float, default=0.0, nullable=False)  # 0 - 100
    
    # 5-Dimensional Competency Rubric (0.0 to 10.0 scale)
    correctness_score = Column(Float, default=0.0, nullable=False)
    complexity_score = Column(Float, default=0.0, nullable=False)
    system_design_score = Column(Float, default=0.0, nullable=False)
    communication_score = Column(Float, default=0.0, nullable=False)
    veracity_score = Column(Float, default=0.0, nullable=False)  # Resume claim consistency
    
    executive_summary = Column(Text, default="", nullable=False)
    weaknesses = Column(Text, default="[]", nullable=False)  # JSON array
    strengths = Column(Text, default="[]", nullable=False)  # JSON array
    coach_roadmap_30d = Column(Text, default="[]", nullable=False)  # JSON array of weekly actionable goals
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
