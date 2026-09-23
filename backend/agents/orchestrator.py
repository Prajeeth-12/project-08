"""
Session Manager for coordinating agents.
"""

import logging
import json
import asyncio
import uuid
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime

from backend.agents.interviewer import InterviewerAgent
from backend.agents.agentic_coach import AgenticCoachAgent
from backend.utils.event_bus import Event, EventBus, EventType
from backend.agents.config_models import SessionConfig
from backend.services.llm_service import LLMService
from backend.services import get_search_service
from backend.utils.common import get_current_timestamp
from backend.agents.constants import (
    ERROR_AGENT_LOAD_FAILED, ERROR_PROCESSING_REQUEST,
    COACH_FEEDBACK_ERROR, COACH_FEEDBACK_UNAVAILABLE
)


class AgentSessionManager:
    """
    Manages the flow of an interview preparation session.
    Routes messages between user and agents, maintains conversation history.

    The InterviewerAgent is a zero-LLM controller that provides system prompt,
    tracks interview state, and determines when the interview should end.
    Nova Sonic is the conversational model — this orchestrator does NOT call
    any LLM for interviewer responses.
    """

    def __init__(self, llm_service: LLMService, event_bus: EventBus, logger: logging.Logger,
                 session_config: SessionConfig, session_id: Optional[str] = None):
        self.llm_service = llm_service
        self.event_bus = event_bus
        self.logger = logger
        self.session_config = session_config
        self.session_id = session_id or str(uuid.uuid4())

        self.session_status = "active"
        self.final_summary_generating: bool = False
        self.needs_database_save: bool = False

        self.conversation_history: List[Dict[str, Any]] = []
        self.per_turn_coaching_feedback_log: List[Dict[str, str]] = []

        self.final_summary: Optional[Dict[str, Any]] = None
        self.resource_generation_completed_at: Optional[datetime] = None

        self._interviewer: Optional[InterviewerAgent] = None
        self._coach: Optional[AgenticCoachAgent] = None

        self.response_times: List[float] = []
        self.total_response_time = 0.0
        self.total_tokens_used = 0
        self.api_call_count = 0

        config_dict = self.session_config.model_dump() if hasattr(self.session_config, 'model_dump') else vars(self.session_config)
        if config_dict:
            for key, value in config_dict.items():
                if hasattr(value, 'value'):
                    config_dict[key] = value.value
            self.event_bus.publish(Event(
                event_type=EventType.SESSION_START,
                source='AgentSessionManager',
                data={"config": config_dict, "session_id": self.session_id}
            ))

    # ------------------------------------------------------------------
    # Agent access
    # ------------------------------------------------------------------

    def _get_interviewer(self) -> InterviewerAgent:
        """Get or create the InterviewerAgent (zero-LLM controller)."""
        if self._interviewer is None:
            config = self.session_config
            self._interviewer = InterviewerAgent(
                event_bus=self.event_bus,
                logger=self.logger.getChild("InterviewerAgent"),
                interview_style=config.style,
                job_role=config.job_role,
                job_description=config.job_description,
                resume_content=config.resume_content,
                difficulty_level=config.difficulty,
                question_count=config.target_question_count,
                company_name=config.company_name,
                interview_duration_minutes=config.interview_duration_minutes,
                use_time_based_interview=config.use_time_based_interview
            )
            self.event_bus.publish(Event(
                event_type=EventType.AGENT_LOAD,
                source='AgentSessionManager',
                data={"agent_type": "interviewer"}
            ))
        return self._interviewer

    def _get_coach(self) -> Optional[AgenticCoachAgent]:
        """Get or create the AgenticCoachAgent (uses Gemini for evaluation)."""
        if self._coach is None:
            try:
                self._coach = AgenticCoachAgent(
                    llm_service=self.llm_service,
                    search_service=get_search_service(),
                    event_bus=self.event_bus,
                    logger=self.logger.getChild("AgenticCoachAgent"),
                    resume_content=self.session_config.resume_content,
                    job_description=self.session_config.job_description
                )
                self.event_bus.publish(Event(
                    event_type=EventType.AGENT_LOAD,
                    source='AgentSessionManager',
                    data={"agent_type": "coach"}
                ))
            except Exception as e:
                self.logger.exception(f"Failed to initialize coach agent: {e}")
        return self._coach

    # Backward-compatible accessor used by speech_api.py
    def _get_agent(self, agent_type: str):
        if agent_type == "interviewer":
            return self._get_interviewer()
        elif agent_type == "coach":
            return self._get_coach()
        return None

    # ------------------------------------------------------------------
    # Nova Sonic integration — primary interview path
    # ------------------------------------------------------------------

    def get_interviewer_system_prompt(self) -> str:
        """Get the system prompt for Nova Sonic from the InterviewerAgent."""
        return self._get_interviewer().get_system_prompt()

    def get_interviewer_introduction(self) -> str:
        """Get the interview introduction text."""
        return self._get_interviewer().create_introduction()

    def record_voice_turn(self, role: str, text: str) -> Dict[str, Any]:
        """
        Record a completed voice turn from Nova Sonic.
        Updates InterviewerAgent state and conversation history.
        Triggers coach evaluation for candidate turns.

        Args:
            role: "user" (candidate) or "assistant" (interviewer/Nova)
            text: the final transcript text

        Returns:
            Dict with state info including whether the interview should end.
        """
        now = datetime.utcnow()

        if role == "user":
            msg = {"role": "user", "content": text, "timestamp": now.isoformat()}
            self.conversation_history.append(msg)
            self.event_bus.publish(Event(
                event_type=EventType.USER_MESSAGE,
                source='AgentSessionManager',
                data={"message": msg}
            ))
            self._generate_coaching_feedback(msg)
        elif role == "assistant":
            msg = {
                "role": "assistant",
                "agent": "interviewer",
                "content": text,
                "timestamp": now.isoformat(),
                "response_type": "question"
            }
            self.conversation_history.append(msg)
            self.event_bus.publish(Event(
                event_type=EventType.ASSISTANT_RESPONSE,
                source='AgentSessionManager',
                data={"response": msg}
            ))

        interviewer = self._get_interviewer()
        interviewer.record_turn(role, text)

        return {
            "should_end": interviewer.should_end_interview(),
            "state": interviewer.get_state_summary()
        }

    def should_end_interview(self) -> bool:
        """Check whether the interview should end."""
        return self._get_interviewer().should_end_interview()

    # ------------------------------------------------------------------
    # Text path — records turn for non-voice usage (same controller)
    # ------------------------------------------------------------------

    def process_message(self, message: str) -> Dict[str, Any]:
        """
        Process a user message from the text/REST path.
        Records the turn through the same InterviewerAgent controller.
        Does NOT invoke any LLM for the interviewer response.

        For the text path, the introduction is returned on the first call
        (empty message), and subsequent calls record the user message.
        Nova Sonic is the primary interviewer — the text path provides
        limited functionality for session setup.
        """
        start_time = datetime.utcnow()

        if not message or not message.strip():
            intro_text = self.get_interviewer_introduction()
            intro_msg = {
                "role": "assistant",
                "agent": "interviewer",
                "content": intro_text,
                "response_type": "introduction",
                "timestamp": start_time.isoformat(),
                "metadata": {}
            }
            self.conversation_history.append(intro_msg)
            self._get_interviewer().record_turn("assistant", intro_text)
            return intro_msg

        user_msg = {"role": "user", "content": message, "timestamp": start_time.isoformat()}
        self.conversation_history.append(user_msg)
        self.event_bus.publish(Event(
            event_type=EventType.USER_MESSAGE,
            source='AgentSessionManager',
            data={"message": user_msg}
        ))

        self._get_interviewer().record_turn("user", message)
        self._generate_coaching_feedback(user_msg)

        response_data = {
            "role": "assistant",
            "agent": "interviewer",
            "content": "Voice interview in progress. Please use the microphone to continue the conversation.",
            "response_type": "status",
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": self._get_interviewer().get_state_summary()
        }
        self.conversation_history.append(response_data)
        return response_data

    # ------------------------------------------------------------------
    # Coaching feedback (unchanged — CoachAgent uses Gemini)
    # ------------------------------------------------------------------

    def _generate_coaching_feedback(self, user_message_data: Dict[str, Any]) -> None:
        """Collect live feedback from the agentic coach agent if available."""
        try:
            question = self._find_last_interviewer_question()
            answer = user_message_data.get("content", "")

            if question and answer:
                coach_agent = self._get_coach()
                if coach_agent:
                    feedback = self._get_coach_feedback(coach_agent, question, answer)
                    self._log_coach_feedback(question, answer, feedback)
                else:
                    self._log_coach_feedback_unavailable(question, answer)
        except Exception as e:
            self.logger.exception(f"Error generating coaching feedback: {e}")

    def _find_last_interviewer_question(self) -> Optional[str]:
        for message in reversed(self.conversation_history):
            if (message.get("role") == "assistant" and
                    message.get("agent") == "interviewer"):
                return message.get("content", "")
        return None

    def _get_coach_feedback(self, coach_agent: AgenticCoachAgent, question: str, answer: str) -> str:
        try:
            filtered_history = self._create_filtered_history_for_coach()
            feedback_response = coach_agent.evaluate_answer(
                question=question,
                answer=answer,
                justification=None,
                conversation_history=filtered_history
            )
            return feedback_response if feedback_response else COACH_FEEDBACK_UNAVAILABLE
        except Exception as e:
            self.logger.exception(f"Error getting coach feedback: {e}")
            return COACH_FEEDBACK_ERROR

    def _create_filtered_history_for_coach(self) -> List[Dict[str, Any]]:
        filtered_history = []
        for message in self.conversation_history:
            if message.get("role") in ["user", "assistant"]:
                filtered_message = {
                    "role": message["role"],
                    "content": message.get("content", ""),
                    "timestamp": message.get("timestamp", "")
                }
                if message.get("role") == "assistant":
                    filtered_message["agent"] = message.get("agent", "unknown")
                filtered_history.append(filtered_message)
        return filtered_history

    def _log_coach_feedback(self, question: str, answer: str, feedback: str) -> None:
        self.per_turn_coaching_feedback_log.append({
            "question": question[:200],
            "answer": answer[:200],
            "feedback": feedback
        })

    def _log_coach_feedback_unavailable(self, question: str, answer: str) -> None:
        self._log_coach_feedback(question, answer, COACH_FEEDBACK_UNAVAILABLE)

    # ------------------------------------------------------------------
    # End interview + final summary (background, uses CoachAgent/Gemini)
    # ------------------------------------------------------------------

    def end_interview(self) -> Dict[str, Any]:
        """End the interview session and start background final summary generation."""
        self.event_bus.publish(Event(
            event_type=EventType.SESSION_END,
            source='AgentSessionManager',
            data={}
        ))

        self._get_interviewer().mark_completed()

        final_results = {
            "status": "Interview Ended",
            "coaching_summary": None,
            "per_turn_feedback": self.per_turn_coaching_feedback_log
        }

        if not self.final_summary_generating:
            self.final_summary_generating = True
            asyncio.create_task(self._generate_final_summary_background())
            self.logger.info(f"Started background final summary generation for session {self.session_id}")

        return final_results

    async def _generate_final_summary_background(self) -> None:
        """Generate final coaching summary in background async task."""
        start_time = datetime.utcnow()
        try:
            self.logger.info(f"Background final summary generation STARTED for session {self.session_id}")

            if not self.conversation_history:
                raise ValueError("No conversation history available for final summary generation")

            coaching_summary = self._generate_final_coaching_summary()
            generation_time = (datetime.utcnow() - start_time).total_seconds()

            if coaching_summary:
                self.final_summary = coaching_summary
                self.session_status = "completed"
                if isinstance(coaching_summary, dict) and coaching_summary.get('recommended_resources'):
                    self.resource_generation_completed_at = datetime.utcnow()
                self.logger.info(
                    f"Background final summary COMPLETED for session {self.session_id}: "
                    f"{len(str(coaching_summary))} chars in {generation_time:.2f}s"
                )
            else:
                self.final_summary = {"error": "Final coaching summary generation returned None"}
                self.session_status = "completed"

        except Exception as e:
            self.final_summary = {"error": f"Final coaching summary generation failed: {str(e)}"}
            self.session_status = "completed"
            self.logger.exception(f"Background final summary EXCEPTION for session {self.session_id}")
        finally:
            self.final_summary_generating = False
            self.needs_database_save = True

    def _generate_final_coaching_summary(self) -> Optional[Dict[str, Any]]:
        """Generate final coaching summary using agentic coach agent."""
        try:
            coach_agent = self._get_coach()
            if not coach_agent:
                self.logger.error("Coach agent not available for final summary generation")
                return None
            summary_result = coach_agent.generate_final_summary_with_resources(self.conversation_history)
            return summary_result
        except Exception as e:
            self.logger.exception(f"Exception in _generate_final_coaching_summary: {e}")
            return None

    # ------------------------------------------------------------------
    # Session state queries
    # ------------------------------------------------------------------

    def get_conversation_history(self) -> List[Dict[str, Any]]:
        return self.conversation_history

    def get_session_stats(self) -> Dict[str, Any]:
        avg_response_time = (self.total_response_time / len(self.response_times)) if self.response_times else 0
        return {
            "total_messages": len(self.conversation_history),
            "user_messages": sum(1 for msg in self.conversation_history if msg.get("role") == "user"),
            "assistant_messages": sum(1 for msg in self.conversation_history if msg.get("role") == "assistant"),
            "system_messages": sum(1 for msg in self.conversation_history if msg.get("role") == "system"),
            "total_response_time_seconds": round(self.total_response_time, 2),
            "average_response_time_seconds": round(avg_response_time, 2),
            "total_api_calls": self.api_call_count,
            "total_tokens_used": self.total_tokens_used,
        }

    def reset_session(self):
        """Reset the session state."""
        self.conversation_history = []
        self.per_turn_coaching_feedback_log = []
        self.final_summary = None
        self.final_summary_generating = False
        self.needs_database_save = False
        self.resource_generation_completed_at = None
        self._interviewer = None
        self._coach = None
        self.response_times = []
        self.total_response_time = 0.0
        self.total_tokens_used = 0
        self.api_call_count = 0
        self.session_status = "active"
        self.event_bus.publish(Event(event_type=EventType.SESSION_RESET, source='AgentSessionManager', data={}))

    # ------------------------------------------------------------------
    # Serialization (database persistence)
    # ------------------------------------------------------------------

    @classmethod
    def from_session_data(cls, session_data: Dict, llm_service: LLMService,
                         event_bus: EventBus, logger: logging.Logger) -> 'AgentSessionManager':
        config_data = session_data.get("session_config", {})
        session_config = SessionConfig(**config_data) if config_data else SessionConfig()

        manager = cls(
            llm_service=llm_service,
            event_bus=event_bus,
            logger=logger,
            session_config=session_config,
            session_id=session_data["session_id"]
        )

        manager.conversation_history = session_data.get("conversation_history", [])
        manager.per_turn_coaching_feedback_log = session_data.get("per_turn_feedback_log", [])
        manager.final_summary = session_data.get("final_summary")
        manager.final_summary_generating = session_data.get("final_summary_generating", False)
        manager.needs_database_save = session_data.get("needs_database_save", False)
        resource_timestamp_str = session_data.get("resource_generation_completed_at")
        if resource_timestamp_str:
            try:
                manager.resource_generation_completed_at = datetime.fromisoformat(resource_timestamp_str.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                manager.resource_generation_completed_at = None
        manager.total_response_time = session_data.get("session_stats", {}).get("total_response_time_seconds", 0.0)
        manager.total_tokens_used = session_data.get("session_stats", {}).get("total_tokens_used", 0)
        manager.api_call_count = session_data.get("session_stats", {}).get("total_api_calls", 0)
        manager.session_status = session_data.get("status", "active")

        logger.info(f"Restored session manager from database: {manager.session_id}")
        return manager

    def to_dict(self) -> Dict:
        session_config_dict = self.session_config.model_dump() if hasattr(self.session_config, 'model_dump') else vars(self.session_config)
        for key, value in session_config_dict.items():
            if hasattr(value, 'value'):
                session_config_dict[key] = value.value

        return {
            "session_id": self.session_id,
            "session_config": session_config_dict,
            "conversation_history": self.conversation_history,
            "per_turn_feedback_log": self.per_turn_coaching_feedback_log,
            "final_summary": self.final_summary,
            "final_summary_generating": self.final_summary_generating,
            "needs_database_save": self.needs_database_save,
            "resource_generation_completed_at": self.resource_generation_completed_at.isoformat() if self.resource_generation_completed_at else None,
            "session_stats": self.get_session_stats(),
            "status": self.session_status
        }

    def get_langchain_config(self) -> Dict:
        return {"configurable": {"thread_id": self.session_id}}
