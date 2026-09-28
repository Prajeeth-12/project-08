# module-2-ai-interview-agent/core/state_machine.py
import enum
from typing import List, Optional
from pydantic import BaseModel, Field
from .decisions import InterviewEvidence


class SessionState(str, enum.Enum):
    CREATED = "CREATED"
    READY = "READY"
    INTRO = "INTRO"
    SECTION_ACTIVE = "SECTION_ACTIVE"
    WAITING_FOR_RESPONSE = "WAITING_FOR_RESPONSE"
    EVALUATING = "EVALUATING"
    DECIDING = "DECIDING"
    SECTION_COMPLETE = "SECTION_COMPLETE"
    COMPLETED = "COMPLETED"
    REPORTING = "REPORTING"
    SCORED = "SCORED"
    PAUSED = "PAUSED"
    ABANDONED = "ABANDONED"
    # Backward-compat states (used by agent_loop.py and existing tests)
    PREP = "PREP"
    TECH_PROBING = "TECH_PROBING"
    CODING_INVOKED = "CODING_INVOKED"
    EVALUATION = "EVALUATION"


class ProbingDepth(str, enum.Enum):
    SURFACE = "SURFACE"
    INTERMEDIATE = "INTERMEDIATE"
    DEEP = "DEEP"


class TurnVerdict(str, enum.Enum):
    SOLID = "SOLID"
    SHAKY = "SHAKY"
    UNDEFENDED = "UNDEFENDED"


class ConversationTurn(BaseModel):
    turn_index: int
    sender: str
    content: str
    depth: ProbingDepth = ProbingDepth.INTERMEDIATE
    verdict: Optional[TurnVerdict] = None
    claim_referenced: Optional[str] = None
    action_taken: str = "ASK_FOLLOWUP"
    competency: Optional[str] = None


class InterviewSessionState(BaseModel):
    session_id: str
    candidate_id: str = "anonymous"
    current_state: SessionState = SessionState.READY
    current_section_index: int = 0
    current_competency: str = ""
    current_depth: ProbingDepth = ProbingDepth.SURFACE
    turns: List[ConversationTurn] = Field(default_factory=list)
    evidence: List[InterviewEvidence] = Field(default_factory=list)
    competencies_assessed: List[str] = Field(default_factory=list)
    turn_count: int = 0
    final_score: Optional[float] = None
    # Backward-compat fields (used by agent_loop.py and existing tests)
    coding_tool_invoked: bool = False
    active_code_draft: Optional[str] = None
    submission_id: Optional[str] = None

    def add_candidate_turn(self, content: str, competency: str = "", action: str = "", verdict_str: str = "SHAKY") -> ConversationTurn:
        self.turn_count += 1
        verdict = TurnVerdict(verdict_str) if verdict_str in TurnVerdict.__members__ else TurnVerdict.SHAKY
        turn = ConversationTurn(
            turn_index=self.turn_count,
            sender="CANDIDATE",
            content=content,
            competency=competency,
            action_taken=action,
            verdict=verdict,
        )
        self.turns.append(turn)
        return turn

    def add_ai_turn(self, content: str, competency: str = "", action: str = "") -> ConversationTurn:
        self.turn_count += 1
        turn = ConversationTurn(
            turn_index=self.turn_count,
            sender="AI",
            content=content,
            competency=competency,
            action_taken=action,
        )
        self.turns.append(turn)
        return turn

    def add_evidence(self, competency: str, turn_index: int, summary: str, strength: str = "moderate"):
        ev = InterviewEvidence(
            competency=competency,
            source_turn_index=turn_index,
            content_summary=summary,
            strength=strength,
        )
        self.evidence.append(ev)
        if competency not in self.competencies_assessed:
            self.competencies_assessed.append(competency)

    def reconstruct_answers(self) -> int:
        """Recover unsaved evidence from CANDIDATE turns (shutdown fallback).

        For every CANDIDATE turn that has no corresponding evidence entry
        (matched by ``source_turn_index``), if the turn content reaches the
        substance gate (>= 12 words), add a new InterviewEvidence entry.
        Already-covered turns are never re-processed.

        Returns the number of evidence records added.

        Substance gate: a turn's content must have >= 12 words. Fragments,
        greetings, and one-word acknowledgements stay unrecovered so a
        contentless session keeps its honest state instead of a junk scorecard.
        """
        _MIN_RECOVERED_WORDS = 12

        covered = {ev.source_turn_index for ev in self.evidence}

        added = 0
        for turn in self.turns:
            if turn.sender != "CANDIDATE":
                continue
            if turn.turn_index in covered:
                continue
            text = (turn.content or "").strip()
            if len(text.split()) < _MIN_RECOVERED_WORDS:
                continue
            ev = InterviewEvidence(
                competency=turn.competency or self.current_competency or "general",
                source_turn_index=turn.turn_index,
                content_summary=text[:200],
                strength="moderate",
            )
            self.evidence.append(ev)
            added += 1

        return added

    def advance_turn(
        self,
        candidate_input: str,
        observation: str,
        decision: str,
        ai_response: str,
        claim_ref: Optional[str] = None,
    ) -> ConversationTurn:
        """Backward-compatible turn advancement used by agent_loop.py."""
        # Determine depth and verdict from candidate input
        word_count = len(candidate_input.split())
        if word_count < 15:
            self.current_depth = ProbingDepth.SURFACE
            verdict = TurnVerdict.UNDEFENDED
        elif any(k in candidate_input.lower() for k in [
            "trade-off", "bottleneck", "concurrency", "lock", "index", "b-tree", "acid", "partition"
        ]):
            self.current_depth = ProbingDepth.DEEP
            verdict = TurnVerdict.SOLID
        else:
            self.current_depth = ProbingDepth.INTERMEDIATE
            verdict = TurnVerdict.SHAKY

        # Append candidate turn
        c_turn = ConversationTurn(
            turn_index=len(self.turns) + 1,
            sender="CANDIDATE",
            content=candidate_input,
            depth=self.current_depth,
            verdict=verdict,
            claim_referenced=claim_ref,
            action_taken=decision,
        )
        self.turns.append(c_turn)
        self.turn_count += 1

        # Append AI turn
        ai_turn = ConversationTurn(
            turn_index=len(self.turns) + 1,
            sender="AI",
            content=ai_response,
            depth=self.current_depth,
            claim_referenced=claim_ref,
            action_taken=decision,
        )
        self.turns.append(ai_turn)
        self.turn_count += 1

        if decision == "INVOKE_CODING":
            self.current_state = SessionState.CODING_INVOKED
            self.coding_tool_invoked = True

        return ai_turn
