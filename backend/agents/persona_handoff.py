"""
Persona handoff — maps section titles to specialist system prompts.

When the interviewer transitions to a new section (e.g. "Database Design") we
swap the system prompt to a domain specialist persona.  This makes the probing
more focused and realistic for each technical area.

Public API
----------
get_persona_for_section(section_title: str) -> str
    Returns the specialist system prompt string for the given section title.
    Falls back to the default SKEPTICAL_STAFF_ENGINEER_PROMPT when no
    specialist is registered for the section.
"""

from __future__ import annotations

import re

from backend.agents.persona import (
    DATABASE_SPECIALIST_PROMPT,
    SYSTEM_DESIGN_SPECIALIST_PROMPT,
    API_SPECIALIST_PROMPT,
    SKEPTICAL_STAFF_ENGINEER_PROMPT,
)

# ---------------------------------------------------------------------------
# Section → persona mapping
# Each key is a pattern (case-insensitive substring match); first match wins.
# ---------------------------------------------------------------------------

_SECTION_PERSONA_MAP: list[tuple[str, str]] = [
    # Database-related sections
    ("database", DATABASE_SPECIALIST_PROMPT),
    ("sql", DATABASE_SPECIALIST_PROMPT),
    ("data model", DATABASE_SPECIALIST_PROMPT),
    ("schema", DATABASE_SPECIALIST_PROMPT),
    ("storage", DATABASE_SPECIALIST_PROMPT),
    ("persistence", DATABASE_SPECIALIST_PROMPT),
    # System design sections
    ("system design", SYSTEM_DESIGN_SPECIALIST_PROMPT),
    ("architecture", SYSTEM_DESIGN_SPECIALIST_PROMPT),
    ("scalability", SYSTEM_DESIGN_SPECIALIST_PROMPT),
    ("distributed", SYSTEM_DESIGN_SPECIALIST_PROMPT),
    ("infrastructure", SYSTEM_DESIGN_SPECIALIST_PROMPT),
    # API / backend sections
    ("api", API_SPECIALIST_PROMPT),
    ("rest", API_SPECIALIST_PROMPT),
    ("graphql", API_SPECIALIST_PROMPT),
    ("backend", API_SPECIALIST_PROMPT),
    ("service", API_SPECIALIST_PROMPT),
    ("integration", API_SPECIALIST_PROMPT),
    ("endpoint", API_SPECIALIST_PROMPT),
]


def get_persona_for_section(section_title: str) -> str:
    """Return the specialist system prompt for *section_title*.

    Parameters
    ----------
    section_title:
        The title of the interview section (e.g. ``"Database Design"``).

    Returns
    -------
    str
        A system prompt string.  Falls back to
        ``SKEPTICAL_STAFF_ENGINEER_PROMPT`` when no specialist applies.
    """
    lower = section_title.lower()
    for keyword, prompt in _SECTION_PERSONA_MAP:
        if keyword in lower:
            return prompt
    return SKEPTICAL_STAFF_ENGINEER_PROMPT
