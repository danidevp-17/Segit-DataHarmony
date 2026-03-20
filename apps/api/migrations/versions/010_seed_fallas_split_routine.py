"""Seed routine fallas-split en BD (sin catalog.json)

Revision ID: 010
Revises: 009
"""
from typing import Sequence, Union

from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DESC = (
    "Reads fallas.dat on a registered volume, splits by Fault Name into "
    "<Fault Name>.dat (legacy awk-compatible format)."
)


def upgrade() -> None:
    op.execute(
        f"""
        INSERT INTO routines (
            id, slug, name, description, script, params, file_inputs,
            needs_datasource, module, execution_mode, created_at, updated_at
        )
        SELECT gen_random_uuid(),
               'faults-to-petrel',
               'Faults to Petrel',
               '{_DESC.replace("'", "''")}',
               'internal://fallas_volume_split',
               '[]'::jsonb,
               '[]'::jsonb,
               false,
               'geology_geophysics',
               'fallas_volume_split',
               now(),
               now()
        WHERE NOT EXISTS (SELECT 1 FROM routines WHERE slug = 'fallas-split');
        """
    )
    op.execute(
        """
        UPDATE routines
        SET execution_mode = 'fallas_volume_split',
            script = 'internal://fallas_volume_split'
        WHERE slug = 'fallas-split'
          AND execution_mode IS DISTINCT FROM 'fallas_volume_split';
        """
    )


def downgrade() -> None:
    # No eliminamos la fila: puede tener historial de jobs.
    op.execute(
        """
        UPDATE routines
        SET execution_mode = 'subprocess'
        WHERE slug = 'fallas-split' AND script = 'internal://fallas_volume_split';
        """
    )
