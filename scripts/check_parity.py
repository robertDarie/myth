"""Small research gate: traceability and repeatable checks, not external fact verification."""
import argparse
import csv
import fnmatch
import json
import re
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = "research/parity/registry.json"
LABELS = {"VERIFIED", "CORROBORATED", "ESTIMATED", "UNKNOWN", "CONFLICTING"}
PARITY = {"Verified parity", "Partial parity", "Different by design", "Not yet verified"}
SECTIONS = ["Feature and RoK equivalent", "Reference version and sources", "Verified mechanics and prerequisites", "Numeric reference", "Formulas and modifiers", "Known uncertainties", "Current Thrones of Myth behavior", "Planned Thrones of Myth behavior", "Differences and project decisions", "Systems affected", "Save migration", "Acceptance tests", "Implementation status"]
INFRA = {"http.mjs", "realms.mjs", "database.mjs", "storage.mjs", "identity.mjs", "checkpoint.mjs", "telemetry.mjs", "index.mjs", "backup.mjs", "migrate.mjs"}


def git(root, *args, required=True):
    r = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True)
    if required and r.returncode:
        raise ValueError(r.stderr.strip() or "Cannot inspect gameplay changes.")
    return r.stdout.splitlines() if r.returncode == 0 else []


def changed_paths(root):
    paths = set(git(root, "diff", "--name-only", "--no-renames", "--diff-filter=ACMRD", "HEAD"))
    paths.update(git(root, "ls-files", "--others", "--exclude-standard"))
    if git(root, "rev-parse", "--verify", "origin/main", required=False):
        paths.update(git(root, "diff", "--name-only", "--no-renames", "--diff-filter=ACMRD", "origin/main...HEAD"))
    else:
        paths.update(git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"))
    return {p.replace("\\", "/") for p in paths}


def gameplay(path):
    p = Path(path)
    if path.startswith("server/"):
        return "/testing/" not in path and not path.endswith(".test.mjs") and ((p.suffix == ".mjs" and p.name not in INFRA) or p.suffix == ".json")
    return path.startswith("client/Assets/ThronesOfMyth/Scripts/") and p.suffix == ".cs"


def local_file(root, relative):
    if not isinstance(relative, str) or not relative:
        raise ValueError("Missing repository-relative evidence/fixture path.")
    resolved = (root / relative).resolve()
    if not resolved.is_relative_to(root.resolve()) or not resolved.is_file():
        raise ValueError("Missing or unsafe evidence/fixture path: " + relative)
    return resolved


def checked_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Use an explicit checked date YYYY-MM-DD.")
    date.fromisoformat(value)


def document(root, relative, checks, coverage):
    content = local_file(root, relative).read_text(encoding="utf-8")
    match = re.search(r"<!--\s*parity\s*\n(.*?)\n\s*-->", content, re.S)
    if not match:
        raise ValueError(relative + ": missing parity metadata block; use FEATURE_TEMPLATE.md.")
    meta = json.loads(match.group(1))
    if re.search(r"\b(REPLACE_ME|TBD|TODO)\b|YYYY-MM-DD|example\.invalid", json.dumps(meta)):
        raise ValueError(relative + ": placeholder metadata is not research evidence.")
    for field in ["id", "description", "reference_game", "reference_version", "checked", "status", "parity", "sources", "numeric_references", "numeric_fixtures", "deviations", "essential_unknowns", "acceptance_checks", "covers", "coverage_ids"]:
        if field not in meta:
            raise ValueError(relative + ": missing field " + field)
    for field in ["id", "description", "reference_game", "reference_version"]:
        if not isinstance(meta[field], str) or not meta[field].strip():
            raise ValueError(relative + ": empty field " + field)
    if meta["reference_game"] not in {"Rise of Kingdoms", "Call of Dragons"}:
        raise ValueError(relative + ": keep reference games in separate evidence documents.")
    if meta["status"] not in {"PLANNED", "IN_PROGRESS", "IMPLEMENTED"} or meta["parity"] not in PARITY:
        raise ValueError(relative + ": invalid implementation/parity status.")
    checked_date(meta["checked"])
    for field in ["sources", "numeric_references", "numeric_fixtures", "deviations", "essential_unknowns", "acceptance_checks", "covers", "coverage_ids"]:
        if not isinstance(meta[field], list):
            raise ValueError(relative + ": " + field + " must be a list.")
    if not meta["sources"] or not meta["numeric_references"] or not meta["covers"] or not meta["coverage_ids"]:
        raise ValueError(relative + ": missing sources, reference values, scope or coverage IDs.")
    for source in meta["sources"]:
        if source.get("classification") not in LABELS or not re.match(r"https?://[^/]+", source.get("url", "")):
            raise ValueError(relative + ": invalid source URL or evidence label.")
        checked_date(source.get("checked"))
    for ref in meta["numeric_references"]:
        if not ref.get("quantity") or not ref.get("reference") or ref.get("classification") not in LABELS:
            raise ValueError(relative + ": missing reference value/link, explanation or evidence label.")
        if ref["classification"] in {"ESTIMATED", "UNKNOWN", "CONFLICTING"} and not ref.get("treatment"):
            raise ValueError(relative + ": uncertain values need explicit treatment.")
    for deviation in meta["deviations"]:
        if any(not deviation.get(key) for key in ["decision", "reason", "impact", "authority"]):
            raise ValueError(relative + ": unexplained deviation or missing project decision.")
    if meta["parity"] != "Verified parity" and not meta["deviations"]:
        raise ValueError(relative + ": differences must be explained.")
    if meta["parity"] == "Verified parity" and (meta["deviations"] or any(r["classification"] in {"UNKNOWN", "CONFLICTING", "ESTIMATED"} for r in meta["numeric_references"])):
        raise ValueError(relative + ": uncertainty/deviations cannot be labeled verified parity.")
    for fixture in meta["numeric_fixtures"]:
        local_file(root, fixture["path"])
        if not fixture.get("checks") or any(name not in checks for name in fixture["checks"]):
            raise ValueError(relative + ": numeric fixture must bind to registered implementation checks.")
    if any(name not in checks for name in meta["acceptance_checks"]):
        raise ValueError(relative + ": acceptance check is absent from scripts/publish-tests.json.")
    if any(value not in coverage for value in meta["coverage_ids"]):
        raise ValueError(relative + ": coverage register is missing a feature ID.")
    for section in SECTIONS:
        part = re.search(r"^## " + re.escape(section) + r"\s*\n(.*?)(?=^## |\Z)", content, re.M | re.S)
        if not part or not part.group(1).strip() or re.search(r"\b(TODO|TBD|REPLACE_ME)\b|YYYY-MM-DD", part.group(1)):
            raise ValueError(relative + ": missing or placeholder section " + section)
    if meta["status"] == "IMPLEMENTED" and (meta["essential_unknowns"] or not meta["acceptance_checks"] or not meta["numeric_fixtures"]):
        raise ValueError(relative + ": unresolved essential unknowns or missing deterministic acceptance.")
    return meta


def validate_repo(root=ROOT, *, paths=None, run_checks=True, runner=None):
    root = Path(root)
    for required in ["AGENTS.md", "research/parity/README.md", "research/parity/FEATURE_TEMPLATE.md", REGISTRY]:
        local_file(root, required)
    registry = json.loads(local_file(root, REGISTRY).read_text(encoding="utf-8"))
    if registry.get("version") != 1 or not registry.get("features") or not isinstance(registry.get("features"), list) or not isinstance(registry.get("exemptions"), list):
        raise ValueError("Invalid research registry.")
    checks = {t["name"]: t["command"] for t in json.loads(local_file(root, "scripts/publish-tests.json").read_text(encoding="utf-8"))["tests"]}
    with local_file(root, "research/MYTH_feature_coverage_register.csv").open(encoding="utf-8", newline="") as stream:
        coverage = {row["Requirement ID"] for row in csv.DictReader(stream)}
    documents = {}
    for relative in registry["features"]:
        if not isinstance(relative, str) or not relative.startswith("research/parity/features/") or not relative.endswith(".md"):
            raise ValueError("Feature evidence must live under research/parity/features/.")
        meta = document(root, relative, checks, coverage)
        if meta["id"] in documents:
            raise ValueError("Duplicate parity feature ID: " + meta["id"])
        documents[meta["id"]] = (relative, meta)
    changed = set(paths) if paths is not None else changed_paths(root)
    active = {key for key, (path, _) in documents.items() if path in changed}
    for path in sorted(p for p in changed if gameplay(p)):
        covered = [(key, rel, meta) for key, (rel, meta) in documents.items() if any(fnmatch.fnmatchcase(path, pattern) for pattern in meta["covers"]) and rel in changed and meta["status"] == "IMPLEMENTED"]
        exempt = any(REGISTRY in changed and e.get("kind") in {"bug-fix", "formatting", "security", "infrastructure"} and len(e.get("reason", "").strip()) >= 20 and any(fnmatch.fnmatchcase(path, pattern) for pattern in e.get("paths", [])) for e in registry["exemptions"])
        if not covered and not exempt:
            raise ValueError(path + ": gameplay change needs an updated IMPLEMENTED evidence document or an explained non-gameplay exemption in " + REGISTRY)
        active.update(key for key, _, _ in covered)
    names = set()
    for key in active:
        meta = documents[key][1]
        if meta["status"] == "IMPLEMENTED":
            names.update(meta["acceptance_checks"])
            for fixture in meta["numeric_fixtures"]:
                names.update(fixture["checks"])
    if run_checks:
        run = runner or (lambda command: subprocess.run(command, cwd=root).returncode)
        for name in sorted(names):
            command = checks[name]
            if any("check_parity.py" in str(arg) for arg in command):
                raise ValueError("A numeric binding cannot recursively call the research gate.")
            if run(command) != 0:
                raise ValueError("Research numeric/acceptance check failed: " + name)
    return {"documents": len(documents), "gameplay_paths": sum(gameplay(p) for p in changed), "numeric_checks": len(names) if run_checks else 0, "bound_checks": len(names), "factual_review": "External evidence still requires independent review."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--metadata-only", action="store_true", help="Publication plan mode; the publisher separately runs numeric bindings.")
    args = parser.parse_args()
    try:
        print(json.dumps(validate_repo(run_checks=not args.metadata_only)))
        return 0
    except (ValueError, KeyError, TypeError, OSError) as error:
        print("Research gate failed: " + str(error))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
