"""Offline proof that the stop hook speaks JSON and does not call OpenAI."""
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HOOK = ROOT / ".cursor" / "hooks" / "ai-loop-stop.py"
ENGINE = ROOT / ".ai-loop" / "engine.py"


def load_engine():
    spec = importlib.util.spec_from_file_location("ai_loop_engine_test", ENGINE)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ENGINE_MODULE = load_engine()


class EngineTests(unittest.TestCase):
    def test_redact_and_parse(self):
        self.assertNotIn("sk-secretvalue", ENGINE_MODULE.redact("token sk-secretvalue more"))
        self.assertEqual(ENGINE_MODULE.parse_decision('{"decision":"FIX","message":"tighten the test"}')["decision"], "FIX")
        self.assertEqual(ENGINE_MODULE.parse_decision("not json")["decision"], "STOP")
        self.assertIn("server/http.mjs", ENGINE_MODULE.risky_paths("M server/http.mjs"))

    def test_missing_key_does_not_call_network(self):
        previous = os.environ.pop("OPENAI_API_KEY", None)
        try:
            decision = ENGINE_MODULE.live_decision("packet")
        finally:
            if previous is not None:
                os.environ["OPENAI_API_KEY"] = previous
        self.assertEqual(decision["decision"], "STOP")
        self.assertIn("spending-policy", decision["reasons"])


class HookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.state = Path(self.temp.name)
        (self.state / "project-context.md").write_text("Context for the test.", encoding="utf-8")
        (self.state / "roadmap.md").write_text("M0-01 is the first task.", encoding="utf-8")
        (self.state / "handoff.md").write_text("Task M0-03 ran no tests yet.", encoding="utf-8")
        (self.state / "enabled").write_text("1\n", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def run_hook(self, payload, fixture):
        fixture_path = self.state / "decision.json"
        fixture_path.write_text(json.dumps(fixture), encoding="utf-8")
        env = os.environ.copy()
        env["AI_LOOP_DIR"] = str(self.state)
        env["AI_LOOP_OFFLINE"] = "1"
        env["AI_LOOP_FIXTURE"] = str(fixture_path)
        env.pop("OPENAI_API_KEY", None)
        completed = subprocess.run(
            [sys.executable, "-X", "utf8", str(HOOK)],
            input=json.dumps(payload),
            text=True,
            encoding="utf-8",
            capture_output=True,
            cwd=ROOT,
            env=env,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        parsed = json.loads(completed.stdout)
        self.assertIsInstance(parsed, dict)
        return parsed

    def test_paused_loop_emits_empty_object(self):
        (self.state / "enabled").unlink()
        self.assertEqual(self.run_hook({"status": "completed", "loop_count": 0}, {"decision": "NEXT", "message": "go"}), {})

    def test_fix_becomes_a_followup(self):
        result = self.run_hook({"status": "completed", "loop_count": 0}, {"decision": "FIX", "message": "Show the real exit code."})
        self.assertIn("FIX", result["followup_message"])
        self.assertIn("Show the real exit code.", result["followup_message"])

    def test_stop_and_limit_do_not_continue(self):
        self.assertEqual(self.run_hook({"status": "completed", "loop_count": 0}, {"decision": "STOP", "message": "Need a person."}), {})
        self.assertEqual(self.run_hook({"status": "completed", "loop_count": 3}, {"decision": "NEXT", "message": "should not run"}), {})
        self.assertEqual(self.run_hook({"status": "error", "loop_count": 0}, {"decision": "NEXT", "message": "should not run"}), {})

    def test_missing_handoff_stops(self):
        (self.state / "handoff.md").unlink()
        self.assertEqual(self.run_hook({"status": "completed", "loop_count": 1}, {"decision": "NEXT", "message": "go"}), {})

    def test_invalid_stdin_is_empty_json(self):
        env = os.environ.copy()
        env["AI_LOOP_OFFLINE"] = "1"
        env.pop("OPENAI_API_KEY", None)
        completed = subprocess.run(
            [sys.executable, "-X", "utf8", str(HOOK)],
            input="{not json",
            text=True,
            encoding="utf-8",
            capture_output=True,
            cwd=ROOT,
            env=env,
            check=False,
        )
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(json.loads(completed.stdout), {})


if __name__ == "__main__":
    unittest.main()
