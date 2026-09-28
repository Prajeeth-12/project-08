# module-2-ai-interview-agent/core/probe_taxonomy.py
"""
9-Category Probe Taxonomy for the AI Staff-Engineer interviewer.

Each category has 3-4 template questions designed to expose whether the
candidate genuinely built and understands a system, or is reciting surface-level
talking points.

Usage:
    from core.probe_taxonomy import PROBE_TAXONOMY
    questions = PROBE_TAXONOMY["Failure modes"]
"""

from typing import Dict, List

PROBE_TAXONOMY: Dict[str, List[str]] = {
    "Load-bearing decisions": [
        "What breaks first if this component fails under peak load?",
        "Which part of this system is load-bearing — the piece whose failure cascades everywhere?",
        "Walk me through your circuit-breaker strategy. What happens downstream when this service is degraded?",
        "If you had to remove one dependency from this architecture to reduce single points of failure, which would it be and why?",
    ],
    "X-over-Y tradeoffs": [
        "Why did you choose X over Y here? At what scale or traffic pattern does that decision start to hurt?",
        "You picked an eventually-consistent model rather than a strongly-consistent one. Where does that come back to bite you?",
        "Walk me through the trade-off that forced your hand when you picked this queue over a direct HTTP call.",
        "At what point does your current data-storage choice become the wrong answer, and what would you migrate to?",
    ],
    "Failure modes": [
        "Your upstream API hangs for 30 seconds. What does the user see, and how does your system recover?",
        "Describe a failure mode in this system that is not immediately visible — one that silently corrupts state.",
        "What is the worst-case scenario if your cache layer goes cold simultaneously with a traffic spike?",
        "Walk me through how a malformed payload from an external service propagates through your pipeline.",
    ],
    "Scale ceilings": [
        "What input size, request rate, or data volume kills this approach as currently designed?",
        "At 10x your current load, which bottleneck surfaces first — CPU, memory, I/O, or network?",
        "How did you estimate the throughput ceiling of this design before committing to it?",
        "What would you rewrite first if you had to scale this to handle 100x more concurrent users?",
    ],
    "Data flow tracing": [
        "Trace a request from the entry point all the way to the database write. Where can data be silently lost?",
        "Walk me through exactly how a user action becomes a persisted record, including every intermediate state.",
        "Where in this pipeline is the first point where you can guarantee the data is durable?",
        "If I replay an event twice, what guarantees idempotency, and which layer enforces it?",
    ],
    "Security surface": [
        "Where does untrusted user input first touch your system, and how do you sanitize it before it reaches the database?",
        "Walk me through how an attacker with a valid session token could escalate privileges in this design.",
        "What is your secret-rotation strategy, and what breaks in production during a key rotation?",
        "Show me the path an SQL injection attempt would take and where exactly it gets blocked.",
    ],
    "Struggle probes": [
        "What was the hardest debugging session you had on this project, and how did you eventually isolate the root cause?",
        "Describe a design decision you made early on that you later had to reverse. What changed your mind?",
        "What is the ugliest part of this codebase, and why did it end up that way?",
        "Tell me about a week where this project was genuinely blocked. What unblocked it?",
    ],
    "Dependency probes": [
        "Walk me through exactly how this specific piece works — not the high-level pitch, the actual mechanics.",
        "Which third-party dependency are you most nervous about, and what is your contingency if it stops being maintained?",
        "How does your system behave during a rolling deployment when old and new versions of this service coexist?",
        "Explain the contract between this module and its caller. What invariants does the caller have to respect?",
    ],
    "Value skepticism": [
        "Couldn't I build a simpler version of this in a weekend? What is actually hard here that is not obvious from the outside?",
        "Your README says this solves X at scale. What is the simplest proof that this is genuinely hard and not a CRUD app with ambition?",
        "Every team claims their architecture handles failures gracefully. Show me the evidence in your design, not the aspiration.",
        "If a senior engineer picked up this project tomorrow, where would they first push back on your choices?",
    ],
}
