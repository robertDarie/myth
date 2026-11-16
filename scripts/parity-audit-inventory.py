"""Source-linked inventory and legacy-register reconciliation; no gameplay writes."""
import csv
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "research/parity/audits/full-rok-audit"
groups = json.loads((OUT / "subsystems.json").read_text(encoding="utf-8"))

def write(name, records):
    with (OUT / name).open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(records[0]))
        writer.writeheader()
        writer.writerows(records)

features = []
for group in groups:
    source_files=group["files"]+({'N':['realms.mjs'],'H':['downtime.mjs']}.get(group['id'],[]))
    paths = [ROOT / "server" / file for file in source_files]
    assert all(path.exists() for path in paths), group["id"]
    tests = sorted({str(path.relative_to(ROOT)).replace("\\", "/") for source in paths
                    for path in (ROOT / "server").glob("*.test.mjs")
                    if source.stem in path.read_text(encoding="utf-8")})
    for index, title in enumerate(group["features"], 1):
        features.append({"feature_id":f"TOM-{group['id']}-{index:02}","subsystem":group["name"],
          "behavior":title,"authoritative_paths":";".join("server/"+file for file in source_files),
          "implementation":"SOURCE PRESENT; gaps listed; not gameplay certification",
          "reference_url":group["reference"],"reference_build":"UNKNOWN",
          "reference_class":"UNKNOWN","parity":"PARTIAL PARITY",
          "gap":group["gap"],"existing_tests":";".join(tests),
          "numeric_evidence":"parity-matrix.csv; exported-parameters.csv; FORMULA_COMPARISON.md",
          "verification":"Code inspection; individual native/progression evidence remains separate"})
write("feature-inventory.csv",features)

modules = []
for path in sorted((ROOT / "server").glob("*.mjs")):
    if path.name.endswith(".test.mjs"):
        continue
    mapped = [g["id"] for g in groups if path.name in g["files"]]
    text = path.read_text(encoding="utf-8")
    modules.append({"path":"server/"+path.name,"subsystems":";".join(mapped),
       "disposition":"GAMEPLAY" if mapped else "SUPPORT / PERSISTENCE / HOSTING; review interfaces separately",
       "exports":";".join(re.findall(r"export\s+(?:async\s+)?(?:const|function|class)\s+(\w+)",text)),
       "sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
write("source-module-inventory.csv",modules)

legacy = list(csv.DictReader((ROOT / "research/MYTH_feature_coverage_register.csv").open(encoding="utf-8-sig")))
reconciled = []
for row in legacy:
    text = " ".join(row.values())
    paths = sorted(set(re.findall(r"server/[A-Za-z0-9_.-]+\.mjs",text)))
    existing = [path for path in paths if (ROOT/path).is_file()]
    mapped = sorted({g["id"] for g in groups if any(Path(path).name in g["files"] for path in existing)})
    reconciled.append({"requirement_id":row["Requirement ID"],"source_sheet":row["Source sheet"],
      "feature":row["Feature"],"historical_claim":row["Actual code status"],
      "existing_source_links":";".join(existing),"subsystem_links":";".join(mapped),
      "disposition":"SOURCE LINK EXISTS; claim requires semantic verification" if existing else "NO DIRECT SOURCE LINK IN REGISTER; not evidence of missing implementation",
      "parity":"NOT YET VERIFIED","note":"Research/visual/architecture/open-question rows are not automatically implemented gameplay features"})
write("coverage-reconciliation.csv",reconciled)
print(json.dumps({"behavior_inventory":len(features),"subsystems":len(groups),"source_modules":len(modules),
                  "legacy_rows_reconciled":len(reconciled),"scope":"Inventory and traceability; not functional PASS"}))
