# module-2-ai-interview-agent/eval_engine/reporter.py
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from core.state_machine import InterviewSessionState
from backend.blueprint.models import InterviewBlueprint
# LLMGateway replaced by Base LLMService — see callers


class CompetencyScore(BaseModel):
    score: float = 0
    evidence_count: int = 0
    strength: str = "not_assessed"
    mastery_level: str = "not_assessed"


class InterviewReport(BaseModel):
    session_id: str
    overall_score: float = 0
    competency_scores: Dict[str, CompetencyScore] = Field(default_factory=dict)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    not_assessed: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    coverage_pct: float = 0.0
    # Task 8: Coaching output fields
    key_strengths: List[str] = Field(default_factory=list)
    areas_for_improvement: List[str] = Field(default_factory=list)
    verdicts: Dict[str, str] = Field(default_factory=dict)
    coaching_cards: List[dict] = Field(default_factory=list)
    language_report: Optional[dict] = None
    # Task 9: Readiness score, narrative, prep punch list
    readiness_score: float = 0.0
    narrative: str = ""
    prep_list: List[dict] = Field(default_factory=list)
    # Task 7: Live resource URLs for each coaching recommendation
    resources: List[dict] = Field(default_factory=list)


STRENGTH_TO_SCORE = {"strong": 85, "moderate": 70, "weak": 50, "contradictory": 30}

# Number of top/bottom competencies to surface in key_strengths / areas_for_improvement.
_TOP_N = 3


