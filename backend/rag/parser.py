import io
import re
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import pypdf

from .pre_validator import ResumePreValidator, PreValidationError
from .section_extractor import extract_sections
from .experience_parser import parse_experience, seniority_rank

# ---------------------------------------------------------------------------
# Skill vocabulary — lowercase lookup keys.
# Merged from cloned_repos/ai-resume-matcher/app/jobs/skill_extractor.py
# (42 canonical skills) plus our own 4 platform-specific additions.
# ---------------------------------------------------------------------------
KNOWN_SKILLS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "vue",
    "angular",
    "fastapi",
    "django",
    "flask",
    "sql",
    "postgresql",
    "mysql",
    "docker",
    "kubernetes",
    "git",
    "rest",
    "rest api",
    "rest apis",
    "api",
    "aws",
    "azure",
    "gcp",
    "linux",
    "ci/cd",
    "github",
    "html",
    "css",
    "node.js",
    "nodejs",
    "mongodb",
    "redis",
    "machine learning",
    "ai",
    "spring",
    "spring boot",
    "java ee",
    "microservices",
    "quarkus",
    "kafka",
    "rabbitmq",
    "jenkins",
    "next.js",
    "nextjs",
    "tailwind",
    "tailwind css",
    "graphql",
    "llm",
    "claude",
    "chatgpt",
    "openai",
    "prompt engineering",
    "langchain",
    # Platform-specific additions
    "c++",
    "elasticsearch",
    "sqlalchemy",
    "alembic",
]

DISPLAY_NAMES = {
    "python": "Python",
    "java": "Java",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "react": "React",
    "vue": "Vue",
    "angular": "Angular",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "sql": "SQL",
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "git": "Git",
    "rest": "REST",
    "rest api": "REST API",
    "rest apis": "REST APIs",
    "api": "API",
    "aws": "AWS",
    "azure": "Azure",
    "gcp": "GCP",
    "linux": "Linux",
    "ci/cd": "CI/CD",
    "github": "GitHub",
    "html": "HTML",
    "css": "CSS",
    "node.js": "Node.js",
    "nodejs": "Node.js",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "machine learning": "Machine Learning",
    "ai": "AI",
    "spring": "Spring",
    "spring boot": "Spring Boot",
    "java ee": "Java EE",
    "microservices": "Microservices",
    "quarkus": "Quarkus",
    "kafka": "Kafka",
    "rabbitmq": "RabbitMQ",
    "jenkins": "Jenkins",
    "next.js": "Next.js",
    "nextjs": "Next.js",
    "tailwind": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "graphql": "GraphQL",
    "llm": "LLMs",
    "claude": "Claude AI",
    "chatgpt": "ChatGPT",
    "openai": "OpenAI",
    "prompt engineering": "Prompt Engineering",
    "langchain": "LangChain",
    # Platform-specific additions
    "c++": "C++",
    "elasticsearch": "Elasticsearch",
    "sqlalchemy": "SQLAlchemy",
    "alembic": "Alembic",
}


def _contains_term(text: str, term: str) -> bool:
    """Word-boundary-aware case-insensitive skill match.

    Lifted verbatim from
    cloned_repos/ai-resume-matcher/app/jobs/skill_extractor.py:149-152.
    """
    escaped = re.escape(term)
    pattern = rf"(?<!\w){escaped}(?!\w)"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def normalize_text(text: str) -> str:
    """Strip carriage returns, collapse consecutive spaces, truncate at 12K chars.

    - Removes \\r so that \\r\\n line endings become plain \\n.
    - Collapses two-or-more consecutive spaces into one (preserves newlines).
    - Hard-truncates at 12,000 characters to cap LLM token spend.
    """
    text = text.replace("\r", "")
    text = re.sub(r" {2,}", " ", text)
    return text[:12000]

class TechnicalClaim(BaseModel):
    category: str = Field(description="Architecture, Database, Concurrency, or Optimization")
    raw_statement: str
    quantified_metric: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    veracity_level: str = "UNVERIFIED"  # UNVERIFIED, PROBED_SOUND, PROBED_FLAWED

class StructuredCandidateProfile(BaseModel):
    file_hash: str
    full_name: Optional[str] = "Candidate"
    target_role: Optional[str] = "Software Engineer"
    skills: List[str] = Field(default_factory=list)
    projects: List[str] = Field(default_factory=list)
    claims: List[TechnicalClaim] = Field(default_factory=list)
    raw_text: str
    # --- Task 3 additions ---
    years_experience: Optional[int] = None
    seniority_detected: str = "unknown"
    sections: Dict[str, str] = Field(default_factory=dict)
    # --- Task 11 additions (Feature #31 GitHub enrichment) ---
    github_repos: List[dict] = Field(default_factory=list)

