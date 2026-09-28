import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_dynamic_live_probing(client: AsyncClient):
    # Probing turn 1: Technical answer on scaling
    payload = {
        "session_id": "session-probe-1",
        "candidate_response": "I built a distributed service with async queue workers to handle high scale and concurrency.",
        "turn_index": 1,
    }
    resp = await client.post("/api/ai/live-probe", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "PROBE_DEEPER"
    assert data["difficulty"] == "DEEP"
    assert "race condition" in data["probe_question"].lower() or "concurrency" in data["reasoning"].lower()

@pytest.mark.asyncio
async def test_probing_invokes_coding_after_turn_3(client: AsyncClient):
    payload = {
        "session_id": "session-probe-2",
        "candidate_response": "We tuned the database connection pools and implemented automated circuit breaking to recover seamlessly.",
        "turn_index": 3,
    }
    resp = await client.post("/api/ai/live-probe", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "INVOKE_CODING"
    assert "coding workspace" in data["probe_question"].lower()
