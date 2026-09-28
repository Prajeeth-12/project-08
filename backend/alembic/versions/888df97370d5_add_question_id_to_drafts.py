"""add question id to drafts

Revision ID: 888df97370d5
Revises: 141ec7daddc3
Create Date: 2026-09-24 09:48:33.430653

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '888df97370d5'
down_revision: Union[str, Sequence[str], None] = '141ec7daddc3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table("drafts", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "question_id",
                sa.String(length=100),
                nullable=False,
            )
        )

        batch_op.create_unique_constraint(
            "uq_draft_user_session_question_language",
            [
                "user_id",
                "session_id",
                "question_id",
                "language",
            ],
        )


def downgrade() -> None:
    with op.batch_alter_table("drafts", schema=None) as batch_op:
        batch_op.drop_constraint(
            "uq_draft_user_session_question_language",
            type_="unique",
        )

        batch_op.drop_column("question_id")