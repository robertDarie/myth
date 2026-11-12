"""Run the publish test plan and fast-forward origin/main. Never force-pushes."""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "scripts" / "publish-tests.json"
MARKER = ROOT / ".cursor" / "publish-pending"
# Names and renamed copies of the two private research workbooks. Spaces and punctuation are ignored.
PRIVATE_WORKBOOK = re.compile(
    r"rokvideoresearch|videoresearchv1|riseofkingdomscallofdragonscompletereference|callofdragonscompletereference|riseofkingdomscompletereference"
)
SECRET = re.compile(r"(^|/)(\.env($|\.)|credentials(\.[^/]+)?$|.*\.pem$|id_rsa$|.*api[-_]?key.*|secrets?\.(json|ya?ml|txt)$)", re.I)


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


def compact_name(path):
    return re.sub(r"[^a-z0-9]", "", Path(path).name.lower())


def forbidden(paths):
    blocked = []
    for path in paths:
        name = Path(path).name
        lowered = path.replace("\\", "/").lower()
        if PRIVATE_WORKBOOK.search(compact_name(path)) or SECRET.search(lowered):
            blocked.append(path)
        elif name.lower().endswith((".sqlite", ".sqlite-wal", ".sqlite-shm")):
            blocked.append(path)
        elif lowered.endswith("/world.json") or lowered == "world.json" or "/saves/" in lowered:
            blocked.append(path)
    return blocked


def worktrees(cwd=ROOT):
    text = git("worktree", "list", "--porcelain", cwd=cwd).stdout
    items, current = [], {}
    for line in text.splitlines():
        if line.startswith("worktree "):
            if current:
                items.append(current)
            current = {"path": line.split(" ", 1)[1]}
        elif line.startswith("branch "):
            current["branch"] = line.split(" ", 1)[1]
    if current:
        items.append(current)
    return items


def dirty(cwd=ROOT):
    return [line for line in git("status", "--porcelain", cwd=cwd).stdout.splitlines() if line.strip()]


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
    main_tree = next((item for item in worktrees(cwd) if item.get("branch") == "refs/heads/main"), None)
    if branch != "main":
        where = f" Main is checked out at {main_tree['path']}." if main_tree else " Check out main in its own worktree first."
        raise RuntimeError(f"Refusing to push from {branch}.{where} This command will not switch branches or merge another branch.")
    toplevel = Path(git("rev-parse", "--show-toplevel", cwd=cwd).stdout.strip())
    if main_tree and toplevel.resolve() != Path(main_tree["path"]).resolve():
        raise RuntimeError(f"Refusing to publish from {toplevel}. Main is checked out at {main_tree['path']}.")
    pending = dirty(cwd)
    if pending:
        raise RuntimeError("Refusing to publish because this worktree has uncommitted files. Nothing was reset or overwritten:\n" + "\n".join(pending[:20]))
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
    print(f"{len(tests)} required regression checks passed. This plan is not a full game audit.")
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
