from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_question_bank_db

router = APIRouter(
    prefix="/api/questions",
    tags=["Questions"],
)


@router.get("")
async def get_questions(
    db: AsyncSession = Depends(get_question_bank_db),
):
    try:
        result = await db.execute(
            text("""
                SELECT
                    id,
                    title,
                    topic,
                    description,
                    difficulty_level,
                    lpa_level,
                    examples,
                    constraints
                FROM public.interview_questions
                ORDER BY id
            """)
        )

        rows = result.mappings().all()

        questions = []

        for row in rows:
            questions.append({
                "question_id": str(row["id"]),
                "title": row["title"],
                "description": row["description"],
                "topic": row["topic"],
                "ctc_band": row["lpa_level"],
                "difficulty": row["difficulty_level"],
                "constraints": row["constraints"],
                "examples": row["examples"],
                "sample_test_cases": [],
            })

        return questions

    except Exception as exc:
        print("Question bank error:", str(exc))

        raise HTTPException(
            status_code=500,
            detail="Unable to fetch questions",
        )