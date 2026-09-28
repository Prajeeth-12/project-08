import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_save_and_retrieve_draft(client: AsyncClient):
    session_id = "test-session-123"

    # Save initial code draft
    save_payload = {
        "session_id": session_id,
        "candidate_id": "cand-001",
        "language": "python",
        "code_content": "def solution():\n    return 42\n",
    }
    resp = await client.post("/api/code/drafts", json=save_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == session_id
    assert "return 42" in data["code_content"]

    # Update code draft
    update_payload = {
        "session_id": session_id,
        "candidate_id": "cand-001",
        "language": "python",
        "code_content": "def solution():\n    return 100\n",
    }
    update_resp = await client.post("/api/code/drafts", json=update_payload)
    assert update_resp.status_code == 200
    assert "return 100" in update_resp.json()["code_content"]

    # Fetch latest draft
    fetch_resp = await client.get(f"/api/code/drafts/{session_id}")
    assert fetch_resp.status_code == 200
    assert "return 100" in fetch_resp.json()["code_content"]
