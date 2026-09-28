from backend.models.user import User, UserRole
from backend.models.session import InterviewSession, SessionStage
from backend.models.draft import Draft

# V4 institutional models
from backend.models.institutional import Organization, Cohort, CohortMember, PlacementDrive, DriveAllocation

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