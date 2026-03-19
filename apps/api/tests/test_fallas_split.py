"""Tests unitarios fallas_split (sin volumen remoto)."""
from pathlib import Path

import pandas as pd
import pytest

from modules.routines.fallas_split.reader import filter_by_fault_name, load_fallas_dataframe
from modules.routines.fallas_split.transform import group_rows_by_fault
from modules.routines.fallas_split.validation import compare_to_golden
from modules.routines.fallas_split.writer import (
    build_outputs,
    format_arreglo_line,
    format_output_lines,
    validate_fault_filename,
)


def test_load_and_strip_quotes():
    raw = b'"X","Y","Z","Fault Name","Sequence Number"\n1.0,2.0,3.0,"F-A",10\n'
    df = load_fallas_dataframe(raw)
    assert len(df) == 1
    assert df["Fault Name"].iloc[0] == "F-A"


def test_group_multiple_faults_order():
    csv = (
        "X,Y,Z,Fault Name,Sequence Number\n"
        "1,1,1,A,1\n"
        "2,2,2,B,1\n"
        "3,3,3,A,2\n"
    )
    df = load_fallas_dataframe(csv.encode())
    g = group_rows_by_fault(df)
    assert list(g.keys()) == ["A", "B"]
    assert len(g["A"]) == 2
    assert list(g["A"]["Sequence Number"]) == ["1", "2"]


def test_single_fault():
    csv = "X,Y,Z,Fault Name,Sequence Number\n9,8,7,Only,99\n"
    df = load_fallas_dataframe(csv.encode())
    g = group_rows_by_fault(df)
    assert len(g) == 1
    out = build_outputs(g)
    assert "Only.dat" in out
    assert "INLINE-  2147483647 2147483647" in out["Only.dat"]


def test_fault_filter():
    csv = (
        "X,Y,Z,Fault Name,Sequence Number\n"
        "1,1,1,Keep,1\n"
        "2,2,2,Drop,1\n"
    )
    df = load_fallas_dataframe(csv.encode())
    df2 = filter_by_fault_name(df, "Keep")
    g = group_rows_by_fault(df2)
    assert len(g) == 1


def test_filter_missing_fault_raises():
    from modules.routines.fallas_split.errors import FallasSplitCsvError

    csv = "X,Y,Z,Fault Name,Sequence Number\n1,1,1,X,1\n"
    df = load_fallas_dataframe(csv.encode())
    with pytest.raises(FallasSplitCsvError):
        filter_by_fault_name(df, "Nope")


def test_invalid_fault_filename():
    with pytest.raises(ValueError):
        validate_fault_filename("bad/name")


def test_golden_compare_ok():
    produced = {"A.dat": "x\n", "B.dat": "y\n"}
    golden = {"A.dat": "x\n", "B.dat": "y\n"}
    r = compare_to_golden(produced, golden)
    assert r["ok"] is True


def test_golden_mismatch():
    produced = {"A.dat": "line1\n"}
    golden = {"A.dat": "line2\n"}
    r = compare_to_golden(produced, golden)
    assert r["ok"] is False
    assert r["mismatches"]


def test_format_line_matches_awk_arreglo():
    """Mismo layout que awk printf %%7s %%11d %%10d %%15.5f x3 %%20s %%-12d."""
    line = format_arreglo_line(1, 2, 3, "F1", 0)
    assert line == (
        "INLINE-  2147483647 2147483647         1.00000         2.00000         3.00000"
        "                   F1 0           "
    )


def test_format_output_lines_one_row():
    df = pd.DataFrame(
        [{"X": "1", "Y": "2", "Z": "3", "Fault Name": "F1", "Sequence Number": "0"}]
    )
    s = format_output_lines(df)
    assert s.strip() == format_arreglo_line(1, 2, 3, "F1", 0)


_FIX = Path(__file__).resolve().parent / "fixtures" / "fallas_split"


def test_fixture_matches_golden():
    raw = (_FIX / "fallas.dat").read_bytes()
    df = load_fallas_dataframe(raw)
    g = group_rows_by_fault(df)
    out = build_outputs(g)

    def load_expected(name: str) -> str:
        t = (_FIX / name).read_text(encoding="utf-8").replace("\r\n", "\n")
        return t if t.endswith("\n") else t + "\n"

    assert out["Alpha.dat"].replace("\r\n", "\n") == load_expected("Alpha.dat")
    assert out["Beta.dat"].replace("\r\n", "\n") == load_expected("Beta.dat")
