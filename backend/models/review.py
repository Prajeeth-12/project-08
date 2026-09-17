from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, DateTime, Float, Integer, String, Text
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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class AssessmentSubmission(Base):
    """Graded candidate submission evaluating hidden test suites, competitive verdicts, and AST metrics."""
    __tablename__ = "assessment_submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id = Column(String(36), index=True, nullable=True)
    problem_id = Column(String(36), index=True, nullable=True)
    session_id = Column(String(36), index=True, nullable=True)
    source_code = Column(Text, nullable=False)
    language = Column(String(50), default="python", nullable=False)
    verdict = Column(String(50), default="WRONG_ANSWER", nullable=False)  # ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, COMPILATION_ERROR
    score_percentage = Column(Float, default=0.0, nullable=False)
    test_cases_passed = Column(Integer, default=0, nullable=False)
    total_test_cases = Column(Integer, default=0, nullable=False)
    execution_time_ms = Column(Float, default=0.0, nullable=False)
    ast_metrics = Column(Text, default="{}", nullable=False)  # JSON string
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


