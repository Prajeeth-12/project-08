import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_execute_valid_code(client: AsyncClient):
    payload = {
        "source_code": "print('Hello from sandbox!')",
        "language": "python",
        "stdin": "",
    }
    resp = await client.post("/api/code/execute", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ACCEPTED"
    assert "Hello from sandbox!" in data["stdout"]
    assert data["execution_time"] >= 0.0

@pytest.mark.asyncio
async def test_execute_code_with_syntax_error(client: AsyncClient):
    payload = {
        "source_code": "def invalid_syntax(\n",
        "language": "python",
        "stdin": "",
    }
    resp = await client.post("/api/code/execute", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ERROR"
    assert "SyntaxError" in data["stderr"]
