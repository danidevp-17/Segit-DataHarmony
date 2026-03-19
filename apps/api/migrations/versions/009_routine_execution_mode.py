"""Add execution_mode to routines

Revision ID: 009
Revises: 008
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "routines",
        sa.Column(
            "execution_mode",
            sa.String(64),
            nullable=False,
            server_default="subprocess",
        ),
    )


def downgrade() -> None:
    op.drop_column("routines", "execution_mode")
