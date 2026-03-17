"""Add app_volume_audit_logs table

Revision ID: 008
Revises: 007
Create Date: 2026-03-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_volume_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.String(256), nullable=True),
        sa.Column("user_email", sa.String(256), nullable=True),
        sa.Column("username", sa.String(256), nullable=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("module", sa.String(64), nullable=False),
        sa.Column("volume_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("volume_name", sa.String(256), nullable=True),
        sa.Column("source_path", sa.String(2048), nullable=True),
        sa.Column("target_path", sa.String(2048), nullable=True),
        sa.Column("destination_path", sa.String(2048), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(128), nullable=True),
        sa.Column("user_agent", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_volume_audit_logs_volume_id", "app_volume_audit_logs", ["volume_id"], unique=False)
    op.create_index("ix_volume_audit_logs_user_id", "app_volume_audit_logs", ["user_id"], unique=False)
    op.create_index("ix_volume_audit_logs_action", "app_volume_audit_logs", ["action"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_volume_audit_logs_action", table_name="app_volume_audit_logs")
    op.drop_index("ix_volume_audit_logs_user_id", table_name="app_volume_audit_logs")
    op.drop_index("ix_volume_audit_logs_volume_id", table_name="app_volume_audit_logs")
    op.drop_table("app_volume_audit_logs")
