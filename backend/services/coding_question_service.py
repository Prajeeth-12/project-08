from typing import Any, Dict, List


# Temporary dummy database.
# This will later be replaced with the real database.
DUMMY_CODING_QUESTIONS: Dict[str, Dict[str, Any]] = {
    "Q001": {
        "question_id": "Q001",
        "title": "Sum of Two Numbers",
        "description": "Given two integers, print their sum.",
        "topic": "Basic Programming",
        "ctc_band": "5-8 LPA",
        "difficulty": "easy",
        "constraints": "1 <= a, b <= 10^9",
        "sample_test_cases": [
            {
                "input": "5 10",
                "expected_output": "15"
            },
            {
                "input": "20 30",
                "expected_output": "50"
            }
        ],
        "hidden_test_cases": [
            {
                "input": "100 200",
                "expected_output": "300"
            },
            {
                "input": "0 50",
                "expected_output": "50"
            },
            {
                "input": "999 1",
                "expected_output": "1000"
            }
        ]
    },

    "Q002": {
        "question_id": "Q002",
        "title": "Find Maximum",
        "description": "Given three integers, print the largest integer.",
        "topic": "Basic Programming",
        "ctc_band": "5-8 LPA",
        "difficulty": "easy",
        "constraints": "-10^9 <= a, b, c <= 10^9",
        "sample_test_cases": [
            {
                "input": "10 20 15",
                "expected_output": "20"
            },
            {
                "input": "50 30 40",
                "expected_output": "50"
            }
        ],
        "hidden_test_cases": [
            {
                "input": "1 2 3",
                "expected_output": "3"
            },
            {
                "input": "-10 -5 -20",
                "expected_output": "-5"
            },
            {
                "input": "100 100 50",
                "expected_output": "100"
            }
        ]
    }
}


def get_question(question_id: str) -> Dict[str, Any] | None:
    """
    Get a coding question using its question_id.
    """
    return DUMMY_CODING_QUESTIONS.get(question_id)


def get_sample_test_cases(question_id: str) -> List[Dict[str, str]]:
    """
    Get sample test cases for a question.
    """
    question = get_question(question_id)

    if question is None:
        return []

    return question["sample_test_cases"]


def get_hidden_test_cases(question_id: str) -> List[Dict[str, str]]:
    """
    Get hidden test cases for a question.

    This function is used by the Submit flow.
    Hidden test cases must never be returned to A1.
    """
    question = get_question(question_id)

    if question is None:
        return []

    return question["hidden_test_cases"]