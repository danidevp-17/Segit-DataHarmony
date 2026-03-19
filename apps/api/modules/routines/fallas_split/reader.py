"""Lectura y parsing de fallas.dat (CSV)."""
from io import BytesIO

import pandas as pd

from modules.routines.fallas_split.errors import FallasSplitCsvError

# Columnas esperadas (legacy)
COLS = {
    "x": "X",
    "y": "Y",
    "z": "Z",
    "fault": "Fault Name",
    "seq": "Sequence Number",
}


def load_fallas_dataframe(raw: bytes) -> pd.DataFrame:
    """
    Carga CSV con comillas; todas las columnas como string para preservar formato.
    Elimina comillas dobles de valores (equivalente a gsub(/"/, "", ...) en awk).
    """
    try:
        df = pd.read_csv(
            BytesIO(raw),
            dtype=str,
            keep_default_na=False,
            encoding="utf-8-sig",
        )
    except Exception as e:
        raise FallasSplitCsvError(f"Cannot parse CSV: {e}") from e

    df.columns = [c.strip() for c in df.columns]
    required = list(COLS.values())
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise FallasSplitCsvError(f"Missing columns: {missing}. Found: {list(df.columns)}")

    for c in df.columns:
        df[c] = df[c].astype(str).str.replace('"', "", regex=False).str.strip()

    return df


def filter_by_fault_name(df: pd.DataFrame, fault_filter: str | None) -> pd.DataFrame:
    """Si fault_filter no vacío, solo filas con Fault Name exacto."""
    ft = (fault_filter or "").strip()
    if not ft:
        return df
    col = COLS["fault"]
    out = df[df[col] == ft]
    if out.empty:
        raise FallasSplitCsvError(f"No rows match fault name filter: {ft!r}")
    return out.copy()
