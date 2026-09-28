# module-2-ai-interview-agent/eval_engine/integrity.py
"""Evidence integrity guardrails and anti-flattery cap.

Five rules guard against phantom, thin, or mis-attributed evidence.
The anti-flattery cap prevents one stellar answer from masking weak areas.
Written fresh for this platform — not lifted from any cloned repo.
"""
from __future__ import annotations

from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.agents.decisions import InterviewEvidence
    from backend.agents.state_machine import InterviewSessionState
    from backend.blueprint.models import InterviewBlueprint


def validate_evidence(
    evidence: "InterviewEvidence",
    state: "InterviewSessionState",
    blueprint: "InterviewBlueprint",
) -> List[str]:
    """Run 5 integrity guardrails against a single evidence item.

    Returns a list of human-readable violation strings (empty list = valid).

    Rules:
    1. source_turn_index must reference a turn that exists in the transcript.
    2. content_summary must share at least one word (case-insensitive) with the
       referenced transcript turn's content.
    3. strength 'strong' is forbidden when the candidate's answer at that turn
       has fewer than 20 words.
    4. competency must be listed in the blueprint.
    5. 'strong' overall strength is forbidden when any other evidence entry for
       the same competency carries 'contradictory' strength (checked across all
       state evidence).
    """
    violations: List[str] = []

    # Build turn lookup by index for O(1) access
    turn_by_index = {t.turn_index: t for t in state.turns}

    # ── Rule 1: turn must exist ───────────────────────────────────────────────
    if evidence.source_turn_index not in turn_by_index:
        violations.append(
            f"Rule 1: source_turn_index {evidence.source_turn_index} does not "
            f"exist in the transcript (known indices: "
            f"{sorted(turn_by_index.keys())})."
        )
        # Rules 2 & 3 require a valid turn — skip them when Rule 1 fires.
    else:
        turn = turn_by_index[evidence.source_turn_index]
        turn_words = {
            w.lower().strip(".,!?;:'\"") for w in turn.content.split()
        }
        summary_words = {
            w.lower().strip(".,!?;:'\"") for w in evidence.content_summary.split()
        }

        # ── Rule 2: word overlap between summary and turn content ─────────────
        if not (turn_words & summary_words):
            violations.append(
                f"Rule 2: content_summary shares no word with the referenced "
                f"turn (turn_index={evidence.source_turn_index})."
            )

        # ── Rule 3: 'strong' requires ≥20 words in the candidate answer ───────
        if evidence.strength == "strong" and turn.sender == "CANDIDATE":
            word_count = len(turn.content.split())
            if word_count < 20:
                violations.append(
                    f"Rule 3: strength='strong' but candidate turn has only "
                    f"{word_count} word(s) (minimum 20 required)."
                )

    # ── Rule 4: competency must appear in the blueprint ───────────────────────
    all_comps: set = set()
    for section in blueprint.sections:
        all_comps.update(section.competencies)
    if evidence.competency not in all_comps:
        violations.append(
            f"Rule 4: competency '{evidence.competency}' is not listed in the "
            f"blueprint (known: {sorted(all_comps)})."
        )

    # ── Rule 5: contradictory sibling evidence blocks 'strong' ───────────────
    if evidence.strength == "strong":
        same_comp = [
            e for e in state.evidence if e.competency == evidence.competency
        ]
        has_contradictory = any(e.strength == "contradictory" for e in same_comp)
        if has_contradictory:
            violations.append(
                f"Rule 5: evidence for '{evidence.competency}' contains "
                f"'contradictory' entries — overall strength cannot be 'strong'."
            )

    return violations


def apply_anti_flattery_cap(
    proposed_overall: float,
    competency_scores: List[float],
) -> float:
    """Cap overall_score at the 85th-percentile of individual competency scores.

    Prevents one stellar answer from masking uniformly weak areas. Uses linear
    interpolation (same method as NumPy's default percentile).

    Returns proposed_overall unchanged when there are fewer than 2 scores.
    """
    if len(competency_scores) < 2:
        return proposed_overall

    sorted_scores = sorted(competency_scores)
    n = len(sorted_scores)
    idx = 0.85 * (n - 1)
    lower_i = int(idx)
    upper_i = min(lower_i + 1, n - 1)
    frac = idx - lower_i
    cap = sorted_scores[lower_i] + frac * (sorted_scores[upper_i] - sorted_scores[lower_i])
    return min(proposed_overall, cap)
