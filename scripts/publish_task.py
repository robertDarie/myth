"""Run the publish test plan and fast-forward origin/main. Never force-pushes."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "scripts" / "publish-tests.json"
MARKER = ROOT / ".cursor" / "publish-pending"
FORBIDDEN_NAMES = {
    "Rise_of_Kingdoms_Call_of_Dragons_Complete_Reference.xlsx",
    "Thrones_of_Myth_RoK_Video_Research_v1.xlsx",
}


def git(*args, cwd=ROOT, check=True):
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "git failed")
    return result


def load_plan(path=PLAN):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    tests = data.get("tests")
    if not isinstance(tests, list) or not tests:
        raise RuntimeError("The publish test plan is empty.")
    for test in tests:
        if not isinstance(test.get("command"), list) or not test["command"]:
            raise RuntimeError("A publish test is missing its command.")
    return tests


def run_plan(tests, cwd=ROOT):
    failed = []
    for test in tests:
        result = subprocess.run(test["command"], cwd=cwd)
        if result.returncode != 0:
            failed.append(test.get("name") or " ".join(test["command"]))
    return failed


def forbidden(paths):
    blocked = []
    for path in paths:
        name = Path(path).name
        lowered = path.replace("\\", "/").lower()
        if name in FORBIDDEN_NAMES or name == ".env" or name.startswith(".env."):
            blocked.append(path)
        elif name.endswith(".sqlite") or name.endswith(".sqlite-wal") or name.endswith(".sqlite-shm"):
            blocked.append(path)
        elif lowered.endswith("/world.json") or "/saves/" in lowered or lowered.endswith(".env"):
            blocked.append(path)
    return blocked


def commits_ahead(remote_ref="origin/main", cwd=ROOT):
    listed = git("log", "--format=%H %s", f"{remote_ref}..HEAD", cwd=cwd).stdout.splitlines()
    files = git("diff", "--name-only", f"{remote_ref}...HEAD", cwd=cwd).stdout.splitlines()
    return listed, [line for line in files if line]


def assert_fast_forward(remote_ref="origin/main", cwd=ROOT):
    head = git("rev-parse", "HEAD", cwd=cwd).stdout.strip()
    remote = git("rev-parse", remote_ref, cwd=cwd).stdout.strip()
    ancestor = git("merge-base", "--is-ancestor", remote_ref, "HEAD", cwd=cwd, check=False)
    if ancestor.returncode != 0:
        raise RuntimeError(
            f"{remote_ref} is not an ancestor of HEAD ({head}). The remote has diverged or the branch was rewritten. Not pushing."
        )
    return head, remote


def push_main(cwd=ROOT):
    branch = git("rev-parse", "--abbrev-ref", "HEAD", cwd=cwd).stdout.strip()
    if branch != "main":
        raise RuntimeError(f"Refusing to push from {branch}. Publish from main so unrelated branch commits stay out.")
    git("fetch", "origin", "main", cwd=cwd)
    head, remote = assert_fast_forward(cwd=cwd)
    if head == remote:
        return head
    ahead, files = commits_ahead(cwd=cwd)
    blocked = forbidden(files)
    if blocked:
        raise RuntimeError("Refusing to push private or secret files: " + ", ".join(blocked))
    if not ahead:
        raise RuntimeError("No new commits to push.")
    pushed = git("push", "origin", "HEAD:main", cwd=cwd)
    if pushed.returncode != 0:
        raise RuntimeError(pushed.stderr.strip() or "GitHub rejected the push.")
    git("fetch", "origin", "main", cwd=cwd)
    confirmed = git("rev-parse", "origin/main", cwd=cwd).stdout.strip()
    if confirmed != head:
        raise RuntimeError(f"Push did not update origin/main. Remote is {confirmed}; local is {head}.")
    if MARKER.exists():
        MARKER.unlink()
    return confirmed


def main(argv=None):
    parser = argparse.ArgumentParser(description="Test and fast-forward origin/main.")
    parser.add_argument("--push", action="store_true", help="Push main after the test plan passes.")
    parser.add_argument("--plan", type=Path, default=PLAN)
    args = parser.parse_args(argv)
    if args.push and any(arg in {"--force", "--force-with-lease"} for arg in (argv or sys.argv)):
        print("Force push is refused.", file=sys.stderr)
        return 2
    try:
        tests = load_plan(args.plan)
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 2
    failed = run_plan(tests)
    if failed:
        print("Tests failed; nothing was published: " + "; ".join(failed), file=sys.stderr)
        return 1
    print(f"{len(tests)} publish-plan checks passed.")
    if not args.push:
        print("Publish was not requested.")
        return 0
    try:
        confirmed = push_main()
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 3
    print("origin/main " + confirmed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
