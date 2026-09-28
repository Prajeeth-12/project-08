import uuid
import enum

from sqlalchemy import Uuid, String, Enum
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class UserRole(str, enum.Enum):
    CANDIDATE = "candidate"
    FACULTY = "faculty"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        default=UserRole.CANDIDATE,
        nullable=False,
    )

    department: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default="Computer Science",
    )