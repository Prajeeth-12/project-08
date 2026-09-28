from backend.models.user import User, UserRole
from backend.models.session import InterviewSession, SessionStage
from backend.models.draft import Draft

# Core 12-table schema
from backend.models.core import (
    PlatformUser,
    CandidateProfile,
    InterviewBlueprint,
    InterviewSession as CoreInterviewSession,
    InterviewQuestion,
    CandidateAnswer,
    ScoreDimension,
    Score,
    TurnFeedback,
    InterviewReport,
    RecommendedResource,
    SpeechTask,
)