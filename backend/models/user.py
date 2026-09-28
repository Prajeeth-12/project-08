from datetime import datetime
import enum
import uuid
from sqlalchemy import Column, DateTime, Enum, Integer, String
from backend.database import Base

class UserRole(str, enum.Enum):
    CANDIDATE = "CANDIDATE"
    FACULTY = "FACULTY"
    ADMIN = "ADMIN"

class User(Base):
    """User account entity supporting RBAC for candidates, faculty, and administrators."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CANDIDATE, nullable=False)
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
