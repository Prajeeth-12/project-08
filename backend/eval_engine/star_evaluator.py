from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from backend.agents.state_machine import InterviewSessionState, ConversationTurn, TurnVerdict

class EvidenceCitation(BaseModel):
    category: str
    quote: str
    impact: str  # BONUS or DEDUCTION
    points: float
    explanation: str

class STREvaluationReport(BaseModel):
    session_id: str
    overall_score: float  # 0 to 100
    correctness_score: float  # 0 to 10
    complexity_score: float   # 0 to 10
    system_design_score: float # 0 to 10
    communication_score: float # 0 to 10
    veracity_score: float      # 0 to 10
    citations: List[EvidenceCitation] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    executive_summary: str

class STAREvaluator:
    """Evaluates full interview session transcript with evidence citations and transparent bonuses/deductions."""

    @classmethod
    def evaluate_session(cls, session: InterviewSessionState) -> STREvaluationReport:
        """Score session across 5 dimensions using candidate turn evidence."""
        candidate_turns = [t for t in session.turns if t.sender == "CANDIDATE"]
        total_candidate_words = sum(len(t.content.split()) for t in candidate_turns)

        citations: List[EvidenceCitation] = []
        strengths: List[str] = []
        weaknesses: List[str] = []

        # Baseline scores
        correctness = 7.0
        complexity = 7.0
        system_design = 7.0
        communication = 7.0
        veracity = 8.0

        for turn in candidate_turns:
            text_lower = turn.content.lower()

            # Bonus: Concrete architectural reasoning
            if any(k in text_lower for k in ["trade-off", "bottleneck", "latency", "throughput", "b-tree"]):
                citations.append(EvidenceCitation(
                    category="System Design",
                    quote=turn.content[:80] + "...",
                    impact="BONUS",
                    points=+1.0,
                    explanation="Candidate explicitly discussed architectural trade-offs and bottleneck diagnostics.",
                ))
                system_design = min(10.0, system_design + 1.0)
                complexity = min(10.0, complexity + 0.5)

            # Bonus: Quantifiable metrics
            if any(m in text_lower for m in ["%", "ms", "rps", "seconds", "megabytes", "index"]):
                citations.append(EvidenceCitation(
                    category="Veracity",
                    quote=turn.content[:80] + "...",
                    impact="BONUS",
                    points=+0.8,
                    explanation="Candidate defended claims using quantified metrics rather than vague descriptions.",
                ))
                veracity = min(10.0, veracity + 0.8)

            # Deduction: Vague hand-waving or overly brief answers (< 8 words)
            if len(turn.content.split()) < 8:
                citations.append(EvidenceCitation(
                    category="Communication",
                    quote=turn.content,
                    impact="DEDUCTION",
                    points=-1.2,
                    explanation="Answer was overly brief and lacked implementation details.",
                ))
                communication = max(3.0, communication - 1.2)
                correctness = max(4.0, correctness - 0.8)

        # Strengths & Weaknesses synthesis
        if system_design >= 8.0:
            strengths.append("High architectural maturity; reasoned clearly about bottlenecks and trade-offs.")
        else:
            weaknesses.append("Needs deeper articulation of failure modes and distributed caching strategies.")

        if communication >= 7.5:
            strengths.append("Structured communication adhering to the STAR framework.")
        else:
            weaknesses.append("Response brevity in initial turns reduced communication score.")

        if session.coding_tool_invoked:
            strengths.append("Successfully transitioned into live in-interview code workspace.")

        # Compute weighted overall percentage (0-100)
        overall = (
            (correctness * 3.0)
            + (complexity * 2.5)
            + (system_design * 2.0)
            + (communication * 1.5)
            + (veracity * 1.0)
        )

        summary = (
            f"Candidate completed {len(candidate_turns)} interview turns with a final readiness score of {overall:.1f}%. "
            f"Demonstrated strength in {strengths[0] if strengths else 'core reasoning'}. "
            f"Recommended focus area: {weaknesses[0] if weaknesses else 'refining Big-O memory bounds'}."
        )

        return STREvaluationReport(
            session_id=session.session_id,
            overall_score=round(overall, 2),
            correctness_score=round(correctness, 1),
            complexity_score=round(complexity, 1),
            system_design_score=round(system_design, 1),
            communication_score=round(communication, 1),
            veracity_score=round(veracity, 1),
            citations=citations[:5],
            strengths=strengths,
            weaknesses=weaknesses,
            executive_summary=summary,
        )
