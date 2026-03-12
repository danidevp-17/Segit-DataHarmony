"""Add data_sources table

Revision ID: 002
Revises: 001
Create Date: 2025-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "data_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("host", sa.String(256), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("database", sa.String(256), nullable=True),
        sa.Column("service_name", sa.String(256), nullable=True),
        sa.Column("username", sa.String(256), nullable=False),
        sa.Column("password_encrypted", sa.Text(), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_sources_type"), "data_sources", ["type"], unique=False)


def downgrade() -> None:
    op.drop_table("data_sources")
