"""Comparación con archivos golden / reportes de diferencias."""
from __future__ import annotations


def compare_to_golden(
    produced: dict[str, str],
    golden: dict[str, str],
) -> dict:
    """
    Compara contenidos producidos vs esperados.
    Retorna dict con ok, missingFiles, extraFiles, mismatches (por archivo).
    """
    missing = [k for k in golden if k not in produced]
    extra = [k for k in produced if k not in golden]
    mismatches: list[dict] = []

    for name in sorted(set(produced) & set(golden)):
        a, b = produced[name], golden[name]
        if a == b:
            continue
        a_lines = a.splitlines()
        b_lines = b.splitlines()
        diff_summary: dict = {
            "file": name,
            "lineCountProduced": len(a_lines),
            "lineCountExpected": len(b_lines),
        }
        if len(a_lines) == len(b_lines):
            for i, (la, lb) in enumerate(zip(a_lines, b_lines)):
                if la != lb:
                    diff_summary["firstDiffLine"] = i + 1
                    diff_summary["producedSample"] = la[:200]
                    diff_summary["expectedSample"] = lb[:200]
                    break
        mismatches.append(diff_summary)

    return {
        "ok": not missing and not extra and not mismatches,
        "missingFiles": missing,
        "extraFiles": extra,
        "mismatches": mismatches,
    }


def summarize_row_counts(grouped: dict) -> dict[str, int]:
    """Nombre falla -> número de filas."""
    return {name: len(gdf) for name, gdf in grouped.items()}
