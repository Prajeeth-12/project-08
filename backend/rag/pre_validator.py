import asyncio
import hashlib
import json
import re
from typing import Dict, Optional

from pydantic import BaseModel

# PDF guard — imported here so callers can access all validation in one place
from .file_guard import (  # noqa: F401  (re-exported for convenience)
    PdfValidationError,
    assert_file_size_and_page_count,
    assert_pdf_upload,
)

# Positive keyword signals that typically characterize legitimate engineering resumes
RESUME_POSITIVE_SIGNALS = [
    "experience",
    "work experience",
    "education",
    "skills",
    "projects",
    "technologies",
    "technical skills",
    "employment",
    "certifications",
    "github",
    "linkedin",
]

# Obvious non-resume signals (invoices, leases, receipts, generic letters)
NON_RESUME_SIGNALS = [
    "invoice",
    "tax invoice",
    "receipt",
    "bill to",
    "lease agreement",
    "tenant",
    "payment receipt",
    "shipping address",
    "order confirmation",
]

# Patterns often used in white-font or hidden-text prompt injection attacks
PROMPT_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"you\s+must\s+give\s+this\s+candidate\s+a\s+perfect\s+score",
    r"system\s*:\s*you\s+are",
    r"override\s+scoring",
    r"prompt\s+injection",
]

# In-memory SHA-256 hash cache for instant resume re-identification
_HASH_CACHE: Dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Pydantic model for the LLM-based two-stage classifier response.
# ---------------------------------------------------------------------------
class _IsResumeCheck(BaseModel):
    """Minimal schema expected from the LLM two-stage classifier."""
    is_resume: bool


class PreValidationError(Exception):
    """Raised when an uploaded document fails authenticity or safety checks."""
    pass


