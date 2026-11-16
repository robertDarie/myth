"""Validate the initial audit dataset; does not certify source truth or completeness."""
import csv
import json
import math
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "research/parity/audits/full-rok-audit"
rows = list(csv.DictReader((DATA / "parity-matrix.csv").open(encoding="utf-8", newline="")))
typed = json.loads((DATA / "matrix.json").read_text(encoding="utf-8"))
assert rows and len(rows) == len(typed), "CSV/JSON row count mismatch"
assert len({r["audit_id"] for r in rows}) == len(rows), "Duplicate audit IDs"
assert all(r["code_path"].startswith("server/") for r in rows), "Missing authoritative code path"
classes = {"VERIFIED", "CORROBORATED", "ESTIMATED", "UNKNOWN", "CONFLICTING"}
for row, value in zip(rows, typed):
    assert set(row) == set(value), f"Column mismatch: {row['audit_id']}"
    for key in row:
        assert row[key] == str(value[key]), f"CSV/JSON value mismatch: {row['audit_id']} {key}"
    assert row["evidence_class"] in classes
    assert isinstance(value["tom_value"], (int, float)) and math.isfinite(value["tom_value"])
    assert len(row["audited_commit"]) == 40
    if row["rok_value"] == "":
        assert row["evidence_class"] == "UNKNOWN"
        assert row["absolute_difference"] == row["percentage_difference"] == ""
        assert row["parity"] == "UNKNOWN REFERENCE"
    else:
        assert row["source_url"].startswith("https://")
        assert isinstance(value["rok_value"], (int, float)) and math.isfinite(value["rok_value"])
        expected = value["tom_value"] - value["rok_value"]
        assert math.isclose(value["absolute_difference"], expected, abs_tol=1e-12)
        assert value["rok_value"] != 0, "Define explicit zero-denominator policy before adding such rows"
        assert math.isclose(value["percentage_difference"], expected / value["rok_value"] * 100, abs_tol=1e-12)
diagnostics = json.loads((DATA / "diagnostics.json").read_text(encoding="utf-8"))
assert diagnostics["commit"] == rows[0]["audited_commit"]
assert {p["id"] for p in diagnostics["probes"]} == {
    "military-frontier", "scout-pass", "secondary-passive", "secondary-level"
}
assert all(p["verdict"] in {"PASS", "FAIL"} for p in diagnostics["probes"])
with zipfile.ZipFile(DATA / "RoK_vs_Thrones_of_Myth_Master_Parity_Audit.xlsx") as book:
    ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    strings = []
    if "xl/sharedStrings.xml" in book.namelist():
        strings = ["".join(item.itertext()) for item in ET.fromstring(book.read("xl/sharedStrings.xml"))]
    sheet = ET.fromstring(book.read("xl/worksheets/sheet2.xml"))
    def cell_value(cell):
        text = cell.find("s:v", ns)
        if cell.get("t") == "s":
            return strings[int(text.text)]
        if cell.get("t") == "inlineStr":
            return "".join(cell.find("s:is", ns).itertext())
        return text.text if text is not None else ""
    sheet_rows = sheet.findall("s:sheetData/s:row", ns)
    headers = [cell_value(cell) for cell in sheet_rows[0]]
    assert len(sheet_rows) == len(rows) + 1, "Workbook row count differs from CSV"
    for xml_row, source in zip(sheet_rows[1:], typed):
        values = {"".join(filter(str.isalpha, cell.get("r"))): cell_value(cell) for cell in xml_row}
        for column, header in enumerate(headers):
            address = chr(ord("A") + column)  # Initial workbook uses A:Q.
            actual, expected = values.get(address, ""), source[header]
            if isinstance(expected, (int, float)):
                assert actual != "" and math.isclose(float(actual), expected, rel_tol=1e-12, abs_tol=1e-10)
            else:
                assert actual == expected, f"Workbook differs from CSV: {source['audit_id']} {header}"
print(json.dumps({"rows": len(rows), "known_reference_rows": sum(r["rok_value"] != "" for r in rows),
                  "unknown_reference_rows": sum(r["rok_value"] == "" for r in rows),
                  "diagnostic_gameplay_failures": sum(p["verdict"] == "FAIL" for p in diagnostics["probes"]),
                  "workbook_rows_verified": len(rows), "scope": "Dataset consistency only; full audit incomplete"}))
