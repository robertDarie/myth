"""Start, pause, resume, or inspect the local AI loop. This does not call the network."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".ai-loop"


def write_flag(name: str) -> None:
    (STATE / name).write_text("1\n", encoding="utf-8")


def remove_flag(name: str) -> None:
    path = STATE / name
    if path.exists():
        path.unlink()


def status() -> dict:
    return {
        "enabled": (STATE / "enabled").is_file(),
        "paused": (STATE / "paused").is_file(),
        "handoff": (STATE / "handoff.md").is_file(),
        "api_key_set": bool(__import__("os").environ.get("OPENAI_API_KEY", "").strip()),
    }


def main(argv: list[str]) -> int:
    command = argv[1] if len(argv) > 1 else "status"
    if command == "start" or command == "resume":
        remove_flag("paused")
        write_flag("enabled")
    elif command == "pause":
        remove_flag("enabled")
        write_flag("paused")
    elif command != "status":
        print("Use start, pause, resume, or status.", file=sys.stderr)
        return 2
    print(json.dumps(status()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
