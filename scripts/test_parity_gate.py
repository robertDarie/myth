"""Offline research-gate contracts. Temporary repositories contain no private data."""
import json
import re
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stdout
import io
from pathlib import Path
import check_parity as gate

DOC = "research/parity/features/forsaken-numerics.md"
POP = "research/parity/features/forsaken-population.md"


class ResearchGate(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in ["AGENTS.md", "research/parity/README.md", "research/parity/FEATURE_TEMPLATE.md", gate.REGISTRY, DOC, POP, "scripts/publish-tests.json", "research/MYTH_feature_coverage_register.csv", "server/balance-reference.json", "docs/benchmarks/forsaken-calibration.json"]:
            dest = self.root / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(gate.ROOT / name, dest)

    def meta(self, change, name=DOC):
        path = self.root / name
        text = path.read_text(encoding="utf-8")
        match = re.search(r"<!--\s*parity\s*\n(.*?)\n\s*-->", text, re.S)
        value = json.loads(match.group(1))
        change(value)
        path.write_text(text[:match.start(1)] + json.dumps(value, indent=2) + text[match.end(1):], encoding="utf-8")

    def validate(self, paths=(), runner=None):
        return gate.validate_repo(self.root, paths=paths, runner=runner)

    def test_valid_active_evidence_runs_real_registered_bindings(self):
        commands = []
        result = self.validate([DOC, "server/world.mjs"], lambda command: commands.append(command) or 0)
        self.assertEqual(result["gameplay_paths"], 1)
        self.assertEqual(len(commands), 3)
        self.assertTrue(any("scripts/check-forsaken-evidence.mjs" in c for c in commands))

    def test_unknown_gameplay_needs_its_own_evidence(self):
        with self.assertRaisesRegex(ValueError, "needs an updated"):
            self.validate([DOC, "server/new-gameplay.mjs"])

    def test_existing_document_must_be_updated_for_gameplay(self):
        with self.assertRaisesRegex(ValueError, "needs an updated"):
            self.validate(["server/world.mjs"])

    def test_unfinished_population_document_cannot_authorize_publication(self):
        with self.assertRaisesRegex(ValueError, "needs an updated"):
            self.validate([POP, "server/forsaken-population.mjs"])

    def test_infrastructure_and_docs_need_no_new_rok_analogue(self):
        result = self.validate(["server/http.mjs", "scripts/a-tool.py", "docs/a-note.md"], lambda _: self.fail("Unrelated maintenance must not run gameplay checks"))
        self.assertEqual(result["gameplay_paths"], 0)
        self.assertEqual(result["numeric_checks"], 0)

    def test_explained_non_gameplay_fix_is_allowed_but_stale_exemption_is_not(self):
        path = self.root / gate.REGISTRY
        registry = json.loads(path.read_text(encoding="utf-8"))
        registry["exemptions"] = [{"paths": ["server/world.mjs"], "kind": "security", "reason": "Restore an authorization guard without changing numerical gameplay."}]
        path.write_text(json.dumps(registry), encoding="utf-8")
        self.assertEqual(self.validate([gate.REGISTRY, "server/world.mjs"])["gameplay_paths"], 1)
        with self.assertRaisesRegex(ValueError, "needs an updated"):
            self.validate(["server/world.mjs"])

    def test_missing_evidence_and_numeric_fixture_fail(self):
        (self.root / DOC).unlink()
        with self.assertRaisesRegex(ValueError, "Missing"):
            self.validate()
        shutil.copy2(gate.ROOT / DOC, self.root / DOC)
        (self.root / "server/balance-reference.json").unlink()
        with self.assertRaisesRegex(ValueError, "Missing"):
            self.validate()

    def test_required_fields_and_sections_cannot_be_blank(self):
        self.meta(lambda m: m.pop("reference_version"))
        with self.assertRaisesRegex(ValueError, "missing field"):
            self.validate()
        shutil.copy2(gate.ROOT / DOC, self.root / DOC)
        path = self.root / DOC
        path.write_text(re.sub(r"## Numeric reference\n.*?(?=## )", "## Numeric reference\n\n", path.read_text(encoding="utf-8"), flags=re.S), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "section Numeric"):
            self.validate()

    def test_uncertain_numbers_need_explanation(self):
        self.meta(lambda m: m["numeric_references"][2].pop("treatment"))
        with self.assertRaisesRegex(ValueError, "uncertain values"):
            self.validate()

    def test_placeholder_reference_is_not_evidence(self):
        self.meta(lambda m: m["numeric_references"][0].update(reference="REPLACE_ME"))
        with self.assertRaisesRegex(ValueError, "placeholder metadata"):
            self.validate()

    def test_custom_publication_plan_cannot_bypass_research_gate(self):
        import publish_task
        with patch.object(publish_task, "ROOT", self.root), patch.object(publish_task, "load_plan", return_value=[{"name": "minimal", "command": ["ignored"]}]), patch.object(publish_task.check_parity, "validate_repo", side_effect=ValueError("missing evidence")), patch.object(publish_task, "run_plan") as run_plan, patch.object(publish_task, "push_main") as push, redirect_stdout(io.StringIO()):
            self.assertEqual(publish_task.main(["--plan", "custom.json", "--push"]), 2)
            run_plan.assert_not_called()
            push.assert_not_called()

    def test_unexplained_deviation_or_unproven_exactness_is_rejected(self):
        self.meta(lambda m: m["deviations"][0].pop("reason"))
        with self.assertRaisesRegex(ValueError, "unexplained deviation"):
            self.validate()
        shutil.copy2(gate.ROOT / DOC, self.root / DOC)
        self.meta(lambda m: m.update(parity="Verified parity"))
        with self.assertRaisesRegex(ValueError, "cannot be labeled verified"):
            self.validate()

    def test_essential_unknown_blocks_implemented_status(self):
        self.meta(lambda m: m["essential_unknowns"].append("Exact essential equation is unverified"))
        with self.assertRaisesRegex(ValueError, "essential unknowns"):
            self.validate()

    def test_missing_registered_check_and_failed_numeric_measurement_fail(self):
        self.meta(lambda m: m["numeric_fixtures"][0]["checks"].append("nonexistent check"))
        with self.assertRaisesRegex(ValueError, "registered implementation"):
            self.validate()
        shutil.copy2(gate.ROOT / DOC, self.root / DOC)
        with self.assertRaisesRegex(ValueError, "check failed"):
            self.validate([DOC], lambda _: 7)

    def test_evidence_paths_cannot_escape_repository(self):
        self.meta(lambda m: m["numeric_fixtures"][0].update(path="../outside.json"))
        with self.assertRaisesRegex(ValueError, "unsafe"):
            self.validate()

    def test_staged_untracked_and_committed_changes_are_all_inspected(self):
        def git(*args):
            return subprocess.run(["git", *args], cwd=self.root, check=True, capture_output=True, text=True)
        git("init", "-b", "main")
        git("config", "user.name", "Policy Test")
        git("config", "user.email", "policy-test@example.invalid")
        source = self.root / "server/world.mjs"
        source.write_text("// baseline\n", encoding="utf-8")
        git("add", ".")
        git("commit", "-m", "fixture baseline")
        git("update-ref", "refs/remotes/origin/main", "HEAD")
        source.write_text("// gameplay edit\n", encoding="utf-8")
        (self.root / "server/new.mjs").write_text("// untracked\n", encoding="utf-8")
        self.assertTrue({"server/world.mjs", "server/new.mjs"}.issubset(gate.changed_paths(self.root)))
        (self.root / "server/new.mjs").unlink()
        with (self.root / DOC).open("a", encoding="utf-8") as stream:
            stream.write("\nUpdated evidence review.\n")
        git("add", "server/world.mjs", DOC)
        self.assertIn(DOC, gate.changed_paths(self.root))
        git("commit", "-m", "gameplay with reviewed evidence")
        self.assertIn("server/world.mjs", gate.changed_paths(self.root))
        self.assertEqual(gate.validate_repo(self.root, runner=lambda _: 0)["gameplay_paths"], 1)
        source.unlink()
        self.assertIn("server/world.mjs", gate.changed_paths(self.root))


if __name__ == "__main__":
    unittest.main()