async def generate_report(
    state: InterviewSessionState,
    blueprint: InterviewBlueprint,
    llm: LLMGateway,
) -> InterviewReport:
    # Lazy imports to avoid circular dependencies at module load time.
    from eval_engine.rubric import level_for_score, coverage_pct as calc_coverage_pct
    from eval_engine.integrity import validate_evidence, apply_anti_flattery_cap
    from eval_engine.verifier import verify_scores
    from eval_engine.verdict import assign_verdict
    from eval_engine.coaching import generate_coaching_card
    from eval_engine.language_report import assess_language

    all_competencies = set()
    for section in blueprint.sections:
        all_competencies.update(section.competencies)

    # Filter evidence through the 5 integrity guardrails.
    valid_evidence = [
        ev for ev in state.evidence
        if not validate_evidence(ev, state, blueprint)
    ]

    comp_scores: Dict[str, CompetencyScore] = {}
    for comp in all_competencies:
        evidence_for_comp = [e for e in valid_evidence if e.competency == comp]
        if not evidence_for_comp:
            continue
        avg_score = sum(
            STRENGTH_TO_SCORE.get(e.strength, 50) for e in evidence_for_comp
        ) / len(evidence_for_comp)
        best_strength = max(
            (e.strength for e in evidence_for_comp),
            key=lambda s: STRENGTH_TO_SCORE.get(s, 0),
        )
        avg_rounded = round(avg_score, 1)
        comp_scores[comp] = CompetencyScore(
            score=avg_rounded,
            evidence_count=len(evidence_for_comp),
            strength=best_strength,
            mastery_level=level_for_score(avg_rounded),
        )

    # Adversarial second pass: re-examine developing/novice scores.
    comp_scores = await verify_scores(comp_scores, state, llm)

    assessed = set(comp_scores.keys())
    not_assessed = sorted(all_competencies - assessed)

    strengths = [comp for comp, cs in comp_scores.items() if cs.strength == "strong"]
    weaknesses = [
        comp for comp, cs in comp_scores.items()
        if cs.strength in ("weak", "contradictory")
    ]

    overall = 0.0
    if comp_scores:
        raw_overall = sum(cs.score for cs in comp_scores.values()) / len(comp_scores)
        overall = round(
            apply_anti_flattery_cap(
                raw_overall,
                [cs.score for cs in comp_scores.values()],
            ),
            1,
        )

    cov = calc_coverage_pct(list(assessed), blueprint)

    recommendations: List[str] = []
    for w in weaknesses:
        recommendations.append(
            f"Practice {w.replace('_', ' ')} scenarios with deeper technical examples"
        )
    for na in not_assessed[:2]:
        recommendations.append(
            f"Review {na.replace('_', ' ')} — not covered in this session"
        )

    # ── Task 8: Per-competency word counts (for verdict assignment) ──────────
    words_by_comp: Dict[str, int] = {}
    for turn in state.turns:
        if turn.sender != "CANDIDATE":
            continue
        comp = turn.competency or ""
        if comp:
            words_by_comp[comp] = words_by_comp.get(comp, 0) + len(turn.content.split())

    # ── Task 8: Three-tier verdicts ──────────────────────────────────────────
    verdicts: Dict[str, str] = {
        comp: assign_verdict(
            score=cs.score,
            evidence_count=cs.evidence_count,
            answer_word_count=words_by_comp.get(comp, 0),
        )
        for comp, cs in comp_scores.items()
    }

    # ── Task 8: Key strengths / areas for improvement ────────────────────────
    sorted_desc = sorted(comp_scores.items(), key=lambda x: x[1].score, reverse=True)
    sorted_asc = sorted(comp_scores.items(), key=lambda x: x[1].score)

    key_strengths: List[str] = [
        comp for comp, cs in sorted_desc[:_TOP_N] if cs.score >= 60
    ]
    areas_for_improvement: List[str] = [
        comp for comp, cs in sorted_asc[:_TOP_N] if cs.score < 70
    ]

    # ── Task 8: Coaching cards (LLM-backed; gracefully degrades) ─────────────
    coaching_cards: List[dict] = []
    for comp, v in verdicts.items():
        if v in ("shaky", "couldnt_defend"):
            # Build a short transcript excerpt for this competency.
            excerpt_parts = [
                t.content for t in state.turns
                if t.sender == "CANDIDATE" and (t.competency or "") == comp
            ]
            excerpt = " ".join(excerpt_parts)[:400]
            try:
                card = await generate_coaching_card(comp, v, excerpt, llm)
                coaching_cards.append({"competency": comp, **card.model_dump()})
            except Exception:
                coaching_cards.append({
                    "competency": comp,
                    "say": f"Provide concrete examples for {comp.replace('_', ' ')}.",
                    "avoid": "Generic, unsupported claims.",
                    "fix": f"Practise structured responses for {comp.replace('_', ' ')}.",
                })

    # ── Task 8: Language report (LLM-backed; gracefully degrades) ────────────
    language_report_dict: Optional[dict] = None
    try:
        lang_report = await assess_language(state.turns, llm)
        language_report_dict = lang_report.model_dump()
    except Exception:
        language_report_dict = None

    # ── Task 9: Readiness score ───────────────────────────────────────────────
    from eval_engine.readiness import calculate_readiness
    from eval_engine.narrative import generate_narrative
    from eval_engine.prep_list import generate_prep_list

    readiness_score = calculate_readiness(verdicts, comp_scores)

    # Build a partial report to feed narrative and prep list generators.
    partial_report = InterviewReport(
        session_id=state.session_id,
        overall_score=overall,
        competency_scores=comp_scores,
        strengths=strengths,
        weaknesses=weaknesses,
        not_assessed=not_assessed,
        recommendations=recommendations,
        coverage_pct=round(cov, 2),
        key_strengths=key_strengths,
        areas_for_improvement=areas_for_improvement,
        verdicts=verdicts,
        coaching_cards=coaching_cards,
        language_report=language_report_dict,
        readiness_score=readiness_score,
    )

    narrative = generate_narrative(partial_report)
    prep_items = generate_prep_list(partial_report)

    # ── Task 7: Fetch offline/live resources for weak competencies ────────────
    from eval_engine.resource_search import search_resources as _search_resources

    resource_dicts: List[dict] = []
    # Use the top-2 weaknesses as search targets to keep report generation fast.
    for weak_comp in weaknesses[:2]:
        skill_name = weak_comp.replace("_", " ")
        try:
            found = await _search_resources(skill_name, "intermediate", api_key=None)
            resource_dicts.extend(r.to_dict() for r in found[:3])
        except Exception:
            pass

    return InterviewReport(
        session_id=state.session_id,
        overall_score=overall,
        competency_scores=comp_scores,
        strengths=strengths,
        weaknesses=weaknesses,
        not_assessed=not_assessed,
        recommendations=recommendations,
        coverage_pct=round(cov, 2),
        key_strengths=key_strengths,
        areas_for_improvement=areas_for_improvement,
        verdicts=verdicts,
        coaching_cards=coaching_cards,
        language_report=language_report_dict,
        readiness_score=readiness_score,
        narrative=narrative,
        prep_list=[item.model_dump() for item in prep_items],
        resources=resource_dicts,
    )
