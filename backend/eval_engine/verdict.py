# module-2-ai-interview-agent/eval_engine/verdict.py
"""Three-tier verdict assignment for individual competency assessments.

Maps a competency's numeric score, evidence count, and answer depth to one of
three human-readable verdict labels that drive coaching card generation.

  solid          — strong performance: score >= 70, at least 2 evidence items,
                   and at least one substantive answer (>= 30 words).
  shaky          — partial performance: score >= 45 with at least one evidence
                   item or a genuine attempt at answering.
  couldnt_defend — weak performance: everything else (low score, no evidence,
                   or only trivial/empty answers).
"""
from __future__ import annotations


def assign_verdict(score: float, evidence_count: int, answer_word_count: int) -> str:
    """Assign a three-tier verdict for a single competency.

    Args:
        score:             Numeric score in the 0-100 range.
        evidence_count:    Number of validated evidence items collected for this
                           competency across all interview turns.
        answer_word_count: Total word count of the candidate's answers that
                           target this competency.

    Returns:
        ``"solid"``, ``"shaky"``, or ``"couldnt_defend"``.
    """
    if score >= 70 and evidence_count >= 2 and answer_word_count >= 30:
        return "solid"
    if score >= 45 and (evidence_count >= 1 or answer_word_count > 0):
        return "shaky"
    return "couldnt_defend"
