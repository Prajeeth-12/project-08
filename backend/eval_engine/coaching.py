# module-2-ai-interview-agent/eval_engine/coaching.py
"""Say/Avoid/Fix coaching cards and model answer generation.

Produces two user-facing artefacts for each assessed competency:

* ``CoachingCard`` — three short coaching directives (what to say, what to
  avoid, and a concrete fix) derived from the competency verdict and a
  transcript excerpt. Generated via LLM with a rule-based fallback so offline
  tests always receive a well-formed card.

* Model answer — a short exemplar answer drafted from blueprint context.
  Falls back to a generic template when the LLM is unavailable.

LLM schema lifted from DeepInterview shared_models.py / post/report.py and
adapted to our LLMGateway.complete_json() interface and CoachingCard shape.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    pass  # LLMGateway replaced by Base LLMService


class CoachingCard(BaseModel):
    """Say/Avoid/Fix coaching directives for one competency."""

    say: str = ""
    avoid: str = ""
    fix: str = ""


class _ModelAnswerWrapper(BaseModel):
    """Single-field wrapper so we can use complete_json for free-text output."""

    answer: str = ""


async def generate_coaching_card(
    competency: str,
    verdict: str,
    transcript_excerpt: str,
    llm: "LLMGateway",
) -> CoachingCard:
    """Generate a Say/Avoid/Fix coaching card for one competency.

    Calls the LLM to produce targeted coaching based on the competency label,
    the three-tier verdict, and a short transcript excerpt. Falls back to
    rule-based defaults on any LLM failure so the report is always populated.

    Args:
        competency:         Competency identifier (e.g. ``"api_design"``).
        verdict:            One of ``"solid"``, ``"shaky"``, ``"couldnt_defend"``.
        transcript_excerpt: Raw candidate transcript for this competency
                            (truncated to 500 chars internally).
        llm:                Configured ``LLMGateway`` instance.

    Returns:
        A ``CoachingCard`` with non-empty ``say``, ``avoid``, and ``fix``
        strings.
    """
    comp_label = competency.replace("_", " ")
    system_prompt = (
        "You are an expert technical interview coach. "
        "Given a competency assessment result, produce targeted, actionable "
        "coaching as a JSON object with three keys: "
        "'say' (what the candidate should say next time), "
        "'avoid' (one habit or pattern to avoid), "
        "'fix' (one concrete exercise to improve). "
        "Keep each value under 40 words."
    )
    excerpt = transcript_excerpt[:500] if transcript_excerpt else "(no transcript available)"
    user_msg = (
        f"Competency: {comp_label}\n"
        f"Verdict: {verdict}\n"
        f"Transcript excerpt: {excerpt}\n\n"
        "Return a JSON coaching card with keys: say, avoid, fix."
    )

    try:
        card = await llm.complete_json(
            system_prompt=system_prompt,
            user_message=user_msg,
            response_model=CoachingCard,
        )
        # Ensure all fields are non-empty even if the LLM returned partial data.
        return CoachingCard(
            say=card.say or f"Demonstrate concrete examples when discussing {comp_label}.",
            avoid=card.avoid or "Vague statements without supporting technical details.",
            fix=card.fix or f"Prepare 2-3 specific scenarios showcasing your {comp_label} skills.",
        )
    except Exception:
        return CoachingCard(
            say=f"Demonstrate concrete examples when discussing {comp_label}.",
            avoid="Vague statements without supporting technical details.",
            fix=f"Prepare 2-3 specific scenarios that showcase your {comp_label} skills.",
        )


async def generate_model_answer(
    competency: str,
    blueprint_context: str,
    llm: "LLMGateway",
) -> str:
    """Draft a model answer for the given competency area.

    The answer is intended to illustrate what a strong candidate response looks
    like, grounded in the blueprint context. Falls back to a descriptive
    template on any LLM failure.

    Adapted from DeepInterview post/report.py ``_model_answers()`` pattern:
    uses concurrent-safe isolated calls with graceful per-answer fallback.

    Args:
        competency:        Competency identifier (e.g. ``"system_design"``).
        blueprint_context: Brief description of the role and question context
                           (truncated to 500 chars internally).
        llm:               Configured ``LLMGateway`` instance.

    Returns:
        A non-empty string containing the model answer.
    """
    comp_label = competency.replace("_", " ")
    system_prompt = (
        "You are a senior technical interviewer writing a model answer to "
        "illustrate the ideal candidate response. Be concise (3-5 sentences), "
        "specific, and include one quantifiable detail where possible."
    )
    context = blueprint_context[:500] if blueprint_context else comp_label
    user_msg = (
        f"Competency being assessed: {comp_label}\n"
        f"Interview context: {context}\n\n"
        "Write a model answer that a strong candidate would give. "
        "Return JSON with a single key 'answer' containing the answer text."
    )

    try:
        wrapper = await llm.complete_json(
            system_prompt=system_prompt,
            user_message=user_msg,
            response_model=_ModelAnswerWrapper,
        )
        answer = wrapper.answer.strip() if wrapper.answer else ""
        return answer or (
            f"A strong answer for {comp_label} includes specific examples, "
            "quantifiable outcomes, and clear technical depth that demonstrates "
            "hands-on experience."
        )
    except Exception:
        return (
            f"A strong answer for {comp_label} should include specific examples, "
            "quantifiable outcomes, and clear technical depth that demonstrates "
            "hands-on experience with the underlying concepts."
        )
