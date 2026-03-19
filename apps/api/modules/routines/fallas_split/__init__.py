"""Transformación fallas.dat → archivos por Fault Name (migración legacy bash/awk)."""

from modules.routines.fallas_split.service import (
    FallasSplitService,
    execute_fallas_split_on_volume,
)

__all__ = ["FallasSplitService", "execute_fallas_split_on_volume"]
