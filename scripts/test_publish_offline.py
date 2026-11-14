"""Offline checks for the publish script and stop-hook reminder. No network and no model calls."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import publish_task  # noqa: E402


def check(condition, message):
    if not condition:
        raise SystemExit(message)


def git(repo, *args):
    result = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def init_repo(path):
    path.mkdir(parents=True)
    git(path, "init", "-b", "main")
    git(path, "config", "user.email", "publish-test@example.com")
    git(path, "config", "user.name", "Publish Test")
    (path / "README.md").write_text("test\n", encoding="utf-8")
    git(path, "add", "README.md")
    git(path, "commit", "-m", "initial")


def test_plan_and_forbidden():
    with tempfile.TemporaryDirectory() as temp:
        plan = Path(temp) / "plan.json"
        plan.write_text(json.dumps({"tests": [{"name": "ok", "command": [sys.executable, "-c", "raise SystemExit(0)"]}]}), encoding="utf-8")
        check(publish_task.run_plan(publish_task.load_plan(plan), cwd=ROOT) == [], "A passing command was reported as a failure.")
        plan.write_text(json.dumps({"tests": [{"name": "bad", "command": [sys.executable, "-c", "raise SystemExit(7)"]}]}), encoding="utf-8")
        failed = publish_task.run_plan(publish_task.load_plan(plan), cwd=ROOT)
        check(failed == ["bad"], "A failing command was not reported.")
    blocked = publish_task.forbidden([
        "research/Thrones_of_Myth_RoK_Video_Research_v1.xlsx",
        "research/Rise_of_Kingdoms_Call_of_Dragons_Complete_Reference.xlsx",
        "incoming/Copy of Thrones of Myth RoK Video Research v1.xlsx",
        "notes/Call-of-Dragons Complete Reference (2).xlsx",
        ".env",
        "ops/kingdom/world.json",
        "data/kingdom.sqlite",
        "secrets/api-key.txt",
    ])
    check(len(blocked) == 8, "Private workbooks, renamed copies, secrets, or saves were allowed.")
    check(publish_task.forbidden(["server/storage.mjs", "docs/roadmap/Thrones_of_Myth_Master_Development_Roadmap_v2.xlsx"]) == [], "Ordinary source files were blocked.")


def pair(temp):
    seed = Path(temp) / "seed"
    origin = Path(temp) / "origin.git"
    local = Path(temp) / "local"
    init_repo(seed)
    subprocess.run(["git", "init", "--bare", "-b", "main", str(origin)], check=True, capture_output=True)
    git(seed, "remote", "add", "origin", str(origin))
    git(seed, "push", "origin", "main")
    subprocess.run(["git", "clone", str(origin), str(local)], check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "publish-test@example.com"], cwd=local, check=True)
    subprocess.run(["git", "config", "user.name", "Publish Test"], cwd=local, check=True)
    return seed, origin, local


def test_push_refuses_feature_branch_and_divergence():
    with tempfile.TemporaryDirectory() as temp:
        seed, origin, local = pair(temp)
        (local / "play.txt").write_text("play\n", encoding="utf-8")
        git(local, "add", "play.txt")
        git(local, "commit", "-m", "play")
        git(local, "checkout", "-b", "feature/captain-3d")
        try:
            publish_task.push_main(local)
        except RuntimeError as error:
            check("feature/captain-3d" in str(error), "A feature branch push was not refused.")
        else:
            raise SystemExit("A feature branch push was allowed.")
        git(local, "checkout", "main")
        (seed / "other.txt").write_text("remote\n", encoding="utf-8")
        git(seed, "add", "other.txt")
        git(seed, "commit", "-m", "remote only")
        git(seed, "push", "origin", "main")
        git(local, "fetch", "origin", "main")
        try:
            publish_task.assert_fast_forward(cwd=local)
        except RuntimeError as error:
            check("Not pushing" in str(error), "A diverged main was not refused.")
        else:
            raise SystemExit("A diverged main was treated as a fast-forward.")


def test_fast_forward_push_updates_origin():
    with tempfile.TemporaryDirectory() as temp:
        seed, origin, local = pair(temp)
        (local / "play.txt").write_text("play\n", encoding="utf-8")
        git(local, "add", "play.txt")
        git(local, "commit", "-m", "play")
        confirmed = publish_task.push_main(local)
        remote = git(origin, "rev-parse", "main")
        check(confirmed == remote, "The local push did not update the remote main commit.")
        check(confirmed == git(local, "rev-parse", "HEAD"), "The confirmed SHA is not the local commit.")


def test_private_file_removal_is_publishable():
    with tempfile.TemporaryDirectory() as temp:
        seed, origin, local = pair(temp)
        private = "Rise_of_Kingdoms_Call_of_Dragons_Complete_Reference.xlsx"
        (seed / private).write_bytes(b"private fixture")
        git(seed, "add", private)
        git(seed, "commit", "-m", "existing private file fixture")
        git(seed, "push", "origin", "main")
        git(local, "pull", "--ff-only")
        git(local, "rm", private)
        git(local, "commit", "-m", "remove private file")
        ahead, files = publish_task.commits_ahead(cwd=local)
        check(bool(ahead) and private not in files, "Removing private files must be allowed.")
        confirmed = publish_task.push_main(local)
        check(confirmed == git(origin, "rev-parse", "main"), "Private removal was not published.")
        # A rename is an addition for privacy checks, even if git detects a rename.
        (local / private).write_bytes(b"new private fixture")
        git(local, "add", private)
        git(local, "commit", "-m", "private addition fixture")
        _, files = publish_task.commits_ahead(cwd=local)
        check(private in publish_task.forbidden(files), "Private additions must remain blocked.")


def test_dirty_worktree_is_left_untouched():
    with tempfile.TemporaryDirectory() as temp:
        seed, origin, local = pair(temp)
        (local / "notes.txt").write_text("keep me\n", encoding="utf-8")
        try:
            publish_task.push_main(local)
        except RuntimeError as error:
            check("uncommitted" in str(error), "A dirty main worktree was not refused.")
        else:
            raise SystemExit("A dirty worktree was published.")
        check((local / "notes.txt").read_text(encoding="utf-8") == "keep me\n", "The uncommitted file was overwritten.")
        check(git(origin, "rev-parse", "main") == git(local, "rev-parse", "HEAD"), "A dirty worktree still moved the remote.")


def test_guard_is_quiet_without_a_marker():
    # Isolate the hook test from a real pending publication in this workspace.
    # Never erase or replace the user's production publish marker.
    source = ROOT / ".cursor" / "hooks" / "publish_guard.py"
    with tempfile.TemporaryDirectory() as temp:
        fixture_root = Path(temp)
        script = fixture_root / ".cursor" / "hooks" / "publish_guard.py"
        script.parent.mkdir(parents=True)
        script.write_bytes(source.read_bytes())
        result = subprocess.run([sys.executable, "-X", "utf8", str(script)], input='{"status":"completed"}\n', text=True, capture_output=True, check=True)
        check(result.stdout.strip() == "{}", "The publish reminder fired without a pending marker.")
        marker = fixture_root / ".cursor" / "publish-pending"
        marker.write_text("offline-test\n", encoding="utf-8")
        result = subprocess.run([sys.executable, "-X", "utf8", str(script)], input="{}\n", text=True, capture_output=True, check=True)
        payload = json.loads(result.stdout)
        check("publish_task.py --push" in payload.get("followup_message", ""), "The pending marker did not remind the agent to publish.")


def main():
    test_plan_and_forbidden()
    test_push_refuses_feature_branch_and_divergence()
    test_fast_forward_push_updates_origin()
    test_private_file_removal_is_publishable()
    test_dirty_worktree_is_left_untouched()
    test_guard_is_quiet_without_a_marker()
    print("Publish offline checks: 6 passed.")


if __name__ == "__main__":
    main()
