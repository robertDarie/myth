"""Decide whether a finished Cursor turn should continue. No API key is stored here."""
from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

HIGH_RISK = (
    "server/world.mjs",
    "server/http.mjs",
    "client/ProjectSettings/",
    ".env",
    "credentials",
    "world.json",
    "server/database.mjs",
)
SECRET = re.compile(r"sk-[A-Za-z0-9_\-]{8,}|AKIA[0-9A-Z]{16}")
MAX_CONTEXT = 12000
MAX_DIFF = 24000


def loop_dir(root: Path) -> Path:
    override = os.environ.get("AI_LOOP_DIR")
    return Path(override) if override else root / ".ai-loop"


def redact(text: str) -> str:
    return SECRET.sub("[redacted]", text)


def read_text(path: Path, limit: int) -> str:
    if not path.is_file():
        return ""
    return redact(path.read_text(encoding="utf-8", errors="replace")[:limit])


def git_text(root: Path, args: list[str]) -> tuple[int, str]:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=20,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        return 1, str(error)
    return completed.returncode, redact((completed.stdout or "") + (completed.stderr or ""))


def risky_paths(diff_text: str) -> list[str]:
    found = []
    lowered = diff_text.lower()
    for needle in HIGH_RISK:
        if needle.lower() in lowered:
            found.append(needle)
    return found


def parse_decision(raw: str) -> dict:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {"decision": "STOP", "message": "Reviewer returned invalid JSON.", "reasons": ["invalid-json"]}
    if not isinstance(data, dict):
        return {"decision": "STOP", "message": "Reviewer returned a non-object.", "reasons": ["invalid-json"]}
    decision = str(data.get("decision", "")).upper()
    if decision not in {"FIX", "NEXT", "STOP"}:
        return {"decision": "STOP", "message": "Reviewer decision was not FIX, NEXT, or STOP.", "reasons": ["invalid-decision"]}
    message = str(data.get("message", "")).strip()
    reasons = data.get("reasons") if isinstance(data.get("reasons"), list) else []
    return {"decision": decision, "message": message or decision, "reasons": [str(item) for item in reasons]}


def offline_decision(state: Path) -> dict:
    fixture = os.environ.get("AI_LOOP_FIXTURE")
    path = Path(fixture) if fixture else state / "fixtures" / "decision.json"
    if not path.is_file():
        return {"decision": "STOP", "message": "Offline fixture is missing.", "reasons": ["missing-fixture"]}
    return parse_decision(path.read_text(encoding="utf-8"))


def live_decision(packet: str) -> dict:
    # A ChatGPT subscription does not pay for this API. The pilot must not call it.
    return {
        "decision": "STOP",
        "message": "Live OpenAI review is disabled so this loop cannot spend extra money. Review the local handoff.",
        "reasons": ["spending-policy"],
    }


def followup_for(decision: dict) -> str:
    kind = decision["decision"]
    if kind == "STOP":
        return ""
    header = {
        "FIX": "AI loop FIX. Apply only the corrections below. Do not push or merge. Update .ai-loop/handoff.md when the corrections are retested.",
        "NEXT": "AI loop NEXT. The previous handoff is accepted. Implement only the task below. Do not push or merge. Update .ai-loop/handoff.md with real test results.",
    }[kind]
    return header + "\n\n" + decision["message"]


def handle_stop(payload: dict, root: Path) -> dict:
    state = loop_dir(root)
    state.mkdir(parents=True, exist_ok=True)
    status = str(payload.get("status", ""))
    try:
        loop_count = int(payload.get("loop_count", 0))
    except (TypeError, ValueError):
        loop_count = 0
    record = {"status": status, "loop_count": loop_count, "decision": "STOP", "followup": False}

    def finish(decision: dict, follow: bool) -> dict:
        record.update(decision)
        record["followup"] = follow
        (state / "last-decision.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
        if follow and decision["decision"] in {"FIX", "NEXT"}:
            return {"followup_message": followup_for(decision)}
        return {}

    if not (state / "enabled").is_file() or (state / "paused").is_file():
        return finish({"decision": "STOP", "message": "Loop is paused or not started.", "reasons": ["inactive"]}, False)
    if status != "completed":
        return finish({"decision": "STOP", "message": f"Agent status is {status or 'unknown'}.", "reasons": ["agent-status"]}, False)
    if loop_count >= 3:
        return finish({"decision": "STOP", "message": "Pilot limit of three follow-ups is reached.", "reasons": ["loop-limit"]}, False)

    handoff = read_text(state / "handoff.md", MAX_CONTEXT)
    if not handoff.strip():
        return finish({"decision": "STOP", "message": "Handoff is missing.", "reasons": ["missing-handoff"]}, False)

    code, head = git_text(root, ["rev-parse", "--abbrev-ref", "HEAD"])
    diff_code, diff = git_text(root, ["diff", "--stat", "HEAD"])
    work_code, work = git_text(root, ["status", "--short"])
    if code or diff_code or work_code:
        return finish({"decision": "STOP", "message": "Git context could not be read.", "reasons": ["git-error"]}, False)
    risks = risky_paths(diff + "\n" + work)
    if risks:
        return finish({"decision": "STOP", "message": "High-risk paths changed: " + ", ".join(risks), "reasons": ["high-risk"]}, False)

    context = read_text(state / "project-context.md", MAX_CONTEXT)
    roadmap = read_text(state / "roadmap.md", MAX_CONTEXT)
    if not context.strip() or not roadmap.strip():
        return finish({"decision": "STOP", "message": "Project context or roadmap is missing.", "reasons": ["missing-context"]}, False)

    packet = "\n\n".join([
        f"Branch: {head.strip()}",
        "Handoff:\n" + handoff,
        "Git status:\n" + work[:4000],
        "Git diff stat:\n" + diff[:MAX_DIFF],
        "Project context:\n" + context,
        "Roadmap:\n" + roadmap,
    ])
    if os.environ.get("AI_LOOP_OFFLINE") == "1":
        decision = offline_decision(state)
    else:
        decision = live_decision(packet)
    follow = decision["decision"] in {"FIX", "NEXT"} and loop_count < 3
    return finish(decision, follow)