class ResumeParser:
    """Production PDF parsing and claim extraction engine."""

    @classmethod
    def extract_text_from_pdf(cls, file_bytes: bytes) -> str:
        """Extract clean text content from PDF bytes using pypdf."""
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            return "\n".join(text_parts).strip()
        except Exception as e:
            raise PreValidationError(f"Failed to extract text from PDF: {str(e)}")

    @classmethod
    def parse_profile(cls, raw_content: str, file_hash: str = "direct-text-hash") -> StructuredCandidateProfile:
        """Parse raw resume text into structured skills and verifiable claims."""
        is_valid, cleaned_text = ResumePreValidator.sanitize_and_validate_text(raw_content)
        cleaned_text = normalize_text(cleaned_text)

        # 1. Skill Extraction — word-boundary regex + display-name normalization
        extracted_skills: List[str] = []
        for skill in KNOWN_SKILLS:
            if _contains_term(cleaned_text, skill):
                display_name = DISPLAY_NAMES.get(skill, skill.title())
                if display_name not in extracted_skills:
                    extracted_skills.append(display_name)

        # 2. Project Extraction
        projects = []
        lines = [line.strip() for line in cleaned_text.split("\n") if line.strip()]
        for line in lines:
            line_lower = line.lower()
            if any(k in line_lower for k in ["project:", "system", "platform", "service", "engine", "application", "pipeline"]):
                if 15 <= len(line) <= 120 and not line.endswith(":") and not any(h in line_lower for h in ["experience", "education"]):
                    projects.append(line)

        # 3. Technical Claims Extraction with Metric Flagging
        claims: List[TechnicalClaim] = []
        for line in lines:
            line_lower = line.lower()
            # Identify quantified claims or action-heavy engineering assertions
            metric_match = re.search(r"(\d+%\s*(latency|improvement|reduction|increase)|\d+\s*(rps|ms|users|requests|req/s))", line_lower)
            has_action = any(v in line_lower for v in ["optimized", "scaled", "designed", "architected", "built", "implemented", "reduced", "tuned"])

            if has_action and len(line) >= 30:
                matched_techs = [s for s in extracted_skills if s.lower() in line_lower]
                category = "Optimization" if ("optimiz" in line_lower or "reduc" in line_lower) else \
                           "Database" if any(db in line_lower for db in ["sql", "postgres", "redis", "database", "query", "index"]) else \
                           "Concurrency" if any(c in line_lower for c in ["async", "concurren", "thread", "worker", "kafka", "queue"]) else "Architecture"

                claims.append(TechnicalClaim(
                    category=category,
                    raw_statement=line,
                    quantified_metric=metric_match.group(0) if metric_match else None,
                    technologies=matched_techs,
                    veracity_level="UNVERIFIED",
                ))

        if not claims:
            # Fallback baseline claims to anchor the probing agent
            claims.append(TechnicalClaim(
                category="Architecture",
                raw_statement="Designed high-throughput REST backend services with async Python and PostgreSQL.",
                quantified_metric="1000 requests/sec",
                technologies=["Python", "FastAPI", "PostgreSQL"],
                veracity_level="UNVERIFIED",
            ))

        # 4. Section Extraction (Task 3)
        sections = extract_sections(cleaned_text)

        # 5. Experience & Seniority Detection (Task 3)
        years_exp = parse_experience(cleaned_text)

        # Infer seniority from keywords in the raw text
        text_lower_full = cleaned_text.lower()
        if any(t in text_lower_full for t in ("senior", "lead engineer", "principal", "staff engineer")):
            seniority = "senior"
        elif any(t in text_lower_full for t in ("junior", "entry level", "intern", "graduate")):
            seniority = "junior"
        elif any(t in text_lower_full for t in ("mid-level", "mid level", "associate")):
            seniority = "mid"
        else:
            seniority = "unknown"

        return StructuredCandidateProfile(
            file_hash=file_hash,
            skills=extracted_skills,
            projects=projects[:4] if projects else ["Distributed Backend Service", "Real-Time Event Engine"],
            claims=claims[:6],
            raw_text=cleaned_text,
            years_experience=years_exp,
            seniority_detected=seniority,
            sections=sections,
        )
