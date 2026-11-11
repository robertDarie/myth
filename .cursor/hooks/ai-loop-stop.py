"""Cursor stop hook. JSON in on stdin, JSON out on stdout. Logs go to stderr."""
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENGINE = ROOT / ".ai-loop" / "engine.py"


def load_engine():
    spec = importlib.util.spec_from_file_location("ai_loop_engine", ENGINE)
    if spec is None or spec.loader is None:
        raise RuntimeError("AI loop engine is missing.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        print("{}", flush=True)
        print("AI loop stop hook received invalid JSON.", file=sys.stderr)
        return 0
    if not isinstance(payload, dict):
        print("{}", flush=True)
        return 0
    try:
        result = load_engine().handle_stop(payload, ROOT)
    except Exception as error:
        print("{}", flush=True)
        print(f"AI loop stop hook failed closed-open: {error}", file=sys.stderr)
        return 0
    if not isinstance(result, dict):
        result = {}
    sys.stdout.write(json.dumps(result, ensure_ascii=True))
    sys.stdout.write("\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
