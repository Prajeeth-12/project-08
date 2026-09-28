import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_score_evaluation_and_generate_roadmap(client: AsyncClient):
    payload = {
        "candidate_id": "cand-eval-55",
        "session_id": "session-eval-1",
        "correctness_score": 9.0,
        "complexity_score": 8.5,
        "system_design_score": 8.0,
        "communication_score": 7.5,
        "veracity_score": 9.0,
    }
    resp = await client.post("/api/evaluations/score", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_score"] > 80.0
    assert len(data["coach_roadmap_30d"]) == 4  # 4-week roadmap
    assert len(data["strengths"]) > 0

    # Retrieve saved evaluation
    get_resp = await client.get("/api/evaluations/session-eval-1")
    assert get_resp.status_code == 200
    assert get_resp.json()["overall_score"] == data["overall_score"]
