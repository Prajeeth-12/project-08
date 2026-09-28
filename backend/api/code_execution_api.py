
import os
import time
import base64

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.coding_question_service import get_hidden_test_cases


router = APIRouter()


LANGUAGE_IDS = {
    "python": 71,
    "javascript": 63,
    "java": 62,
    "cpp": 54,
    "c": 50,
}

POLL_INTERVAL_SECONDS = 0.5
MAX_POLLS = 40

STATUS_IN_QUEUE = 1
STATUS_PROCESSING = 2
STATUS_ACCEPTED = 3
STATUS_TIME_LIMIT_EXCEEDED = 5
STATUS_COMPILATION_ERROR = 6

RUNTIME_ERROR_STATUSES = {7, 8, 9, 10, 11, 12}


class SubmitRequest(BaseModel):
    question_id: str
    language: str
    source_code: str


class RunRequest(BaseModel):
    question_id: str
    language: str
    source_code: str
    test_cases: list[dict[str, str]]


def _normalize_output(output: str | None) -> str:
    if output is None:
        return ""

    text = output.replace("\r\n", "\n").replace("\r", "\n")

    return "\n".join(
        line.rstrip() for line in text.split("\n")
    ).strip()


def _decode_base64(value: str | None) -> str:
    if not value:
        return ""

    try:
        return base64.b64decode(value).decode(
            "utf-8",
            errors="replace",
        )
    except (ValueError, TypeError):
        return value


def _get_judge0_config():
    judge0_url = os.getenv("JUDGE0_URL", "").rstrip("/")
    auth_header = os.getenv(
        "JUDGE0_AUTH_HEADER",
        "X-Auth-Token",
    )
    auth_token = os.getenv("JUDGE0_AUTH_TOKEN", "")

    if not judge0_url:
        raise HTTPException(
            status_code=500,
            detail="JUDGE0_URL is not configured",
        )

    if not auth_token:
        raise HTTPException(
            status_code=500,
            detail="JUDGE0_AUTH_TOKEN is not configured",
        )

    return judge0_url, {
        auth_header: auth_token,
    }


def _execute_test_case(
    source_code: str,
    language: str,
    test_case: dict,
) -> dict:
    judge0_url, headers = _get_judge0_config()

    language_id = LANGUAGE_IDS[language]

    submission = {
        "source_code": base64.b64encode(
            source_code.encode("utf-8")
        ).decode("utf-8"),
        "language_id": language_id,
        "stdin": base64.b64encode(
            str(test_case["input"]).encode("utf-8")
        ).decode("utf-8"),
    }

    # 1. Create Judge0 submission
    try:
        response = httpx.post(
            f"{judge0_url}/submissions",
            headers=headers,
            params={
                "base64_encoded": "true",
                "wait": "false",
            },
            json=submission,
            timeout=10,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to Judge0",
        )

    if response.status_code != 201:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Judge0 submission failed: "
                f"{response.status_code} - {response.text}"
            ),
        )

    try:
        token = response.json().get("token")
    except ValueError:
        token = None

    if not token:
        raise HTTPException(
            status_code=502,
            detail="Judge0 did not return a submission token",
        )

    # 2. Poll Judge0 until execution finishes
    for _ in range(MAX_POLLS):
        time.sleep(POLL_INTERVAL_SECONDS)

        try:
            result_response = httpx.get(
                f"{judge0_url}/submissions/{token}",
                headers=headers,
                params={"base64_encoded": "true"},
                timeout=10,
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=502,
                detail="Failed to get Judge0 result",
            )

        if result_response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Judge0 result request failed: "
                    f"{result_response.status_code} - "
                    f"{result_response.text}"
                ),
            )

        try:
            result = result_response.json()
        except ValueError:
            raise HTTPException(
                status_code=502,
                detail="Judge0 returned an invalid result",
            )

        status = result.get("status") or {}
        status_id = status.get("id")

        if status_id in (
            STATUS_IN_QUEUE,
            STATUS_PROCESSING,
        ):
            continue

        if status_id == STATUS_COMPILATION_ERROR:
            return {
                "status": "compilation_error",
                "compiler_output": _decode_base64(
                    result.get("compile_output")
                ),
            }

        if status_id == STATUS_TIME_LIMIT_EXCEEDED:
            return {
                "status": "time_limit_exceeded",
            }

        if status_id in RUNTIME_ERROR_STATUSES:
            return {
                "status": "runtime_error",
                "error": _decode_base64(
                    result.get("stderr")
                ),
            }

        if status_id == STATUS_ACCEPTED:
            actual_output = _decode_base64(
                result.get("stdout")
            )
            expected_output = str(
                test_case["expected_output"]
            )

            if (
                _normalize_output(actual_output)
                == _normalize_output(expected_output)
            ):
                return {
                    "status": "passed",
                    "actual_output": actual_output,
                }

            return {
                "status": "wrong_answer",
                "actual_output": actual_output,
            }

        return {
            "status": "runtime_error",
            "error": (
                _decode_base64(result.get("message"))
                or status.get("description")
                or "Unknown Judge0 error"
            ),
        }

    raise HTTPException(
        status_code=504,
        detail="Code execution timed out",
    )


