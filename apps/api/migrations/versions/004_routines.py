"""Add routines table

Revision ID: 004
Revises: 003
Create Date: 2025-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "routines",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("script", sa.String(512), nullable=False),
        sa.Column("params", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("file_inputs", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("needs_datasource", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("module", sa.String(64), nullable=False, server_default="geology_geophysics"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_routines_slug", "routines", ["slug"], unique=True)
    op.create_index("ix_routines_module", "routines", ["module"])


def downgrade() -> None:
    op.drop_table("routines")
