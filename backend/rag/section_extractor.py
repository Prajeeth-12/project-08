# module-2-ai-interview-agent/rag/section_extractor.py
"""
Regex-based resume section detection.

Splits raw resume text into named sections by detecting common section
header anchors (e.g. SKILLS, EXPERIENCE, EDUCATION, PROJECTS).  Headers
are matched case-insensitively so "Technical Skills", "TECHNICAL SKILLS",
and "technical skills" are all normalised to the same canonical key.
"""

import re
from typing import Dict

# ---------------------------------------------------------------------------
# Keyword → canonical section name mapping.
# Longer variants must sort before shorter ones so the regex alternation
# prefers the most specific match.
# ---------------------------------------------------------------------------
_SECTION_KEYWORDS: Dict[str, str] = {
    # Experience variants
    "professional experience": "Experience",
    "work experience": "Experience",
    "employment history": "Experience",
    "employment": "Experience",
    "experience": "Experience",
    # Projects variants (including combined headers common in student resumes)
    "projects & experience": "Projects",
    "projects and experience": "Projects",
    "personal projects": "Projects",
    "key projects": "Projects",
    "projects": "Projects",
    # Skills variants
    "technical skills": "Skills",
    "core skills": "Skills",
    "key skills": "Skills",
    "technologies": "Skills",
    "skills": "Skills",
    # Education
    "academic background": "Education",
    "education": "Education",
    # Certifications
    "certifications": "Certifications",
    "certificates": "Certifications",
    # Summaries / objectives
    "professional summary": "Summary",
    "summary": "Summary",
    "objective": "Objective",
    "profile": "Profile",
    # Other common sections
    "achievements": "Achievements",
    "awards": "Awards",
    "languages": "Languages",
    "publications": "Publications",
    "references": "References",
}

# Build alternation ordered by descending keyword length so longer phrases
# take precedence over their shorter sub-strings.
_sorted_keywords = sorted(_SECTION_KEYWORDS.keys(), key=len, reverse=True)
_kw_alternation = "|".join(re.escape(kw) for kw in _sorted_keywords)

# A "section header line" is a line whose entire content (ignoring leading /
# trailing whitespace and an optional trailing colon) is one of the keywords.
_HEADER_RE = re.compile(
    rf"^[ \t]*(?P<header>{_kw_alternation}):?[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)


def extract_sections(text: str) -> Dict[str, str]:
    """Split *text* into a ``{canonical_name: content}`` dict.

    Each key is the canonical section name (e.g. ``"Skills"``, ``"Projects"``).
    The value is the raw text that follows the header, up to the next detected
    header (or the end of the document).

    If no section headers are found the whole text is returned under the key
    ``"Full Text"`` so callers always receive a non-empty dict.

    Example::

        >>> sections = extract_sections(resume_text)
        >>> sections["Skills"]
        'Python, FastAPI, PostgreSQL ...'
    """
    matches = list(_HEADER_RE.finditer(text))

    if not matches:
        return {"Full Text": text.strip()}

    sections: Dict[str, str] = {}
    for i, match in enumerate(matches):
        raw_header = match.group("header").strip()
        canonical = _SECTION_KEYWORDS.get(raw_header.lower(), raw_header.title())

        content_start = match.end()
        content_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        content = text[content_start:content_end].strip()

        # If multiple headers normalise to the same canonical key, append content.
        if canonical in sections:
            sections[canonical] = sections[canonical] + "\n" + content
        else:
            sections[canonical] = content

    return sections
