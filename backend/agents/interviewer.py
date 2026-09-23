"""
InterviewerAgent — Application-level interview controller.

Zero LLM calls. Responsible for:
- Building the system prompt / interview context for Nova Sonic
- Maintaining InterviewState (phases, covered topics, question count)
- Time management and interview pacing
- Determining when the interview should end
- Recording completed turns from Nova Sonic
"""

import logging
from typing import Dict, Any, List, Optional

from backend.utils.event_bus import Event, EventBus, EventType
from backend.agents.config_models import InterviewStyle, SessionConfig
from backend.agents.templates.interviewer_templates import (
    INTERVIEWER_SYSTEM_PROMPT,
    INTRODUCTION_TEMPLATES,
)
from backend.utils.common import get_current_timestamp, safe_get_or_default
from backend.utils.time_manager import InterviewTimeManager, TimeContext, TimePhase
from backend.agents.constants import (
    DEFAULT_JOB_ROLE, DEFAULT_COMPANY_NAME, DEFAULT_VALUE_NOT_PROVIDED,
    MINIMUM_QUESTION_COUNT, ESTIMATED_TIME_PER_QUESTION,
    ERROR_INTERVIEW_CONCLUDED, INTERVIEW_CONCLUSION
)
from backend.agents.interview_state import InterviewState, InterviewPhase


