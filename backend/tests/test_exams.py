import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_formal_exam_infraction_and_disqualification(client: AsyncClient):
    # 1. Create Exam
    exam_payload = {
        "title": "Semester 7 Campus Placement Exam",
        "description": "Standardized DSA & System Code Assessment",
        "duration_minutes": 60,
        "seb_required": True,
        "max_infractions": 3,
    }
    exam_resp = await client.post("/api/exams/create", json=exam_payload)
    assert exam_resp.status_code == 200
    exam_id = exam_resp.json()["id"]

    # 2. Start Attempt
    start_resp = await client.post(f"/api/exams/{exam_id}/start", json={"candidate_id": "student-101"})
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "IN_PROGRESS"

    # 3. Log 2 infractions (window blur)
    inf1 = await client.post(f"/api/exams/{exam_id}/infraction", json={"candidate_id": "student-101", "reason": "WINDOW_BLUR"})
    assert inf1.json()["infraction_count"] == 1
    assert inf1.json()["status"] == "IN_PROGRESS"

    inf2 = await client.post(f"/api/exams/{exam_id}/infraction", json={"candidate_id": "student-101", "reason": "TAB_SWITCH"})
    assert inf2.json()["infraction_count"] == 2
    assert inf2.json()["status"] == "IN_PROGRESS"

    # 4. Third strike -> Automatic DISQUALIFICATION
    inf3 = await client.post(f"/api/exams/{exam_id}/infraction", json={"candidate_id": "student-101", "reason": "FULLSCREEN_EXIT"})
    assert inf3.json()["infraction_count"] == 3
    assert inf3.json()["status"] == "DISQUALIFIED"