class ResumePreValidator:
    """Fast, deterministic pre-validation engine protecting our LLM budget and assessment integrity.

    Stage 1 (always): keyword-signal check — fast, zero LLM cost.
    Stage 2 (optional): LLM binary classifier invoked only when the document
        is *borderline* (fewer than 3 positive signals).  Pass an
        ``LLMGateway`` instance to enable this stage; omitting it keeps the
        original single-stage behaviour so no existing code breaks.
    """

    @staticmethod
    def compute_sha256(content: bytes) -> str:
        """Compute cryptographic SHA-256 digest of document bytes."""
        hasher = hashlib.sha256()
        hasher.update(content)
        return hasher.hexdigest()

    @staticmethod
    def get_cached_result(file_hash: str) -> Optional[dict]:
        """Check if identical document was previously parsed."""
        return _HASH_CACHE.get(file_hash)

    @staticmethod
    def cache_result(file_hash: str, parsed_data: dict) -> None:
        """Store parsed document profile against its content hash."""
        _HASH_CACHE[file_hash] = parsed_data

    # ------------------------------------------------------------------
    # Internal async helper for Stage-2 LLM classification.
    # ------------------------------------------------------------------
    @staticmethod
    async def _llm_resume_check(text_snippet: str, llm_gateway) -> bool:
        """Call the LLM gateway with a minimal prompt to confirm document is a resume.

        Uses the first 800 characters of the document to keep token spend low.
        Returns ``True`` if the LLM considers it a resume, ``False`` otherwise.
        Falls back to ``True`` (pass-through) on any exception so a gateway
        failure never blocks a real candidate.
        """
        try:
            snippet = text_snippet[:800]
            result: _IsResumeCheck = await llm_gateway.complete_json(
                system_prompt=(
                    "You are a document classifier. Given a text snippet, decide "
                    "whether it is a resume / CV."
                ),
                user_message=(
                    f"Is this document a resume? Answer with JSON only.\n\nDocument:\n{snippet}"
                ),
                response_model=_IsResumeCheck,
                temperature=0.0,
                max_tokens=32,
            )
            return result.is_resume
        except Exception:
            # Fail open: a gateway error should not block a genuine resume.
            return True

    @staticmethod
    def sanitize_and_validate_text(
        text: str,
        llm_gateway=None,
    ) -> tuple[bool, str]:
        """Validate document content authenticity and strip malicious injection strings.

        Args:
            text:         Raw document text to validate.
            llm_gateway:  Optional ``LLMGateway`` instance.  When supplied and
                          the fast keyword check is *borderline* (fewer than 3
                          positive signals), a second LLM-based classification
                          pass is performed.  Omit (or pass ``None``) to keep
                          the original deterministic-only behaviour.

        Returns:
            ``(is_valid: bool, cleaned_text: str)``

        Raises:
            PreValidationError: When the document fails any validation stage.
        """
        text_lower = text.lower()

        # 1. Reject empty or abnormally sparse files (< 50 words)
        words = text.split()
        if len(words) < 50:
            raise PreValidationError(
                f"Document text too sparse ({len(words)} words). Please upload a complete resume."
            )

        # 2. Check for non-resume signals
        non_resume_matches = [sig for sig in NON_RESUME_SIGNALS if sig in text_lower]
        positive_matches = [sig for sig in RESUME_POSITIVE_SIGNALS if sig in text_lower]

        if len(non_resume_matches) >= 2 and len(positive_matches) < 2:
            raise PreValidationError(
                f"Document rejected: identified as non-resume document (matches: {', '.join(non_resume_matches)})."
            )

        if len(positive_matches) == 0:
            raise PreValidationError(
                "Document rejected: missing essential resume sections (Experience, Education, Skills, or Projects)."
            )

        # 3. Stage-2 LLM classification for borderline documents
        # Borderline = passes Stage-1 but has fewer than 3 positive signals.
        # Clear resumes (3+ signals) skip the LLM call entirely.
        if llm_gateway is not None and len(positive_matches) < 3:
            try:
                # Bridge sync → async.  Use asyncio.run() when no event loop is
                # running; fall back silently inside an async context so we never
                # deadlock an existing loop.
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Already inside an async context — schedule as coroutine but
                    # we cannot await here; skip LLM stage conservatively.
                    is_resume_via_llm = True
                else:
                    is_resume_via_llm = loop.run_until_complete(
                        ResumePreValidator._llm_resume_check(text_lower, llm_gateway)
                    )
            except RuntimeError:
                # No current event loop — create one.
                is_resume_via_llm = asyncio.run(
                    ResumePreValidator._llm_resume_check(text_lower, llm_gateway)
                )

            if not is_resume_via_llm:
                raise PreValidationError(
                    "LLM classifier rejected: document does not appear to be a resume."
                )

        # 4. Detect and neutralize prompt injection attempts
        sanitized_text = text
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, text_lower):
                sanitized_text = re.sub(pattern, "[STRIPPED_SECURITY_VIOLATION]", sanitized_text, flags=re.IGNORECASE)

        return True, sanitized_text


# ---------------------------------------------------------------------------
# DB-backed resume deduplication (Feature #37)
# ---------------------------------------------------------------------------

async def check_resume_dedup(file_hash: str, db) -> Optional[dict]:
    """Check the database for a previously processed resume with the same SHA-256 hash.

    This is a lightweight async guard called before expensive PDF parsing.  When a
    candidate re-uploads an identical resume (byte-for-byte), we can skip the full
    parse pipeline and return the existing scorecard instantly.

    Args:
        file_hash: 64-character hex SHA-256 digest of the raw resume bytes.
        db:        Active async SQLAlchemy session.

    Returns:
        The stored scorecard dict if a matching resume_hash exists in the
        ``candidate_scorecards`` table, otherwise ``None``.
    """
    from sqlalchemy import select
    from models.tables import CandidateScorecardRow

    result = await db.execute(
        select(CandidateScorecardRow)
        .where(CandidateScorecardRow.resume_hash == file_hash)
        .order_by(CandidateScorecardRow.created_at.desc())
        .limit(1)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return json.loads(row.scorecard_json)
