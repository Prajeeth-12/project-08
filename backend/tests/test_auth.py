import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient):
    # 1. Register candidate
    reg_payload = {
        "email": "candidate@example.com",
        "password": "SecurePassword123!",
        "full_name": "Test Candidate",
        "role": "CANDIDATE",
        "department": "Computer Science",
    }
    reg_resp = await client.post("/api/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "access_token" in data
    assert data["role"] == "CANDIDATE"

    # 2. Login with valid credentials
    login_payload = {
        "email": "candidate@example.com",
        "password": "SecurePassword123!",
    }
    login_resp = await client.post("/api/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    token = login_data["access_token"]
    assert token

    # 3. Test /me profile endpoint
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "candidate@example.com"
    assert me_data["role"] == "CANDIDATE"

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    login_payload = {
        "email": "nonexistent@example.com",
        "password": "WrongPassword",
    }
    resp = await client.post("/api/auth/login", json=login_payload)
    assert resp.status_code == 401
