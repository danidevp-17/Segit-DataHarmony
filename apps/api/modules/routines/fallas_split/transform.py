"""Agrupación por Fault Name manteniendo orden de aparición."""
from __future__ import annotations

import pandas as pd

from modules.routines.fallas_split.reader import COLS


def group_rows_by_fault(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """
    Agrupa por Fault Name; dentro de cada grupo el orden es el del CSV original.
    """
    fault_col = COLS["fault"]
    groups: dict[str, pd.DataFrame] = {}
    seen_order: list[str] = []

    for fault_name, g in df.groupby(fault_col, sort=False):
        fn = str(fault_name).strip()
        if not fn:
            continue
        if fn not in groups:
            seen_order.append(fn)
        groups[fn] = g.reset_index(drop=True)

    if not groups:
        raise ValueError("No fault groups after processing (empty Fault Name?)")

    return {k: groups[k] for k in seen_order}