class InterviewerAgent:
    """
    Application-level interview controller. Does NOT call any LLM.

    Nova Sonic is the conversational model. This agent provides:
    - System prompt with full interview context for Nova Sonic
    - Interview state tracking (phase, topics, turn count, time)
    - Rules for when the interview should end
    """

    def __init__(
        self,
        event_bus: Optional[EventBus] = None,
        logger: Optional[logging.Logger] = None,
        interview_style: InterviewStyle = InterviewStyle.CASUAL,
        job_role: str = "",
        job_description: str = "",
        resume_content: str = "",
        difficulty_level: str = "medium",
        question_count: Optional[int] = None,
        company_name: Optional[str] = None,
        interview_duration_minutes: Optional[int] = None,
        use_time_based_interview: bool = False
    ):
        self.event_bus = event_bus or EventBus()
        self.logger = logger or logging.getLogger(self.__class__.__name__)

        self.interview_style = interview_style
        self.job_role = job_role
        self.job_description = job_description
        self.resume_content = resume_content
        self.difficulty_level = difficulty_level
        self.question_count = question_count or 15
        self.company_name = company_name

        self.interview_duration_minutes = interview_duration_minutes
        self.use_time_based_interview = use_time_based_interview
        self.time_manager: Optional[InterviewTimeManager] = None

        if self.use_time_based_interview and self.interview_duration_minutes:
            self.time_manager = InterviewTimeManager(self.interview_duration_minutes)
            self._setup_time_callbacks()

        self.state = InterviewState()

        self.event_bus.subscribe(EventType.SESSION_START, self._handle_session_start)
        self.event_bus.subscribe(EventType.SESSION_END, self._handle_session_end)
        self.event_bus.subscribe(EventType.SESSION_RESET, self._handle_session_reset)

    # ------------------------------------------------------------------
    # System prompt — this is what Nova Sonic receives as its instructions
    # ------------------------------------------------------------------

    def get_system_prompt(self) -> str:
        """Build the full system prompt for Nova Sonic."""
        time_context = ""
        if self.use_time_based_interview and self.time_manager:
            time_info = self.time_manager.get_time_based_prompt_context()
            time_context = f"""
TIME AWARENESS:
- Interview Duration: {self.interview_duration_minutes} minutes
- Current Phase: {time_info['current_time_phase']}
- Progress: {time_info['time_progress_percentage']}%
- Time Pressure: {time_info['time_pressure']}
"""

        base_prompt = INTERVIEWER_SYSTEM_PROMPT.format(
            job_role=safe_get_or_default(self.job_role, DEFAULT_JOB_ROLE),
            interview_style=self.interview_style.value,
            resume_content=safe_get_or_default(self.resume_content, DEFAULT_VALUE_NOT_PROVIDED),
            job_description=safe_get_or_default(self.job_description, DEFAULT_VALUE_NOT_PROVIDED),
            target_question_count=self.question_count
        )

        covered = self.state.get_covered_topics_str()
        state_context = f"""
CURRENT INTERVIEW STATE:
- Questions asked so far: {self.state.asked_question_count}
- Topics/skills already covered: {covered}
- Interview phase: {self.state.phase.value}
- Difficulty level: {self.difficulty_level}
"""

        return base_prompt + time_context + state_context

    # ------------------------------------------------------------------
    # Introduction — template-based, no LLM
    # ------------------------------------------------------------------

    def create_introduction(self) -> str:
        """Create the introduction text for the interview."""
        style_key = self.interview_style.value.lower()
        template = INTRODUCTION_TEMPLATES.get(style_key, INTRODUCTION_TEMPLATES["formal"])

        if self.use_time_based_interview and self.interview_duration_minutes:
            duration = f"around {self.interview_duration_minutes} minutes"
            if self.time_manager and not self.time_manager.is_active:
                self.time_manager.start_interview()
                self.logger.info("Started interview timer")
        else:
            duration = f"around {self.question_count * ESTIMATED_TIME_PER_QUESTION} minutes"

        return template.format(
            job_role=safe_get_or_default(self.job_role, DEFAULT_JOB_ROLE),
            interview_duration=duration,
            company_name=safe_get_or_default(self.company_name, DEFAULT_COMPANY_NAME)
        )

    # ------------------------------------------------------------------
    # Turn recording — called when Nova Sonic emits a final transcript
    # ------------------------------------------------------------------

    def record_turn(self, role: str, text: str) -> None:
        """
        Record a completed turn from Nova Sonic.

        Args:
            role: "user" (candidate) or "assistant" (interviewer/Nova)
            text: the final transcript text
        """
        if self.state.phase == InterviewPhase.COMPLETED:
            return

        if self.state.phase == InterviewPhase.INITIALIZING:
            self.state.phase = InterviewPhase.INTRODUCING

        if self.state.phase == InterviewPhase.INTRODUCING:
            if role == "assistant":
                self.state.phase = InterviewPhase.QUESTIONING

        if role == "assistant":
            self.state.ask_question(text)
        elif role == "user":
            topics = self._extract_topics_from_text(text)
            if topics:
                self.state.add_covered_topics(topics)

    def _extract_topics_from_text(self, text: str) -> List[str]:
        """
        Simple keyword extraction from candidate answer for topic tracking.
        No LLM — uses basic heuristic matching against known domain terms.
        """
        if not text or len(text) < 20:
            return []

        known_domains = [
            "python", "java", "javascript", "react", "angular", "vue",
            "node", "fastapi", "django", "flask", "spring",
            "aws", "azure", "gcp", "docker", "kubernetes",
            "sql", "postgresql", "mongodb", "redis",
            "machine learning", "deep learning", "data science",
            "microservices", "rest api", "graphql", "websocket",
            "agile", "scrum", "ci/cd", "devops", "git",
            "system design", "algorithms", "data structures",
            "testing", "tdd", "performance", "security",
            "leadership", "teamwork", "communication", "project management",
        ]
        text_lower = text.lower()
        return [topic for topic in known_domains if topic in text_lower]

    # ------------------------------------------------------------------
    # Interview lifecycle queries
    # ------------------------------------------------------------------

    def should_end_interview(self) -> bool:
        """Determine whether the interview should end based on time or question limits."""
        if self.state.phase == InterviewPhase.COMPLETED:
            return True

        if self.use_time_based_interview and self.time_manager:
            time_context = self.time_manager.get_time_context()
            if time_context.remaining_minutes <= 0:
                return True
            if (time_context.current_phase == TimePhase.CLOSING
                    and self.state.asked_question_count >= MINIMUM_QUESTION_COUNT):
                return True
        else:
            if self.state.asked_question_count >= self.question_count:
                return True

        return False

    def mark_completed(self) -> None:
        """Mark the interview as completed."""
        self.state.phase = InterviewPhase.COMPLETED
        if self.time_manager and self.time_manager.is_active:
            self.time_manager.stop_interview()
            self.logger.info("Interview timer stopped")

    def get_state_summary(self) -> Dict[str, Any]:
        """Return a summary of current interview state for diagnostics."""
        result = {
            "phase": self.state.phase.value,
            "asked_question_count": self.state.asked_question_count,
            "covered_topics": self.state.areas_covered,
            "should_end": self.should_end_interview(),
        }
        if self.time_manager and self.time_manager.is_active:
            tc = self.time_manager.get_time_context()
            result["remaining_minutes"] = round(tc.remaining_minutes, 1)
            result["progress_pct"] = round(tc.progress_percentage, 1)
        return result

    # ------------------------------------------------------------------
    # Configuration update from session events
    # ------------------------------------------------------------------

    def update_config(self, config: Dict[str, Any]) -> None:
        """Update agent configuration from a config dict."""
        if not isinstance(config, dict):
            return

        self.job_role = config.get("job_role", self.job_role)
        self.job_description = config.get("job_description", self.job_description)
        self.resume_content = config.get("resume_content", self.resume_content)
        self.difficulty_level = config.get("difficulty", self.difficulty_level)
        self.company_name = config.get("company_name", self.company_name)
        self.use_time_based_interview = config.get("use_time_based_interview", self.use_time_based_interview)
        self.interview_duration_minutes = config.get("interview_duration_minutes", self.interview_duration_minutes)

        if not self.use_time_based_interview:
            self.question_count = config.get("target_question_count", self.question_count)

        if self.use_time_based_interview and self.interview_duration_minutes and not self.time_manager:
            self.time_manager = InterviewTimeManager(self.interview_duration_minutes)
            self._setup_time_callbacks()
            self.logger.info(f"Initialized time manager for {self.interview_duration_minutes} minutes")

        style_value = config.get("style")
        if style_value:
            if isinstance(style_value, str):
                try:
                    self.interview_style = InterviewStyle(style_value)
                except ValueError:
                    self.logger.warning(f"Invalid interview style: {style_value}")
            elif hasattr(style_value, 'value'):
                self.interview_style = style_value

        self.logger.info(
            f"Config updated: job_role={self.job_role}, style={self.interview_style.value}, "
            f"time_based={self.use_time_based_interview}"
        )

    # ------------------------------------------------------------------
    # Event handlers
    # ------------------------------------------------------------------

    def _handle_session_start(self, event: Event) -> None:
        self.state.reset()
        config = event.data.get("config", {})
        self.update_config(config)

    def _handle_session_end(self, event: Event) -> None:
        self.mark_completed()

    def _handle_session_reset(self, event: Event) -> None:
        self.state.reset()
        config = event.data.get("config", {})
        self.update_config(config)

    # ------------------------------------------------------------------
    # Time callbacks
    # ------------------------------------------------------------------

    def _setup_time_callbacks(self) -> None:
        if not self.time_manager:
            return

        def on_phase_change(tc: TimeContext):
            self.logger.info(f"Interview phase changed to: {tc.current_phase.value}")

        def on_time_warning(tc: TimeContext):
            self.logger.warning(f"Time warning: {tc.remaining_minutes:.1f} minutes remaining")

        def on_halfway_point(tc: TimeContext):
            self.logger.info("Interview halfway point reached")

        def on_final_warning(tc: TimeContext):
            self.logger.warning("Final time warning: interview should be concluding soon")

        self.time_manager.register_callback("phase_change", on_phase_change)
        self.time_manager.register_callback("time_warning", on_time_warning)
        self.time_manager.register_callback("halfway_point", on_halfway_point)
        self.time_manager.register_callback("final_warning", on_final_warning)
