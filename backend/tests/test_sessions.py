import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_session_lifecycle(client: AsyncClient):
    # 1. Start session
    start_payload = {
        "candidate_id": "cand-999",
        "role_title": "Senior Backend Architect",
    }
    resp = await client.post("/api/sessions/start", json=start_payload)
    assert resp.status_code == 200
    data = resp.json()
    session_id = data["id"]
    assert data["stage"] == "TECH"
    assert len(data["transcript"]) > 0

    # 2. Post new message
    msg_payload = {
        "sender": "CANDIDATE",
        "content": "I designed a scalable asynchronous messaging bus using Redis and Python.",
    }
    msg_resp = await client.post(f"/api/sessions/{session_id}/message", json=msg_payload)
    assert msg_resp.status_code == 200
    assert len(msg_resp.json()["transcript"]) == 2

    # 3. Transition stage to CODING_TOOL
    stage_payload = {"stage": "CODING_TOOL"}
    stage_resp = await client.patch(f"/api/sessions/{session_id}/stage", json=stage_payload)
    assert stage_resp.status_code == 200
    assert stage_resp.json()["stage"] == "CODING_TOOL"
