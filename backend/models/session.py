import uuid
import enum

from sqlalchemy import ForeignKey, Uuid, String, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class SessionStage(str, enum.Enum):
    TECH = "TECH"
    CODING_TOOL = "CODING_TOOL"
    EVALUATING = "EVALUATING"


class InterviewSession(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    role_title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Full Stack Software Engineer",
    )

    stage: Mapped[SessionStage] = mapped_column(
        Enum(SessionStage),
        nullable=False,
        default=SessionStage.TECH,
    )

    transcript: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="[]",
    )