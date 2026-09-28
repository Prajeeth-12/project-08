"""
file_guard.py — Multi-layer PDF upload validation.

Layer 0: MIME type and file extension must indicate PDF.
Layer 1: Reject oversize files (> 2 MB) and PDFs with too many pages (> 3).

Adapted from cloned_repos/ai-resume-matcher/app/resume/file_utils.py.
"""
from __future__ import annotations

import hashlib
import io
from pathlib import Path

import pypdf

MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB
MAX_PAGE_COUNT = 3

ALLOWED_PDF_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "application/x-pdf",
    }
)
ALLOWED_PDF_EXTENSIONS = frozenset({".pdf"})


class PdfValidationError(Exception):
    """Raised when an upload fails defense layers 0 or 1."""


def compute_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def get_pdf_page_count(file_bytes: bytes) -> int:
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        return len(reader.pages)
    except Exception as exc:
        raise PdfValidationError(
            "Unable to read PDF. The file may be corrupted or password-protected."
        ) from exc


def assert_pdf_upload(filename: str | None, content_type: str | None) -> None:
    """Layer 0: MIME type and file extension must indicate PDF."""
    extension = Path(filename or "").suffix.lower()
    if extension not in ALLOWED_PDF_EXTENSIONS:
        raise PdfValidationError("Only PDF files are allowed.")

    normalized_type = (content_type or "").split(";")[0].strip().lower()
    if normalized_type and normalized_type not in ALLOWED_PDF_CONTENT_TYPES:
        raise PdfValidationError("Only PDF files are allowed.")


def assert_file_size_and_page_count(file_bytes: bytes) -> None:
    """Layer 1: Reject oversize files and PDFs with too many pages."""
    if len(file_bytes) == 0:
        raise PdfValidationError("Uploaded file is empty.")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise PdfValidationError(
            f"File exceeds the maximum size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    page_count = get_pdf_page_count(file_bytes)
    if page_count > MAX_PAGE_COUNT:
        raise PdfValidationError(
            f"PDF has {page_count} pages. Maximum allowed is {MAX_PAGE_COUNT} pages."
        )

    if page_count == 0:
        raise PdfValidationError("PDF contains no readable pages.")
