import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_query_questions(client: AsyncClient):
    # 1. Create Question
    q_payload = {
        "title": "Two Sum Problem",
        "slug": "two-sum-problem",
        "difficulty": "EASY",
        "category": "Arrays",
        "description": "Find indices of two numbers that add up to target.",
        "starter_code": "def twoSum(nums, target):\n    pass\n",
        "test_cases": [{"input": "[2,7,11,15], 9", "expected_output": "[0,1]"}],
    }
    resp = await client.post("/api/questions", json=q_payload)
    assert resp.status_code == 200
    q_data = resp.json()
    assert q_data["title"] == "Two Sum Problem"

    # 2. List Questions by difficulty filter
    list_resp = await client.get("/api/questions?difficulty=EASY")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 3. Create Blueprint
    bp_payload = {
        "title": "Full-Stack SDE Assessment",
        "target_role": "Backend Engineer",
        "company_style": "Amazon",
    }
    bp_resp = await client.post("/api/questions/blueprint", json=bp_payload)
    assert bp_resp.status_code == 200
    assert bp_resp.json()["target_role"] == "Backend Engineer"
