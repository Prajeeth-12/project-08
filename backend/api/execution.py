from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(
    prefix="/execution",
    tags=["execution"],
)


class ExecutionTestCase(BaseModel):
    input: str
    expected_output: str


class RunRequest(BaseModel):
    question_id: str
    language: str
    source_code: str
    test_cases: list[ExecutionTestCase]


class SubmitRequest(BaseModel):
    question_id: str
    language: str
    source_code: str


@router.post("/run")
async def run_code(request: RunRequest):
    return {
        "status": "completed",
        "passed": False,
        "total_test_cases": len(request.test_cases),
        "passed_test_cases": 0,
        "results": [],
        "error": "Execution engine not implemented yet.",
    }


@router.post("/submit")
async def submit_code(request: SubmitRequest):
    return {
        "status": "completed",
        "passed": False,
        "total_test_cases": 0,
        "passed_test_cases": 0,
        "results": [],
        "error": "Submission engine not implemented yet.",
    }