"""
Interview Blueprint Planner — V2.

Generates a structured InterviewBlueprint from resume profile + target role.
Adapted from module-2/blueprint/planner.py to use Base's LLMService (LangChain + Gemini)
instead of M2's custom gateway.
"""

import json
import logging
from typing import Optional

from backend.blueprint.models import InterviewBlueprint, InterviewSection, EvaluationExpectation
from backend.blueprint.role_calibration import load_role

logger = logging.getLogger(__name__)

PLANNER_PROMPT = """You are an expert technical interview planner.

Given the candidate profile and target role below, generate a structured interview blueprint as JSON.

Candidate:
- Target role: {role}
- Seniority: {seniority}
- Skills: {skills}
- Key claims: {claims}

Generate a blueprint with exactly this JSON structure:
{{
  "role": "{role}",
  "seniority": "{seniority}",
  "duration_minutes": {duration},
  "sections": [
    {{
      "title": "Section Title",
      "competencies": ["competency_1", "competency_2"],
      "time_budget_minutes": 10,
      "expectations": [
        {{"competency": "competency_1", "description": "what to assess", "min_evidence_strength": "moderate"}}
      ]
    }}
  ],
  "candidate_skills": {skills},
  "candidate_claims": {claims}
}}

Rules:
- 3-4 sections progressing from fundamentals → applied → project-specific
- Each section: 2-3 competencies directly relevant to the role and candidate's background
- Time budgets must sum to {duration} minutes
- Return ONLY the JSON object, no markdown fences
"""


def generate_blueprint(
    role: str,
    skills: list,
    claims: list,
    seniority: str = "mid",
    duration_minutes: int = 30,
    llm_service=None,
) -> InterviewBlueprint:
    """
    Generate an InterviewBlueprint for the given role + candidate profile.

    First tries role calibration (pre-built templates).
    Falls back to LLM generation.
    Falls back to heuristic blueprint if LLM unavailable.
    """
    # Try pre-built role template first (fast, deterministic)
    try:
        normalised = role.lower().replace(" ", "_").replace("-", "_")
        role_config = load_role(normalised)
        if role_config and role_config.sections:
            mins = max(5, duration_minutes // len(role_config.sections))
            sections = [
                InterviewSection(
                    title=s,
                    competencies=[s.lower().replace(" ", "_")],
                    time_budget_minutes=mins,
                    expectations=[EvaluationExpectation(
                        competency=s.lower().replace(" ", "_"),
                        description=f"Assess candidate's {s} knowledge and application",
                    )],
                )
                for s in role_config.sections
            ]
            return InterviewBlueprint(
                role=role, seniority=seniority, duration_minutes=duration_minutes,
                sections=sections, candidate_skills=skills, candidate_claims=claims,
            )
    except Exception:
        pass

    # LLM generation
    if llm_service:
        try:
            prompt = PLANNER_PROMPT.format(
                role=role, seniority=seniority,
                skills=json.dumps(skills[:15]),
                claims=json.dumps([c if isinstance(c, str) else c.get("text", "") for c in claims[:10]]),
                duration=duration_minutes,
            )
            llm = llm_service.get_llm()
            from langchain_core.messages import HumanMessage
            response = llm.invoke([HumanMessage(content=prompt)])
            raw = response.content if hasattr(response, "content") else str(response)
            # Strip markdown fences if present
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw.strip())
            return InterviewBlueprint(**data)
        except Exception as e:
            logger.warning(f"LLM blueprint generation failed: {e}")

    # Heuristic fallback — always works
    return _heuristic_blueprint(role, skills, seniority, duration_minutes, claims)


def _heuristic_blueprint(role, skills, seniority, duration, claims) -> InterviewBlueprint:
    mins = duration // 3
    top_skills = skills[:4] if skills else ["core_concepts", "problem_solving"]
    return InterviewBlueprint(
        role=role,
        seniority=seniority,
        duration_minutes=duration,
        sections=[
            InterviewSection(
                title="Technical Fundamentals",
                competencies=top_skills[:2],
                time_budget_minutes=mins,
                expectations=[EvaluationExpectation(competency=s, description=f"Core {s} knowledge") for s in top_skills[:2]],
            ),
            InterviewSection(
                title="Applied Problem Solving",
                competencies=top_skills[2:4] or ["problem_solving", "system_thinking"],
                time_budget_minutes=mins,
                expectations=[EvaluationExpectation(competency="problem_solving", description="Approach to ambiguous problems")],
            ),
            InterviewSection(
                title="Experience & Projects",
                competencies=["project_depth", "communication"],
                time_budget_minutes=duration - 2 * mins,
                expectations=[
                    EvaluationExpectation(competency="project_depth", description="Depth of past project involvement"),
                    EvaluationExpectation(competency="communication", description="Clarity and structure of explanation"),
                ],
            ),
        ],
        candidate_skills=skills,
        candidate_claims=[c if isinstance(c, str) else c.get("text", "") for c in claims],
    )
