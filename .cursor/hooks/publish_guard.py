"""Stop-hook reminder. JSON in, JSON out. It never pushes and never calls a model."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARKER = ROOT / ".cursor" / "publish-pending"


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        print("{}", flush=True)
        return 0
    if not isinstance(payload, dict):
        print("{}", flush=True)
        return 0
    if MARKER.is_file():
        task = MARKER.read_text(encoding="utf-8").strip() or "the completed task"
        message = (
            "Publication is unfinished for "
            + task
            + ". Run python scripts/publish_task.py --push and wait until origin/main matches that commit. "
            + "Do not start another feature, and do not force-push."
        )
        sys.stdout.write(json.dumps({"followup_message": message}, ensure_ascii=True))
        sys.stdout.write("\n")
    else:
        sys.stdout.write("{}\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
