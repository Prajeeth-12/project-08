import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_parse_resume_and_extract_claims(client: AsyncClient):
    resume_text = """
John Doe
Software Engineer
Skills: Python, FastAPI, PostgreSQL, Docker, Redis, Next.js
Projects:
- AI Mock Interview Platform: Built high-throughput async REST microservices with FastAPI and PostgreSQL.
- Optimized query latency by 45% using Redis caching.
- Scaled Docker and Kubernetes deployment handling concurrent candidate sessions.
"""
    payload = {
        "user_id": "cand-john-101",
        "resume_text": resume_text,
    }
    resp = await client.post("/api/resumes/parse", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "Python" in data["skills"]
    assert "FastAPI" in data["skills"]
    assert len(data["claims"]) > 0

    # Retrieve saved claims
    get_resp = await client.get("/api/resumes/cand-john-101")
    assert get_resp.status_code == 200
    assert len(get_resp.json()["skills"]) >= 3