@router.post("/submit")
def submit_code(request: SubmitRequest):
    if not request.source_code.strip():
        raise HTTPException(
            status_code=400,
            detail="Source code cannot be empty",
        )

    language = request.language.lower()

    if language not in LANGUAGE_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {request.language}",
        )

    hidden_test_cases = get_hidden_test_cases(
        request.question_id
    )

    if not hidden_test_cases:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No hidden test cases found "
                f"for question_id: {request.question_id}"
            ),
        )

    total = len(hidden_test_cases)
    results = []
    passed_test_cases = 0

    for index, test_case in enumerate(
        hidden_test_cases,
        start=1,
    ):
        execution_result = _execute_test_case(
            source_code=request.source_code,
            language=language,
            test_case=test_case,
        )

        test_status = execution_result["status"]

        if test_status == "compilation_error":
            return {
                "status": "compilation_error",
                "passed": False,
                "total_test_cases": total,
                "passed_test_cases": 0,
                "error": "Compilation failed",
                "compiler_output": execution_result.get(
                    "compiler_output",
                    "",
                ),
            }

        if test_status == "time_limit_exceeded":
            results.append({
                "test_case": index,
                "status": "time_limit_exceeded",
            })

            return {
                "status": "time_limit_exceeded",
                "passed": False,
                "total_test_cases": total,
                "passed_test_cases": passed_test_cases,
                "results": results,
            }

        if test_status == "runtime_error":
            results.append({
                "test_case": index,
                "status": "runtime_error",
            })

            return {
                "status": "runtime_error",
                "passed": False,
                "total_test_cases": total,
                "passed_test_cases": passed_test_cases,
                "error": "Runtime error",
                "results": results,
            }

        if test_status == "passed":
            passed_test_cases += 1
            results.append({
                "test_case": index,
                "status": "passed",
            })
            continue

        results.append({
            "test_case": index,
            "status": "wrong_answer",
        })

    all_passed = passed_test_cases == total

    return {
        "status": "accepted" if all_passed else "wrong_answer",
        "passed": all_passed,
        "total_test_cases": total,
        "passed_test_cases": passed_test_cases,
        "results": results,
    }


@router.post("/run")
def run_code(request: RunRequest):
    if not request.source_code.strip():
        raise HTTPException(
            status_code=400,
            detail="Source code cannot be empty",
        )

    language = request.language.lower()

    if language not in LANGUAGE_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {request.language}",
        )

    if not request.test_cases:
        raise HTTPException(
            status_code=400,
            detail="At least one test case is required",
        )

    results = []
    passed_test_cases = 0

    for index, test_case in enumerate(
        request.test_cases,
        start=1,
    ):
        if "input" not in test_case:
            raise HTTPException(
                status_code=400,
                detail=f"Test case {index} is missing 'input'",
            )

        if "expected_output" not in test_case:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Test case {index} "
                    "is missing 'expected_output'"
                ),
            )

        execution_result = _execute_test_case(
            source_code=request.source_code,
            language=language,
            test_case=test_case,
        )

        test_status = execution_result["status"]

        if test_status == "compilation_error":
            return {
                "status": "compilation_error",
                "passed": False,
                "total_test_cases": len(request.test_cases),
                "passed_test_cases": passed_test_cases,
                "error": "Compilation failed",
                "compiler_output": execution_result.get(
                    "compiler_output",
                    "",
                ),
                "results": results,
            }

        if test_status == "time_limit_exceeded":
            results.append({
                "test_case": index,
                "status": "time_limit_exceeded",
            })

            return {
                "status": "time_limit_exceeded",
                "passed": False,
                "total_test_cases": len(request.test_cases),
                "passed_test_cases": passed_test_cases,
                "results": results,
            }

        if test_status == "runtime_error":
            results.append({
                "test_case": index,
                "status": "runtime_error",
            })

            return {
                "status": "runtime_error",
                "passed": False,
                "total_test_cases": len(request.test_cases),
                "passed_test_cases": passed_test_cases,
                "error": "Runtime error",
                "results": results,
            }

        if test_status == "passed":
            passed_test_cases += 1

            results.append({
                "test_case": index,
                "status": "passed",
                "actual_output": execution_result.get(
                    "actual_output",
                    "",
                ),
            })

        else:
            results.append({
                "test_case": index,
                "status": "wrong_answer",
                "actual_output": execution_result.get(
                    "actual_output",
                    "",
                ),
            })

    all_passed = (
        passed_test_cases == len(request.test_cases)
    )

    return {
        "status": "completed",
        "passed": all_passed,
        "total_test_cases": len(request.test_cases),
        "passed_test_cases": passed_test_cases,
        "results": results,
    }


def create_code_execution_api(app):
    app.include_router(
        router,
        prefix="/api/code",
        tags=["Code Execution"],
    )