import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_code_review_linear_complexity(client: AsyncClient):
    # Single loop -> O(N)
    source_code = """
def find_max(nums):
    m = nums[0]
    for x in nums:
        if x > m:
            m = x
    return m
"""
    resp = await client.post("/api/ai/code-review", json={"code": source_code})
    assert resp.status_code == 200
    data = resp.json()
    assert data["time_complexity"] == "O(N)"
    assert data["max_loop_depth"] == 1
    assert data["cyclomatic_complexity"] >= 2

@pytest.mark.asyncio
async def test_code_review_nested_quadratic(client: AsyncClient):
    # Nested loop -> O(N^2)
    source_code = """
def two_sum_naive(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []
"""
    resp = await client.post("/api/ai/code-review", json={"code": source_code})
    assert resp.status_code == 200
    data = resp.json()
    assert data["time_complexity"] == "O(N^2)"
    assert data["max_loop_depth"] == 2
    assert any("nested loop" in s.lower() for s in data["code_smells"])
