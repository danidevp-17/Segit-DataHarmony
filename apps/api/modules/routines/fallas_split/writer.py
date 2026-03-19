"""Escritura .dat con el mismo layout que awk arreglo.dat."""
from __future__ import annotations

import re
from typing import TYPE_CHECKING

import pandas as pd

from modules.routines.fallas_split.reader import COLS

if TYPE_CHECKING:
    pass

# Coincide con split legacy: awk '{printf "%7s %11d %10d %15.5f %15.5f %15.5f %20s %-12d\n",...}'
INLINE_TAG = "INLINE-"
INLINE_SENTINEL_HI = 2147483647
INLINE_SENTINEL_LO = 2147483647

_INVALID_FILENAME = re.compile(r'[\\/:*?"<>|]')


def validate_fault_filename(fault_name: str) -> None:
    if _INVALID_FILENAME.search(fault_name):
        raise ValueError(
            f"Fault Name contains invalid path characters: {fault_name!r} "
            r"(\ / : * ? "" < > |)"
        )


def _to_float(v: object) -> float:
    s = str(v).strip().replace(",", ".")
    return float(s)


def _to_int_seq(v: object) -> int:
    s = str(v).strip()
    if not s:
        return 0
    return int(float(s))


def format_arreglo_line(
    x: object,
    y: object,
    z: object,
    fault_name: str,
    sequence: object,
) -> str:
    """
    Una línea como en arreglo.dat tras el awk:
    printf "%7s %11d %10d %15.5f %15.5f %15.5f %20s %-12d\\n", ...
    """
    fx, fy, fz = _to_float(x), _to_float(y), _to_float(z)
    fn = str(fault_name).strip()
    seq = _to_int_seq(sequence)
    return (
        f"{INLINE_TAG:>7s} {INLINE_SENTINEL_HI:11d} {INLINE_SENTINEL_LO:10d} "
        f"{fx:15.5f} {fy:15.5f} {fz:15.5f} {fn:>20s} {seq:<12d}"
    )


def format_output_lines(group_df: pd.DataFrame) -> str:
    """Genera contenido .dat para un grupo (mismo formato que salida awk)."""
    xc, yc, zc, fc, sc = COLS["x"], COLS["y"], COLS["z"], COLS["fault"], COLS["seq"]
    lines: list[str] = []
    for _, row in group_df.iterrows():
        line = format_arreglo_line(
            row[xc], row[yc], row[zc], str(row[fc]), row[sc]
        )
        lines.append(line)
    return "\n".join(lines) + ("\n" if lines else "")


def build_outputs(grouped: dict[str, pd.DataFrame]) -> dict[str, str]:
    """fault_name -> file content (UTF-8)."""
    out: dict[str, str] = {}
    for fault_name, gdf in grouped.items():
        validate_fault_filename(fault_name)
        filename = f"{fault_name}_convert.dat"
        out[filename] = format_output_lines(gdf)
    return out
