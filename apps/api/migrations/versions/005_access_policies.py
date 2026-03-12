"""Add access_policy_routine and access_policy_module

Revision ID: 005
Revises: 004
Create Date: 2025-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "access_policy_routine",
        sa.Column("routine_slug", sa.String(128), nullable=False),
        sa.Column("datasource_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["datasource_id"],
            ["data_sources.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("routine_slug", "datasource_id"),
    )
    op.create_table(
        "access_policy_module",
        sa.Column("module_id", sa.String(64), nullable=False),
        sa.Column("datasource_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["datasource_id"],
            ["data_sources.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("module_id", "datasource_id"),
    )


def downgrade() -> None:
    op.drop_table("access_policy_module")
    op.drop_table("access_policy_routine")
