import os
from typing import Optional
from pydantic import BaseModel

from .persona import SKEPTICAL_STAFF_ENGINEER_PROMPT, PROBING_TAXONOMY
from .state_machine import InterviewSessionState, ProbingDepth
from rag.parser import StructuredCandidateProfile, TechnicalClaim
from rag.retriever import ClaimRetriever

class AgentLoopStep(BaseModel):
    observation: str
    reasoning: str
    decision: str  # PROBE_DEEPER, PIVOT, INVOKE_CODING
    act_output: str
    depth: ProbingDepth
    claim_anchor: Optional[str] = None

class StatefulAgentEngine:
    """The central nervous system of Module 2 executing the Observe -> Reason -> Decide -> Act loop."""

    @classmethod
    def execute_turn(
        cls,
        session_state: InterviewSessionState,
        candidate_response: str,
        profile: Optional[StructuredCandidateProfile] = None,
    ) -> AgentLoopStep:
        """Run the four-step agent loop against candidate response and resume claims."""
        turn_number = len([t for t in session_state.turns if t.sender == "CANDIDATE"]) + 1
        resp_lower = candidate_response.lower()
        word_count = len(candidate_response.split())

        # Retrieve relevant resume claim if profile is available
        relevant_claim = None
        if profile and profile.claims:
            relevant_claim = ClaimRetriever.retrieve_relevant_claim(profile, candidate_response)

        # 1. OBSERVE
        if word_count < 10:
            observation = f"Candidate provided an overly brief response ({word_count} words) with zero architectural specifics."
            depth = ProbingDepth.SURFACE
        elif any(k in resp_lower for k in ["trade-off", "bottleneck", "concurrency", "lock", "index", "b-tree", "acid"]):
            observation = "Candidate introduced concrete architectural concepts and performance trade-offs."
            depth = ProbingDepth.DEEP
        else:
            observation = "Candidate gave a moderate explanation but omitted exact parameters and failure modes."
            depth = ProbingDepth.INTERMEDIATE

        # 2. REASON & 3. DECIDE & 4. ACT
        if turn_number >= 3:
            # Candidate demonstrated conceptual stamina -> Transition to Monaco Coding Tool
            reasoning = "Candidate has completed 3 verbal probing rounds. Time to verify practical code translation."
            decision = "INVOKE_CODING"
            act_output = (
                "You've articulated these architectural concepts well. Now let's see how you translate them into code. "
                "I am opening the live coding workspace on your screen. Implement the algorithmic solution and verify with test cases."
            )
        elif depth == ProbingDepth.SURFACE:
            reasoning = "Candidate gave an evasive or superficial answer. Must challenge for concrete numbers and tools."
            decision = "PROBE_DEEPER"
            claim_text = relevant_claim.raw_statement if relevant_claim else "this feature"
            act_output = (
                f"That sounds like a generic overview. Your resume highlights: '{claim_text}'. "
                "Walk me through the exact technical bottleneck you diagnosed, the profiling tools you ran, and the specific metrics you tracked."
            )
        elif "database" in resp_lower or "sql" in resp_lower or "redis" in resp_lower:
            reasoning = "Candidate touched on persistence/caching. Need to verify consistency and indexing overhead."
            decision = "PROBE_DEEPER"
            act_output = (
                "When you implemented that caching and indexing strategy, how did you handle cache-aside invalidation, "
                "and what impact did the new indexes have on write throughput under heavy load?"
            )
        elif "async" in resp_lower or "queue" in resp_lower or "kafka" in resp_lower or "worker" in resp_lower:
            reasoning = "Candidate mentioned concurrent message processing. Probe idempotency and distributed race conditions."
            decision = "PROBE_DEEPER"
            act_output = (
                "In distributed async worker pipelines, network retries inevitably duplicate messages. "
                "How did you enforce idempotency and avoid duplicate state mutations across concurrent worker threads?"
            )
        else:
            reasoning = "Candidate described standard architecture. Pivot to failure modes and resilience."
            decision = "PROBE_DEEPER"
            act_output = (
                "What was the single point of failure in that design, and what circuit breaker or graceful degradation "
                "policy was activated when downstream dependencies failed?"
            )

        step = AgentLoopStep(
            observation=observation,
            reasoning=reasoning,
            decision=decision,
            act_output=act_output,
            depth=depth,
            claim_anchor=relevant_claim.raw_statement if relevant_claim else None,
        )

        # Advance session state
        session_state.advance_turn(
            candidate_input=candidate_response,
            observation=step.observation,
            decision=step.decision,
            ai_response=step.act_output,
            claim_ref=step.claim_anchor,
        )

        return step
