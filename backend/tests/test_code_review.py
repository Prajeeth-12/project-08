import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_code_review_constant_complexity(client: AsyncClient):
    # Pure arithmetic without loops -> O(1)
    source_code = """
def add_two(a, b):
    return a + b
"""
    resp = await client.post("/api/ai/code-review", json={"code": source_code})
    assert resp.status_code == 200
    data = resp.json()
    assert data["time_complexity"] == "O(1)"
    assert data["max_loop_depth"] == 0
    assert data["space_complexity"] == "O(1)"

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

@pytest.mark.asyncio
async def test_code_review_recursion_and_smells(client: AsyncClient):
    # Recursive function with bare except
    source_code = """
def factorial(n):
    try:
        if n <= 1:
            return 1
        return n * factorial(n - 1)
    except:
        return 0
"""
    resp = await client.post("/api/ai/code-review", json={"code": source_code})
    assert resp.status_code == 200
    data = resp.json()
    assert "Recursion Stack" in data["space_complexity"] or any("recursion" in s.lower() for s in data["code_smells"])
    assert any("bare 'except:'" in s.lower() for s in data["code_smells"])

@pytest.mark.asyncio
async def test_code_review_syntax_error_handling(client: AsyncClient):
    # Invalid syntax
    source_code = """
def broken_syntax(
    print("missing closing paren"
"""
    resp = await client.post("/api/ai/code-review", json={"code": source_code})
    assert resp.status_code == 200
    data = resp.json()
    assert data["time_complexity"] == "N/A"
    assert any("syntax error" in s.lower() for s in data["code_smells"])

@pytest.mark.asyncio
async def test_evaluate_submission_accepted(client: AsyncClient):
    # Working solution meeting hidden test cases
    solution_code = """
import sys

def solve():
    raw = sys.stdin.read().strip()
    if raw:
        nums = [int(x) for x in raw.split()]
        print(sum(nums))

solve()
"""
    payload = {
        "source_code": solution_code,
        "candidate_id": "cand-001",
        "problem_id": "prob-sum-101",
        "hidden_test_cases": [
            {"input": "1 2 3", "expected_output": "6"},
            {"input": "10 20 30", "expected_output": "60"},
            {"input": "5 -5", "expected_output": "0"},
        ]
    }
    resp = await client.post("/api/ai/code-review/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "ACCEPTED"
    assert data["score_percentage"] == 100.0
    assert data["test_cases_passed"] == 3
    assert data["total_test_cases"] == 3
    assert data["time_complexity"] == "O(1)" or data["time_complexity"] == "O(N)"
    assert data["submission_id"] is not None

@pytest.mark.asyncio
async def test_evaluate_submission_wrong_answer(client: AsyncClient):
    # Solution producing wrong output on second test case
    solution_code = """
import sys
line = sys.stdin.read().strip()
if line == "ping":
    print("pong")
else:
    print("wrong")
"""
    payload = {
        "source_code": solution_code,
        "candidate_id": "cand-002",
        "problem_id": "prob-ping-102",
        "hidden_test_cases": [
            {"input": "ping", "expected_output": "pong"},
            {"input": "hello", "expected_output": "world"},
        ]
    }
    resp = await client.post("/api/ai/code-review/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "WRONG_ANSWER"
    assert data["score_percentage"] == 50.0
    assert data["test_cases_passed"] == 1
    assert data["total_test_cases"] == 2

@pytest.mark.asyncio
async def test_evaluate_submission_compilation_error(client: AsyncClient):
    # Syntax error in submission
    solution_code = "def foo(: print('syntax err')"
    payload = {
        "source_code": solution_code,
        "candidate_id": "cand-003",
        "problem_id": "prob-err-103",
        "hidden_test_cases": [
            {"input": "test", "expected_output": "test"},
        ]
    }
    resp = await client.post("/api/ai/code-review/evaluate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "COMPILATION_ERROR"
    assert data["score_percentage"] == 0.0
    assert data["test_cases_passed"] == 0
    assert any("syntax error" in s.lower() for s in data["code_smells"])

