"""CLI local: python -m modules.routines.fallas_split <fallas.dat> [--fault NAME]"""
from __future__ import annotations

import argparse
from pathlib import Path

from modules.routines.fallas_split.reader import filter_by_fault_name, load_fallas_dataframe
from modules.routines.fallas_split.transform import group_rows_by_fault
from modules.routines.fallas_split.writer import build_outputs


def main() -> None:
    p = argparse.ArgumentParser(description="Split fallas.dat by Fault Name (stdout preview).")
    p.add_argument("input", type=Path, help="Path to fallas.dat")
    p.add_argument("--fault", default="", help="Only this Fault Name")
    p.add_argument("--out-dir", type=Path, help="Write .dat files here")
    args = p.parse_args()
    raw = args.input.read_bytes()
    df = load_fallas_dataframe(raw)
    df = filter_by_fault_name(df, args.fault)
    grouped = group_rows_by_fault(df)
    outputs = build_outputs(grouped)
    if args.out_dir:
        args.out_dir.mkdir(parents=True, exist_ok=True)
        for name, content in outputs.items():
            (args.out_dir / name).write_text(content, encoding="utf-8")
        print(f"Wrote {len(outputs)} file(s) to {args.out_dir}")
    else:
        for name, content in outputs.items():
            print(f"=== {name} ===")
            print(content, end="")


if __name__ == "__main__":
    main()
